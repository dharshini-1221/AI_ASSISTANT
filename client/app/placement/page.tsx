"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CandidateType = "Fresher" | "Internship Seeker" | "Experienced";

interface Recommendation {
  technologies: string[];
  projects: string[];
  certifications: string[];
  interviewTopics: string[];
}

interface HistoryItem {
  candidateType: CandidateType;
  resumeScore: number;
  interviewScore: number;
  communicationScore: number;
  skillScore: number;
  overallScore: number;
  category: string;
  createdAt: string;
}

interface Readiness {
  candidateType: CandidateType;
  resumeScore: number;
  interviewScore: number;
  communicationScore: number;
  skillScore: number;
  overallScore: number;
  category: string;
  weakTechnicalAreas: string[];
  communicationGaps: string[];
  missingIndustrySkills: string[];
  recommendations: Recommendation;
  history: HistoryItem[];
  scoreWeights?: { resume: number; interview: number; communication: number; skills: number };
  categoryRules?: { placementReady: number; highPotential: number };
}

const types: { value: CandidateType; icon: string; title: string; text: string }[] = [
  { value: "Fresher", icon: "🎓", title: "Fresher", text: "Building fundamentals and your first placement portfolio." },
  { value: "Internship Seeker", icon: "🚀", title: "Internship Seeker", text: "Preparing for internships and practical project work." },
  { value: "Experienced", icon: "💼", title: "Experienced", text: "Targeting stronger roles, architecture and impact." },
];

const categoryMeta: Record<string, { icon: string; className: string }> = {
  "Placement Ready": { icon: "🟢", className: "text-green-600 border-green-500/30 bg-green-500/5" },
  "High Potential Candidate": { icon: "🔵", className: "text-blue-600 border-blue-500/30 bg-blue-500/5" },
  "Needs Improvement": { icon: "🟡", className: "text-amber-600 border-amber-500/30 bg-amber-500/5" },
};

function ScoreCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <Card className="p-4 border border-border/50">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <span>{icon}</span>
      </div>
      <p className="text-2xl font-black text-foreground mt-2">{value}%</p>
      <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </Card>
  );
}

function ListCard({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  return (
    <Card className="p-5 border border-border/50">
      <h3 className="text-sm font-bold text-foreground mb-3">{icon} {title}</h3>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={`${item}-${i}`} className="text-xs text-muted-foreground flex gap-2 leading-relaxed">
              <span className="text-primary font-bold">•</span><span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No gaps detected yet.</p>
      )}
    </Card>
  );
}

