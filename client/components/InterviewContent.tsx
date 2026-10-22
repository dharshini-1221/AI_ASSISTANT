"use client";

import ChatContainer from "@/components/ChatContainer";
import { InputBox } from "@/components/InputBox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import { useRouter, useSearchParams } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface FinalReport {
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  progression?: string;
  recommendation?: string;

  // Task 3 - Company Recruiter fields
  companySummary?: string;
  companyStrengths?: string[];
  companyWeaknesses?: string[];
  companyRecommendation?: string;
  companyStandardResult?: string;
}

interface CompanyProfile {
  name?: string;
  type?: string;
  expectedStandard?: number;
  interviewStyle?: string;
  focusAreas?: string[];
  difficultyRange?: {
    min: number;
    max: number;
  };
}

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const DEFAULT_TOTAL_QUESTIONS = 5;

// ─────────────────────────────────────────────────────────────
// Domain Emojis
// ─────────────────────────────────────────────────────────────

const domainEmoji: Record<string, string> = {
  JavaScript: "🟨",
  "JavaScript/Node.js": "🟨",
  React: "⚛️",
  Python: "🐍",
  "Data Science": "📊",
  DevOps: "⚙️",
  "System Design": "🏗️",
  "Database Design": "🗄️",
  General: "🎯",
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

const InterviewContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    isLoggedIn,
    isLoading: authLoading,
  } = useAuth();

  // ─────────────────────────────────────────────────────────
  // URL Parameters
  // ─────────────────────────────────────────────────────────

  const domain =
    searchParams.get("domain") || "General";

  const companyId =
    searchParams.get("company") || "";

  const isCompanyInterview =
    Boolean(companyId);

  // ─────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────

  const [messages, setMessages] = useState<Message[]>(
    []
  );

  const [isLoading, setIsLoading] =
    useState(false);

  const [sessionId, setSessionId] =
    useState("");

  const [interviewScore, setInterviewScore] =
    useState<number | null>(null);

  const [
    isInterviewComplete,
    setIsInterviewComplete,
  ] = useState(false);

  const [
    questionsAnswered,
    setQuestionsAnswered,
  ] = useState(0);

  const [
    questionsSkipped,
    setQuestionsSkipped,
  ] = useState(0);

  const [
    repeatedAnswers,
    setRepeatedAnswers,
  ] = useState(0);

  const [
    currentDifficulty,
    setCurrentDifficulty,
  ] = useState(2);

  const [
    technicalAccuracy,
    setTechnicalAccuracy,
  ] = useState<number | null>(null);

  const [
    understanding,
    setUnderstanding,
  ] = useState<number | null>(null);

  const [
    finalReport,
    setFinalReport,
  ] = useState<FinalReport | null>(null);

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] = useState(0);

  const [
    showExitConfirm,
    setShowExitConfirm,
  ] = useState(false);

  // ─────────────────────────────────────────────────────────
  // Task 3 - Company State
  // ─────────────────────────────────────────────────────────

  const [companyName, setCompanyName] =
    useState("");

  const [companyType, setCompanyType] =
    useState("");

  const [companyExpectedStandard, setCompanyExpectedStandard] =
    useState<number | null>(null);

  const [companyProfile, setCompanyProfile] =
    useState<CompanyProfile | null>(null);

  const [
    meetsCompanyStandard,
    setMeetsCompanyStandard,
  ] = useState<boolean | null>(null);

  const [
    companyScoreGap,
    setCompanyScoreGap,
  ] = useState<number | null>(null);

  // ─────────────────────────────────────────────────────────
  // Dynamic total questions
  // ─────────────────────────────────────────────────────────

  const [
    totalQuestions,
    setTotalQuestions,
  ] = useState(DEFAULT_TOTAL_QUESTIONS);

  // ─────────────────────────────────────────────────────────
  // Prevent duplicate start request
  // ─────────────────────────────────────────────────────────

  const startedInterviewKeyRef =
    useRef<string>("");

  // ─────────────────────────────────────────────────────────
  // Reset Interview State
  // ─────────────────────────────────────────────────────────

  const resetInterviewState = useCallback(() => {
    setIsInterviewComplete(false);
    setInterviewScore(null);

    setQuestionsAnswered(0);
    setQuestionsSkipped(0);
    setRepeatedAnswers(0);

    setCurrentDifficulty(2);

    setTechnicalAccuracy(null);
    setUnderstanding(null);

    setFinalReport(null);

    setElapsedSeconds(0);

    setSessionId("");
    setMessages([]);

    setTotalQuestions(
      DEFAULT_TOTAL_QUESTIONS
    );

    // Company information
    setCompanyName("");
    setCompanyType("");
    setCompanyExpectedStandard(null);
    setCompanyProfile(null);
    setMeetsCompanyStandard(null);
    setCompanyScoreGap(null);

    setShowExitConfirm(false);
  }, []);

  // ─────────────────────────────────────────────────────────
  // Authentication
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (
      !authLoading &&
      !isLoggedIn
    ) {
      router.push("/login");
    }
  }, [
    isLoggedIn,
    authLoading,
    router,
  ]);

  // ─────────────────────────────────────────────────────────
  // Start Interview
  // ─────────────────────────────────────────────────────────

  const startInterview = useCallback(
    async (
      forceRestart = false
    ) => {
      if (!isLoggedIn) {
        return;
      }

      const interviewKey =
        `${domain}::${companyId}`;

      // Prevent duplicate request caused by
      // React StrictMode / repeated renders.
      if (
        !forceRestart &&
        startedInterviewKeyRef.current ===
          interviewKey
      ) {
        return;
      }

      if (isLoading) {
        return;
      }

      try {
        startedInterviewKeyRef.current =
          interviewKey;

        setIsLoading(true);

        resetInterviewState();

        // ─────────────────────────────────────────
        // Task 3 API Request
        // ─────────────────────────────────────────
        //
        // IMPORTANT:
        // Backend route is /api/interview/start
        // NOT /api/interviews/start
        //
        // companyId is sent only when recruiter
        // company has been selected.

        const requestBody = {
          domain,
          ...(companyId
            ? {
                companyId,
              }
            : {}),
        };

        const response =
          await axiosInstance.post(
            "/api/interviews/start",
            requestBody
          );

        const data = response?.data;

        if (!data) {
          throw new Error(
            "Empty response from interview server."
          );
        }

        // ─────────────────────────────────────────
        // Session
        // ─────────────────────────────────────────

        const receivedSessionId =
          data.sessionId || "";

        if (!receivedSessionId) {
          throw new Error(
            "Interview session ID was not returned."
          );
        }

        setSessionId(
          String(receivedSessionId)
        );

        // ─────────────────────────────────────────
        // Difficulty
        // ─────────────────────────────────────────

        if (
          typeof data.difficulty ===
          "number"
        ) {
          setCurrentDifficulty(
            data.difficulty
          );
        } else {
          setCurrentDifficulty(2);
        }

        // ─────────────────────────────────────────
        // Total Questions
        // ─────────────────────────────────────────

        if (
          typeof data.totalQuestions ===
            "number" &&
          data.totalQuestions > 0
        ) {
          setTotalQuestions(
            data.totalQuestions
          );
        } else {
          setTotalQuestions(
            DEFAULT_TOTAL_QUESTIONS
          );
        }

        // ─────────────────────────────────────────
        // Task 3 - Company Information
        // ─────────────────────────────────────────

        if (data.companyName) {
          setCompanyName(
            String(data.companyName)
          );
        } else {
          setCompanyName("");
        }

        if (data.companyType) {
          setCompanyType(
            String(data.companyType)
          );
        } else {
          setCompanyType("");
        }

        if (
          typeof data.expectedStandard ===
          "number"
        ) {
          setCompanyExpectedStandard(
            data.expectedStandard
          );
        } else {
          setCompanyExpectedStandard(null);
        }

        if (
          data.companyProfile &&
          typeof data.companyProfile ===
            "object"
        ) {
          setCompanyProfile(
            data.companyProfile
          );
        } else {
          setCompanyProfile(null);
        }

        // ─────────────────────────────────────────
        // First Question
        // ─────────────────────────────────────────

        const firstQuestion =
          typeof data.question === "string" &&
          data.question.trim()
            ? data.question.trim()
            : "Tell me about yourself.";

        setMessages([
          {
            id: `question-${Date.now()}`,
            content: firstQuestion,
            isUser: false,
            timestamp: new Date(),
          },
        ]);

        setQuestionsAnswered(0);
        setQuestionsSkipped(0);
        setRepeatedAnswers(0);
      } catch (error: any) {
        console.error(
          "startInterview error:",
          error
        );

        // Allow retry after failure
        startedInterviewKeyRef.current = "";

        setSessionId("");

        let errorMessage =
          "Unable to start the interview. Please try again.";

        if (
          error?.response?.data?.message
        ) {
          errorMessage =
            error.response.data.message;
        } else if (
          error?.message
        ) {
          errorMessage =
            error.message;
        }

        setMessages([
          {
            id: "start-error",
            content: `❌ ${errorMessage}`,
            isUser: false,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoggedIn,
      domain,
      companyId,
      isLoading,
      resetInterviewState,
    ]
  );

  // ─────────────────────────────────────────────────────────
  // Start Interview When Logged In
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (
      isLoggedIn &&
      !authLoading
    ) {
      startInterview();
    }
  }, [
    isLoggedIn,
    authLoading,
    startInterview,
  ]);

  // ─────────────────────────────────────────────────────────
  // Timer
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (
      !isLoggedIn ||
      authLoading ||
      isInterviewComplete ||
      !sessionId
    ) {
      return;
    }

    const timer = setInterval(() => {
      setElapsedSeconds(
        (seconds) => seconds + 1
      );
    }, 1000);

    return () =>
      clearInterval(timer);
  }, [
    isLoggedIn,
    authLoading,
    isInterviewComplete,
    sessionId,
  ]);

  // ─────────────────────────────────────────────────────────
  // Format Timer
  // ─────────────────────────────────────────────────────────

  const formatTime = (
    seconds: number
  ) => {
    return `${String(
      Math.floor(seconds / 60)
    ).padStart(
      2,
      "0"
    )}:${String(
      seconds % 60
    ).padStart(
      2,
      "0"
    )}`;
  };

  // ─────────────────────────────────────────────────────────
  // Safe Percentage
  // ─────────────────────────────────────────────────────────

  const safePercentage = (
    value: unknown,
    fallback = 0
  ) => {
    const numericValue =
      typeof value === "number"
        ? value
        : Number(value);

    if (
      !Number.isFinite(
        numericValue
      )
    ) {
      return fallback;
    }

    return Math.max(
      0,
      Math.min(
        100,
        numericValue
      )
    );
  };

  // ─────────────────────────────────────────────────────────
  // Submit Answer
  // ─────────────────────────────────────────────────────────

  const handleSendMessage =
    async (
      userMessage: string
    ) => {
      if (
        !userMessage.trim() ||
        !sessionId ||
        isLoading ||
        isInterviewComplete
      ) {
        return;
      }

      const cleanMessage =
        userMessage.trim();

      // ─────────────────────────────────────
      // Add user message immediately
      // ─────────────────────────────────────

      setMessages(
        (prev) => [
          ...prev,
          {
            id: `user-${Date.now()}`,
            content:
              cleanMessage,
            isUser: true,
            timestamp:
              new Date(),
          },
        ]
      );

      setIsLoading(true);

      try {
        // ─────────────────────────────────────
        // Correct Backend Endpoint
        // ─────────────────────────────────────
        //
        // /api/interview/submit-answer
        //
        // NOT
        // /api/interviews/submit-answer

        const response =
          await axiosInstance.post(
            "/api/interviews/submit-answer",
            {
              sessionId,
              answer:
                cleanMessage,
              domain,
            }
          );

        const data =
          response?.data;

        if (!data) {
          throw new Error(
            "Empty response from server."
          );
        }

        // ─────────────────────────────────────
        // Questions Answered
        // ─────────────────────────────────────

        const newCount =
          typeof data.questionsAnswered ===
          "number"
            ? data.questionsAnswered
            : questionsAnswered + 1;

        setQuestionsAnswered(
          newCount
        );

        // ─────────────────────────────────────
        // Adaptive Difficulty
        // ─────────────────────────────────────

        if (
          typeof data.difficulty ===
          "number"
        ) {
          setCurrentDifficulty(
            data.difficulty
          );
        }

        // ─────────────────────────────────────
        // Technical Accuracy
        // ─────────────────────────────────────

        if (
          typeof data.technicalAccuracy ===
          "number"
        ) {
          setTechnicalAccuracy(
            safePercentage(
              data.technicalAccuracy
            )
          );
        }

        // ─────────────────────────────────────
        // Understanding
        // ─────────────────────────────────────

        if (
          typeof data.understanding ===
          "number"
        ) {
          setUnderstanding(
            safePercentage(
              data.understanding
            )
          );
        }

        // ─────────────────────────────────────
        // Repeated Answers
        // ─────────────────────────────────────

        if (
          typeof data.repeatedAnswers ===
          "number"
        ) {
          setRepeatedAnswers(
            data.repeatedAnswers
          );
        }

        // ─────────────────────────────────────
        // AI Feedback
        // ─────────────────────────────────────

        if (
          typeof data.feedback ===
            "string" &&
          data.feedback.trim()
        ) {
          setMessages(
            (prev) => [
              ...prev,
              {
                id: `feedback-${Date.now()}`,
                content:
                  data.feedback,
                isUser: false,
                timestamp:
                  new Date(),
              },
            ]
          );
        }

        // ─────────────────────────────────────
        // Interview Complete
        // ─────────────────────────────────────

        const interviewCompleted =
          Boolean(
            data.isComplete
          ) ||
          newCount >=
            totalQuestions;

        if (
          interviewCompleted
        ) {
          const finalScore =
            typeof data.score ===
            "number"
              ? safePercentage(
                  data.score
                )
              : 0;

          setInterviewScore(
            finalScore
          );

          if (
            typeof data.technicalAccuracy ===
            "number"
          ) {
            setTechnicalAccuracy(
              safePercentage(
                data.technicalAccuracy
              )
            );
          }

          if (
            typeof data.understanding ===
            "number"
          ) {
            setUnderstanding(
              safePercentage(
                data.understanding
              )
            );
          }

          setFinalReport(
            data.finalReport ||
              null
          );

          // Task 3 final company information
          if (
            typeof data.meetsCompanyStandard ===
            "boolean"
          ) {
            setMeetsCompanyStandard(
              data.meetsCompanyStandard
            );
          }

          if (
            typeof data.companyScoreGap ===
            "number"
          ) {
            setCompanyScoreGap(
              data.companyScoreGap
            );
          }

          if (
            typeof data.companyExpectedStandard ===
            "number"
          ) {
            setCompanyExpectedStandard(
              data.companyExpectedStandard
            );
          }

          if (
            data.companyName
          ) {
            setCompanyName(
              String(
                data.companyName
              )
            );
          }

          if (
            data.companyType
          ) {
            setCompanyType(
              String(
                data.companyType
              )
            );
          }

          setIsInterviewComplete(
            true
          );

          return;
        }

        // ─────────────────────────────────────
        // Next Question
        // ─────────────────────────────────────

        if (
          typeof data.nextQuestion ===
            "string" &&
          data.nextQuestion.trim()
        ) {
          setTimeout(() => {
            setMessages(
              (prev) => [
                ...prev,
                {
                  id: `question-${Date.now()}`,
                  content:
                    data.nextQuestion,
                  isUser: false,
                  timestamp:
                    new Date(),
                },
              ]
            );
          }, 500);
        }
      } catch (error: any) {
        console.error(
          "submitAnswer error:",
          error
        );

        let errorMessage =
          "Connection error. Please try again.";

        if (
          error?.response?.data?.message
        ) {
          errorMessage =
            error.response.data.message;
        }

        setMessages(
          (prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              content: `❌ ${errorMessage}`,
              isUser: false,
              timestamp:
                new Date(),
            },
          ]
        );
      } finally {
        setIsLoading(false);
      }
    };

  // ─────────────────────────────────────────────────────────
  // Skip Question
  // ─────────────────────────────────────────────────────────

  const handleSkipQuestion =
    async () => {
      if (
        !sessionId ||
        isLoading ||
        isInterviewComplete
      ) {
        return;
      }

      setIsLoading(true);

      try {
        // Correct backend endpoint
        const response =
          await axiosInstance.post(
            "/api/interviews/skip",
            {
              sessionId,
            }
          );

        const data =
          response?.data;

        if (!data) {
          throw new Error(
            "Empty response from server."
          );
        }

        // ─────────────────────────────────────
        // Skipped Count
        // ─────────────────────────────────────

        const skippedCount =
          typeof data.questionsSkipped ===
          "number"
            ? data.questionsSkipped
            : questionsSkipped + 1;

        setQuestionsSkipped(
          skippedCount
        );

        // ─────────────────────────────────────
        // Difficulty
        // ─────────────────────────────────────

        if (
          typeof data.difficulty ===
          "number"
        ) {
          setCurrentDifficulty(
            data.difficulty
          );
        }

        // ─────────────────────────────────────
        // Show Skip Message
        // ─────────────────────────────────────

        setMessages(
          (prev) => [
            ...prev,
            {
              id: `skip-${Date.now()}`,
              content:
                "⏭️ Question skipped",
              isUser: true,
              timestamp:
                new Date(),
            },
          ]
        );

        // ─────────────────────────────────────
        // Complete After Skip
        // ─────────────────────────────────────

        if (
          data.isComplete
        ) {
          const finalScore =
            typeof data.score ===
            "number"
              ? safePercentage(
                  data.score
                )
              : 0;

          setInterviewScore(
            finalScore
          );

          if (
            typeof data.technicalAccuracy ===
            "number"
          ) {
            setTechnicalAccuracy(
              safePercentage(
                data.technicalAccuracy
              )
            );
          }

          if (
            typeof data.understanding ===
            "number"
          ) {
            setUnderstanding(
              safePercentage(
                data.understanding
              )
            );
          }

          setFinalReport(
            data.finalReport ||
              null
          );

          // Task 3 company information
          if (
            typeof data.meetsCompanyStandard ===
            "boolean"
          ) {
            setMeetsCompanyStandard(
              data.meetsCompanyStandard
            );
          }

          if (
            typeof data.companyScoreGap ===
            "number"
          ) {
            setCompanyScoreGap(
              data.companyScoreGap
            );
          }

          if (
            typeof data.companyExpectedStandard ===
            "number"
          ) {
            setCompanyExpectedStandard(
              data.companyExpectedStandard
            );
          }

          setIsInterviewComplete(
            true
          );

          return;
        }

        // ─────────────────────────────────────
        // Next Question After Skip
        // ─────────────────────────────────────

        if (
          typeof data.nextQuestion ===
            "string" &&
          data.nextQuestion.trim()
        ) {
          setTimeout(() => {
            setMessages(
              (prev) => [
                ...prev,
                {
                  id: `question-${Date.now()}`,
                  content:
                    data.nextQuestion,
                  isUser: false,
                  timestamp:
                    new Date(),
                },
              ]
            );
          }, 400);
        }
      } catch (error: any) {
        console.error(
          "skipQuestion error:",
          error
        );

        let errorMessage =
          "Unable to skip this question. Please try again.";

        if (
          error?.response?.data?.message
        ) {
          errorMessage =
            error.response.data.message;
        }

        setMessages(
          (prev) => [
            ...prev,
            {
              id: `skip-error-${Date.now()}`,
              content: `❌ ${errorMessage}`,
              isUser: false,
              timestamp:
                new Date(),
            },
          ]
        );
      } finally {
        setIsLoading(false);
      }
    };

  // ─────────────────────────────────────────────────────────
  // End Interview
  // ─────────────────────────────────────────────────────────

  const handleEndInterview =
    () => {
      router.push("/dashboard");
    };

  // ─────────────────────────────────────────────────────────
  // Loading / Authentication
  // ─────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-3xl mb-3">
            ⏳
          </div>

          <p className="text-sm text-muted-foreground">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  // ─────────────────────────────────────────────────────────
  // Score
  // ─────────────────────────────────────────────────────────

  const score =
    safePercentage(
      interviewScore ?? 0
    );

  const scoreLabel =
    score >= 80
      ? {
          text:
            "Excellent! You're interview-ready 🚀",
          color:
            "text-green-600 dark:text-green-400",
        }
      : score >= 60
        ? {
            text:
              "Good effort! A few more sessions will get you there 💪",
            color:
              "text-blue-600 dark:text-blue-400",
          }
        : {
            text:
              "Keep practicing! Every session makes you stronger 🌟",
            color:
              "text-orange-600 dark:text-orange-400",
          };

  // ─────────────────────────────────────────────────────────
  // Progress
  // ─────────────────────────────────────────────────────────

  const completedQuestions =
    questionsAnswered +
    questionsSkipped;

  const progressPercentage =
    totalQuestions > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (completedQuestions /
              totalQuestions) *
              100
          )
        )
      : 0;

  const currentQuestionNumber =
    Math.min(
      completedQuestions + 1,
      totalQuestions
    );

  // ─────────────────────────────────────────────────────────
  // Company Standard
  // ─────────────────────────────────────────────────────────

  const companyStandard =
    companyExpectedStandard ??
    companyProfile?.expectedStandard ??
    null;

  const companyGap =
    companyScoreGap !== null
      ? companyScoreGap
      : companyStandard !== null
        ? score -
          companyStandard
        : null;

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ─────────────────────────────────────────────── */}
      {/* Header */}
      {/* ─────────────────────────────────────────────── */}

      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-16 z-30">

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">

          <div className="flex items-center justify-between gap-4">

            {/* Left - Interview / Company */}

            <div className="flex items-center gap-3 min-w-0">

              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center text-xl flex-shrink-0">
                {isCompanyInterview
                  ? "🏢"
                  : domainEmoji[
                      domain
                    ] || "🎯"}
              </div>

              <div className="min-w-0">

                <div className="flex items-center gap-2 flex-wrap">

                  <h1 className="text-base font-bold text-foreground truncate">
                    {isCompanyInterview &&
                    companyName
                      ? `${companyName} Interview`
                      : `${domain} Interview`}
                  </h1>

                  {!isInterviewComplete && (
                    <span className="flex items-center gap-1 text-xs bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-medium flex-shrink-0">

                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />

                      Live
                    </span>
                  )}

                </div>

                <div className="flex items-center gap-2 flex-wrap">

                  <p className="text-xs text-muted-foreground">
                    {isCompanyInterview
                      ? "AI Company Recruiter Simulation"
                      : "AI Mock Interview Session"}
                  </p>

                  {isCompanyInterview &&
                    companyType && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        {companyType}
                      </span>
                    )}

                </div>

              </div>

            </div>

            {/* Center - Progress */}

            {!isInterviewComplete && (
              <div className="hidden sm:flex flex-col items-center gap-1.5">

                <ProgressDots
                  current={
                    completedQuestions
                  }
                  total={
                    totalQuestions
                  }
                />

                <p className="text-xs text-muted-foreground">
                  Question{" "}
                  {
                    currentQuestionNumber
                  }{" "}
                  of{" "}
                  {
                    totalQuestions
                  }
                </p>

              </div>
            )}

            {/* Right */}

            <div className="flex items-center gap-2 flex-shrink-0">

              {!isInterviewComplete && (
                <div className="hidden sm:flex items-center gap-1.5 bg-muted/50 border border-border/60 px-3 py-1.5 rounded-full">

                  <span className="text-xs text-muted-foreground">
                    ⏱
                  </span>

                  <span className="text-sm font-mono font-semibold text-foreground tabular-nums">
                    {formatTime(
                      elapsedSeconds
                    )}
                  </span>

                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  isInterviewComplete
                    ? handleEndInterview()
                    : setShowExitConfirm(
                        true
                      )
                }
                className="rounded-full text-xs border-border/60 hover:border-destructive/50 hover:text-destructive hover:bg-destructive/5 transition-colors"
              >
                {isInterviewComplete
                  ? "Go to Dashboard"
                  : "Exit"}
              </Button>

            </div>

          </div>

          {/* ───────────────────────────────────────── */}
          {/* Company Standard Mini Bar */}
          {/* ───────────────────────────────────────── */}

          {isCompanyInterview &&
            companyStandard !== null &&
            !isInterviewComplete && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">

                <span className="px-2.5 py-1 rounded-full bg-primary/5 text-primary border border-primary/10">
                  🎯 Expected Standard:{" "}
                  <strong>
                    {
                      companyStandard
                    }
                    /100
                  </strong>
                </span>

                {companyProfile?.difficultyRange && (
                  <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                    📈 Difficulty:{" "}
                    {
                      companyProfile
                        .difficultyRange
                        ?.min
                    }
                    -
                    {
                      companyProfile
                        .difficultyRange
                        ?.max
                    }
                  </span>
                )}

              </div>
            )}

          {/* ───────────────────────────────────────── */}
          {/* Mobile Progress */}
          {/* ───────────────────────────────────────── */}

          {!isInterviewComplete && (
            <div className="sm:hidden mt-3">

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">

                <span>
                  Q
                  {
                    currentQuestionNumber
                  }{" "}
                  of{" "}
                  {
                    totalQuestions
                  }
                </span>

                <span className="font-mono">
                  {formatTime(
                    elapsedSeconds
                  )}
                </span>

              </div>

              <div className="h-1.5 bg-border rounded-full overflow-hidden">

                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
                  style={{
                    width: `${progressPercentage}%`,
                  }}
                />

              </div>

            </div>
          )}

        </div>

      </div>

      {/* ─────────────────────────────────────────────── */}
      {/* Main */}
      {/* ─────────────────────────────────────────────── */}

      <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col">

        {isInterviewComplete ? (

          /* ───────────────────────────────────────── */
          /* Final Result */
          /* ───────────────────────────────────────── */

          <div className="flex-1 flex items-center justify-center p-4 md:p-8">

            <div className="w-full max-w-lg space-y-5">

              {/* Score */}

              <Card className="p-8 border border-border/60 text-center">

                <div className="text-3xl mb-3">
                  🎉
                </div>

                <h2 className="text-2xl font-black text-foreground mb-1">
                  Interview Complete!
                </h2>

                <p className="text-sm text-muted-foreground mb-8">
                  {isCompanyInterview &&
                  companyName
                    ? `Your ${companyName} recruiter simulation result`
                    : "Here's how you performed"}
                </p>

                <ScoreRing
                  score={score}
                />

                <p
                  className={`text-sm font-semibold mt-6 ${scoreLabel.color}`}
                >
                  {scoreLabel.text}
                </p>

              </Card>

              {/* ───────────────────────────────────── */}
              {/* Company Result */}
              {/* ───────────────────────────────────── */}

              {isCompanyInterview && (
                <Card className="p-6 border border-border/50">

                  <div className="flex items-center justify-between gap-3 mb-4">

                    <div>

                      <p className="text-sm font-semibold text-foreground">
                        🏢 Company Recruiter Result
                      </p>

                      <p className="text-xs text-muted-foreground mt-1">
                        {companyName ||
                          "Selected Company"}
                        {companyType
                          ? ` • ${companyType}`
                          : ""}
                      </p>

                    </div>

                    {meetsCompanyStandard !==
                      null && (
                      <span
                        className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                          meetsCompanyStandard
                            ? "bg-green-500/10 text-green-600 border border-green-500/20"
                            : "bg-orange-500/10 text-orange-600 border border-orange-500/20"
                        }`}
                      >
                        {meetsCompanyStandard
                          ? "Standard Met"
                          : "Below Standard"}
                      </span>
                    )}

                  </div>

                  <div className="grid grid-cols-2 gap-3">

                    <div className="rounded-xl bg-muted/40 border border-border/50 p-4">

                      <p className="text-xs text-muted-foreground">
                        Your Score
                      </p>

                      <p className="text-xl font-black text-foreground mt-1">
                        {score}/100
                      </p>

                    </div>

                    <div className="rounded-xl bg-muted/40 border border-border/50 p-4">

                      <p className="text-xs text-muted-foreground">
                        Expected Standard
                      </p>

                      <p className="text-xl font-black text-foreground mt-1">
                        {companyStandard !==
                        null
                          ? `${companyStandard}/100`
                          : "N/A"}
                      </p>

                    </div>

                  </div>

                  {companyGap !== null && (
                    <div className="mt-4 rounded-xl border border-border/50 p-4">

                      <div className="flex items-center justify-between gap-3">

                        <span className="text-xs text-muted-foreground">
                          Score Gap
                        </span>

                        <span className="text-sm font-bold text-foreground">
                          {companyGap >=
                          0
                            ? `+${companyGap}`
                            : companyGap}
                        </span>

                      </div>

                    </div>
                  )}

                </Card>
              )}

              {/* ───────────────────────────────────── */}
              {/* Stats */}
              {/* ───────────────────────────────────── */}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                {[
                  {
                    label:
                      "Answered",
                    value:
                      questionsAnswered,
                    icon: "✅",
                  },
                  {
                    label:
                      "Skipped",
                    value:
                      questionsSkipped,
                    icon: "⏭️",
                  },
                  {
                    label:
                      "Difficulty",
                    value: `${currentDifficulty}/5`,
                    icon: "📈",
                  },
                  {
                    label:
                      "Duration",
                    value:
                      formatTime(
                        elapsedSeconds
                      ),
                    icon: "⏱",
                  },
                ].map(
                  (
                    stat,
                    index
                  ) => (
                    <Card
                      key={index}
                      className="p-4 text-center border border-border/50"
                    >

                      <div className="text-lg mb-1">
                        {
                          stat.icon
                        }
                      </div>

                      <p className="text-base font-bold text-foreground">
                        {
                          stat.value
                        }
                      </p>

                      <p className="text-xs text-muted-foreground mt-0.5">
                        {
                          stat.label
                        }
                      </p>

                    </Card>
                  )
                )}

              </div>

              {/* ───────────────────────────────────── */}
              {/* Performance Breakdown */}
              {/* ───────────────────────────────────── */}

              <Card className="p-6 border border-border/50">

                <p className="text-sm font-semibold text-foreground mb-4">
                  Performance Breakdown
                </p>

                {[
                  {
                    label:
                      "Technical Accuracy",
                    pct:
                      technicalAccuracy ??
                      score,
                  },
                  {
                    label:
                      "Technical Understanding",
                    pct:
                      understanding ??
                      score,
                  },
                ].map(
                  (
                    bar,
                    index
                  ) => {

                    const percentage =
                      safePercentage(
                        bar.pct,
                        score
                      );

                    return (
                      <div
                        key={
                          index
                        }
                        className="mb-3 last:mb-0"
                      >

                        <div className="flex justify-between text-xs mb-1">

                          <span className="text-muted-foreground">
                            {
                              bar.label
                            }
                          </span>

                          <span className="font-semibold text-foreground">
                            {
                              percentage
                            }%
                          </span>

                        </div>

                        <div className="h-1.5 bg-border rounded-full overflow-hidden">

                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />

                        </div>

                      </div>
                    );
                  }
                )}

              </Card>

              {/* ───────────────────────────────────── */}
              {/* Company Final Summary */}
              {/* ───────────────────────────────────── */}

              {isCompanyInterview &&
                finalReport?.companySummary && (
                  <Card className="p-6 border border-border/50">

                    <p className="text-sm font-semibold text-foreground mb-3">
                      🏢 Company Recruiter Summary
                    </p>

                    <p className="text-sm text-muted-foreground leading-6">
                      {
                        finalReport.companySummary
                      }
                    </p>

                  </Card>
                )}

              {/* ───────────────────────────────────── */}
              {/* Company Strengths */}
              {/* ───────────────────────────────────── */}

              {isCompanyInterview &&
                finalReport?.companyStrengths &&
                finalReport
                  .companyStrengths
                  .length > 0 && (
                  <Card className="p-6 border border-border/50">

                    <p className="text-sm font-semibold text-foreground mb-3">
                      💪 Company-Specific Strengths
                    </p>

                    <ul className="space-y-2">

                      {finalReport.companyStrengths.map(
                        (
                          strength,
                          index
                        ) => (
                          <li
                            key={
                              index
                            }
                            className="text-sm text-muted-foreground flex gap-2"
                          >

                            <span>
                              ✓
                            </span>

                            <span>
                              {
                                strength
                              }
                            </span>

                          </li>
                        )
                      )}

                    </ul>

                  </Card>
                )}

              {/* ───────────────────────────────────── */}
              {/* Company Weaknesses */}
              {/* ───────────────────────────────────── */}

              {isCompanyInterview &&
                finalReport?.companyWeaknesses &&
                finalReport
                  .companyWeaknesses
                  .length > 0 && (
                  <Card className="p-6 border border-border/50">

                    <p className="text-sm font-semibold text-foreground mb-3">
                      🎯 Company-Specific Areas to Improve
                    </p>

                    <ul className="space-y-2">

                      {finalReport.companyWeaknesses.map(
                        (
                          weakness,
                          index
                        ) => (
                          <li
                            key={
                              index
                            }
                            className="text-sm text-muted-foreground flex gap-2"
                          >

                            <span>
                              •
                            </span>

                            <span>
                              {
                                weakness
                              }
                            </span>

                          </li>
                        )
                      )}

                    </ul>

                  </Card>
                )}

              {/* ───────────────────────────────────── */}
              {/* Company Recommendation */}
              {/* ───────────────────────────────────── */}

              {isCompanyInterview &&
                finalReport?.companyRecommendation && (
                  <Card className="p-6 border border-border/50">

                    <p className="text-sm font-semibold text-foreground mb-3">
                      🏢 Recruiter Feedback
                    </p>

                    <p className="text-sm text-muted-foreground leading-6">
                      {
                        finalReport.companyRecommendation
                      }
                    </p>

                  </Card>
                )}

              {/* ───────────────────────────────────── */}
              {/* Company Standard Result */}
              {/* ───────────────────────────────────── */}

              {isCompanyInterview &&
                finalReport?.companyStandardResult && (
                  <Card className="p-6 border border-primary/20 bg-primary/5">

                    <p className="text-sm font-semibold text-foreground mb-3">
                      🎯 Company Standard Analysis
                    </p>

                    <p className="text-sm text-muted-foreground leading-6">
                      {
                        finalReport.companyStandardResult
                      }
                    </p>

                  </Card>
                )}

              {/* ───────────────────────────────────── */}
              {/* Adaptive Progression */}
              {/* ───────────────────────────────────── */}

              {finalReport?.progression && (
                <Card className="p-6 border border-border/50">

                  <p className="text-sm font-semibold text-foreground mb-3">
                    📈 Adaptive Progression
                  </p>

                  <p className="text-sm text-muted-foreground leading-6">
                    {
                      finalReport.progression
                    }
                  </p>

                </Card>
              )}

              {/* ───────────────────────────────────── */}
              {/* Strengths */}
              {/* ───────────────────────────────────── */}

              {finalReport?.strengths &&
                finalReport.strengths
                  .length > 0 && (
                  <Card className="p-6 border border-border/50">

                    <p className="text-sm font-semibold text-foreground mb-3">
                      💪 Strengths
                    </p>

                    <ul className="space-y-2">

                      {finalReport.strengths.map(
                        (
                          strength,
                          index
                        ) => (
                          <li
                            key={
                              index
                            }
                            className="text-sm text-muted-foreground flex gap-2"
                          >

                            <span>
                              ✓
                            </span>

                            <span>
                              {
                                strength
                              }
                            </span>

                          </li>
                        )
                      )}

                    </ul>

                  </Card>
                )}

              {/* ───────────────────────────────────── */}
              {/* Weaknesses */}
              {/* ───────────────────────────────────── */}

              {finalReport?.weaknesses &&
                finalReport.weaknesses
                  .length > 0 && (
                  <Card className="p-6 border border-border/50">

                    <p className="text-sm font-semibold text-foreground mb-3">
                      🎯 Areas to Improve
                    </p>

                    <ul className="space-y-2">

                      {finalReport.weaknesses.map(
                        (
                          weakness,
                          index
                        ) => (
                          <li
                            key={
                              index
                            }
                            className="text-sm text-muted-foreground flex gap-2"
                          >

                            <span>
                              •
                            </span>

                            <span>
                              {
                                weakness
                              }
                            </span>

                          </li>
                        )
                      )}

                    </ul>

                  </Card>
                )}

              {/* ───────────────────────────────────── */}
              {/* Recommendation */}
              {/* ───────────────────────────────────── */}

              {finalReport?.recommendation && (
                <Card className="p-6 border border-border/50">

                  <p className="text-sm font-semibold text-foreground mb-3">
                    📝 Recommendation
                  </p>

                  <p className="text-sm text-muted-foreground leading-6">
                    {
                      finalReport.recommendation
                    }
                  </p>

                </Card>
              )}

              {/* ───────────────────────────────────── */}
              {/* Summary */}
              {/* ───────────────────────────────────── */}

              {finalReport?.summary && (
                <Card className="p-6 border border-border/50">

                  <p className="text-sm font-semibold text-foreground mb-3">
                    📋 Interview Summary
                  </p>

                  <p className="text-sm text-muted-foreground leading-6">
                    {
                      finalReport.summary
                    }
                  </p>

                </Card>
              )}

              {/* ───────────────────────────────────── */}
              {/* Repeated Answers */}
              {/* ───────────────────────────────────── */}

              {repeatedAnswers > 0 && (
                <Card className="p-4 border border-yellow-500/30 bg-yellow-500/5">

                  <p className="text-sm text-muted-foreground text-center">

                    ⚠️ Repeated answers detected:{" "}

                    <span className="font-semibold text-foreground">
                      {
                        repeatedAnswers
                      }
                    </span>

                  </p>

                </Card>
              )}

              {/* ───────────────────────────────────── */}
              {/* Actions */}
              {/* ───────────────────────────────────── */}

              <div className="grid grid-cols-2 gap-3">

                <Button
                  variant="outline"
                  disabled={
                    isLoading
                  }
                  onClick={() => {
                    startedInterviewKeyRef.current =
                      "";

                    startInterview(
                      true
                    );
                  }}
                  className="rounded-full border-border/60"
                >
                  🔄 Try Again
                </Button>

                <Button
                  onClick={
                    handleEndInterview
                  }
                  className="rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold"
                >
                  Dashboard →
                </Button>

              </div>

            </div>

          </div>

        ) : (

          /* ───────────────────────────────────────── */
          /* Interview Chat */
          /* ───────────────────────────────────────── */

          <>

            <ChatContainer
              messages={
                messages
              }
              isLoading={
                isLoading
              }
            />

            <div className="border-t border-border/50 bg-background">

              <div className="max-w-4xl mx-auto px-4 pt-2">

                <p className="text-xs text-muted-foreground text-center">

                  💡 Tip: Be specific
                  and use examples
                  from your experience
                  for stronger answers

                </p>

              </div>

              <InputBox
                onSend={
                  handleSendMessage
                }
                onSkip={
                  handleSkipQuestion
                }
                disabled={
                  isLoading ||
                  isInterviewComplete ||
                  !sessionId
                }
              />

            </div>

          </>
        )}

      </div>

      {/* ─────────────────────────────────────────────── */}
      {/* Exit Confirmation */}
      {/* ─────────────────────────────────────────────── */}

      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <Card className="w-full max-w-sm p-6">

            <h3 className="text-lg font-bold text-foreground mb-2">
              Exit Interview?
            </h3>

            <p className="text-sm text-muted-foreground mb-6">
              Your current interview
              progress will not be
              continued if you exit.
            </p>

            <div className="flex gap-3">

              <Button
                variant="outline"
                className="flex-1"
                onClick={() =>
                  setShowExitConfirm(
                    false
                  )
                }
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                className="flex-1"
                onClick={
                  handleEndInterview
                }
              >
                Exit
              </Button>

            </div>

          </Card>

        </div>
      )}

    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Score Ring
// ─────────────────────────────────────────────────────────────

function ScoreRing({
  score,
}: {
  score: number;
}) {
  const radius = 54;

  const circumference =
    2 * Math.PI * radius;

  const safeScore =
    Math.max(
      0,
      Math.min(
        100,
        Number.isFinite(
          score
        )
          ? score
          : 0
      )
    );

  const offset =
    circumference -
    (safeScore / 100) *
      circumference;

  const color =
    safeScore >= 80
      ? "#22c55e"
      : safeScore >= 60
        ? "#3b82f6"
        : "#f97316";

  return (
    <div className="relative w-40 h-40 mx-auto">

      <svg
        className="w-full h-full -rotate-90"
        viewBox="0 0 120 120"
      >

        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-border"
        />

        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={
            circumference
          }
          strokeDashoffset={
            offset
          }
          style={{
            transition:
              "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
          }}
        />

      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">

        <span className="text-4xl font-black text-foreground">
          {Math.round(
            safeScore
          )}
        </span>

        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
          Score
        </span>

      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Progress Dots
// ─────────────────────────────────────────────────────────────

function ProgressDots({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const safeTotal =
    Math.max(
      1,
      total
    );

  const safeCurrent =
    Math.max(
      0,
      Math.min(
        current,
        safeTotal
      )
    );

  return (
    <div className="flex items-center gap-2">

      {Array.from({
        length: safeTotal,
      }).map(
        (_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-500 ${
              index <
              safeCurrent
                ? "bg-gradient-to-r from-primary to-accent w-6"
                : index ===
                    safeCurrent
                  ? "bg-primary/40 w-4 animate-pulse"
                  : "bg-border w-2"
            }`}
          />
        )
      )}

    </div>
  );
}

export default InterviewContent;