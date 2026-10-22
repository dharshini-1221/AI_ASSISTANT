
"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import axiosInstance from "@/lib/axios";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await axiosInstance.post(
        "/api/auth/forgot-password",
        { email: normalizedEmail }
      );

      setMessage(
        response.data?.message ||
          "If an account exists, a reset link will be sent."
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        // Prefer a generic message to avoid revealing account details.
        setError(
          err.response?.data?.message ||
            "Unable to send the reset link. Please try again."
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
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-7 text-center">
          <div className="mb-4 text-5xl" aria-hidden="true">
            🔐
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Forgot Password?
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Enter your registered email address. If your account exists,
            we will send you a secure password reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-700 hover:underline"
          >
            Back to Login
          </Link>
        </p>
      </section>
    </main>
  );
}
