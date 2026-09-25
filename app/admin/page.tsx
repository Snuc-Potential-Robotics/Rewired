"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { 
  ShieldAlert, 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Edit3, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Terminal, 
  Activity, 
  LogOut, 
  Save, 
  X, 
  AlertTriangle,
  Tag,
  Key,
  Flame,
  PlusCircle,
  Coins,
  BookOpen,
  Lock,
  Cpu,
  Radio,
  FileKey
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import Link from "next/link";
import type { OrganizerGuideData } from "@/app/api/admin/guide/route";
import { formatINR } from "@/lib/utils";

interface AdminContestState {
  status: string;
  duration_seconds: number;
  time_remaining_seconds: number;
  start_time: string | null;
  end_time: string | null;
}

interface AdminQuestion {
  id: number;
  title: string;
  category: string;
  points: number;
  description: string;
  flag: string;
  hint: string | null;
  order_index: number;
  is_active: boolean;
  solves_count: number | string;
  total_attempts: number | string;
}

interface SubmissionLog {
  id: number;
  team_name: string;
  question_title: string;
  submitted_flag: string;
  is_correct: boolean;
  points_awarded: number;
  created_at: string;
}

interface TeamOverview {
  id: number;
  name: string;
  code: string;
  score: number;
  solves_count: number | string;
  created_at: string;
}

