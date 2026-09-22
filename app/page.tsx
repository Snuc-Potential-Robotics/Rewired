"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircuitBoard, Trophy } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AuthModal } from "@/components/AuthModal";
import { BriefingPanel } from "@/components/BriefingPanel";
import { ChallengeModal, QuestionItem } from "@/components/ChallengeModal";
import { ObjectiveCard } from "@/components/ObjectiveCard";
import { useToast } from "@/components/Toast";
import { useContest, usePoll, useTeamSession } from "@/lib/use-contest";
import type { Briefing } from "@/lib/briefing";

export default function HomePage() {
  const { toast } = useToast();

  const contest = useContest();
  const { team, setTeam, refresh: refreshTeam } = useTeamSession();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [selected, setSelected] = useState<QuestionItem | null>(null);

  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefingSealed, setBriefingSealed] = useState(true);
  const [briefingLoaded, setBriefingLoaded] = useState(false);

  const locked = contest.status === "PENDING";
  const ended = contest.status === "ENDED";

  // The headline quotes the real window an organiser configured, so it can
  // never drift from what the clock is actually counting down.
  const windowMinutes = Math.max(1, Math.round(contest.duration / 60));

  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch("/api/questions", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch {
      // The next poll covers it.
    } finally {
      setQuestionsLoaded(true);
    }
  }, []);

  usePoll(fetchQuestions, 5000);

  // The briefing is released by the server at launch, so re-request it
  // whenever the contest status changes rather than polling for it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/briefing", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setBriefing(data.briefing ?? null);
        setBriefingSealed(Boolean(data.sealed));
      } catch {
        // Leave it sealed.
      } finally {
        if (!cancelled) setBriefingLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contest.status]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/team/logout", { method: "POST" });
      setTeam(null);
      toast("Signed out.", "info");
      void fetchQuestions();
    } catch {
      toast("Could not sign out. Check your connection and try again.", "error");
    }
  };

  const handleSolved = (questionId: number, _points: number, newScore: number) => {
    setTeam((prev) => (prev ? { ...prev, score: newScore } : prev));
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, isSolved: true, solves_count: Number(q.solves_count || 0) + 1 }
          : q
      )
    );
    setSelected((prev) => (prev?.id === questionId ? { ...prev, isSolved: true } : prev));
  };

  const openAuth = (mode: "register" | "login" = "register") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const totalCoins = questions.reduce((sum, q) => sum + Number(q.points || 0), 0);
  const solvedCount = questions.filter((q) => q.isSolved).length;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        team={team}
        status={contest.status}
        remaining={contest.remaining}
        duration={contest.duration}
        loaded={contest.loaded}
        onOpenAuth={openAuth}
        onLogout={handleLogout}
      />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-20 pt-10 sm:px-6 lg:px-10">
        {/* ---- Hero: the thesis of the whole event ---- */}
        <section className="grid grid-cols-1 gap-10 border-b border-edge pb-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
          <div>
            <div className="flex items-center gap-2.5">
              <span aria-hidden className="h-1 w-1 rotate-45 bg-copper" />
              <span className="silkscreen">
                SNUC Potential Robotics &nbsp;/&nbsp; Round 1 &nbsp;/&nbsp; Hardware CTF
              </span>
            </div>

            <h1 className="mt-5 font-display text-[clamp(2.25rem,5.5vw,4rem)] font-bold leading-[0.95] tracking-[-0.035em] text-foreground">
              {windowMinutes} minutes to get inside
              <br />
              <span className="text-signal">an air-gapped room.</span>
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              No network to attack. Everything you need is in the kit on your bench and the
              signals in the air around you. Work the objectives, bank coins — your balance
              here is the money you bid with in round 2.
            </p>
          </div>

          {/* Instrument strip: the three numbers worth tracking. */}
          <dl className="grid w-full grid-cols-3 gap-px overflow-hidden rounded-lg border border-edge bg-edge lg:w-auto">
            <Readout label="Objectives" value={questions.length || "—"} />
            <Readout label="Coins in play" value={totalCoins || "—"} accent />
            <Readout
              label="Your balance"
              value={team ? team.score : "—"}
              sub={team ? `${solvedCount} captured` : "Not signed in"}
            />
          </dl>
        </section>

        {/* ---- Briefing ---- */}
        <div className="pt-10">
          <BriefingPanel
            briefing={briefing}
            sealed={briefingSealed}
            loading={!briefingLoaded}
          />
        </div>

        {/* ---- Objectives ---- */}
        <section className="pt-12">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
            <div>
              <div className="silkscreen mb-2.5">Objectives</div>
              <h2 className="font-display text-2xl font-bold tracking-[-0.025em] text-foreground">
                {locked
                  ? "Sealed until launch"
                  : ended
                    ? "Final board"
                    : `${questions.length - solvedCount} left to capture`}
              </h2>
            </div>

            <Link
              href="/leaderboard"
              className="group flex items-center gap-2 rounded-md border border-edge bg-board px-4 py-2.5 font-display text-[13px] font-semibold text-foreground transition-colors hover:border-signal/45"
            >
              <Trophy className="h-3.5 w-3.5 text-signal" />
              Live standings
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {ended && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-edge bg-board px-5 py-4">
              <div>
                <h3 className="font-display text-[15px] font-semibold text-foreground">
                  The window is closed
                </h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Submissions are shut. Final coin balances carry straight into round 2 bidding.
                </p>
              </div>
              <Link
                href="/leaderboard"
                className="rounded-md bg-signal px-4 py-2 font-display text-[13px] font-semibold text-ink transition-colors hover:bg-signal/85"
              >
                See the final standings
              </Link>
            </div>
          )}

          {!questionsLoaded ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="panel h-[220px] animate-pulse opacity-40" />
              ))}
            </div>
          ) : questions.length === 0 ? (
            <EmptyBoard team={team} onRegister={() => openAuth("register")} />
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {questions.map((q, i) => (
                <ObjectiveCard
                  key={q.id}
                  question={q}
                  index={i}
                  locked={locked}
                  onOpen={() => !locked && setSelected(q)}
                />
              ))}
            </div>
          )}

          {locked && questions.length > 0 && (
            <p className="mt-5 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
              <span aria-hidden className="h-1 w-1 rotate-45 bg-signal animate-signal-blink" />
              Objective briefs unlock the moment an organiser starts the clock.
            </p>
          )}
        </section>
      </main>

      {selected && (
        <ChallengeModal
          key={selected.id}
          question={selected}
          onClose={() => setSelected(null)}
          contestStatus={contest.status}
          isTeamLoggedIn={Boolean(team)}
          onOpenAuth={() => openAuth("register")}
          onSolvedSuccess={handleSolved}
        />
      )}

      {/* Keyed so opening the dialog always starts from a clean form rather
          than resetting fields from inside an effect. */}
      <AuthModal
        key={`${authModalOpen}-${authMode}`}
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(loggedTeam) => {
          setTeam(loggedTeam);
          void refreshTeam();
          void fetchQuestions();
        }}
      />
    </div>
  );
}

