const express = require("express");

const {
  getCompanies,
  getCompany,
} = require("../controllers/companycontroller");

const { protect } = require("../middleware/auth.js");

const router = express.Router();

// Company profiles describe interview formats and are only useful to
// authenticated users running a simulated interview.
router.use(protect);

// ============================================================
// GET ALL COMPANY PROFILES
// GET /api/recruiter/companies
// ============================================================

router.get(
  "/companies",
  getCompanies
);

// ============================================================
// GET SINGLE COMPANY PROFILE
// GET /api/recruiter/companies/:companyId
// ============================================================

router.get(
  "/companies/:companyId",
  getCompany
);

module.exports = router;