export default function AdminPage() {
  const { toast } = useToast();

  // Auth State
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState("robotics@snuchennai.edu.in");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Active Tab: 'questions' | 'guide' | 'submissions' | 'teams'
  const [activeTab, setActiveTab] = useState<"questions" | "guide" | "submissions" | "teams">("questions");

  // Contest State
  const [contest, setContest] = useState<AdminContestState | null>(null);
  const [customDurationMinutes, setCustomDurationMinutes] = useState(45);

  // Questions State
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);

  // Form State for Question Add/Edit
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Hardware");
  const [formPoints, setFormPoints] = useState(100);
  const [formDescription, setFormDescription] = useState("");
  const [formFlag, setFormFlag] = useState("");
  const [formHint, setFormHint] = useState("");
  const [formOrder, setFormOrder] = useState(1);
  const [formActive, setFormActive] = useState(true);

  // Submissions and Teams
  const [submissions, setSubmissions] = useState<SubmissionLog[]>([]);
  const [teams, setTeams] = useState<TeamOverview[]>([]);

  // Confirmation dialogs. Each destructive organiser action opens one of
  // these instead of a native window.confirm.
  const [deleteTarget, setDeleteTarget] = useState<AdminQuestion | null>(null);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetClearsScores, setResetClearsScores] = useState(false);

  // Authenticated Organizer Guide data (fetched from server to avoid leaking secrets in client bundle)
  const [guideData, setGuideData] = useState<OrganizerGuideData | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "guide" && !guideData && !guideLoading && isAdmin) {
      setGuideLoading(true);
      fetch("/api/admin/guide")
        .then((res) => {
          if (!res.ok) throw new Error("Unauthorized");
          return res.json();
        })
        .then((data: OrganizerGuideData) => setGuideData(data))
        .catch((err) => console.error("Failed to load organizer guide:", err))
        .finally(() => setGuideLoading(false));
    }
  }, [activeTab, guideData, guideLoading, isAdmin]);

  // 1. Verify Admin Session
  const checkAdminAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/admin/me");
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.authenticated);
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    checkAdminAuth();
  }, [checkAdminAuth]);

  // 2. Fetch Contest, Questions, Submissions, Teams in parallel
  const fetchAllData = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const [cRes, qRes, sRes, tRes] = await Promise.all([
        fetch("/api/contest", { cache: "no-store" }),
        fetch("/api/questions", { cache: "no-store" }),
        fetch("/api/admin/submissions", { cache: "no-store" }),
        fetch("/api/admin/teams", { cache: "no-store" }),
      ]);

      if (cRes.ok) {
        const cData = await cRes.json();
        setContest(cData);
      }
      if (qRes.ok) {
        const qData = await qRes.json();
        setQuestions(qData.questions || []);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        setSubmissions(sData.submissions || []);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTeams(tData.teams || []);
      }
    } catch (e) {
      console.error("Admin fetch error:", e);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 3500);
      return () => clearInterval(interval);
    }
  }, [isAdmin, fetchAllData]);

  // Handle Admin Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Login failed.", "error");
        return;
      }

      toast("Admin authenticated successfully.", "success");
      setIsAdmin(true);
      fetchAllData();
    } catch {
      toast("Connection error during login.", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Admin Logout
  const handleLogout = async () => {
    await fetch("/api/auth/admin/logout", { method: "POST" });
    setIsAdmin(false);
    toast("Logged out of Admin Portal.", "info");
  };

  // Contest Actions: Start, Pause, Resume, Extend, End, Reset
  const handleContestAction = async (action: string, payload?: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Action failed.", "error");
        return;
      }

      toast(data.message, "success");
      fetchAllData();
    } catch {
      toast("Error performing contest action.", "error");
    }
  };

  // Open Question Add Modal
  const openAddQuestion = () => {
    setEditingQuestion(null);
    setFormTitle("");
    setFormCategory("Hardware");
    setFormPoints(100);
    setFormDescription("");
    setFormFlag("flag{}");
    setFormHint("");
    setFormOrder(questions.length + 1);
    setFormActive(true);
    setQuestionModalOpen(true);
  };

  // Open Question Edit Modal
  const openEditQuestion = (q: AdminQuestion) => {
    setEditingQuestion(q);
    setFormTitle(q.title);
    setFormCategory(q.category);
    setFormPoints(q.points);
    setFormDescription(q.description);
    setFormFlag(q.flag);
    setFormHint(q.hint || "");
    setFormOrder(q.order_index);
    setFormActive(q.is_active);
    setQuestionModalOpen(true);
  };

  // Save Question (Add or Update)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      title: formTitle,
      category: formCategory,
      points: formPoints,
      description: formDescription,
      flag: formFlag,
      hint: formHint,
      order_index: formOrder,
      is_active: formActive,
    };

    try {
      let res;
      if (editingQuestion) {
        res = await fetch("/api/questions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingQuestion.id, ...payload }),
        });
      } else {
        res = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to save challenge.", "error");
        return;
      }

      toast(data.message, "success");
      setQuestionModalOpen(false);
      fetchAllData();
    } catch {
      toast("Error saving challenge.", "error");
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (id: number) => {
    try {
      const res = await fetch(`/api/questions?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast("Challenge deleted.", "info");
        fetchAllData();
      } else {
        toast(data.error || "Failed to delete challenge.", "error");
      }
    } catch {
      toast("Error deleting challenge.", "error");
    }
  };

  const formatTimerDisplay = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Render Login Screen if not admin
  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold font-mono tracking-tight">Admin Command Portal</h1>
            <p className="text-xs text-muted-foreground">
              Restricted access for SNUC Potential Robotics Club organizers
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="robotics@snuchennai.edu.in"
                className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold text-sm py-3 rounded-xl transition-all shadow-md mt-2"
            >
              {authLoading ? "Authenticating..." : "Sign In to Admin Portal"}
            </button>
          </form>

          <div className="pt-4 border-t border-border text-center">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Contest Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Admin Topbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-card border border-border flex items-center justify-center p-1 shadow-sm">
              <Image
                src="/logo.png"
                alt="Rewired Logo"
                width={32}
                height={32}
                className="object-contain w-full h-full"
                priority
              />
            </div>
            <div>
              <div className="font-mono font-bold text-sm text-foreground flex items-center gap-2">
                REWIRED // HARDWARE CTF ADMIN
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-semibold uppercase">
                  Organizer
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">robotics@snuchennai.edu.in</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-colors hidden sm:block"
            >
              Contest View
            </Link>
            <Link
              href="/leaderboard"
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-colors hidden sm:block"
            >
              Leaderboard
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* CONTEST TIMER & LIFECYCLE CONTROLLER (Primary Requirement) */}
        <section className="rounded-2xl border-2 border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                    contest?.status === "RUNNING"
                      ? "bg-primary/20 text-primary border border-primary/30 animate-pulse"
                      : contest?.status === "PAUSED"
                      ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                      : contest?.status === "ENDED"
                      ? "bg-destructive/20 text-destructive border border-destructive/30"
                      : "bg-secondary text-muted-foreground border border-border"
                  }`}
                >
                  STATUS: {contest?.status || "PENDING"}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  Default: 30 Minutes
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
                Competition Command Center
              </h2>
              <p className="text-xs text-muted-foreground max-w-xl">
                Contestants see challenges blurred in standby until you click &quot;Start CTF&quot;. When the timer reaches 00:00, all submissions automatically lock and the Top 3 Podium is crowned.
              </p>
            </div>

            {/* Live Clock Display */}
            <div className="p-4 sm:p-5 rounded-2xl bg-secondary/80 border border-border flex flex-col items-center justify-center min-w-[200px] shrink-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Remaining Time
              </div>
              <div className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-primary">
                {contest ? formatTimerDisplay(contest.time_remaining_seconds) : "45:00"}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-1">
                {contest?.status === "RUNNING"
                  ? "Timer Running • Submissions Active"
                  : contest?.status === "ENDED"
                  ? "Submissions Locked"
                  : "Standby Mode"}
              </div>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="pt-4 border-t border-border flex flex-wrap items-center gap-3">
            {contest?.status === "PENDING" && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleContestAction("start", { durationMinutes: customDurationMinutes })}
                  className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm flex items-center gap-2 shadow-lg hover:scale-102 transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  START CTF ({customDurationMinutes} MINUTES)
                </button>

                <div className="flex items-center gap-1.5 bg-secondary px-3 py-2 rounded-xl border border-border text-xs">
                  <span className="text-muted-foreground">Duration:</span>
                  <select
                    value={customDurationMinutes}
                    onChange={(e) => setCustomDurationMinutes(Number(e.target.value))}
                    className="bg-card border border-border rounded-lg px-2 py-1 text-foreground font-mono"
                  >
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins (Standard)</option>
                    <option value={60}>60 mins</option>
                  </select>
                </div>
              </div>
            )}

            {contest?.status === "RUNNING" && (
              <>
                <button
                  onClick={() => handleContestAction("pause")}
                  className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold text-xs flex items-center gap-2 transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  Pause Contest
                </button>
                <button
                  onClick={() => handleContestAction("extend", { minutes: 5 })}
                  className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-primary font-semibold text-xs flex items-center gap-2 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  +5 Minutes
                </button>
                <button
                  onClick={() => setEndConfirmOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-destructive/15 hover:bg-destructive/25 text-destructive border border-destructive/30 font-semibold text-xs flex items-center gap-2 transition-colors"
                >
                  <ShieldAlert className="w-4 h-4" />
                  End CTF Early
                </button>
              </>
            )}

            {contest?.status === "PAUSED" && (
              <>
                <button
                  onClick={() => handleContestAction("resume")}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-2 transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Resume CTF
                </button>
                <button
                  onClick={() => handleContestAction("extend", { minutes: 5 })}
                  className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-primary font-semibold text-xs flex items-center gap-2 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  +5 Minutes
                </button>
              </>
            )}

            {contest?.status === "ENDED" && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleContestAction("extend", { minutes: 5 })}
                  className="px-4 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-semibold text-xs flex items-center gap-2 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  Re-Open (+5 Min Overtime)
                </button>
              </div>
            )}

            <div className="ml-auto">
              <button
                onClick={() => {
                  setResetClearsScores(false);
                  setResetConfirmOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border text-xs flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Contest & Scores
              </button>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex border-b border-border gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("questions")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === "questions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal className="w-4 h-4" />
            Challenges & Flags ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === "guide"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lock className="w-4 h-4" />
            Organizer Secret Guide (Confidential)
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === "submissions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="w-4 h-4" />
            Live Submissions ({submissions.length})
          </button>
          <button
            onClick={() => setActiveTab("teams")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === "teams"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" />
            Registered Teams ({teams.length})
          </button>
        </div>

        {/* TAB 1: QUESTIONS CRUD (Add, Edit, Delete, Points, Flags) */}
        {activeTab === "questions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold font-mono text-foreground">Challenge Management</h3>
                <p className="text-xs text-muted-foreground">
                  Manage challenges, flags, and monetary rewards. Rewards earned by teams are used as bidding currency in Round 2.
                </p>
              </div>
              <button
                onClick={openAddQuestion}
                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Add New Challenge
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-mono uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Challenge Title</th>
                      <th className="py-3 px-4">Base Reward</th>
                      <th className="py-3 px-4">Secret Flag / Answer</th>
                      <th className="py-3 px-4 text-center">Solves / Attempts</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {questions.map((q) => (
                      <tr key={q.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">
                          {q.order_index}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-foreground text-sm">{q.title}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-primary">
                          {formatINR(q.points)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-primary bg-secondary/20 rounded px-2">
                          <code className="text-[11px] select-all">{q.flag}</code>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs">
                          <span className="text-emerald-400 font-semibold">{q.solves_count}</span>
                          <span className="text-muted-foreground"> / {q.total_attempts}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              q.is_active
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {q.is_active ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditQuestion(q)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                              title="Edit Challenge"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(q)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Delete Challenge"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {questions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-muted-foreground text-xs">
                          <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                              <Terminal className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                              <div className="font-bold text-sm text-foreground">
                                No Hardware Challenges Added Yet
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Create your first challenge with firmware dumps, oscilloscope captures, bus captures, or PCB diagrams.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={openAddQuestion}
                              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm transition-all"
                            >
                              + Deploy First Hardware Challenge
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ORGANIZER SECRET GUIDE (SERVER-AUTHENTICATED ONLY) */}
        {activeTab === "guide" && (
          <div className="space-y-6">
            {guideLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground font-mono space-y-3">
                <Activity className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs">Fetching confidential organizer master sheet from secure server...</p>
              </div>
            ) : !guideData ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
                <h4 className="text-sm font-bold text-foreground font-mono">Unable to load organizer guide</h4>
                <p className="text-xs text-muted-foreground">Admin authentication required to access this endpoint.</p>
                <button
                  onClick={() => {
                    setGuideLoading(true);
                    fetch("/api/admin/guide")
                      .then((res) => {
                        if (!res.ok) throw new Error("Unauthorized");
                        return res.json();
                      })
                      .then((data) => setGuideData(data))
                      .catch((err) => console.error("Retry guide load error:", err))
                      .finally(() => setGuideLoading(false));
                  }}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs"
                >
                  Retry Loading
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-5 sm:p-6 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                    <Lock className="w-4 h-4" />
                    {guideData.confidentialNotice}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-foreground">
                    {guideData.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {guideData.subtitle}
                  </p>
                </div>

                {/* 3-Phase Ground Truth Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {guideData.phases.map((p, idx) => {
                    const borderColors = ["bg-amber-400", "bg-primary", "bg-emerald-400"];
                    const badgeColors = [
                      "bg-amber-400/20 text-amber-400",
                      "bg-primary/20 text-primary",
                      "bg-emerald-400/20 text-emerald-400",
                    ];
                    return (
                      <div
                        key={p.phase}
                        className="rounded-2xl border border-border bg-card p-5 space-y-3 relative overflow-hidden"
                      >
                        <div className={`absolute top-0 inset-x-0 h-1 ${borderColors[idx % 3]}`} />
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                              badgeColors[idx % 3]
                            }`}
                          >
                            PHASE {p.phase} DEBRIEF
                          </span>
                          <span className="text-xs font-mono font-bold text-primary">
                            {formatINR(p.points)}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-foreground font-mono">
                          {p.title}
                        </h4>
                        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                          <p>
                            <strong className="text-foreground">Mechanism:</strong> {p.mechanism}
                          </p>
                          <p>
                            <strong className="text-foreground">Ground Truth:</strong> {p.groundTruth}
                          </p>
                          <p>
                            <strong className="text-foreground">Solution Method:</strong>{" "}
                            {p.solutionMethod}
                          </p>
                          {p.organizerAction && (
                            <p>
                              <strong className="text-foreground">Organizer Action:</strong>{" "}
                              {p.organizerAction}
                            </p>
                          )}
                          <div className="p-2.5 rounded-xl bg-secondary/70 border border-border font-mono text-[11px] text-foreground">
                            Flag: <code className="text-primary font-bold">{p.flag}</code>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Hint Schedule & Equipment Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Hint Schedule */}
                  <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground">
                      <Clock className="w-4 h-4 text-primary" />
                      HINTS RELEASE SCHEDULE (10-MINUTE INTERVALS)
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Hints must be released every 10 minutes to guide teams through hardware bottlenecks without spoiling flags:
                    </p>

                    <div className="space-y-3 font-mono text-xs">
                      {guideData.hintSchedule.map((h, i) => {
                        const hintColors = ["text-amber-400", "text-primary", "text-emerald-400"];
                        return (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-secondary/60 border border-border space-y-1"
                          >
                            <div className={`flex items-center justify-between font-bold text-[11px] ${hintColors[i % 3]}`}>
                              <span>{h.minute}</span>
                              <span>{h.label}</span>
                            </div>
                            <p className="text-[11px] text-foreground font-sans">
                              &quot;{h.hint}&quot;
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Equipment / Components Needed */}
                  <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground">
                      <Cpu className="w-4 h-4 text-primary" />
                      EQUIPMENT / HARDWARE MASTER CHECKLIST
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Physical gear required for deploying and maintaining the competition environment:
                    </p>

                    <div className="space-y-3">
                      {guideData.equipmentChecklist.map((ec, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl bg-secondary/60 border border-border space-y-2"
                        >
                          <div className={`text-xs font-bold font-mono flex items-center gap-2 ${i === 0 ? "text-primary" : "text-amber-400"}`}>
                            {i === 0 ? <Users className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5" />}
                            {ec.category}
                          </div>
                          <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc font-mono">
                            {ec.items.map((item, j) => (
                              <li key={j}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: LIVE SUBMISSIONS MONITOR */}
        {activeTab === "submissions" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold font-mono text-foreground">Live Submissions Feed</h3>
              <p className="text-xs text-muted-foreground">
                Real-time stream of all flag attempts submitted by registered teams.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-mono uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-4">Challenge</th>
                      <th className="py-3 px-4">Submitted Flag</th>
                      <th className="py-3 px-4 text-center">Result</th>
                      <th className="py-3 px-4 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    {submissions.map((s) => (
                      <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 text-muted-foreground text-[11px]">
                          {new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground font-sans">{s.team_name}</td>
                        <td className="py-3 px-4 text-muted-foreground font-sans">{s.question_title}</td>
                        <td className="py-3 px-4 text-xs text-foreground truncate max-w-[180px]">
                          <code>{s.submitted_flag}</code>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {s.is_correct ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              CORRECT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-destructive/15 text-destructive border border-destructive/30">
                              <XCircle className="w-3 h-3" />
                              WRONG
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-primary">
                          {s.is_correct ? `+${formatINR(s.points_awarded)}` : "0"}
                        </td>
                      </tr>
                    ))}

                    {submissions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs font-sans">
                          No submissions logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REGISTERED TEAMS & ACCESS CODES */}
        {activeTab === "teams" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold font-mono text-foreground">Registered Teams Overview</h3>
              <p className="text-xs text-muted-foreground">
                All teams registered with their exclusive unique access codes and accumulated Round 2 bidding balance.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-mono uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Team Name</th>
                      <th className="py-3 px-4">Unique Access Code</th>
                      <th className="py-3 px-4 text-center">Solved Challenges</th>
                      <th className="py-3 px-4 text-right">Balance (Round 2 Currency)</th>
                      <th className="py-3 px-4 text-right">Registration Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {teams.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-foreground text-sm">{t.name}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-primary">
                          <span className="px-2 py-1 rounded bg-secondary border border-border">
                            {t.code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className="text-emerald-400 font-semibold">{t.solves_count}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-primary text-sm">
                          {formatINR(t.score)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-muted-foreground text-[11px] font-mono">
                          {new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}

                    {teams.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs font-sans">
                          No teams registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* QUESTION ADD / EDIT MODAL */}
      {questionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border bg-secondary/30 flex items-center justify-between">
              <h3 className="font-bold text-base font-mono text-foreground">
                {editingQuestion ? "Edit CTF Challenge" : "Create New CTF Challenge"}
              </h3>
              <button
                onClick={() => setQuestionModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-foreground mb-1">Challenge Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Servo Angle Lock"
                    className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-foreground font-medium text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">Base Reward *</label>
                  <input
                    type="number"
                    required
                    min={10}
                    step={10}
                    value={formPoints}
                    onChange={(e) => setFormPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-primary font-mono text-xs focus:outline-none focus:border-primary font-bold"
                  />
                  {/* Point quick presets */}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {[50000, 100000, 150000, 200000, 250000, 300000, 500000].map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => setFormPoints(pt)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                          formPoints === pt
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
                        }`}
                      >
                        {pt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Challenge Category (Optional)</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Hardware"
                    className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">Order Index</label>
                  <input
                    type="number"
                    value={formOrder}
                    onChange={(e) => setFormOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Secret Flag / Answer *</label>
                <input
                  type="text"
                  required
                  value={formFlag}
                  onChange={(e) => setFormFlag(e.target.value)}
                  placeholder="flag{...}"
                  className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-primary font-mono text-xs focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Strictly validated upon submission.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Description / Brief *</label>
                <textarea
                  required
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Provide technical context, hints or problem prompt..."
                  className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-foreground font-sans text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Hint (Optional)</label>
                <input
                  type="text"
                  value={formHint}
                  onChange={(e) => setFormHint(e.target.value)}
                  placeholder="Optional hint for struggling teams..."
                  className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                <label htmlFor="activeCheck" className="text-foreground font-medium select-none">
                  Challenge is active and visible to contestants
                </label>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuestionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Confirmations for the destructive organiser actions ---- */}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        icon={<Trash2 className="h-5 w-5" />}
        tone="destructive"
        title="Delete this challenge?"
        description={
          <>
            <span className="font-semibold text-foreground">
              {deleteTarget?.title}
            </span>{" "}
            and every submission against it are removed for good. Teams keep the
            coins they already earned from it.
          </>
        }
        confirmLabel="Delete challenge"
        onConfirm={() => {
          if (deleteTarget) handleDeleteQuestion(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      <ConfirmDialog
        open={endConfirmOpen}
        onOpenChange={setEndConfirmOpen}
        icon={<ShieldAlert className="h-5 w-5" />}
        tone="destructive"
        title="End the CTF now?"
        description="The clock stops and every team is locked out of submitting. Final coin balances carry into round 2. You can reopen with overtime afterwards if you need to."
        confirmLabel="End the CTF"
        cancelLabel="Keep it running"
        onConfirm={() => handleContestAction("end")}
      />

      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        icon={<RotateCcw className="h-5 w-5" />}
        tone="destructive"
        title="Reset the contest?"
        description="The contest goes back to PENDING and the clock is cleared, ready to start again. Challenges and registered teams are kept."
        confirmLabel={resetClearsScores ? "Reset and wipe scores" : "Reset the clock"}
        onConfirm={() =>
          handleContestAction("reset", { clearSubmissions: resetClearsScores })
        }
      >
        {/* The old prompt folded this into the OK button, so there was no way
            to reset the clock without also wiping every score. */}
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-breach/25 bg-breach/[0.06] p-4">
          <input
            type="checkbox"
            checked={resetClearsScores}
            onChange={(e) => setResetClearsScores(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--breach)]"
          />
          <span>
            <span className="block font-display text-[13px] font-semibold text-breach">
              Also wipe every submission and score
            </span>
            <span className="mt-1 block text-[12px] leading-relaxed text-muted-foreground">
              Every team drops to 0 coins and their captured flags are deleted.
              Leave this off to restart the clock with scores intact.
            </span>
          </span>
        </label>
      </ConfirmDialog>
    </div>
  );
}
