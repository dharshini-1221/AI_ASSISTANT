"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/lib/axios";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailParam = searchParams.get("email") || "";
  const tokenParam = searchParams.get("token") || "";

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">(
    tokenParam ? "verifying" : "idle"
  );
  const [message, setMessage] = useState(
    tokenParam ? "Verifying your email..." : "Enter the code sent to your email."
  );
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!tokenParam) return;

    const verifyEmail = async () => {
      try {
        const response = await axiosInstance.post("/api/auth/verify-email", {
          token: tokenParam,
        });

        setStatus("success");
        setMessage(response.data.message || "Email verified successfully.");
      } catch (error: any) {
        setStatus("error");
        setMessage(
          error?.response?.data?.message || "Email verification failed."
        );
      }
    };

    verifyEmail();
  }, [tokenParam]);

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("verifying");
    setMessage("Verifying your email...");

    try {
      const response = await axiosInstance.post("/api/auth/verify-email", {
        email,
        otp: otp.trim(),
      });

      setStatus("success");
      setMessage(response.data.message || "Email verified successfully.");
    } catch (error: any) {
      setStatus("error");
      setMessage(
        error?.response?.data?.message || "Email verification failed."
      );
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await axiosInstance.post("/api/auth/resend-verification", { email });
      setMessage("A new verification code has been sent.");
      setStatus("idle");
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message || "Failed to resend code."
      );
      setStatus("error");
    } finally {
      setResending(false);
    }
  };

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
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>?</div>
            <h1
              style={{ fontSize: "28px", fontWeight: "700", marginBottom: "12px" }}
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
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>?</div>
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
            <p style={{ color: "#64748b", marginBottom: "25px" }}>{message}</p>
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

        {status === "error" && !!tokenParam && (
          <>
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>?</div>
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
            <p style={{ color: "#64748b", marginBottom: "25px" }}>{message}</p>
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

        {status !== "success" && status !== "verifying" && !tokenParam && (
          <>
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>??</div>
            <h1
              style={{ fontSize: "28px", fontWeight: "700", marginBottom: "12px" }}
            >
              Verify Your Email
            </h1>
            <p style={{ color: "#64748b", marginBottom: "25px" }}>{message}</p>
            <form onSubmit={handleOtpSubmit} style={{ textAlign: "left" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "6px",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  marginBottom: "16px",
                  fontSize: "15px",
                }}
              />
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "6px",
                }}
              >
                Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                placeholder="6-digit code"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  marginBottom: "16px",
                  fontSize: "18px",
                  letterSpacing: "4px",
                  textAlign: "center",
                }}
              />
              <button
                type="submit"
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
                  marginBottom: "12px",
                }}
              >
                Verify
              </button>
            </form>
            <button
              onClick={handleResend}
              disabled={resending || !email}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                background: "#ffffff",
                color: "#2563eb",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {resending ? "Sending..." : "Resend code"}
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
          <p style={{ color: "#64748b" }}>Loading...</p>
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
