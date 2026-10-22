const companyProfiles = require("../config/companyProfiles");

// ============================================================
// GET ALL ACTIVE COMPANY PROFILES
// ============================================================

const getCompanies = async (req, res) => {
  try {
    const companies = companyProfiles
      .filter((company) => company.active !== false)
      .map((company) => ({
        id: company.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),

        name: company.name,
        type: company.type,
        description: company.description,
        interviewStyle: company.interviewStyle,
        focusAreas: company.focusAreas,
        expectedStandard: company.expectedStandard,
        difficultyRange: company.difficultyRange,
      }));

    return res.status(200).json({
      success: true,
      companies,
    });
  } catch (error) {
    console.error(
      "getCompanies error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company profiles",
      error: error.message,
    });
  }
};

// ============================================================
// GET SINGLE COMPANY PROFILE
// ============================================================

const getCompany = async (req, res) => {
  try {
    const companyId =
      String(req.params.companyId || "")
        .trim()
        .toLowerCase();

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const company = companyProfiles.find(
      (profile) => {
        const generatedId = profile.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        return generatedId === companyId;
      }
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company profile not found",
      });
    }

    return res.status(200).json({
      success: true,

      company: {
        id: company.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),

        ...company,
      },
    });
  } catch (error) {
    console.error(
      "getCompany error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company profile",
      error: error.message,
    });
  }
};

module.exports = {
  getCompanies,
  getCompany,
};