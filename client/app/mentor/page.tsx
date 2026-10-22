
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

interface Interview {
  _id: string;
  userId?: { name?: string; email?: string } | null;
  domain?: string;
  score?: number;
  mentorReview?: {
    feedback?: string;
    rating?: number | null;
  };
}

export default function MentorPage() {
  const { user, isLoading, isLoggedIn, logout } = useAuth();
  const router = useRouter();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadingInterviews, setLoadingInterviews] = useState(true);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [rating, setRating] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    if (isLoading) return;

    if (!isLoggedIn || user?.role !== "Mentor") {
      router.replace("/dashboard");
      return;
    }

    let active = true;

    axiosInstance
      .get("/api/mentor/interviews")
      .then(({ data }) => {
        if (active) setInterviews(data.interviews ?? []);
      })
      .catch((err) => {
        if (active) {
          setError(
            err?.response?.data?.message ||
              "Unable to load interviews. Please check mentor access.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingInterviews(false);
      });

    return () => {
      active = false;
    };
  }, [isLoading, isLoggedIn, user, router]);

  async function submitReview(item: Interview) {
    const reviewText = (
      feedback[item._id] ?? item.mentorReview?.feedback ?? ""
    ).trim();

    const reviewRating =
      rating[item._id] ?? item.mentorReview?.rating ?? 5;

    if (!reviewText) {
      setError("Please enter feedback before saving the review.");
      setSuccess("");
      return;
    }

    setError("");
    setSuccess("");
    setSavingId(item._id);

    try {
      const { data } = await axiosInstance.patch(
        `/api/mentor/interviews/${item._id}/review`,
        { feedback: reviewText, rating: reviewRating },
      );

      setInterviews((previous) =>
        previous.map((interview) =>
          interview._id === item._id
            ? {
                ...interview,
                mentorReview: {
                  feedback: reviewText,
                  rating: reviewRating,
                },
              }
            : interview,
        ),
      );

      setSuccess(data.message || "Mentor review saved successfully.");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to save review. Please try again.",
      );
    } finally {
      setSavingId("");
    }
  }

  const filteredInterviews = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return interviews;

    return interviews.filter((item) =>
      [
        item.userId?.name,
        item.userId?.email,
        item.domain,
        String(item.score ?? ""),
      ].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [interviews, search]);

  if (isLoading || !isLoggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900">
        <p className="text-lg font-semibold">Checking your account...</p>
      </main>
    );
  }

  if (user?.role !== "Mentor") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900">
        <section className="rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="mt-2 text-slate-600">
            Mentor permission is required to access this page.
          </p>
          <button
            onClick={() => router.replace("/dashboard")}
            className="mt-5 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-700"
          >
            Go to Dashboard
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-violet-700">
              MockInterview AI
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Mentor Dashboard
            </h1>
            <p className="mt-2 text-slate-600">
              Review student performance and provide constructive feedback.
            </p>
          </div>

          <button
            onClick={() => void logout()}
            className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white shadow-sm hover:bg-red-700"
          >
            Logout
          </button>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Completed Interviews
            </p>
            <p className="mt-2 text-4xl font-extrabold text-slate-900">
              {interviews.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Reviewed Interviews
            </p>
            <p className="mt-2 text-4xl font-extrabold text-violet-700">
              {interviews.filter((item) => item.mentorReview?.feedback).length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Pending Reviews
            </p>
            <p className="mt-2 text-4xl font-extrabold text-amber-600">
              {interviews.filter((item) => !item.mentorReview?.feedback).length}
            </p>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 font-semibold text-green-800"
          >
            {success}
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="interview-search"
            className="mb-2 block text-sm font-bold text-slate-800"
          >
            Search Interviews
          </label>
          <input
            id="interview-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by student name, email, topic, or score..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          />
          <p className="mt-2 text-sm text-slate-500">
            Showing {filteredInterviews.length} of {interviews.length} interviews
          </p>
        </section>

        {loadingInterviews ? (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-600 shadow-sm">
            Loading completed interviews...
          </div>
        ) : filteredInterviews.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              No Interviews Found
            </h2>
            <p className="mt-2 text-slate-600">
              Try another search or check again after interviews are completed.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredInterviews.map((item, index) => {
              const currentFeedback =
                feedback[item._id] ?? item.mentorReview?.feedback ?? "";

              const currentRating =
                rating[item._id] ?? item.mentorReview?.rating ?? 5;

              const isReviewed = Boolean(item.mentorReview?.feedback);

              return (
                <article
                  key={item._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-7"
                >
                  <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-violet-700">
                        Interview #{index + 1}
                      </p>
                      <h2 className="mt-2 text-xl font-extrabold text-slate-900 sm:text-2xl">
                        {item.userId?.name ?? "Student"}
                      </h2>
                      <p className="mt-1 break-all text-sm text-slate-600">
                        {item.userId?.email ?? "Email unavailable"}
                      </p>
                      <p className="mt-3 inline-flex rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">
                        {item.domain ?? "General Interview"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 text-center">
                        <p className="text-xs font-bold uppercase text-blue-700">
                          Score
                        </p>
                        <p className="mt-1 text-3xl font-extrabold text-blue-900">
                          {item.score ?? "—"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-2 text-xs font-bold ${
                          isReviewed
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isReviewed ? "Reviewed" : "Pending"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-5">
                    <label
                      htmlFor={`feedback-${item._id}`}
                      className="block text-sm font-bold text-slate-800"
                    >
                      Mentor Feedback
                    </label>
                    <textarea
                      id={`feedback-${item._id}`}
                      value={currentFeedback}
                      onChange={(event) =>
                        setFeedback((old) => ({
                          ...old,
                          [item._id]: event.target.value,
                        }))
                      }
                      maxLength={2000}
                      rows={4}
                      placeholder="Enter specific strengths, improvement areas, and recommendations..."
                      className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white p-4 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                    />

                    <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <label
                          htmlFor={`rating-${item._id}`}
                          className="block text-sm font-bold text-slate-800"
                        >
                          Performance Rating
                        </label>
                        <select
                          id={`rating-${item._id}`}
                          value={currentRating}
                          onChange={(event) =>
                            setRating((old) => ({
                              ...old,
                              [item._id]: Number(event.target.value),
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 sm:w-48"
                        >
                          {[1, 2, 3, 4, 5].map((number) => (
                            <option key={number} value={number}>
                              {number} / 5
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => void submitReview(item)}
                        disabled={savingId === item._id}
                        className="rounded-xl bg-violet-700 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingId === item._id
                          ? "Saving Review..."
                          : isReviewed
                            ? "Update Review"
                            : "Save Review"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer className="mt-8 pb-4 text-center text-sm text-slate-500">
          MockInterview AI · Mentor Review Panel
        </footer>
      </div>
    </main>
  );
}
