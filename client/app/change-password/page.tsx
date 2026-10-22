
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import axiosInstance from "@/lib/axios";
import { clearAuth } from "@/lib/auth";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    const isStrongPassword =
      newPassword.length >= 8 &&
      /[A-Z]/.test(newPassword) &&
      /[a-z]/.test(newPassword) &&
      /[0-9]/.test(newPassword) &&
      /[^A-Za-z0-9]/.test(newPassword);

    if (!isStrongPassword) {
      setError(
        "Use at least 8 characters, including uppercase, lowercase, a number, and a special character."
      );
      return;
    }

    if (currentPassword === newPassword) {
      setError("Your new password must differ from your current password.");
      return;
    }

    try {
      setLoading(true);

      const response = await axiosInstance.patch(
        "/api/auth/change-password",
        {
          currentPassword,
          newPassword,
        }
      );

      setMessage(
        response.data?.message ||
          "Password changed successfully. Please log in again."
      );

      // The backend revokes active sessions after a password change.
      // Clear the old local session before navigating to login.
      window.setTimeout(() => {
        clearAuth();
        router.replace("/login");
      }, 1200);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<{ message?: string }>;

        setError(
          axiosError.response?.data?.message ||
            (axiosError.response
              ? "Unable to change the password. Please check your details."
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

          <h1 className="text-3xl font-bold">
            Change Password
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Update your password to keep your account secure.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="currentPassword"
              className="mb-2 block text-sm font-semibold"
            >
              Current password
            </label>

            <input
              id="currentPassword"
              type={showPasswords ? "text" : "password"}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="mb-2 block text-sm font-semibold"
            >
              New password
            </label>

            <input
              id="newPassword"
              type={showPasswords ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-semibold"
            >
              Confirm new password
            </label>

            <input
              id="confirmPassword"
              type={showPasswords ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="Confirm new password"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(event) => setShowPasswords(event.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            Show passwords
          </label>

          <p className="text-xs leading-5 text-slate-500">
            Use at least 8 characters, with uppercase and lowercase letters,
            a number, and a special character.
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Updating Password..." : "Change Password"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Go Back
          </button>
        </form>
      </section>
    </main>
  );
}
