"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Lightbulb, Lock, Send, X } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "./Toast";
import { BriefBody } from "./BriefBody";
import { formatINR } from "@/lib/utils";

export interface QuestionItem {
  id: number;
  title: string;
  category: string;
  points: number;
  current_points?: number;
  isFirstBloodAvailable?: boolean;
  description: string;
  hint?: string | null;
  order_index: number;
  isSolved?: boolean;
  isLocked?: boolean;
  awarded_points?: number;
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
  const [flag, setFlag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Escape closes, and focus lands on the flag field so a team can paste and go.
  useEffect(() => {
    if (!question) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [question, onClose]);

  if (!question) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag.trim() || submitting || cooldown > 0) return;

    if (!isTeamLoggedIn) {
      toast("Sign in with your team code before submitting.", "warning");
      onOpenAuth();
      return;
    }

    if (contestStatus !== "RUNNING") {
      toast("The window is not open. Submissions are closed.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, flag: flag.trim() }),
      });
      const data = await res.json();

      if (res.status === 429) {
        const wait = data.retryAfter || 4;
        setCooldown(wait);
        toast(`Too many attempts. Wait ${wait}s before the next one.`, "warning");
        return;
      }

      if (!res.ok) {
        toast(data.error || "The submission was rejected.", "error");
        setCooldown(4);
        return;
      }

      if (data.isCorrect) {
        toast(data.message, "success", "Flag captured");
        onSolvedSuccess(question.id, data.pointsAwarded ?? question.points, data.newScore);
      } else {
        toast("That flag is wrong. Check your capture and try again.", "error");
        setCooldown(4);
      }
    } catch {
      toast("The submission did not reach the server. Check your connection.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const solved = Boolean(question.isSolved);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={question.title}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="panel flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden shadow-lift"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 border-b border-edge bg-rail/40 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="silkscreen">{question.category}</span>
              <span aria-hidden className="h-2.5 w-px bg-edge-strong" />
              <span
                className={`font-mono text-[12px] font-bold ${
                  solved ? "text-verified" : "text-signal"
                }`}
              >
                {formatINR(question.current_points ?? question.points)} reward
                {question.current_points && question.current_points !== question.points && (
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    (Base: {formatINR(question.points)})
                  </span>
                )}
              </span>
              {question.isFirstBloodAvailable && !solved && (
                <span className="chip flex items-center gap-1 border-signal/40 bg-signal/10 text-signal text-[10px]">
                  🩸 First Blood (100%)
                </span>
              )}
              {solved && (
                <span className="chip flex items-center gap-1 border-verified/40 text-verified">
                  <Check className="h-3 w-3" />
                  Captured
                </span>
              )}
            </div>
            <h2 className="mt-2 font-display text-xl font-semibold leading-snug tracking-tight text-foreground">
              {question.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-rail hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section>
            <div className="silkscreen mb-2.5">Brief</div>
            <BriefBody description={question.description} />
          </section>

          {question.hint && (
            <section className="overflow-hidden rounded-md border border-edge">
              <button
                type="button"
                onClick={() => setShowHint((v) => !v)}
                aria-expanded={showHint}
                className="flex w-full items-center justify-between gap-3 bg-rail/50 px-4 py-3 text-left transition-colors hover:bg-rail"
              >
                <span className="flex items-center gap-2.5">
                  <Lightbulb className="h-3.5 w-3.5 text-signal" />
                  <span className="font-display text-[13px] font-semibold text-foreground">
                    Technical hint
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    showHint ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showHint && (
                <p className="border-t border-edge bg-ink/40 px-4 py-3.5 font-mono text-[12px] leading-relaxed text-foreground/85">
                  {question.hint}
                </p>
              )}
            </section>
          )}

          {solved ? (
            <Banner tone="verified" title={`${formatINR(question.awarded_points ?? question.points)} reward banked`}>
              Your team already captured this flag. The reward is locked into your round 2
              balance and this objective is closed.
            </Banner>
          ) : contestStatus === "ENDED" ? (
            <Banner tone="muted" icon={<Lock className="h-4 w-4" />} title="The window is closed">
              Submissions are shut for the whole board. Final standings are on the leaderboard.
            </Banner>
          ) : contestStatus === "PENDING" ? (
            <Banner tone="signal" icon={<Lock className="h-4 w-4" />} title="Not started yet">
              An organiser starts the clock. Submissions open the moment they do.
            </Banner>
          ) : contestStatus === "PAUSED" ? (
            <Banner tone="muted" icon={<Lock className="h-4 w-4" />} title="Contest is paused">
              The competition clock is currently paused by administrators. Flag submissions will resume when the contest is unpaused.
            </Banner>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="silkscreen">Submit the flag</div>

              {!isTeamLoggedIn && (
                <div className="flex items-center justify-between gap-3 rounded-md border border-signal/25 bg-signal/[0.06] px-4 py-3">
                  <p className="text-[13px] text-foreground">
                    Sign in with your team code to submit.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="shrink-0 rounded-md bg-signal px-3 py-1.5 font-display text-[12px] font-semibold text-ink"
                  >
                    Sign in
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  required
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="flag{...}"
                  value={flag}
                  disabled={!isTeamLoggedIn || submitting || cooldown > 0}
                  onChange={(e) => setFlag(e.target.value)}
                  className="flex-1 rounded-md border border-edge bg-ink px-3.5 py-3 font-mono text-[14px] text-foreground transition-colors placeholder:text-muted-foreground/40 focus:border-signal focus:outline-none disabled:opacity-45"
                />
                <button
                  type="submit"
                  disabled={!isTeamLoggedIn || submitting || cooldown > 0 || !flag.trim()}
                  className="flex shrink-0 items-center gap-2 rounded-md bg-signal px-5 py-3 font-display text-[13px] font-semibold text-ink transition-colors hover:bg-signal/85 disabled:cursor-not-allowed disabled:bg-rail disabled:text-muted-foreground"
                >
                  {submitting ? (
                    "Checking"
                  ) : cooldown > 0 ? (
                    `Wait ${cooldown}s`
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Submit
                    </>
                  )}
                </button>
              </div>

              <p className="font-mono text-[11px] text-muted-foreground">
                Format: flag&#123;answer&#125; &nbsp;·&nbsp; Dynamic scoring: 1st solve gets 100%, 2nd gets 90%, 3rd gets 80% + clock speed bonus
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Banner({
  tone,
  title,
  icon,
  children,
}: {
  tone: "verified" | "signal" | "muted";
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const styles = {
    verified: "border-verified/25 bg-verified/[0.06] text-verified",
    signal: "border-signal/25 bg-signal/[0.06] text-signal",
    muted: "border-edge bg-rail/50 text-muted-foreground",
  }[tone];

  return (
    <div className={`flex items-start gap-3 rounded-md border p-4 ${styles}`}>
      <span className="mt-0.5 shrink-0">{icon ?? <Check className="h-4 w-4" />}</span>
      <div>
        <h3 className="font-display text-[13px] font-semibold">{title}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
