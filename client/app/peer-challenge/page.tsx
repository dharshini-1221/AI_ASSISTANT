"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

interface Question {
  _id?: string;
  question: string;
  expectedAnswer?: string;
  category?: string;
  domain?: string;
  difficulty?: number;
}

interface Challenge {
  _id: string;
  title: string;
  description: string;
  category: string;
  domain: string;
  difficulty: number;
  challengeType: "Daily" | "Weekly";
  questions: Question[];
  totalQuestions: number;
  xpReward: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface Attempt {
  _id: string;
  challengeId: string;
  answers: any[];
  score: number;
  accuracy: number;
  xpEarned: number;
  completed: boolean;
}

interface BadgeItem {
  name: string;
  description: string;
  icon: string;
  earnedAt?: string;
}

interface Profile {
  xp: number;
  rank: string;
  leaderboardPosition: number;
  currentStreak: number;
  longestStreak: number;
  totalAttempts: number;
  totalChallenges: number;
  completedChallenges: number;
  averageScore: number;
  bestScore: number;
  badges: BadgeItem[];
}

interface LeaderboardUser {
  position: number;
  userId: string;
  name: string;
  email?: string;
  xp: number;
  bestScore: number;
  completedChallenges: number;
  rank: string;
}

interface RankingHistoryItem {
  _id?: string;
  rank: number;
  xp: number;
  score: number;
  challengesCompleted: number;
  recordedAt?: string;
}

export default function PeerChallengePage() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [rankingHistory, setRankingHistory] = useState<
    RankingHistoryItem[]
  >([]);

  const [selectedChallenge, setSelectedChallenge] =
    useState<Challenge | null>(null);

