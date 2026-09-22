"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { AuthModal } from "@/components/AuthModal";
import { ChallengeModal, QuestionItem } from "@/components/ChallengeModal";
import { useToast } from "@/components/Toast";
import { 
  Terminal, 
  Trophy, 
  Tag, 
  Award, 
  CheckCircle2, 
  Lock, 
  Clock, 
  Zap, 
  ChevronRight,
  ShieldAlert,
  Users,
  Cpu,
  Radio,
  Layers,
  Wrench,
  UserPlus
} from "lucide-react";
import Link from "next/link";

interface TeamState {
  id: number;
  name: string;
  code: string;
  score: number;
  solvedQuestionIds?: number[];
}

const HARDWARE_CATEGORIES = [
  "All",
  "Microcontrollers & Firmware",
  "Signal & Oscilloscope",
  "Bus Protocols (I2C/SPI/CAN)",
  "PCB & Reverse",
  "Side-Channel Analysis",
  "Wireless & RF",
  "IoT & Sensors",
  "Hardware Crypto",
];

export default function HomePage() {
  const { toast } = useToast();

  const [team, setTeam] = useState<TeamState | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");

  const [contestStatus, setContestStatus] = useState<string>("PENDING");
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(1800);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);

  // 1. Fetch current team session
  const fetchTeamSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/team/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setTeam(data.team);
        } else {
          setTeam(null);
        }
      }
    } catch {
      setTeam(null);
    }
  }, []);

  // 2. Fetch contest state & challenges
  const fetchContestAndQuestions = useCallback(async () => {
    try {
      // Fetch contest state
      const contestRes = await fetch("/api/contest");
      if (contestRes.ok) {
        const contestData = await contestRes.json();
        setContestStatus(contestData.status);
        setTimeRemainingSeconds(contestData.time_remaining_seconds);
      }

      // Fetch questions
      const qRes = await fetch("/api/questions");
      if (qRes.ok) {
        const qData = await qRes.json();
        setQuestions(qData.questions || []);
      }
    } catch (e) {
      console.error("Error loading challenges:", e);
    } finally {
      setLoadingQuestions(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamSession();
    fetchContestAndQuestions();

    const interval = setInterval(() => {
      fetchContestAndQuestions();
      fetchTeamSession();
    }, 3500);

    return () => clearInterval(interval);
  }, [fetchTeamSession, fetchContestAndQuestions]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/team/logout", { method: "POST" });
      setTeam(null);
      toast("Signed out of team.", "info");
      fetchContestAndQuestions();
    } catch {
      toast("Logout failed.", "error");
    }
  };

  const handleSolvedSuccess = (questionId: number, points: number, newScore: number) => {
    setTeam((prev) => (prev ? { ...prev, score: newScore } : null));
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              isSolved: true,
              solves_count: Number(q.solves_count || 0) + 1,
            }
          : q
      )
    );
    if (selectedQuestion?.id === questionId) {
      setSelectedQuestion((prev) => (prev ? { ...prev, isSolved: true } : null));
    }
  };

  // Derive active category tabs (default hardware tags + any dynamically added category)
  const dynamicCategories = Array.from(new Set(questions.map((q) => q.category)));
  const categories = Array.from(new Set(["All", ...HARDWARE_CATEGORIES.slice(1), ...dynamicCategories]));

  const filteredQuestions =
    selectedCategory === "All"
      ? questions
      : questions.filter((q) => q.category === selectedCategory);

  const totalPoints = questions.reduce((sum, q) => sum + Number(q.points), 0);
  const solvedCount = questions.filter((q) => q.isSolved).length;

  const isPending = contestStatus === "PENDING";
  const isEnded = contestStatus === "ENDED";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Navbar */}
      <Navbar
        team={team}
        onOpenAuth={(mode = "register") => {
          setAuthMode(mode);
          setAuthModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-2xl bg-card border border-border p-6 sm:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-secondary border border-border flex items-center justify-center p-1 shadow-sm shrink-0">
                  <Image
                    src="/logo.png"
                    alt="SNUC Potential Robotics Logo"
                    width={44}
                    height={44}
                    className="object-contain w-full h-full"
                    priority
                  />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-mono font-medium">
                    <Zap className="w-3 h-3" />
                    Hardware CTF & Embedded Security Challenge
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono mt-0.5">
                    REWIRED <span className="text-primary">2026</span>
                  </h1>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                30-Minute High-Intensity Hardware Capture The Flag event organized by the{" "}
                <span className="text-foreground font-semibold">SNUC Potential Robotics Club</span>.
                Deconstruct firmware, sniff CAN/I2C/SPI bus frames, extract flash dumps, probe circuit traces, and rise on the dynamic leaderboard.
              </p>
            </div>

            {/* Quick Stats Panel */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-primary" />
                  Hardware Targets
                </div>
                <div className="text-xl font-bold font-mono text-foreground mt-1">
                  {questions.length}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-primary" />
                  Points in Play
                </div>
                <div className="text-xl font-bold font-mono text-primary mt-1">
                  {totalPoints}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border col-span-2 sm:col-span-1">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-primary" />
                  Flags Captured
                </div>
                <div className="text-xl font-bold font-mono text-foreground mt-1">
                  {team ? `${solvedCount}/${questions.length}` : "Sign In"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Category Filter Tabs & Leaderboard Shortcut */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors"
            >
              <Trophy className="w-3.5 h-3.5 text-primary" />
              Live Leaderboard
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
          </div>
        </div>

        {/* Challenges Area with Pre-Contest Blur Effect or Empty State */}
        <div className="relative min-h-[360px]">
          {/* Contest Ended Banner */}
          {isEnded && (
            <div className="mb-6 p-4 rounded-xl bg-secondary border border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground">
                    Hardware CTF Concluded!
                  </div>
                  <div className="text-xs text-muted-foreground">
                    The 30-minute competition has concluded. Check out the top 3 champions on the podium.
                  </div>
                </div>
              </div>
              <Link
                href="/leaderboard"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shrink-0 shadow-sm"
              >
                View Top 3 Podium
              </Link>
            </div>
          )}

          {/* EMPTY STATE: When no questions are in the system yet */}
          {!loadingQuestions && questions.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-2xl border border-dashed border-border bg-card/60 flex flex-col items-center justify-center text-center space-y-4 max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
                <Wrench className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-bold font-mono text-foreground">
                  Hardware Arsenal Under Preparation
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  No challenge targets have been published to the testbed yet. Organizers from the{" "}
                  <span className="text-foreground font-semibold">SNUC Potential Robotics Club</span> are currently flashing microcontrollers, calibrating logic analyzers, and wiring physical test vectors.
                </p>
              </div>

              {team ? (
                <div className="p-3.5 rounded-xl bg-secondary/80 border border-border flex items-center gap-3 text-xs text-left">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-foreground">Team {team.name}</span>
                    <span className="text-muted-foreground block text-[11px]">
                      Access Code: <code className="text-primary font-mono font-bold">{team.code}</code> — Ready on standby. Targets will appear here automatically when deployed.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setAuthMode("register");
                      setAuthModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-md transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    Register Your Team in Advance
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Pre-Contest Overlay when status === 'PENDING' */}
              {isPending && (
                <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                  <div className="max-w-md w-full p-8 rounded-2xl bg-card/90 border border-border/80 shadow-2xl backdrop-blur-md text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                      <Lock className="w-7 h-7" />
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-xl font-bold tracking-tight text-foreground font-mono">
                        Hardware CTF Starts in a Few Minutes
                      </h2>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Hardware challenge payloads and firmware images are encrypted. The 30-minute countdown will begin as soon as the administrator initiates the launch signal.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-secondary/80 border border-border flex items-center justify-center gap-3 text-xs font-mono text-foreground">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                      </span>
                      <span>Awaiting Admin Launch Signal</span>
                    </div>

                    {!team ? (
                      <button
                        onClick={() => {
                          setAuthMode("register");
                          setAuthModalOpen(true);
                        }}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs py-3 rounded-xl transition-all shadow-md"
                      >
                        Register Your Team Now
                      </button>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Team <span className="font-semibold text-primary">{team.name}</span> is registered and standing by for launch.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Challenges Grid */}
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-500 ${
                  isPending ? "filter blur-md pointer-events-none select-none opacity-60" : ""
                }`}
              >
                {filteredQuestions.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => !isPending && setSelectedQuestion(q)}
                    className={`group relative rounded-2xl border bg-card p-5 transition-all cursor-pointer flex flex-col justify-between hover:border-primary/50 hover:shadow-lg ${
                      q.isSolved
                        ? "border-emerald-500/40 bg-card/60"
                        : "border-border"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-secondary text-muted-foreground border border-border flex items-center gap-1">
                          <Tag className="w-3 h-3 text-primary" />
                          {q.category}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-primary/15 text-primary border border-primary/20">
                            {q.points} PTS
                          </span>
                          {q.isSolved && (
                            <span className="p-1 rounded-full bg-emerald-500/10 text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Preview */}
                      <div>
                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {q.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed font-sans">
                          {q.description}
                        </p>
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="pt-4 mt-4 border-t border-border/70 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3 text-primary" />
                        {q.solves_count ?? 0} solves
                      </span>

                      <span className="font-semibold text-[11px] text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        {q.isSolved ? "View Solution" : "Solve Target"}
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {!loadingQuestions && filteredQuestions.length === 0 && questions.length > 0 && (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  No challenges found under the &quot;{selectedCategory}&quot; category.
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Challenge Solve Modal */}
      {selectedQuestion && (
        <ChallengeModal
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          contestStatus={contestStatus}
          isTeamLoggedIn={!!team}
          onOpenAuth={() => {
            setAuthMode("register");
            setAuthModalOpen(true);
          }}
          onSolvedSuccess={handleSolvedSuccess}
        />
      )}

      {/* Team Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(loggedTeam) => {
          setTeam(loggedTeam);
          fetchContestAndQuestions();
        }}
      />
    </div>
  );
}
