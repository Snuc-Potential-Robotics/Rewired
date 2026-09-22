"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  PlusCircle
} from "lucide-react";
import { useToast } from "@/components/Toast";
import Link from "next/link";

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

  // Active Tab: 'controls' | 'questions' | 'submissions' | 'teams'
  const [activeTab, setActiveTab] = useState<"controls" | "questions" | "submissions" | "teams">("controls");

  // Contest State
  const [contest, setContest] = useState<AdminContestState | null>(null);
  const [customDurationMinutes, setCustomDurationMinutes] = useState(30);

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

  // 2. Fetch Contest, Questions, Submissions, Teams
  const fetchAllData = useCallback(async () => {
    if (!isAdmin) return;

    try {
      // Contest
      const cRes = await fetch("/api/contest");
      if (cRes.ok) {
        const cData = await cRes.json();
        setContest(cData);
      }

      // Questions
      const qRes = await fetch("/api/questions");
      if (qRes.ok) {
        const qData = await qRes.json();
        setQuestions(qData.questions || []);
      }

      // Submissions
      const sRes = await fetch("/api/admin/submissions");
      if (sRes.ok) {
        const sData = await sRes.json();
        setSubmissions(sData.submissions || []);
      }

      // Teams
      const tRes = await fetch("/api/admin/teams");
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
    if (!confirm("Are you sure you want to delete this challenge? This will remove all associated submissions.")) {
      return;
    }

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
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-mono font-bold text-sm text-foreground flex items-center gap-2">
                REWIRED // ADMIN
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
                {contest ? formatTimerDisplay(contest.time_remaining_seconds) : "30:00"}
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
                    <option value={30}>30 mins (Standard)</option>
                    <option value={45}>45 mins</option>
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
                  onClick={() => {
                    if (confirm("End the CTF now? Submissions will be locked.")) {
                      handleContestAction("end");
                    }
                  }}
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
                  const clear = confirm("Reset CTF to PENDING?\n\nClick OK to also CLEAR all team submissions and reset scores.\nClick Cancel to abort.");
                  if (clear) {
                    handleContestAction("reset", { clearSubmissions: true });
                  }
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
        <div className="flex border-b border-border gap-2">
          <button
            onClick={() => setActiveTab("questions")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "questions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal className="w-4 h-4" />
            Questions & Answers ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
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
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
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
                  Add, update, or edit points, flags, and hints. Flags are hidden from contestants until solved.
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
                      <th className="py-3 px-4">Title & Category</th>
                      <th className="py-3 px-4">Points</th>
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
                          <div className="text-[11px] text-primary flex items-center gap-1 mt-0.5 font-mono">
                            <Tag className="w-3 h-3" />
                            {q.category}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                          {q.points} PTS
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
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Delete Challenge"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
                          {s.is_correct ? `+${s.points_awarded}` : "0"}
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
                All teams registered with their exclusive unique access codes.
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
                      <th className="py-3 px-4 text-right">Score</th>
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
                          {t.score} PTS
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
                  <label className="block font-semibold text-foreground mb-1">Points *</label>
                  <input
                    type="number"
                    required
                    min={10}
                    step={10}
                    value={formPoints}
                    onChange={(e) => setFormPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary"
                  >
                    <option value="Hardware">Hardware / Robotics</option>
                    <option value="Web">Web Exploitation</option>
                    <option value="Cryptography">Cryptography</option>
                    <option value="Reverse">Reverse Engineering</option>
                    <option value="Forensics">Forensics / Network</option>
                    <option value="Misc">Misc / Logic</option>
                  </select>
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
    </div>
  );
}
