
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

interface LoginRecord {
  _id: string;
  status: "success" | "failed" | "blocked";
  ipAddress: string | null;
  userAgent: string | null;
  device: string;
  failureReason: string | null;
  createdAt: string;
}

export default function SecurityHistoryPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  const [history, setHistory] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    if (authLoading || !isLoggedIn) return;

    let cancelled = false;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError("");

        const { data } = await axiosInstance.get(
          "/api/auth/login-history"
        );

        if (!cancelled) {
          setHistory(data.history || []);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            typeof err === "object" &&
            err !== null &&
            "response" in err
              ? (
                  err as {
                    response?: {
                      data?: { message?: string };
                    };
                  }
                ).response?.data?.message
              : undefined;

          setError(message || "Unable to load login history.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isLoggedIn]);

  if (authLoading || !isLoggedIn) return null;

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mb-6 text-sm font-semibold text-primary"
        >
          ← Back to Dashboard
        </button>

        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            Account Security
          </p>

          <h1 className="mt-2 text-3xl font-black text-foreground md:text-4xl">
            🔐 Login History
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Review your recent successful and failed login attempts.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {error}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ml-2 font-bold underline"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-border/60 p-6 text-sm text-muted-foreground">
            Loading login history...
          </div>
        ) : !error && history.length === 0 ? (
          <div className="rounded-2xl border border-border/60 p-8 text-center">
            <p className="text-3xl">🛡️</p>
            <h2 className="mt-3 font-bold text-foreground">
              No login history found
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              New login attempts will appear here when recorded.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((record) => (
              <article
                key={record._id}
                className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      record.status === "success"
                        ? "bg-green-100 text-green-800"
                        : record.status === "blocked"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {record.status}
                  </span>

                  <time className="text-xs text-muted-foreground sm:text-sm">
                    {new Date(record.createdAt).toLocaleString()}
                  </time>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      IP Address
                    </p>
                    <p className="mt-1 break-all text-sm text-foreground">
                      {record.ipAddress || "Unavailable"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Device / Browser
                    </p>
                    <p className="mt-1 break-words text-sm text-foreground">
                      {record.userAgent || record.device || "Unknown"}
                    </p>
                  </div>
                </div>

                {record.failureReason && (
                  <p className="mt-3 text-sm text-red-600">
                    Reason: {record.failureReason}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
