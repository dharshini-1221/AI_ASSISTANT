
const express = require("express");
const multer = require("multer");

const { protect } = require("../middleware/auth.js");
const authorize = require("../middleware/authorize.js");
const { analyzeResume } = require("../controllers/resumecontroller.js");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024, // 4 MB limit (Vercel caps request bodies at 4.5 MB)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"), false);
    }
  },
});

// Students can analyze their own resumes
router.post(
  "/analyze",
  protect,
  authorize("Student"),
  upload.single("resume"),
  analyzeResume
);

module.exports = router;
