/* =========================================================
   CANVAS BACKEND

   pdf.js needs a 2D canvas to rasterise scanned pages before
   OCR. Two implementations are supported:

   - @napi-rs/canvas : self-contained prebuilt binary, works on
     serverless runtimes that lack cairo/pango.
   - canvas          : node-canvas, needs system libraries.

   The first backend that loads successfully is cached for the
   lifetime of the process. Loading is lazy so that a missing
   native binary only affects OCR, never the whole API.
========================================================= */

let backend = null;

function loadCanvasBackend() {
  const candidates = [
    "@napi-rs/canvas",
    "canvas",
  ];

  const failures = [];

  for (const name of candidates) {
    try {
      const mod = require(name);

      if (typeof mod.createCanvas !== "function") {
        throw new Error(
          "createCanvas is not exported"
        );
      }

      if (typeof mod.loadImage !== "function") {
        throw new Error(
          "loadImage is not exported"
        );
      }

      return {
        createCanvas: mod.createCanvas,
        loadImage: mod.loadImage,
        backendName: name,
      };
    } catch (error) {
      failures.push(
        `${name}: ${error.message}`
      );
    }
  }

  const error = new Error(
    `No usable canvas backend found (${failures.join(
      " | "
    )})`
  );

  error.code = "CANVAS_UNAVAILABLE";

  throw error;
}

function getCanvas() {
  if (!backend) {
    backend = loadCanvasBackend();

    console.log(
      `Canvas backend: ${backend.backendName}`
    );
  }

  return backend;
}

function isCanvasAvailable() {
  try {
    getCanvas();

    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  getCanvas,
  isCanvasAvailable,
};
