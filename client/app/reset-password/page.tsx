
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios, { AxiosError } from "axios";
import axiosInstance from "@/lib/axios";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!token || token === "YOUR_TOKEN") {
      setError("Invalid reset link. Please request a new reset link.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const strongPassword =
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password);

    if (!strongPassword) {
      setError(
        "Use at least 8 characters with uppercase, lowercase, a number, and a special character."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await axiosInstance.post(
        "/api/auth/reset-password",
        { token, password }
      );

      setSuccess(true);
      setMessage(
        response.data?.message || "Password reset successfully."
      );
      setPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<{ message?: string }>;

        setError(
          axiosError.response?.data?.message ||
            (axiosError.response
              ? "Reset link is invalid or expired. Request a new link."
              : "Cannot connect to the server. Make sure the backend is running.")
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-7 text-center">
          <div className="mb-4 text-5xl" aria-hidden="true">
            🔐
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Reset Password
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Choose a strong new password for your account.
          </p>
        </div>

        {!token && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            Reset token is missing. Please request a new reset link.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              New password
            </label>

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Confirm new password
            </label>

            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            Show password
          </label>

          <p className="text-xs leading-5 text-slate-500">
            Minimum 8 characters, including an uppercase letter, a lowercase
            letter, a number, and a special character.
          </p>

          {message && (
            <div
              role="status"
              className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
            >
              {message}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          {!success ? (
            <button
              type="submit"
              disabled={loading || !token || token === "YOUR_TOKEN"}
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Updating Password..." : "Reset Password"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Go to Login
            </button>
          )}
        </form>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-700">
          Loading reset page...
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
