const { createLazyGroq } = require("../utils/groqClient.js");
const pdfjslib = require("pdfjs-dist/legacy/build/pdf.js");
const path = require("path");

const ResumeAnalysis = require("../models/ResumeAnalysis.js");

const { getCanvas } = require("../utils/canvas.js");
const mammoth = require("mammoth");
const { createWorker } = require("tesseract.js");

/* =========================================================
   GROQ
========================================================= */

const groq = createLazyGroq({ timeout: 120000 });

/* =========================================================
   AVAILABLE INTERVIEW DOMAINS
========================================================= */

const DOMAINS = [
  "JavaScript/Node.js",
  "React",
  "Python",
  "Data Science",
  "DevOps",
  "System Design",
  "Database Design",
  "General",
];

/* =========================================================
   PATHS
========================================================= */

const PDFJS_ROOT = path.dirname(
  require.resolve("pdfjs-dist/package.json")
);

const STANDARD_FONT_DATA_URL = path.join(
  PDFJS_ROOT,
  "standard_fonts"
);

const CMAP_URL = path.join(
  PDFJS_ROOT,
  "cmaps"
);

/* =========================================================
   TEXT CLEANING
========================================================= */

function cleanText(text) {
  return String(text || "")
    .replace(/\u0000/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* =========================================================
   PDF CANVAS FACTORY
   IMPORTANT FOR NODE + PDF.JS
========================================================= */

class NodeCanvasFactory {
  create(width, height) {
    const { createCanvas } = getCanvas();

    const canvas = createCanvas(
      Math.ceil(width),
      Math.ceil(height)
    );

    const context = canvas.getContext("2d");

    return {
      canvas,
      context,
    };
  }

  reset(canvasAndContext, width, height) {
    if (!canvasAndContext) {
      return;
    }

    const canvas = canvasAndContext.canvas;

    if (!canvas) {
      return;
    }

    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);

    canvasAndContext.context =
      canvas.getContext("2d");
  }

  destroy(canvasAndContext) {
    if (!canvasAndContext) {
      return;
    }

    if (canvasAndContext.canvas) {
      canvasAndContext.canvas.width = 1;
      canvasAndContext.canvas.height = 1;
    }

    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

/* =========================================================
   PDF OPTIONS
========================================================= */

function getPdfOptions(buffer) {
  return {
    data: new Uint8Array(buffer),

    // Important for Node.js
    disableFontFace: true,

    useSystemFonts: false,

    isEvalSupported: false,

    standardFontDataUrl:
      STANDARD_FONT_DATA_URL,

    cMapUrl: CMAP_URL,

    cMapPacked: true,

    // Explicit Node canvas factory
    canvasFactory:
      new NodeCanvasFactory(),
  };
}

/* =========================================================
   PDF.JS SELECTABLE TEXT
========================================================= */

async function extractSelectableTextFromPDF(
  buffer
) {
  let pdf = null;

  try {
    console.log(
      "Trying PDF selectable-text extraction..."
    );

    const loadingTask =
      pdfjslib.getDocument(
        getPdfOptions(buffer)
      );

    pdf =
      await loadingTask.promise;

    let allText = "";

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {
      const page =
        await pdf.getPage(
          pageNumber
        );

      try {
        const content =
          await page.getTextContent({
            normalizeWhitespace: true,
            disableCombineTextItems: false,
          });

        const pageText =
          content.items
            .map((item) => {
              if (
                item &&
                typeof item.str ===
                  "string"
              ) {
                return item.str;
              }

              return "";
            })
            .filter(Boolean)
            .join(" ");

        allText +=
          pageText + "\n";
      } finally {
        try {
          page.cleanup();
        } catch (_) {}
      }
    }

    const cleaned =
      cleanText(allText);

    console.log(
      `PDF.js extracted ${cleaned.length} characters`
    );

    return cleaned;
  } catch (error) {
    console.error(
      "PDF.js selectable text extraction failed:",
      error.message
    );

    return "";
  } finally {
    if (pdf) {
      try {
        await pdf.destroy();
      } catch (_) {}
    }
  }
}

/* =========================================================
   RAW PDF FALLBACK
========================================================= */

function decodePdfLiteralString(
  value
) {
  let output = "";

  for (
    let i = 0;
    i < value.length;
    i++
  ) {
    const current =
      value[i];

    if (current !== "\\") {
      output += current;
      continue;
    }

    i++;

    if (i >= value.length) {
      break;
    }

    const next =
      value[i];

    if (next === "n") {
      output += "\n";
    } else if (next === "r") {
      output += "\r";
    } else if (next === "t") {
      output += "\t";
    } else if (next === "b") {
      output += "\b";
    } else if (next === "f") {
      output += "\f";
    } else if (
      next === "\\" ||
      next === "(" ||
      next === ")"
    ) {
      output += next;
    } else if (
      /[0-7]/.test(next)
    ) {
      let octal = next;

      for (
        let j = 0;
        j < 2 &&
        i + 1 < value.length &&
        /[0-7]/.test(
          value[i + 1]
        );
        j++
      ) {
        i++;
        octal += value[i];
      }

      output +=
        String.fromCharCode(
          parseInt(
            octal,
            8
          )
        );
    } else {
      output += next;
    }
  }

  return output;
}

function rawPdfTextFallback(
  buffer
) {
  try {
    const source =
      buffer.toString(
        "latin1"
      );

    const blocks =
      source.match(
        /BT[\s\S]*?ET/g
      ) || [];

    const parts = [];

    for (
      const block of blocks
    ) {
      const matches =
        block.match(
          /\((?:\\.|[^\\()])*\)/g
        ) || [];

      for (
        const token of matches
      ) {
        const value =
          token.slice(
            1,
            -1
          );

        const decoded =
          decodePdfLiteralString(
            value
          )
            .replace(
              /[\x00-\x08\x0B\x0C\x0E-\x1F]/g,
              " "
            )
            .trim();

        if (decoded) {
          parts.push(
            decoded
          );
        }
      }
    }

    const result =
      cleanText(
        parts.join(" ")
      );

    console.log(
      `Raw PDF fallback extracted ${result.length} characters`
    );

    return result;
  } catch (error) {
    console.error(
      "Raw PDF fallback failed:",
      error.message
    );

    return "";
  }
}

/* =========================================================
   LOAD PDF FOR OCR
========================================================= */

async function loadPdfForOCR(
  buffer
) {
  const loadingTask =
    pdfjslib.getDocument(
      getPdfOptions(buffer)
    );

  return await loadingTask.promise;
}

/* =========================================================
   RENDER PDF PAGE TO PNG
========================================================= */

async function renderPdfPageToPNG(
  pdf,
  pageNumber
) {
  let page = null;
  let canvasAndContext = null;

  try {
    page =
      await pdf.getPage(
        pageNumber
      );

    /*
      Higher resolution makes OCR
      considerably more reliable for resumes.
    */

    const scale = 2.5;

    const viewport =
      page.getViewport({
        scale,
      });

    const factory =
      new NodeCanvasFactory();

    canvasAndContext =
      factory.create(
        viewport.width,
        viewport.height
      );

    const {
      canvas,
      context,
    } =
      canvasAndContext;

    /*
      White background.
      This is useful for scanned resumes.
    */

    context.save();

    context.fillStyle =
      "#ffffff";

    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    context.restore();

    const renderContext = {
      canvasContext:
        context,

      viewport,

      /*
        THIS IS THE IMPORTANT FIX.
      */
      canvasFactory:
        factory,

      background:
        "rgb(255,255,255)",
    };

    console.log(
      `Rendering PDF page ${pageNumber}...`
    );

    await page.render(
      renderContext
    ).promise;

    const png =
      canvas.toBuffer(
        "image/png"
      );

    console.log(
      `Rendered page ${pageNumber}: ${png.length} bytes`
    );

    return png;
  } finally {
    if (page) {
      try {
        page.cleanup();
      } catch (_) {}
    }

    if (canvasAndContext) {
      try {
        const factory =
          new NodeCanvasFactory();

        factory.destroy(
          canvasAndContext
        );
      } catch (_) {}
    }
  }
}

/* =========================================================
   OCR IMAGE PREPROCESSING
========================================================= */

function preprocessImage(
  pngBuffer
) {
  try {
    /*
      Load the rendered PNG back into
      canvas so we can improve OCR contrast.
    */

    const {
      loadImage,
      createCanvas,
    } = getCanvas();

    return loadImage(
      pngBuffer
    ).then((image) => {
      const canvas =
        createCanvas(
          image.width,
          image.height
        );

      const context =
        canvas.getContext("2d");

      context.fillStyle =
        "#ffffff";

      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      context.drawImage(
        image,
        0,
        0
      );

      /*
        Tesseract can directly process
        this PNG buffer.
      */

      return canvas.toBuffer(
        "image/png"
      );
    });
  } catch (error) {
    console.error(
      "Image preprocessing failed:",
      error.message
    );

    return Promise.resolve(
      pngBuffer
    );
  }
}

/* =========================================================
   OCR
========================================================= */

async function extractTextWithOCR(
  buffer
) {
  console.log(
    "========================================"
  );

  console.log(
    "Selectable text not found."
  );

  console.log(
    "Starting OCR for scanned/image PDF..."
  );

  let pdf = null;
  let worker = null;

  try {
    pdf =
      await loadPdfForOCR(
        buffer
      );

    console.log(
      `OCR processing ${pdf.numPages} PDF page(s)...`
    );

    /*
      One worker for all pages.
      Tesseract recommends reusing a worker
      for multiple images.
    */

    worker =
      await createWorker(
        "eng",
        1,
        {
          /*
            Serverless runtimes ship a read-only
            filesystem outside of /tmp, so the
            traineddata cache must be redirected.
          */
          cachePath:
            process.env
              .TESSERACT_CACHE_PATH ||
            (process.env.VERCEL
              ? "/tmp"
              : "."),

          logger: (message) => {
            if (
              message &&
              message.status ===
                "recognizing text"
            ) {
              if (
                typeof message.progress ===
                "number"
              ) {
                const percent =
                  Math.round(
                    message.progress *
                      100
                  );

                if (
                  percent === 0 ||
                  percent === 25 ||
                  percent === 50 ||
                  percent === 75 ||
                  percent === 100
                ) {
                  console.log(
                    `OCR progress: ${percent}%`
                  );
                }
              }
            }
          },
        }
      );

    let fullText = "";

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {
      console.log(
        `OCR: processing page ${pageNumber}/${pdf.numPages}`
      );

      let imageBuffer = null;

      try {
        imageBuffer =
          await renderPdfPageToPNG(
            pdf,
            pageNumber
          );
      } catch (renderError) {
        console.error(
          `PDF page ${pageNumber} rendering failed:`,
          renderError.message
        );

        continue;
      }

      if (
        !imageBuffer ||
        imageBuffer.length === 0
      ) {
        console.log(
          `OCR: page ${pageNumber} produced no image`
        );

        continue;
      }

      try {
        imageBuffer =
          await preprocessImage(
            imageBuffer
          );
      } catch (_) {}

      try {
        const result =
          await worker.recognize(
            imageBuffer
          );

        const pageText =
          result &&
          result.data &&
          typeof result.data.text ===
            "string"
            ? result.data.text
            : "";

        console.log(
          `OCR page ${pageNumber}: ${pageText.length} characters`
        );

        if (pageText) {
          fullText +=
            "\n" +
            pageText;
        }
      } catch (ocrError) {
        console.error(
          `Tesseract failed on page ${pageNumber}:`,
          ocrError.message
        );
      }
    }

    const cleaned =
      cleanText(
        fullText
      );

    console.log(
      `OCR extracted ${cleaned.length} characters`
    );

    console.log(
      "========================================"
    );

    return cleaned;
  } catch (error) {
    console.error(
      "OCR extraction failed:",
      error
    );

    return "";
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (error) {
        console.error(
          "Tesseract worker termination failed:",
          error.message
        );
      }
    }

    if (pdf) {
      try {
        await pdf.destroy();
      } catch (_) {}
    }
  }
}

/* =========================================================
   DOCX EXTRACTION
========================================================= */

async function extractTextFromDOCX(
  buffer
) {
  try {
    console.log(
      "Extracting text from DOCX..."
    );

    const result =
      await mammoth.extractRawText({
        buffer,
      });

    const text =
      cleanText(
        result.value
      );

    console.log(
      `DOCX extracted ${text.length} characters`
    );

    return text;
  } catch (error) {
    console.error(
      "DOCX extraction failed:",
      error.message
    );

    return "";
  }
}

/* =========================================================
   TEXT FILE
========================================================= */

function extractTextFromTXT(
  buffer
) {
  try {
    return cleanText(
      buffer.toString(
        "utf8"
      )
    );
  } catch (error) {
    console.error(
      "TXT extraction failed:",
      error.message
    );

    return "";
  }
}

/* =========================================================
   OCR AVAILABILITY
   OCR pulls in canvas + a Tesseract worker, which are slow
   and fragile on serverless. It is off by default on Vercel
   and can be force-enabled with ENABLE_OCR=true. Selectable
   PDF text, DOCX and TXT still work with OCR disabled.
========================================================= */

function isOcrEnabled() {
  if (process.env.ENABLE_OCR === "true") {
    return true;
  }

  if (process.env.ENABLE_OCR === "false") {
    return false;
  }

  return !process.env.VERCEL;
}

/* =========================================================
   MAIN RESUME TEXT EXTRACTION
========================================================= */

async function extractResumeText(
  buffer,
  mimetype
) {
  /*
    --------------------------------------------------------
    PDF
    --------------------------------------------------------
  */

  if (
    mimetype ===
      "application/pdf" ||
    mimetype ===
      "application/x-pdf"
  ) {
    /*
      STEP 1:
      Normal selectable PDF text.
    */

    const selectableText =
      await extractSelectableTextFromPDF(
        buffer
      );

    if (
      selectableText &&
      selectableText.length >= 50
    ) {
      console.log(
        "Using selectable PDF text."
      );

      return selectableText;
    }

    /*
      STEP 2:
      Raw PDF fallback.
    */

    const rawText =
      rawPdfTextFallback(
        buffer
      );

    if (
      rawText &&
      rawText.length >= 50
    ) {
      console.log(
        "Using raw PDF fallback text."
      );

      return rawText;
    }

    /*
      STEP 3:
      OCR for scanned/image PDF.
    */

    if (!isOcrEnabled()) {
      console.warn(
        "OCR is disabled in this environment; skipping scanned-PDF OCR."
      );

      return "";
    }

    const ocrText =
      await extractTextWithOCR(
        buffer
      );

    if (
      ocrText &&
      ocrText.length >= 50
    ) {
      console.log(
        "Using OCR extracted text."
      );

      return ocrText;
    }

    return "";
  }

  /*
    --------------------------------------------------------
    DOCX
    --------------------------------------------------------
  */

  if (
    mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return await extractTextFromDOCX(
      buffer
    );
  }

  /*
    --------------------------------------------------------
    TXT
    --------------------------------------------------------
  */

  if (
    mimetype ===
    "text/plain"
  ) {
    return extractTextFromTXT(
      buffer
    );
  }

  return "";
}

/* =========================================================
   JSON PARSER
========================================================= */

function parseAIJson(
  raw
) {
  if (!raw) {
    throw new Error(
      "Empty AI response."
    );
  }

  let text =
    String(raw).trim();

  text =
    text
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/i,
        ""
      )
      .replace(
        /\s*```$/i,
        ""
      )
      .trim();

  try {
    return JSON.parse(
      text
    );
  } catch (_) {}

  const start =
    text.indexOf("{");

  const end =
    text.lastIndexOf("}");

  if (
    start === -1 ||
    end === -1 ||
    end <= start
  ) {
    throw new Error(
      "No valid JSON object found in AI response."
    );
  }

  return JSON.parse(
    text.slice(
      start,
      end + 1
    )
  );
}

/* =========================================================
   NORMALIZE AI RESULT
========================================================= */

function normalizeAnalysis(
  analysis
) {
  const validExperienceLevels = [
    "Junior",
    "Mid",
    "Senior",
  ];

  const experienceLevel =
    validExperienceLevels.includes(
      analysis?.experienceLevel
    )
      ? analysis.experienceLevel
      : "Junior";

  const skillsDetected =
    Array.isArray(
      analysis?.skillsDetected
    )
      ? analysis.skillsDetected
          .filter(
            (skill) =>
              typeof skill ===
              "string"
          )
          .map(
            (skill) =>
              skill.trim()
          )
          .filter(Boolean)
          .slice(0, 30)
      : [];

  const strengths =
    Array.isArray(
      analysis?.strengths
    )
      ? analysis.strengths
          .filter(
            (item) =>
              typeof item ===
              "string"
          )
          .map(
            (item) =>
              item.trim()
          )
          .filter(Boolean)
          .slice(0, 10)
      : [];

  const recommendedDomains =
    Array.isArray(
      analysis?.recommendedDomains
    )
      ? analysis.recommendedDomains
          .filter(
            (item) =>
              item &&
              typeof item ===
                "object"
          )
          .filter(
            (item) =>
              DOMAINS.includes(
                item.label
              )
          )
          .map(
            (item) => ({
              label:
                item.label,

              reason:
                typeof item.reason ===
                "string"
                  ? item.reason.trim()
                  : "This domain matches the candidate's resume.",

              confidence: Math.max(
                0,
                Math.min(
                  100,
                  Number(
                    item.confidence
                  ) || 0
                )
              ),
            })
          )
          .slice(0, 3)
      : [];

  return {
    summary:
      typeof analysis?.summary ===
      "string"
        ? analysis.summary.trim()
        : "Resume analyzed successfully.",

    experienceLevel,

    skillsDetected,

    strengths,

    recommendedDomains,
  };
}

/* =========================================================
   RESUME AI ANALYSIS
========================================================= */

const analyzeResume = async (
  req,
  res
) => {
  try {
    /*
      ------------------------------------------------------
      FILE VALIDATION
      ------------------------------------------------------
    */

    if (!req.file) {
      return res.status(400).json({
        error:
          "No resume file uploaded.",
      });
    }

    /*
      ------------------------------------------------------
      USER VALIDATION
      ------------------------------------------------------
    */

    if (!req.userId) {
      return res.status(401).json({
        error:
          "User authentication required.",
      });
    }

    console.log(
      "========================================"
    );

    console.log(
      "Resume analysis started"
    );

    console.log(
      "File:",
      req.file.originalname
    );

    console.log(
      "Mimetype:",
      req.file.mimetype
    );

    console.log(
      "Size:",
      req.file.size
    );

    /*
      ------------------------------------------------------
      EXTRACT TEXT
      ------------------------------------------------------
    */

    const resumeText =
      cleanText(
        await extractResumeText(
          req.file.buffer,
          req.file.mimetype
        )
      );

    console.log(
      `Final resume text length: ${resumeText.length}`
    );

    /*
      ------------------------------------------------------
      EXTRACTION FAILURE
      ------------------------------------------------------
    */

    if (
      !resumeText ||
      resumeText.length < 50
    ) {
      return res.status(400).json({
        error:
          "Unable to extract readable text from the resume.",

        message:
          isOcrEnabled()
            ? "The resume appears to be image-based and OCR could not read enough text. Please try the same PDF again or upload a clearer copy."
            : "This resume appears to be image-based (scanned). OCR is disabled on this deployment, so please upload a PDF with selectable text or a DOCX file.",
      });
    }

    /*
      ------------------------------------------------------
      DEBUG PREVIEW
      ------------------------------------------------------
    */

    console.log(
      "Resume text preview:"
    );

    console.log(
      resumeText.slice(
        0,
        1000
      )
    );

    /*
      ------------------------------------------------------
      SEND REASONABLE AMOUNT TO AI
      ------------------------------------------------------
    */

    const resumeForAI =
      resumeText.slice(
        0,
        14000
      );

    /*
      ------------------------------------------------------
      AI PROMPT
      ------------------------------------------------------
    */

    const prompt = `
You are an expert resume analyzer,
technical recruiter, placement officer,
and career coach.

Analyze the resume below.

The candidate is applying for
technical placements and internships.

IMPORTANT:
Use ONLY information actually present
in the extracted resume text.

Do NOT invent skills,
experience,
certifications,
projects,
education,
or achievements.

Return ONLY valid JSON.

Available interview domains:

${DOMAINS.join(", ")}

RESUME:

"""
${resumeForAI}
"""

Return exactly this structure:

{
  "summary": "A concise 2-3 sentence summary based only on the resume.",
  "experienceLevel": "Junior",
  "skillsDetected": [
    "actual skill 1",
    "actual skill 2",
    "actual skill 3"
  ],
  "strengths": [
    "actual resume strength 1",
    "actual resume strength 2",
    "actual resume strength 3"
  ],
  "recommendedDomains": [
    {
      "label": "JavaScript/Node.js",
      "reason": "Why this domain matches the resume",
      "confidence": 90
    }
  ]
}

Rules:

1. experienceLevel must be exactly:
   Junior, Mid, or Senior.

2. skillsDetected must contain
   skills explicitly found in the resume.

3. Include programming languages,
   frameworks, databases, tools,
   cloud technologies and relevant
   technical skills when present.

4. Include project-related skills
   when explicitly present.

5. Include internship/work experience
   only when present.

6. strengths must be based on
   actual resume evidence.

7. recommendedDomains should contain
   up to 3 relevant domains.

8. Domain labels must exactly match
   the available domains.

9. Confidence must be 0-100.

10. Do not invent information.

11. If the resume contains projects,
    use them when determining domains.

12. If the candidate is a fresher,
    Junior is normally appropriate unless
    the resume clearly supports another level.
`;

    /*
      ------------------------------------------------------
      GROQ
      ------------------------------------------------------
    */

    console.log(
      "Sending resume to Groq..."
    );

    const response =
      await groq.chat.completions.create({
        model:
          process.env.GROQ_MODEL ||
          "openai/gpt-oss-120b",

        messages: [
          {
            role: "system",
            content:
              "You are a resume analysis engine. Return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.1,

        response_format: {
          type: "json_object",
        },
      });

    const raw =
      response?.choices?.[0]?.message?.content ||
      "";

    console.log(
      "Groq response received."
    );

    /*
      ------------------------------------------------------
      PARSE AI RESPONSE
      ------------------------------------------------------
    */

    let analysis;

    try {
      analysis =
        parseAIJson(
          raw
        );
    } catch (error) {
      console.error(
        "AI JSON parsing failed:",
        error.message
      );

      console.error(
        "Raw AI response:",
        raw
      );

      return res.status(500).json({
        error:
          "AI returned an invalid resume analysis.",

        message:
          "Please try analyzing the resume again.",
      });
    }

    /*
      ------------------------------------------------------
      NORMALIZE
      ------------------------------------------------------
    */

    analysis =
      normalizeAnalysis(
        analysis
      );

    /*
      ------------------------------------------------------
      SAVE TO MONGODB
      ------------------------------------------------------
    */

    const savedAnalysis =
      await ResumeAnalysis.findOneAndUpdate(
        {
          userId:
            req.userId,
        },

        {
          userId:
            req.userId,

          summary:
            analysis.summary,

          experienceLevel:
            analysis.experienceLevel,

          skillsDetected:
            analysis.skillsDetected,

          strengths:
            analysis.strengths,

          recommendedDomains:
            analysis.recommendedDomains,
        },

        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );

    console.log(
      "Resume analysis saved successfully:",
      savedAnalysis._id
    );

    console.log(
      "========================================"
    );

    /*
      ------------------------------------------------------
      SUCCESS
      ------------------------------------------------------
    */

    return res.status(200).json({
      message:
        "Resume analyzed and saved successfully.",

      analysis,

      saved: true,
    });
  } catch (error) {
    console.error(
      "========================================"
    );

    console.error(
      "Resume analysis fatal error:"
    );

    console.error(
      error
    );

    console.error(
      "========================================"
    );

    return res.status(500).json({
      error:
        "Unable to analyse the resume.",

      message:
        error.message ||
        "Unknown server error.",
    });
  }
};

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  analyzeResume,
};