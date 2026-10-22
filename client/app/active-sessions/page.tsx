
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

interface ActiveSessionRecord {
  _id: string;
  device: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  expiresAt: string;
  createdAt: string;
}

export default function ActiveSessionsPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  const [sessions, setSessions] = useState<ActiveSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.replace("/login");
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    if (authLoading || !isLoggedIn) return;

    let cancelled = false;

    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError("");

        const { data } = await axiosInstance.get(
          "/api/auth/active-sessions"
        );

        if (!cancelled) {
          setSessions(
            Array.isArray(data.sessions) ? data.sessions : []
          );
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

          setError(message || "Unable to load active sessions.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSessions();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isLoggedIn]);

  const revokeSession = async (sessionId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to revoke this session? The selected device will lose access."
    );

    if (!confirmed) return;

    try {
      setRevokingId(sessionId);
      setError("");
      setSuccess("");

      await axiosInstance.delete(
        `/api/auth/active-sessions/${sessionId}`
      );

      setSessions((previous) =>
        previous.filter((session) => session._id !== sessionId)
      );

      setSuccess("Session revoked successfully.");
    } catch (err: unknown) {
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

      setError(message || "Unable to revoke this session.");
    } finally {
      setRevokingId(null);
    }
  };

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

        <p className="text-sm font-bold uppercase tracking-widest text-primary">
          Account Security
        </p>

        <h1 className="mt-2 text-3xl font-black text-foreground md:text-4xl">
          💻 Active Sessions
        </h1>

        <p className="mb-8 mt-2 text-sm text-muted-foreground">
          Review the devices and browsers where your account has an active
          login. Revoke sessions you no longer recognize or need.
        </p>

        {success && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-700"
          >
            {success}
          </div>
        )}

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
            Loading active sessions...
          </div>
        ) : !error && sessions.length === 0 ? (
          <div className="rounded-2xl border border-border/60 p-8 text-center">
            <p className="text-4xl">🔒</p>
            <h2 className="mt-3 font-bold text-foreground">
              No active sessions found
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your active login sessions will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <article
                key={session._id}
                className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-bold text-foreground">
                    {session.device || "Unknown device"}
                  </h2>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                    ACTIVE
                  </span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      IP Address
                    </p>
                    <p className="mt-1 break-all text-sm text-foreground">
                      {session.ipAddress || "Unavailable"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Last Activity
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {session.lastActiveAt
                        ? new Date(session.lastActiveAt).toLocaleString()
                        : "Unavailable"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Login Created
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {session.createdAt
                        ? new Date(session.createdAt).toLocaleString()
                        : "Unavailable"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Expires At
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {session.expiresAt
                        ? new Date(session.expiresAt).toLocaleString()
                        : "Unavailable"}
                    </p>
                  </div>
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-primary">
                    View browser details
                  </summary>
                  <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
                    {session.userAgent || "Browser details unavailable"}
                  </p>
                </details>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => revokeSession(session._id)}
                    disabled={revokingId !== null}
                    className="rounded-xl border border-destructive/30 px-4 py-2 text-sm font-bold text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {revokingId === session._id
                      ? "Revoking..."
                      : "Revoke Session"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