export default function PlacementReadinessPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [candidateType, setCandidateType] = useState<CandidateType>("Fresher");
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [skillName, setSkillName] = useState("");
  const [skillScore, setSkillScore] = useState("70");
  const [loading, setLoading] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [skillMessage, setSkillMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push("/login");
  }, [authLoading, isLoggedIn, router]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axiosInstance.get("/api/placement/readiness", { timeout: 60000 });
      setReadiness(data.readiness);
      setCandidateType(data.readiness?.candidateType || "Fresher");
      setHistory(data.readiness?.history || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || (err?.code === "ECONNABORTED" ? "Readiness calculation timed out. Please make sure the server is running and try again." : "Unable to calculate readiness."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) load();
  }, [isLoggedIn]);

  const changeCandidateType = async (value: CandidateType) => {
    setCandidateType(value);
    setSavingType(true);
    setError("");
    try {
      await axiosInstance.patch("/api/placement/candidate-type", { candidateType: value });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not update candidate type.");
    } finally {
      setSavingType(false);
    }
  };

  const addSkill = async () => {
    const score = Number(skillScore);
    if (!skillName.trim() || !Number.isFinite(score) || score < 0 || score > 100) {
      setSkillMessage("Enter a skill name and a score from 0 to 100.");
      return;
    }
    try {
      await axiosInstance.post("/api/skills", { skillName: skillName.trim(), score });
      setSkillName("");
      setSkillMessage("Skill assessment saved. Recalculating readiness…");
      await load();
      setSkillMessage("Skill assessment saved and readiness updated.");
    } catch (err: any) {
      setSkillMessage(err?.response?.data?.message || "Could not save skill assessment.");
    }
  };

  if (authLoading || !isLoggedIn) return null;

  const meta = readiness ? categoryMeta[readiness.category] || categoryMeta["Needs Improvement"] : null;
  const trend = history.length >= 2
    ? history[history.length - 1].overallScore - history[history.length - 2].overallScore
    : null;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-7">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <button onClick={() => router.push("/dashboard")} className="text-xs text-primary font-semibold mb-3 hover:underline">← Back to Dashboard</button>
            <p className="text-sm text-muted-foreground font-medium">🤖 AI-powered career assessment</p>
            <h1 className="text-3xl md:text-4xl font-black text-foreground mt-1">Placement Readiness Engine</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">Resume + interview + skill assessment data are combined into one explainable readiness score. Your roadmap changes as your performance improves.</p>
          </div>
          <Button onClick={load} disabled={loading} className="rounded-full">{loading ? "Recalculating…" : "↻ Recalculate"}</Button>
        </header>

        {error && <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 text-xs text-destructive">⚠️ {error}</div>}

        <Card className="p-5 border border-border/50">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-foreground">Candidate Profile</h2>
              <p className="text-xs text-muted-foreground mt-1">Recommendations are tailored to this career stage.</p>
            </div>
            {savingType && <span className="text-xs text-muted-foreground">Saving…</span>}
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {types.map((t) => (
              <button key={t.value} onClick={() => changeCandidateType(t.value)} className={`text-left p-4 rounded-xl border transition-all ${candidateType === t.value ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/60 hover:border-primary/40"}`}>
                <div className="text-xl">{t.icon}</div>
                <p className="text-sm font-bold text-foreground mt-2">{t.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.text}</p>
              </button>
            ))}
          </div>
        </Card>

        {readiness && (
          <>
            <section className="grid lg:grid-cols-3 gap-4">
              <Card className="p-6 lg:col-span-1 border border-primary/20 bg-primary/[0.03]">
                <p className="text-xs font-bold text-muted-foreground">OVERALL READINESS</p>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-5xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{readiness.overallScore}</span>
                  <span className="text-sm text-muted-foreground mb-2">/ 100</span>
                </div>
                {meta && <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold mt-3 ${meta.className}`}>{meta.icon} {readiness.category}</div>}
                {trend !== null && <p className={`text-xs font-semibold mt-3 ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>{trend >= 0 ? "↗" : "↘"} {Math.abs(trend)} points since the previous readiness snapshot</p>}
              </Card>
              <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                <ScoreCard label="Resume" value={readiness.resumeScore} icon="📄" />
                <ScoreCard label="Interview" value={readiness.interviewScore} icon="🎤" />
                <ScoreCard label="Communication" value={readiness.communicationScore} icon="🗣️" />
                <ScoreCard label="Skills" value={readiness.skillScore} icon="🛠️" />
              </div>
            </section>

            <section className="grid md:grid-cols-3 gap-4">
              <ListCard title="Weak Technical Areas" icon="⚠️" items={readiness.weakTechnicalAreas} />
              <ListCard title="Communication Gaps" icon="🗣️" items={readiness.communicationGaps} />
              <ListCard title="Missing Industry Skills" icon="🏭" items={readiness.missingIndustrySkills} />
            </section>

            <section>
              <div className="flex items-end justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-bold text-primary">PERSONALIZED ROADMAP</p>
                  <h2 className="text-2xl font-black text-foreground">What to improve next</h2>
                </div>
                <span className="text-xs text-muted-foreground">{candidateType} plan</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <ListCard title="Technologies" icon="💻" items={readiness.recommendations?.technologies || []} />
                <ListCard title="Projects" icon="🧩" items={readiness.recommendations?.projects || []} />
                <ListCard title="Certifications" icon="🏅" items={readiness.recommendations?.certifications || []} />
                <ListCard title="Interview Topics" icon="🎯" items={readiness.recommendations?.interviewTopics || []} />
              </div>
            </section>

            <Card className="p-5 border border-border/50">
              <h2 className="text-sm font-bold text-foreground mb-2">📐 Explainable Scoring Rules</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Current formula: Resume {readiness.scoreWeights?.resume ?? 25}% + Interview {readiness.scoreWeights?.interview ?? 35}% + Communication {readiness.scoreWeights?.communication ?? 20}% + Skills {readiness.scoreWeights?.skills ?? 20}%.
                Placement Ready ≥ {readiness.categoryRules?.placementReady ?? 80}; High Potential Candidate ≥ {readiness.categoryRules?.highPotential ?? 60}; otherwise Needs Improvement.
              </p>
            </Card>

            <Card className="p-5 border border-border/50">
              <h2 className="text-sm font-bold text-foreground mb-4">🧪 Add Skill Assessment</h2>
              <div className="grid md:grid-cols-[1fr_140px_auto] gap-3">
                <input value={skillName} onChange={(e) => setSkillName(e.target.value)} placeholder="e.g. Java, SQL, Python" className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={skillScore} onChange={(e) => setSkillScore(e.target.value)} type="number" min="0" max="100" className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                <Button onClick={addSkill}>Save Assessment</Button>
              </div>
              {skillMessage && <p className="text-xs text-muted-foreground mt-2">{skillMessage}</p>}
            </Card>

            <Card className="p-5 border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-foreground">📈 Readiness History</h2>
                  <p className="text-xs text-muted-foreground mt-1">Snapshots are stored only when the measured state changes.</p>
                </div>
                <span className="text-xs text-muted-foreground">{history.length} snapshots</span>
              </div>
              {history.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border/50 text-muted-foreground">
                      <th className="text-left py-2 pr-3">Date</th><th className="text-left py-2">Type</th><th className="text-left py-2">Overall</th><th className="text-left py-2">Interview</th><th className="text-left py-2">Skills</th><th className="text-left py-2">Category</th>
                    </tr></thead>
                    <tbody>{[...history].reverse().map((h, i) => (
                      <tr key={`${h.createdAt}-${i}`} className="border-b border-border/30">
                        <td className="py-2 pr-3">{new Date(h.createdAt).toLocaleString()}</td>
                        <td>{h.candidateType}</td><td className="font-bold">{h.overallScore}%</td><td>{h.interviewScore}%</td><td>{h.skillScore}%</td><td>{h.category}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <p className="text-xs text-muted-foreground">No history yet. Complete an interview or add an assessment to create progress snapshots.</p>}
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
