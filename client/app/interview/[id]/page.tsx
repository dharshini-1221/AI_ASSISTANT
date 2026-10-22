"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

interface Question {
  question: string;
  answer: string;
  score: number;
  communicationScore: number;
  technicalAccuracy: number;
  understanding: number;
  feedback: string;
  skipped: boolean;
}

interface Interview {
  domain: string;
  score: number;
  communicationScore: number;
  duration: number;
  questionsAnswered: number;
  questionsSkipped: number;
  createdAt: string;
  finalReport?: { strengths?: string[]; weaknesses?: string[]; summary?: string };
  questions?: Question[];
}

export default function InterviewDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { isLoggedIn, isLoading } = useAuth();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.push("/login");
  }, [isLoading, isLoggedIn, router]);

  useEffect(() => {
    if (!isLoggedIn || !params?.id) return;
    axiosInstance.get(`/api/interviews/${params.id}`)
      .then(({ data }) => setInterview(data.interview))
      .catch((err) => setError(err?.response?.data?.message || "Unable to load interview."));
  }, [isLoggedIn, params?.id]);

  if (isLoading || !isLoggedIn) return null;

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => router.push("/history")} className="text-sm text-primary font-semibold mb-6">← Back to My Sessions</button>
        {error && <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-sm text-destructive">{error}</div>}
        {!interview && !error && <p className="text-sm text-muted-foreground">Loading interview…</p>}
        {interview && (
          <>
            <div className="rounded-2xl border border-border/60 bg-card p-6 mb-6">
              <p className="text-xs font-bold text-primary uppercase">Interview Report</p>
              <h1 className="text-3xl font-black text-foreground mt-1">{interview.domain}</h1>
              <p className="text-xs text-muted-foreground mt-2">{new Date(interview.createdAt).toLocaleString()} · {interview.duration} min</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                <Metric label="Overall" value={`${interview.score}%`} />
                <Metric label="Communication" value={`${interview.communicationScore ?? 0}%`} />
                <Metric label="Answered" value={String(interview.questionsAnswered ?? 0)} />
                <Metric label="Skipped" value={String(interview.questionsSkipped ?? 0)} />
              </div>
            </div>
            <div className="space-y-4">
              {(interview.questions || []).map((q, index) => (
                <div key={`${index}-${q.question}`} className="rounded-2xl border border-border/60 bg-card p-5">
                  <p className="text-xs font-bold text-primary">QUESTION {index + 1}</p>
                  <h2 className="font-bold text-foreground mt-2">{q.question}</h2>
                  <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{q.answer || "Skipped"}</p>
                  <div className="flex flex-wrap gap-2 mt-4 text-xs">
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">Score {q.score}%</span>
                    <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">Communication {q.communicationScore ?? 0}%</span>
                    <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">Technical {q.technicalAccuracy ?? 0}%</span>
                    <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">Understanding {q.understanding ?? 0}%</span>
                  </div>
                  {q.feedback && <p className="text-xs text-muted-foreground mt-4 leading-relaxed">💡 {q.feedback}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border/50 p-4"><p className="text-[11px] text-muted-foreground font-semibold">{label}</p><p className="text-xl font-black text-foreground mt-1">{value}</p></div>;
}
