"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/lib/axios";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await axiosInstance.post(
          "/api/auth/verify-email",
          {
            token,
          }
        );

        setStatus("success");
        setMessage(
          response.data.message || "Email verified successfully."
        );
      } catch (error: any) {
        setStatus("error");

        setMessage(
          error?.response?.data?.message ||
            "Email verification failed."
        );
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f8fafc",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "450px",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "40px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        {status === "verifying" && (
          <>
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>
              ⏳
            </div>

            <h1
              style={{
                fontSize: "28px",
                fontWeight: "700",
                marginBottom: "12px",
              }}
            >
              Verifying Email
            </h1>

            <p style={{ color: "#64748b" }}>
              Please wait while we verify your email address...
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>
              ✅
            </div>

            <h1
              style={{
                fontSize: "28px",
                fontWeight: "700",
                color: "#16a34a",
                marginBottom: "12px",
              }}
            >
              Email Verified!
            </h1>

            <p
              style={{
                color: "#64748b",
                marginBottom: "25px",
              }}
            >
              {message}
            </p>

            <button
              onClick={() => router.push("/login")}
              style={{
                width: "100%",
                padding: "13px",
                border: "none",
                borderRadius: "8px",
                background: "#2563eb",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Go to Login
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>
              ❌
            </div>

            <h1
              style={{
                fontSize: "28px",
                fontWeight: "700",
                color: "#dc2626",
                marginBottom: "12px",
              }}
            >
              Verification Failed
            </h1>

            <p
              style={{
                color: "#64748b",
                marginBottom: "25px",
              }}
            >
              {message}
            </p>

            <button
              onClick={() => router.push("/login")}
              style={{
                width: "100%",
                padding: "13px",
                border: "none",
                borderRadius: "8px",
                background: "#2563eb",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "#f8fafc",
            padding: "20px",
          }}
        >
          <p style={{ color: "#64748b" }}>Verifying your email...</p>
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}