  const [attempt, setAttempt] = useState<Attempt | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answer, setAnswer] = useState("");

  const [category, setCategory] = useState("Technical");
  const [domain, setDomain] = useState("Java");
  const [challengeType, setChallengeType] =
    useState<"Daily" | "Weekly">("Daily");
  const [difficulty, setDifficulty] = useState(2);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [result, setResult] = useState<any>(null);

  // ---------------------------------------
  // AUTH
  // ---------------------------------------

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoading, isLoggedIn, router]);

  // ---------------------------------------
  // LOAD DATA
  // ---------------------------------------

  useEffect(() => {
    if (!isLoggedIn) return;

    loadChallenges();
    loadProfile();
    loadLeaderboard();
    loadRankingHistory();
  }, [isLoggedIn]);

  const loadChallenges = async () => {
    try {
      const { data } = await axiosInstance.get("/api/challenges");

      setChallenges(data?.challenges || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to load challenges."
      );
    }
  };

  const loadProfile = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/api/challenges/profile/me"
      );

      setProfile(data?.profile || null);
    } catch (err) {
      console.error("Profile loading error:", err);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/api/challenges/leaderboard"
      );

      setLeaderboard(data?.leaderboard || []);
    } catch (err) {
      console.error("Leaderboard loading error:", err);
    }
  };

  const loadRankingHistory = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/api/challenges/ranking-history/me"
      );

      setRankingHistory(data?.history || []);
    } catch (err) {
      console.error("Ranking history loading error:", err);
    }
  };

  // ---------------------------------------
  // GENERATE CHALLENGE
  // ---------------------------------------

  const generateChallenge = async () => {
    try {
      setGenerating(true);
      setError("");
      setSuccess("");

      const { data } = await axiosInstance.post(
        "/api/challenges/generate",
        {
          category,
          domain,
          challengeType,
          difficulty,
        }
      );

      const newChallenge = data?.challenge;

      if (newChallenge) {
        setChallenges((prev) => [
          newChallenge,
          ...prev,
        ]);

        setSelectedChallenge(newChallenge);

        setSuccess(
          "New AI challenge generated successfully."
        );
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to generate challenge."
      );
    } finally {
      setGenerating(false);
    }
  };

  // ---------------------------------------
  // START CHALLENGE
  // ---------------------------------------

  const startChallenge = async (
    challenge: Challenge
  ) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setResult(null);
      setAnswer("");

      const { data } = await axiosInstance.post(
        "/api/challenges/start",
        {
          challengeId: challenge._id,
        }
      );

      setSelectedChallenge(
        data?.challenge || challenge
      );

      setAttempt(data?.attempt || null);

      const existingAnswers =
        data?.attempt?.answers?.length || 0;

      setCurrentQuestion(existingAnswers);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to start challenge."
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------
  // SUBMIT ANSWER
  // ---------------------------------------

  const submitAnswer = async (
    skipped = false
  ) => {
    if (!selectedChallenge || !attempt) return;

    const question =
      selectedChallenge.questions[currentQuestion];

    if (!question?._id) {
      setError(
        "Question ID is missing. Please generate a new challenge."
      );
      return;
    }

    if (!skipped && !answer.trim()) {
      setError(
        "Please enter an answer or skip the question."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data } = await axiosInstance.post(
        "/api/challenges/submit-answer",
        {
          attemptId: attempt._id,
          questionId: question._id,
          answer: skipped ? "" : answer,
          timeTaken: 30,
          skipped,
        }
      );

      setAttempt(data?.attempt || attempt);

      if (data?.completed) {
        setResult({
          attempt: data.attempt,
          profile: data.profile,
          evaluation: data.evaluation,
        });

        setProfile(data.profile);

        await loadLeaderboard();
        await loadRankingHistory();

        setSuccess(
          "Challenge completed successfully."
        );
      } else {
        setCurrentQuestion((prev) => prev + 1);
        setAnswer("");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to submit answer."
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------
  // RESET
  // ---------------------------------------

  const backToChallenges = () => {
    setSelectedChallenge(null);
    setAttempt(null);
    setResult(null);
    setCurrentQuestion(0);
    setAnswer("");
    setError("");
    setSuccess("");

    loadProfile();
    loadLeaderboard();
    loadRankingHistory();
    loadChallenges();
  };

  if (isLoading || !isLoggedIn) {
    return null;
  }

  // ---------------------------------------
  // RESULT SCREEN
  // ---------------------------------------

  if (result) {
    const completedAttempt = result.attempt;

    return (
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="max-w-5xl mx-auto">

          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-primary font-semibold mb-6 hover:underline"
          >
            ← Back to Dashboard
          </button>

          <div className="rounded-3xl border border-border/60 bg-card p-8 text-center shadow-sm">

            <div className="text-5xl mb-4">
              🏆
            </div>

            <p className="text-xs font-bold text-primary uppercase tracking-wider">
              Challenge Completed
            </p>

            <h1 className="text-3xl md:text-4xl font-black text-foreground mt-2">
              Great Job!
            </h1>

            <p className="text-sm text-muted-foreground mt-2">
              You completed the{" "}
              {selectedChallenge?.title}.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">

              <StatCard
                label="Score"
                value={`${completedAttempt?.score ?? 0}%`}
              />

              <StatCard
                label="Accuracy"
                value={`${completedAttempt?.accuracy ?? 0}%`}
              />

              <StatCard
                label="XP Earned"
                value={`+${completedAttempt?.xpEarned ?? 0}`}
              />

              <StatCard
                label="Rank"
                value={result.profile?.rank || "Novice"}
              />

            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">

              <StatCard
                label="Current Streak"
                value={`${result.profile?.currentStreak ?? 0} days`}
              />

              <StatCard
                label="Best Score"
                value={`${result.profile?.bestScore ?? 0}%`}
              />

              <StatCard
                label="Leaderboard"
                value={`#${result.profile?.leaderboardPosition || 0}`}
              />

            </div>

            <button
              onClick={backToChallenges}
              className="mt-8 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              Back to Challenges
            </button>

          </div>
        </div>
      </main>
    );
  }

  // ---------------------------------------
  // ACTIVE QUESTION SCREEN
  // ---------------------------------------

  if (
    selectedChallenge &&
    attempt &&
    currentQuestion <
      selectedChallenge.questions.length
  ) {
    const question =
      selectedChallenge.questions[currentQuestion];

    const progress =
      ((currentQuestion + 1) /
        selectedChallenge.questions.length) *
      100;

    return (
      <main className="min-h-screen bg-background px-4 py-10">

        <div className="max-w-4xl mx-auto">

          <button
            onClick={backToChallenges}
            className="text-sm text-primary font-semibold mb-6 hover:underline"
          >
            ← Back to Challenges
          </button>

          <div className="rounded-3xl border border-border/60 bg-card p-6 md:p-8 shadow-sm">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider">
                  {selectedChallenge.category}
                </p>

                <h1 className="text-2xl font-black text-foreground mt-1">
                  {selectedChallenge.title}
                </h1>
              </div>

              <div className="text-sm font-bold text-muted-foreground">
                Question {currentQuestion + 1} /{" "}
                {selectedChallenge.questions.length}
              </div>

            </div>

            <div className="w-full h-2 bg-muted rounded-full mt-6 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <div className="mt-8">

              <p className="text-xs font-bold text-primary">
                QUESTION {currentQuestion + 1}
              </p>

              <h2 className="text-xl md:text-2xl font-black text-foreground mt-3 leading-relaxed">
                {question.question}
              </h2>

              <textarea
                value={answer}
                onChange={(e) =>
                  setAnswer(e.target.value)
                }
                placeholder="Type your answer here..."
                className="w-full min-h-48 mt-6 rounded-2xl border border-border/60 bg-background p-4 text-sm text-foreground outline-none focus:border-primary resize-none"
              />

              {error && (
                <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-6">

                <button
                  onClick={() =>
                    submitAnswer(false)
                  }
                  disabled={loading}
                  className="flex-1 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 hover:opacity-90"
                >
                  {loading
                    ? "Evaluating..."
                    : "Submit Answer →"}
                </button>

                <button
                  onClick={() =>
                    submitAnswer(true)
                  }
                  disabled={loading}
                  className="rounded-xl border border-border px-5 py-3 text-sm font-bold text-foreground disabled:opacity-50 hover:bg-muted"
                >
                  Skip
                </button>

              </div>

            </div>

          </div>

        </div>
      </main>
    );
  }

  // ---------------------------------------
  // MAIN PAGE
  // ---------------------------------------

  return (
    <main className="min-h-screen bg-background px-4 py-10">

      <div className="max-w-7xl mx-auto">

        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-primary font-semibold mb-6 hover:underline"
        >
          ← Back to Dashboard
        </button>

        {/* HERO */}

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">

          <div>

            <p className="text-xs font-bold text-primary uppercase tracking-[0.2em]">
              Peer Challenge Arena
            </p>

            <h1 className="text-3xl md:text-4xl font-black text-foreground mt-1">
              🎯 Challenge Arena
            </h1>

            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Compete with AI-generated challenges, earn XP,
              build streaks and climb the leaderboard.
            </p>

          </div>

          <div className="grid grid-cols-3 gap-2">

            <MiniStat
              label="XP"
              value={profile?.xp ?? 0}
            />

            <MiniStat
              label="Streak"
              value={`${profile?.currentStreak ?? 0}🔥`}
            />

            <MiniStat
              label="Rank"
              value={profile?.rank || "Novice"}
            />

          </div>

        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
            {success}
          </div>
        )}

        {/* GENERATOR */}

        <section className="mt-8 rounded-3xl border border-border/60 bg-card p-6 shadow-sm">

          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-wider">
              AI Challenge Generator
            </p>

            <h2 className="text-xl font-black text-foreground mt-1">
              Generate New Challenge
            </h2>

            <p className="text-sm text-muted-foreground mt-1">
              Let AI create a personalized interview challenge.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">

            <SelectField
              label="Category"
              value={category}
              onChange={setCategory}
              options={[
                "Technical",
                "HR",
                "Aptitude",
                "Domain-Specific",
              ]}
            />

            <div>
              <label className="text-xs font-bold text-muted-foreground">
                Domain
              </label>

              <input
                value={domain}
                onChange={(e) =>
                  setDomain(e.target.value)
                }
                className="w-full mt-2 rounded-xl border border-border/60 bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-primary"
                placeholder="Java"
              />
            </div>

            <SelectField
              label="Challenge Type"
              value={challengeType}
              onChange={(value) =>
                setChallengeType(
                  value as "Daily" | "Weekly"
                )
              }
              options={[
                "Daily",
                "Weekly",
              ]}
            />

            <SelectField
              label="Difficulty"
              value={String(difficulty)}
              onChange={(value) =>
                setDifficulty(Number(value))
              }
              options={[
                "1",
                "2",
                "3",
                "4",
                "5",
              ]}
            />

          </div>

          <button
            onClick={generateChallenge}
            disabled={generating}
            className="mt-5 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 hover:opacity-90"
          >
            {generating
              ? "Generating with AI..."
              : "✨ Generate Challenge"}
          </button>

        </section>

        {/* PROFILE */}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">

          <StatCard
            label="Completed"
            value={
              profile?.completedChallenges ?? 0
            }
          />

          <StatCard
            label="Average Score"
            value={`${profile?.averageScore ?? 0}%`}
          />

          <StatCard
            label="Best Score"
            value={`${profile?.bestScore ?? 0}%`}
          />

          <StatCard
            label="Longest Streak"
            value={`${profile?.longestStreak ?? 0} days`}
          />

        </section>

        {/* CHALLENGES + LEADERBOARD */}

        <div className="grid lg:grid-cols-[1fr_340px] gap-6 mt-8">

          {/* CHALLENGES */}

          <section>

            <div className="flex items-center justify-between mb-4">

              <div>
                <h2 className="text-xl font-black text-foreground">
                  Active Challenges
                </h2>

                <p className="text-sm text-muted-foreground">
                  Choose a challenge and start competing.
                </p>
              </div>

            </div>

            {challenges.length === 0 ? (

              <div className="rounded-2xl border border-dashed border-border p-10 text-center">

                <div className="text-4xl">
                  🎯
                </div>

                <p className="font-bold text-foreground mt-3">
                  No active challenges
                </p>

                <p className="text-sm text-muted-foreground mt-1">
                  Generate your first AI challenge above.
                </p>

              </div>

            ) : (

              <div className="grid md:grid-cols-2 gap-4">

                {challenges.map((challenge) => (

                  <div
                    key={challenge._id}
                    className="rounded-2xl border border-border/60 bg-card p-5 hover:border-primary hover:shadow-md transition-all"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <span className="inline-block rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                          {challenge.category}
                        </span>

                        <h3 className="font-black text-foreground mt-3">
                          {challenge.title}
                        </h3>

                        <p className="text-xs text-muted-foreground mt-2">
                          {challenge.description}
                        </p>

                      </div>

                      <span className="text-2xl">
                        {challenge.challengeType ===
                        "Weekly"
                          ? "📅"
                          : "⚡"}
                      </span>

                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">

                      <Badge>
                        {challenge.domain}
                      </Badge>

                      <Badge>
                        Difficulty{" "}
                        {challenge.difficulty}/5
                      </Badge>

                      <Badge>
                        {challenge.totalQuestions} Questions
                      </Badge>

                      <Badge>
                        +{challenge.xpReward} XP
                      </Badge>

                    </div>

                    <button
                      onClick={() =>
                        startChallenge(challenge)
                      }
                      disabled={loading}
                      className="w-full mt-5 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 hover:opacity-90"
                    >
                      {loading
                        ? "Starting..."
                        : "Start Challenge →"}
                    </button>

                  </div>

                ))}

              </div>

            )}

          </section>

          {/* LEADERBOARD */}

          <aside>

            <div className="rounded-2xl border border-border/60 bg-card p-5 sticky top-6">

              <p className="text-xs font-bold text-primary uppercase tracking-wider">
                Peer Rankings
              </p>

              <h2 className="text-xl font-black text-foreground mt-1">
                🏆 Leaderboard
              </h2>

              <div className="mt-5 space-y-3">

                {leaderboard.length === 0 ? (

                  <p className="text-sm text-muted-foreground">
                    No leaderboard data yet.
                  </p>

                ) : (

                  leaderboard
                    .slice(0, 10)
                    .map((user) => (

                      <div
                        key={`${user.userId}-${user.position}`}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                          String(
                            user.userId
                          ) ===
                          String(
                            profile?.leaderboardPosition
                          )
                            ? "border-primary/30 bg-primary/5"
                            : "border-border/50"
                        }`}
                      >

                        <div className="w-8 text-center font-black text-primary">
                          #{user.position}
                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="text-sm font-bold text-foreground truncate">
                            {user.name || "User"}
                          </p>

                          <p className="text-[11px] text-muted-foreground">
                            {user.xp} XP ·{" "}
                            {user.completedChallenges} completed
                          </p>

                        </div>

                        <span className="text-xs font-bold text-primary">
                          {user.rank}
                        </span>

                      </div>

                    ))

                )}

              </div>

              <div className="mt-5 rounded-xl bg-primary/5 border border-primary/10 p-4">

                <p className="text-xs text-muted-foreground">
                  Your Position
                </p>

                <p className="text-2xl font-black text-primary mt-1">
                  #{profile?.leaderboardPosition || 0}
                </p>

              </div>

            </div>

          </aside>

        </div>

        {/* --------------------------------------- */}
        {/* ACHIEVEMENT BADGES */}
        {/* --------------------------------------- */}

        <section className="mt-8 rounded-3xl border border-border/60 bg-card p-6 shadow-sm">

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">

            <div>

              <p className="text-xs font-bold text-primary uppercase tracking-wider">
                Achievements
              </p>

              <h2 className="text-xl font-black text-foreground mt-1">
                🏅 Achievement Badges
              </h2>

              <p className="text-sm text-muted-foreground mt-1">
                Earn badges by completing challenges and
                maintaining your performance.
              </p>

            </div>

            <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-2">
              <span className="text-xs text-muted-foreground">
                Unlocked
              </span>
              <span className="ml-2 text-sm font-black text-primary">
                {profile?.badges?.length || 0}
              </span>
            </div>

          </div>

          {profile?.badges?.length ? (

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">

              {profile.badges.map(
                (badge, index) => (

                  <div
                    key={`${badge.name}-${index}`}
                    className="group rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center hover:border-primary/40 hover:-translate-y-1 transition-all"
                  >

                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-background border border-primary/10 text-3xl shadow-sm">
                      {badge.icon || "🏅"}
                    </div>

                    <h3 className="text-sm font-black text-foreground mt-4">
                      {badge.name}
                    </h3>

                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                      {badge.description}
                    </p>

                    {badge.earnedAt && (
                      <p className="text-[10px] text-primary font-semibold mt-3">
                        Earned{" "}
                        {new Date(
                          badge.earnedAt
                        ).toLocaleDateString()}
                      </p>
                    )}

                  </div>

                )
              )}

            </div>

          ) : (

            <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">

              <div className="text-4xl">
                🏅
              </div>

              <p className="font-bold text-foreground mt-3">
                No badges earned yet
              </p>

              <p className="text-sm text-muted-foreground mt-1">
                Complete your first challenge to unlock
                your first badge.
              </p>

            </div>

          )}

        </section>

        {/* --------------------------------------- */}
        {/* RANKING HISTORY */}
        {/* --------------------------------------- */}

        <section className="mt-6 rounded-3xl border border-border/60 bg-card p-6 shadow-sm">

          <div>

            <p className="text-xs font-bold text-primary uppercase tracking-wider">
              Performance Timeline
            </p>

            <h2 className="text-xl font-black text-foreground mt-1">
              📈 Ranking History
            </h2>

            <p className="text-sm text-muted-foreground mt-1">
              Track how your rank, XP and challenge performance
              change over time.
            </p>

          </div>

          {rankingHistory.length > 0 ? (

            <div className="mt-6 overflow-x-auto">

              <table className="w-full text-left">

                <thead>

                  <tr className="border-b border-border/60">

                    <th className="px-4 py-3 text-xs font-bold text-muted-foreground">
                      Date
                    </th>

                    <th className="px-4 py-3 text-xs font-bold text-muted-foreground">
                      Rank
                    </th>

                    <th className="px-4 py-3 text-xs font-bold text-muted-foreground">
                      XP
                    </th>

                    <th className="px-4 py-3 text-xs font-bold text-muted-foreground">
                      Score
                    </th>

                    <th className="px-4 py-3 text-xs font-bold text-muted-foreground">
                      Completed
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {rankingHistory.map(
                    (history, index) => (

                      <tr
                        key={
                          history._id ||
                          `history-${index}`
                        }
                        className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                      >

                        <td className="px-4 py-4 text-sm text-foreground font-medium">

                          {history.recordedAt
                            ? new Date(
                                history.recordedAt
                              ).toLocaleDateString(
                                undefined,
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "—"}

                        </td>

                        <td className="px-4 py-4">

                          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                            #{history.rank}
                          </span>

                        </td>

                        <td className="px-4 py-4 text-sm font-bold text-foreground">
                          {history.xp} XP
                        </td>

                        <td className="px-4 py-4">

                          <span className="text-sm font-black text-foreground">
                            {history.score}%
                          </span>

                        </td>

                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          {history.challengesCompleted}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          ) : (

            <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">

              <div className="text-4xl">
                📈
              </div>

              <p className="font-bold text-foreground mt-3">
                No ranking history yet
              </p>

              <p className="text-sm text-muted-foreground mt-1">
                Complete a challenge to start building your
                ranking history.
              </p>

            </div>

          )}

        </section>

        {/* --------------------------------------- */}
        {/* FOOTER SUMMARY */}
        {/* --------------------------------------- */}

        <section className="mt-6 rounded-3xl border border-primary/10 bg-primary/5 p-6">

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">

            <SummaryItem
              icon="⚡"
              label="Total XP"
              value={`${profile?.xp ?? 0}`}
            />

            <SummaryItem
              icon="🔥"
              label="Current Streak"
              value={`${profile?.currentStreak ?? 0} days`}
            />

            <SummaryItem
              icon="🏅"
              label="Badges"
              value={`${profile?.badges?.length ?? 0}`}
            />

            <SummaryItem
              icon="🏆"
              label="Current Rank"
              value={profile?.rank || "Novice"}
            />

          </div>

        </section>

      </div>

    </main>
  );
}

// ---------------------------------------
// STAT CARD
// ---------------------------------------

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/20 transition-all">

      <p className="text-xs font-semibold text-muted-foreground">
        {label}
      </p>

      <p className="text-2xl font-black text-foreground mt-1">
        {value}
      </p>

    </div>
  );
}

// ---------------------------------------
// MINI STAT
// ---------------------------------------

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3 text-center">

      <p className="text-[10px] font-bold text-muted-foreground">
        {label}
      </p>

      <p className="text-sm font-black text-foreground mt-1">
        {value}
      </p>

    </div>
  );
}

// ---------------------------------------
// BADGE
// ---------------------------------------

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
      {children}
    </span>
  );
}

// ---------------------------------------
// SELECT FIELD
// ---------------------------------------

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>

      <label className="text-xs font-bold text-muted-foreground">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full mt-2 rounded-xl border border-border/60 bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-primary"
      >

        {options.map((option) => (

          <option
            key={option}
            value={option}
          >
            {option}
          </option>

        ))}

      </select>

    </div>
  );
}

// ---------------------------------------
// SUMMARY ITEM
// ---------------------------------------

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3">

      <div className="h-11 w-11 shrink-0 rounded-xl bg-background border border-primary/10 flex items-center justify-center text-xl">
        {icon}
      </div>

      <div>

        <p className="text-xs text-muted-foreground">
          {label}
        </p>

        <p className="text-sm font-black text-foreground">
          {value}
        </p>

      </div>

    </div>
  );
}