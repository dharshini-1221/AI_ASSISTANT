"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

interface Interview { id: string; date: string; score: number; duration: number; topic: string; }

export default function HistoryPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();
  const [items, setItems] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.push("/login");
  }, [isLoading, isLoggedIn, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    axiosInstance.get("/api/interviews")
      .then(({ data }) => setItems(data.interviews || []))
      .catch((err) => setError(err?.response?.data?.message || "Unable to load interview history."))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  if (isLoading || !isLoggedIn) return null;

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => router.push("/dashboard")} className="text-sm text-primary font-semibold mb-6">← Back to Dashboard</button>
        <h1 className="text-3xl md:text-4xl font-black text-foreground">📊 My Sessions</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-8">Review your completed AI mock interviews and continue improving.</p>
        {error && <div className="mb-5 p-3 rounded-xl border border-destructive/20 bg-destructive/5 text-sm text-destructive">{error}</div>}
        {loading ? <p className="text-sm text-muted-foreground">Loading sessions…</p> : items.length === 0 ? <div className="rounded-2xl border border-border/60 p-8 text-center"><p className="font-bold">No completed sessions yet.</p><button onClick={() => router.push("/practice")} className="mt-4 text-sm font-bold text-primary">Start your first interview →</button></div> : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/60 bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1"><p className="font-bold text-foreground">{item.topic}</p><p className="text-xs text-muted-foreground mt-1">{new Date(item.date).toLocaleString()} · {item.duration} min</p></div>
                <div className="text-right"><p className="text-2xl font-black text-primary">{item.score}%</p><button onClick={() => router.push(`/interview/${item.id}`)} className="text-xs font-bold text-muted-foreground hover:text-primary">View details →</button></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