function Readout({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-board px-5 py-4 lg:min-w-[132px]">
      <dt className="silkscreen">{label}</dt>
      <dd
        className={`mt-2.5 font-mono text-[26px] font-bold leading-none ${
          accent ? "text-signal" : "text-foreground"
        }`}
      >
        {value}
      </dd>
      {sub && <div className="mt-2 font-mono text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function EmptyBoard({
  team,
  onRegister,
}: {
  team: { name: string; code: string } | null;
  onRegister: () => void;
}) {
  return (
    <div className="panel mx-auto flex max-w-xl flex-col items-center px-8 py-14 text-center">
      <CircuitBoard className="h-7 w-7 text-copper" />
      <h3 className="mt-5 font-display text-xl font-semibold tracking-tight text-foreground">
        No objectives on the board yet
      </h3>
      <p className="mt-2.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
        Organisers are still flashing boards and wiring test rigs. Objectives appear here on
        their own as soon as they go up — leave this page open.
      </p>

      {team ? (
        <div className="mt-6 flex items-center gap-3 rounded-md border border-edge bg-rail px-4 py-3 text-left">
          <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-verified" />
          <span className="text-[13px]">
            <span className="font-display font-semibold text-foreground">{team.name}</span>
            <span className="text-muted-foreground"> is registered — code </span>
            <span className="font-mono font-semibold text-copper">{team.code}</span>
          </span>
        </div>
      ) : (
        <button
          onClick={onRegister}
          className="mt-6 rounded-md bg-signal px-5 py-2.5 font-display text-[13px] font-semibold text-ink transition-colors hover:bg-signal/85"
        >
          Register your team now
        </button>
      )}
    </div>
  );
}
