"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";

type Company = {
  id: string;
  name: string;
  type: string;
  description: string;
  interviewStyle: string;
  focusAreas: string[];
  expectedStandard: number;
  difficultyRange: {
    min: number;
    max: number;
  };
};

const companyIcons: Record<string, string> = {
  google: "G",
  amazon: "A",
  microsoft: "M",
  tcs: "T",
  infosys: "I",
  startup: "🚀",
};

const companyDescriptions: Record<string, string> = {
  google:
    "Deep technical problem solving and scalable system thinking.",

  amazon:
    "Technical problem solving, ownership and customer-focused thinking.",

  microsoft:
    "Coding, software engineering and system-level thinking.",

  tcs:
    "Programming fundamentals, databases and practical problem solving.",

  infosys:
    "Programming concepts, logical thinking and technical fundamentals.",

  startup:
    "Projects, debugging, APIs and real-world engineering skills.",
};

export default function RecruiterPage() {
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [startingInterview, setStartingInterview] = useState(false);
  const [error, setError] = useState("");

  // ============================================================
  // LOAD COMPANY PROFILES
  // ============================================================

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axiosInstance.get(
        "/api/recruiter/companies"
      );

      if (
        response.data?.success &&
        Array.isArray(response.data.companies)
      ) {
        const loadedCompanies: Company[] =
          response.data.companies;

        if (loadedCompanies.length === 0) {
          setCompanies([]);
          setError(
            "No company profiles are currently available."
          );
          return;
        }

        setCompanies(loadedCompanies);
      } else {
        setCompanies([]);
        setError("Unable to load companies.");
      }
    } catch (err) {
      console.error(
        "Failed to load recruiter companies:",
        err
      );

      setCompanies([]);

      setError(
        "Unable to load companies. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // ============================================================
  // SELECT COMPANY
  // ============================================================

  const handleSelectCompany = (companyId: string) => {
    if (!companyId) {
      return;
    }

    setSelectedCompany(companyId);
    setError("");
  };

  // ============================================================
  // CONTINUE TO INTERVIEW
  // ============================================================

  const handleContinue = () => {
    if (!selectedCompany || startingInterview) {
      return;
    }

    const selected = companies.find(
      (company) => company.id === selectedCompany
    );

    if (!selected) {
      setError(
        "Selected company could not be found. Please select again."
      );
      return;
    }

    try {
      setStartingInterview(true);

      /*
       * IMPORTANT:
       *
       * We pass the company ID through the URL.
       *
       * Example:
       * /interview?company=google
       *
       * The interview page should read this value and send:
       *
       * {
       *   domain: "...",
       *   companyId: "google"
       * }
       *
       * to:
       *
       * POST /api/interview/start
       */

      router.push(
        `/interview?company=${encodeURIComponent(
          selected.id
        )}`
      );
    } catch (err) {
      console.error(
        "Failed to open interview page:",
        err
      );

      setStartingInterview(false);

      setError(
        "Unable to start the interview. Please try again."
      );
    }
  };

  // ============================================================
  // GET SELECTED COMPANY
  // ============================================================

  const selectedCompanyData = companies.find(
    (company) => company.id === selectedCompany
  );

  // ============================================================
  // UI
  // ============================================================

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "8px 16px",
              borderRadius: "999px",
              background: "#e0e7ff",
              color: "#4338ca",
              fontSize: "14px",
              fontWeight: 700,
              marginBottom: "14px",
            }}
          >
            AI RECRUITER SIMULATOR
          </div>

          <h1
            style={{
              fontSize: "38px",
              fontWeight: 800,
              color: "#111827",
              margin: "0 0 12px",
            }}
          >
            Choose Your Target Company
          </h1>

          <p
            style={{
              maxWidth: "720px",
              margin: "0 auto",
              color: "#6b7280",
              fontSize: "16px",
              lineHeight: 1.7,
            }}
          >
            Experience a company-specific AI interview where
            the question patterns, difficulty, evaluation and
            feedback adapt to the selected company profile.
          </p>
        </div>

        {/* ======================================================
            LOADING
        ====================================================== */}

        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "70px 20px",
              color: "#6b7280",
              fontSize: "16px",
            }}
          >
            <div
              style={{
                fontSize: "30px",
                marginBottom: "12px",
              }}
            >
              ⏳
            </div>

            Loading companies...
          </div>
        )}

        {/* ======================================================
            ERROR
        ====================================================== */}

        {!loading && error && (
          <div
            style={{
              maxWidth: "650px",
              margin: "0 auto 25px",
              padding: "20px",
              borderRadius: "14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            <div
              style={{
                marginBottom: "12px",
              }}
            >
              {error}
            </div>

            {companies.length === 0 && (
              <button
                type="button"
                onClick={loadCompanies}
                disabled={loading}
                style={{
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 18px",
                  background: "#b91c1c",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {/* ======================================================
            COMPANY CARDS
        ====================================================== */}

        {!loading &&
          companies.length > 0 && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "22px",
                }}
              >
                {companies.map((company) => {
                  const isSelected =
                    selectedCompany === company.id;

                  const focusAreas = Array.isArray(
                    company.focusAreas
                  )
                    ? company.focusAreas
                    : [];

                  const expectedStandard =
                    Number.isFinite(
                      Number(
                        company.expectedStandard
                      )
                    )
                      ? Number(
                          company.expectedStandard
                        )
                      : 0;

                  return (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() =>
                        handleSelectCompany(
                          company.id
                        )
                      }
                      aria-pressed={isSelected}
                      style={{
                        textAlign: "left",
                        border: isSelected
                          ? "2px solid #4f46e5"
                          : "1px solid #e5e7eb",
                        borderRadius: "20px",
                        padding: "26px",
                        background: isSelected
                          ? "#eef2ff"
                          : "#ffffff",
                        boxShadow: isSelected
                          ? "0 12px 30px rgba(79,70,229,0.15)"
                          : "0 8px 24px rgba(15,23,42,0.06)",
                        cursor: "pointer",
                        transition:
                          "all 0.2s ease",
                        minHeight: "300px",
                      }}
                    >
                      {/* ==================================================
                          CARD HEADER
                      ================================================== */}

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "space-between",
                          marginBottom: "20px",
                        }}
                      >
                        <div
                          style={{
                            width: "54px",
                            height: "54px",
                            borderRadius: "16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent:
                              "center",
                            background: "#111827",
                            color: "#ffffff",
                            fontSize: "22px",
                            fontWeight: 800,
                          }}
                        >
                          {companyIcons[
                            company.id
                          ] || "C"}
                        </div>

                        {isSelected && (
                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              background:
                                "#4f46e5",
                              color: "#ffffff",
                              display: "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              fontWeight: 800,
                            }}
                          >
                            ✓
                          </div>
                        )}
                      </div>

                      {/* ==================================================
                          COMPANY NAME
                      ================================================== */}

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <h2
                          style={{
                            margin: 0,
                            color: "#111827",
                            fontSize: "22px",
                            fontWeight: 800,
                          }}
                        >
                          {company.name}
                        </h2>

                        <span
                          style={{
                            padding: "4px 9px",
                            borderRadius: "999px",
                            background: "#f3f4f6",
                            color: "#4b5563",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          {company.type}
                        </span>
                      </div>

                      {/* ==================================================
                          DESCRIPTION
                      ================================================== */}

                      <p
                        style={{
                          color: "#6b7280",
                          fontSize: "14px",
                          lineHeight: 1.6,
                          minHeight: "68px",
                          margin: "0 0 16px",
                        }}
                      >
                        {company.description ||
                          companyDescriptions[
                            company.id
                          ] ||
                          "Company-specific interview simulation."}
                      </p>

                      {/* ==================================================
                          FOCUS AREAS
                      ================================================== */}

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "7px",
                          marginBottom: "18px",
                        }}
                      >
                        {focusAreas
                          .slice(0, 4)
                          .map((area) => (
                            <span
                              key={area}
                              style={{
                                padding:
                                  "5px 9px",
                                borderRadius:
                                  "8px",
                                background:
                                  "#f8fafc",
                                border:
                                  "1px solid #e5e7eb",
                                color:
                                  "#374151",
                                fontSize:
                                  "11px",
                                fontWeight:
                                  600,
                              }}
                            >
                              {area}
                            </span>
                          ))}
                      </div>

                      {/* ==================================================
                          INTERVIEW STYLE
                      ================================================== */}

                      {company.interviewStyle && (
                        <div
                          style={{
                            marginBottom: "18px",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            background: "#f9fafb",
                            color: "#4b5563",
                            fontSize: "12px",
                            lineHeight: 1.5,
                          }}
                        >
                          <strong>
                            Interview style:
                          </strong>{" "}
                          {company.interviewStyle}
                        </div>
                      )}

                      {/* ==================================================
                          EXPECTED STANDARD
                      ================================================== */}

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "center",
                          paddingTop: "15px",
                          borderTop:
                            "1px solid #e5e7eb",
                        }}
                      >
                        <span
                          style={{
                            color: "#6b7280",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          Expected Standard
                        </span>

                        <strong
                          style={{
                            color: "#111827",
                            fontSize: "17px",
                          }}
                        >
                          {expectedStandard}/100
                        </strong>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ======================================================
                  CONTINUE SECTION
              ====================================================== */}

              <div
                style={{
                  marginTop: "34px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "18px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    color: "#6b7280",
                    fontSize: "14px",
                  }}
                >
                  {selectedCompanyData
                    ? `Selected: ${selectedCompanyData.name}`
                    : "Select a company to continue"}
                </span>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={
                    !selectedCompany ||
                    startingInterview
                  }
                  style={{
                    border: "none",
                    borderRadius: "12px",
                    padding:
                      "13px 26px",
                    background:
                      selectedCompany &&
                      !startingInterview
                        ? "#4f46e5"
                        : "#d1d5db",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 800,
                    cursor:
                      selectedCompany &&
                      !startingInterview
                        ? "pointer"
                        : "not-allowed",
                    boxShadow:
                      selectedCompany &&
                      !startingInterview
                        ? "0 8px 20px rgba(79,70,229,0.25)"
                        : "none",
                  }}
                >
                  {startingInterview
                    ? "Opening Interview..."
                    : "Continue to Interview →"}
                </button>
              </div>
            </>
          )}
      </div>
    </main>
  );
}