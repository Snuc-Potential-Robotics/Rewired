"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Flag, 
  HelpCircle, 
  CheckCircle2, 
  Lock, 
  Send, 
  Loader2, 
  AlertCircle,
  Coins
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "./Toast";

export interface QuestionItem {
  id: number;
  title: string;
  category: string;
  points: number;
  description: string;
  hint?: string | null;
  order_index: number;
  isSolved?: boolean;
  isLocked?: boolean;
  solves_count?: number | string;
}

interface ChallengeModalProps {
  question: QuestionItem | null;
  onClose: () => void;
  contestStatus: string;
  isTeamLoggedIn: boolean;
  onOpenAuth: () => void;
  onSolvedSuccess: (questionId: number, points: number, newScore: number) => void;
}

export function ChallengeModal({
  question,
  onClose,
  contestStatus,
  isTeamLoggedIn,
  onOpenAuth,
  onSolvedSuccess,
}: ChallengeModalProps) {
  const { toast } = useToast();
  const [flagInput, setFlagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    setFlagInput("");
    setShowHint(false);
    setCooldown(0);
  }, [question?.id]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!question) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagInput.trim() || submitting || cooldown > 0) return;

    if (!isTeamLoggedIn) {
      toast("Please register or log in your team first.", "warning");
      onOpenAuth();
      return;
    }

    if (contestStatus !== "RUNNING") {
      toast("Submissions are only accepted while the CTF is active.", "error");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          flag: flagInput.trim(),
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        const waitTime = data.retryAfter || 4;
        setCooldown(waitTime);
        toast(`Rate limited. Please wait ${waitTime}s.`, "warning");
        return;
      }

      if (!res.ok) {
        toast(data.error || "Submission rejected.", "error");
        setCooldown(4);
        return;
      }

      if (data.isCorrect) {
        toast(data.message, "success", "Correct Flag!");
        onSolvedSuccess(question.id, question.points, data.newScore);
      } else {
        toast("Incorrect flag. Please try again.", "error");
        setCooldown(4);
      }
    } catch {
      toast("Error submitting answer. Please check network.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-border bg-secondary/30 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-primary/15 text-primary border border-primary/30 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                {question.points} Coins
              </span>
              {question.isSolved && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Objective Complete
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {question.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-foreground">
          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
              Challenge Brief
            </h3>
            <div className="p-4 rounded-xl bg-secondary/40 border border-border/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {question.description}
            </div>
          </div>

          {/* Hint Accordion */}
          {question.hint && (
            <div className="rounded-xl border border-border/70 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="w-full flex items-center justify-between p-3.5 bg-secondary/30 hover:bg-secondary/60 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  <span>{showHint ? "Hide Technical Hint" : "Reveal Technical Hint"}</span>
                </div>
                <span className="text-[11px] font-mono text-primary font-normal">
                  {showHint ? "▲ Close" : "▼ Open"}
                </span>
              </button>
              {showHint && (
                <div className="p-3.5 bg-secondary/60 border-t border-border text-xs text-foreground/90 font-mono leading-relaxed">
                  {question.hint}
                </div>
              )}
            </div>
          )}

          {/* Solved Status Banner */}
          {question.isSolved ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-sm">Objective Solved</div>
                <div className="text-xs text-emerald-400/80">
                  Your team successfully submitted the correct flag and claimed {question.points} coins for Round 2 bidding. Submissions for this objective are locked.
                </div>
              </div>
            </div>
          ) : contestStatus === "ENDED" ? (
            <div className="p-4 rounded-xl bg-secondary/80 border border-border text-muted-foreground flex items-center gap-3">
              <Lock className="w-5 h-5 shrink-0" />
              <div className="text-xs">
                Contest has officially concluded. Submissions are closed. Check the final Leaderboard standings!
              </div>
            </div>
          ) : contestStatus === "PENDING" ? (
            <div className="p-4 rounded-xl bg-secondary/80 border border-border text-muted-foreground flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-primary shrink-0" />
              <div className="text-xs">
                Contest is currently locked. The administrator will start the event timer shortly.
              </div>
            </div>
          ) : (
            /* Flag Submission Box */
            <form onSubmit={handleSubmit} className="space-y-3 pt-2">
              <label className="block text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Submit Captured Flag
              </label>

              {!isTeamLoggedIn && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground flex items-center justify-between gap-3">
                  <span>Register or sign in to submit flags and score points!</span>
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs"
                  >
                    Sign In
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <Flag className="w-4 h-4 text-primary" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="flag{...}"
                    value={flagInput}
                    disabled={!isTeamLoggedIn || submitting || cooldown > 0}
                    onChange={(e) => setFlagInput(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-secondary/50 border border-border font-mono text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 transition-all placeholder:text-muted-foreground/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!isTeamLoggedIn || submitting || cooldown > 0 || !flagInput.trim()}
                  className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm shrink-0"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking...
                    </>
                  ) : cooldown > 0 ? (
                    `Cooldown (${cooldown}s)`
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Flag
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Format: flag&#123;answer_string&#125;</span>
                {cooldown > 0 && (
                  <span className="text-yellow-400 font-medium">
                    Rate limit cooldown active ({cooldown}s)
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
