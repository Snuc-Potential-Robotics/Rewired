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
  Coins, 
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
  UserPlus,
  Bot,
  AlertCircle,
  FileText,
  Target
} from "lucide-react";
import Link from "next/link";

interface TeamState {
  id: number;
  name: string;
  code: string;
  score: number;
  solvedQuestionIds?: number[];
}

export default function HomePage() {
  const { toast } = useToast();

  const [team, setTeam] = useState<TeamState | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");

  const [contestStatus, setContestStatus] = useState<string>("PENDING");
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(1800);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

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

  const totalCoins = questions.reduce((sum, q) => sum + Number(q.points), 0);
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
                    SNUC Potential Robotics • Hardware CTF
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono mt-0.5">
                    REWIRED <span className="text-primary">2026</span>
                  </h1>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Breach the physically isolated air-gapped server room before security changes shift.
                Sniff BLE advertisements, clone employee RFID credentials, and capture the master-slave authentication token.
              </p>
            </div>

            {/* Quick Stats Panel (Coins Focus) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  Objectives
                </div>
                <div className="text-xl font-bold font-mono text-foreground mt-1">
                  {questions.length} Phases
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-primary" />
                  Total Coins
                </div>
                <div className="text-xl font-bold font-mono text-primary mt-1">
                  {totalCoins}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border col-span-2 sm:col-span-1">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-primary" />
                  Your Coins
                </div>
                <div className="text-xl font-bold font-mono text-foreground mt-1">
                  {team ? `${team.score} Coins` : "Sign In"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MISSION DOSSIER FOR PARTICIPANTS & COMPETITION RULES */}
        <section className="rounded-2xl border-2 border-primary/30 bg-card p-6 sm:p-7 space-y-5 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

          {/* Rules Highlights Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-emerald-300 uppercase tracking-wider">
                  AI Tools Strictly Permitted
                </div>
                <div className="text-emerald-300/80 mt-0.5 leading-relaxed">
                  Participants are fully authorized to use AI tools (ChatGPT, Claude, Gemini, Copilot, etc.) for firmware analysis, code generation, and debugging.
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-primary uppercase tracking-wider">
                  Round 2 Bidding Currency
                </div>
                <div className="text-foreground/80 mt-0.5 leading-relaxed">
                  Teams earn coins through successfully solved flags. Coins earned here in Round 1 will be used as the <strong className="text-primary font-bold">bidding currency in Round 2</strong>!
                </div>
              </div>
            </div>
          </div>

          {/* Operation Briefing Content */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 text-sm font-bold font-mono text-foreground uppercase tracking-wider">
              <FileText className="w-4 h-4 text-primary" />
              Operation Briefing: Air-Gap Server Room Infiltration
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-1.5">
                <div className="font-bold text-primary uppercase tracking-wider text-[11px]">
                  📖 The Story
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  You guys have been contracted to breach a physically isolated server room. Standard attacks over this server have failed because the system is completely air-gapped. We have 45 minutes before the security changes shift.
                </p>
                <p className="text-muted-foreground leading-relaxed pt-1">
                  Your target is a lazy systems administrator who has a habit of reusing credentials and leaving equipment lying around. We believe he dropped his company-issued wireless earphones in the lobby and left his physical access card on a desk.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-1.5">
                <div className="font-bold text-primary uppercase tracking-wider text-[11px]">
                  🎯 The Mission
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Need to get access to the server room by using the username and physical access card, and compromise the system by getting the authentication key that the master system uses to access the slaves.
                </p>
                <div className="pt-2 border-t border-border/70 text-[11px] text-foreground font-mono">
                  <span className="text-primary font-bold">Hardware Kit Per Team:</span>
                  <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5">
                    <li>1x RC522 RFID Reader</li>
                    <li>1x ESP32 Microcontroller</li>
                    <li>Breadboard and jumper wires</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-1.5">
                <div className="font-bold text-primary uppercase tracking-wider text-[11px]">
                  💡 Critical Intelligence
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Additional Info:</strong> The company is giving the same username for every product the employee gets from the company.
                </p>
                <p className="text-muted-foreground leading-relaxed pt-1">
                  Every 10 minutes, technical hints will be unlocked or dispatched by administrators if teams need assistance cracking the protocols.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section Header & Leaderboard Link */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold font-mono text-foreground uppercase tracking-tight">
              Infiltration Objectives
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground font-mono">
              {questions.length} Active Targets
            </span>
          </div>

          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors shrink-0"
          >
            <Trophy className="w-3.5 h-3.5 text-primary" />
            Live Coins Leaderboard
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
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
                    Infiltration Window Concluded!
                  </div>
                  <div className="text-xs text-muted-foreground">
                    The competition has ended. Check out the top 3 teams on the podium to see final coin balances for Round 2!
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
                        CTF Commencing in a Few Minutes
                      </h2>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Hardware challenge targets and terminals are locked. The countdown will begin as soon as the administrator initiates the launch signal.
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

              {/* Challenges Grid (Clean, Without Tags) */}
              <div
                className={`grid grid-cols-1 md:grid-cols-3 gap-5 transition-all duration-500 ${
                  isPending ? "filter blur-md pointer-events-none select-none opacity-60" : ""
                }`}
              >
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    onClick={() => !isPending && setSelectedQuestion(q)}
                    className={`group relative rounded-2xl border bg-card p-6 transition-all cursor-pointer flex flex-col justify-between hover:border-primary/60 hover:shadow-xl ${
                      q.isSolved
                        ? "border-emerald-500/40 bg-card/60"
                        : "border-border"
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Card Header without tags */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-muted-foreground">
                          OBJECTIVE #{idx + 1}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-primary/15 text-primary border border-primary/30 flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" />
                            {q.points} Coins
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
                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                          {q.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-3 mt-2 leading-relaxed font-sans">
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

                      <span className="font-semibold text-xs text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        {q.isSolved ? "View Solution" : "Open Target"}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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
