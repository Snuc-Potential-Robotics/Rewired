"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Check, Copy, X } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "./Toast";

interface Team {
  id: number;
  name: string;
  code: string;
  score: number;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (team: Team) => void;
  initialMode?: "register" | "login";
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "register",
}: AuthModalProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"register" | "login">(initialMode);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<Team | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint =
      mode === "register" ? "/api/auth/team/register" : "/api/auth/team/login";
    const body = mode === "register" ? { name } : { name, code };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            (mode === "register"
              ? "That team could not be registered."
              : "That name and code do not match a team.")
        );
        return;
      }

      if (mode === "register") {
        setRegistered(data.team);
        toast("Team registered.", "success");
      } else {
        toast(`Signed in as ${data.team.name}.`, "success");
        onSuccess(data.team);
        onClose();
      }
    } catch {
      setError("The request did not reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (!registered) return;
    navigator.clipboard.writeText(registered.code);
    setCopied(true);
    toast("Access code copied.", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Team access"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="panel w-full max-w-md overflow-hidden shadow-lift"
      >
        <header className="flex items-center justify-between border-b border-edge bg-rail/40 px-5 py-3.5">
          <div>
            <div className="silkscreen">Team access</div>
            <h2 className="mt-1.5 font-display text-[15px] font-semibold tracking-tight text-foreground">
              {registered ? "You are in" : mode === "register" ? "Register a team" : "Sign in"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-rail hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {registered ? (
          <div className="space-y-5 p-6">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              <span className="font-display font-semibold text-foreground">
                {registered.name}
              </span>{" "}
              is on the board. This code is how every teammate signs in — write it down
              before you close this.
            </p>

            <div className="rounded-md border border-copper/35 bg-copper/[0.06] px-5 py-5 text-center">
              <div className="silkscreen mb-3">Your access code</div>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-[28px] font-bold tracking-[0.12em] text-copper">
                  {registered.code}
                </span>
                <button
                  onClick={copyCode}
                  aria-label="Copy access code"
                  className="rounded-md border border-edge bg-board p-2 text-foreground transition-colors hover:border-copper/60"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-verified" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                onSuccess(registered);
                onClose();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-signal py-3 font-display text-[13px] font-semibold text-ink transition-colors hover:bg-signal/85"
            >
              Go to the objectives
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-edge bg-edge">
              {(["register", "login"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={`py-2.5 font-display text-[12px] font-semibold transition-colors ${
                    mode === m
                      ? "bg-rail text-signal"
                      : "bg-board text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "register" ? "New team" : "Have a code"}
                </button>
              ))}
            </div>

            {error && (
              <p className="mb-4 rounded-md border border-breach/30 bg-breach/[0.07] px-3.5 py-2.5 text-[13px] leading-relaxed text-breach">
                {error}
              </p>
            )}

            <form onSubmit={submit} className="space-y-4">
              <Field label="Team name">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={mode === "register" ? "Pick something memorable" : "Your team name"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-edge bg-ink px-3.5 py-2.5 text-[14px] text-foreground transition-colors placeholder:text-muted-foreground/40 focus:border-signal focus:outline-none"
                />
              </Field>

              {mode === "login" && (
                <Field label="Access code">
                  <input
                    type="text"
                    required
                    spellCheck={false}
                    autoComplete="off"
                    placeholder="RW-A8F29C"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full rounded-md border border-edge bg-ink px-3.5 py-2.5 font-mono text-[14px] uppercase tracking-[0.1em] text-foreground transition-colors placeholder:text-muted-foreground/40 focus:border-signal focus:outline-none"
                  />
                </Field>
              )}

              {mode === "register" && (
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  Names are unique. You get an access code on the next screen — it signs the
                  whole team in, on any device.
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !name.trim() || (mode === "login" && !code.trim())}
                className="w-full rounded-md bg-signal py-3 font-display text-[13px] font-semibold text-ink transition-colors hover:bg-signal/85 disabled:cursor-not-allowed disabled:bg-rail disabled:text-muted-foreground"
              >
                {loading
                  ? mode === "register"
                    ? "Registering"
                    : "Checking"
                  : mode === "register"
                    ? "Register and get a code"
                    : "Sign in"}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="silkscreen mb-2 block">{label}</span>
      {children}
    </label>
  );
}
