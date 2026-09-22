"use client";

import React, { useState } from "react";
import { X, ShieldCheck, UserPlus, KeyRound, Copy, Check, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "./Toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (team: { id: number; name: string; code: string; score: number }) => void;
  initialMode?: "register" | "login";
}

export function AuthModal({ isOpen, onClose, onSuccess, initialMode = "register" }: AuthModalProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"register" | "login">(initialMode);
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state showing generated code
  const [registeredTeam, setRegisteredTeam] = useState<{
    id: number;
    name: string;
    code: string;
    score: number;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/team/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to register team.");
        return;
      }

      setRegisteredTeam(data.team);
      toast("Team successfully registered!", "success");
    } catch {
      setError("An unexpected error occurred. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/team/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName, code: teamCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }

      toast(`Welcome back, Team ${data.team.name}!`, "success");
      onSuccess(data.team);
      onClose();
    } catch {
      setError("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (!registeredTeam) return;
    navigator.clipboard.writeText(registeredTeam.code);
    setCopiedCode(true);
    toast("Access code copied!", "info");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const finishRegistration = () => {
    if (registeredTeam) {
      onSuccess(registeredTeam);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden text-foreground"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Team Access Portal</h2>
              <p className="text-xs text-muted-foreground">SNUC Rewired CTF 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* If successfully registered, show the Access Code Reveal Card */}
        {registeredTeam ? (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-1">
              <div className="inline-flex p-2 rounded-full bg-emerald-500/10 text-emerald-400 mb-1 border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-foreground">Team Registered!</h3>
              <p className="text-xs text-muted-foreground">
                Your team <span className="font-semibold text-primary">{registeredTeam.name}</span> has been created.
              </p>
            </div>

            {/* Generated Code Display */}
            <div className="p-4 rounded-xl bg-secondary/80 border border-border space-y-2 text-center">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                Your Unique Access Code
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-2xl font-bold tracking-widest text-primary">
                  {registeredTeam.code}
                </span>
                <button
                  type="button"
                  onClick={copyCode}
                  className="p-2 rounded-lg bg-background border border-border hover:bg-secondary text-foreground transition-colors"
                  title="Copy code"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Save this code! You can use it to log in from other devices or share with teammates.
              </p>
            </div>

            <button
              onClick={finishRegistration}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm py-3 rounded-xl transition-all shadow-md"
            >
              Enter Contest Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-6">
            {/* Tabs */}
            <div className="flex rounded-xl bg-secondary/60 p-1 mb-5 border border-border">
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === "register"
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register New Team
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === "login"
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Enter with Code
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs leading-relaxed">
                {error}
              </div>
            )}

            {mode === "register" ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Team Name <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CyberRobots, ByteBenders"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    No duplicate names. You will receive an exclusive access code upon registration.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !teamName.trim()}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold text-sm py-2.5 rounded-xl transition-all shadow-sm"
                >
                  {loading ? "Registering Team..." : "Create Team & Generate Code"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Team Name <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Your registered team name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Unique Access Code <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RW-A8F29C"
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                    className="w-full font-mono uppercase tracking-wider px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !teamName.trim() || !teamCode.trim()}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold text-sm py-2.5 rounded-xl transition-all shadow-sm"
                >
                  {loading ? "Verifying..." : "Sign In to Team"}
                </button>
              </form>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
