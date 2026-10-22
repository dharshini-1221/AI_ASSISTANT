"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const domains = [
  ["JavaScript/Node.js", "🟨", "JavaScript, Node.js, async programming"],
  ["React", "⚛️", "Hooks, state, components, performance"],
  ["Python", "🐍", "Python, OOP, data structures"],
  ["Data Science", "📊", "ML, pandas, statistics"],
  ["DevOps", "⚙️", "CI/CD, Docker, Kubernetes"],
  ["System Design", "🏗️", "Architecture and scalability"],
  ["Database Design", "🗄️", "SQL, NoSQL, indexing"],
  ["General", "🎯", "Fundamentals and professional questions"],
];

export default function PracticePage() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.push("/login");
  }, [isLoading, isLoggedIn, router]);

  if (isLoading || !isLoggedIn) return null;

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => router.push("/dashboard")} className="text-sm text-primary font-semibold mb-6">← Back to Dashboard</button>
        <h1 className="text-3xl md:text-4xl font-black text-foreground">🎯 Start Practice</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-8">Choose a domain and start a new AI-powered mock interview.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {domains.map(([name, icon, description]) => (
            <button key={name} onClick={() => router.push(`/interview?domain=${encodeURIComponent(name)}`)} className="text-left rounded-2xl border border-border/60 bg-card p-5 hover:border-primary hover:bg-primary/5 transition-all">
              <div className="text-3xl">{icon}</div>
              <h2 className="font-bold text-foreground mt-3">{name}</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
              <span className="inline-block mt-4 text-xs font-bold text-primary">Start interview →</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
