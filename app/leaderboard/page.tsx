"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Search, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Navbar } from "@/components/Navbar";
import { AuthModal } from "@/components/AuthModal";
import { useContest, usePoll, useTeamSession } from "@/lib/use-contest";
import { formatINR } from "@/lib/utils";

interface RankedTeam {
  rank: number;
  id: number;
  name: string;
  score: number;
  solvesCount: number;
  lastSubmissionAt: string | null;
  createdAt: string;
}

/** Podium metal, drawn from the same material palette as the rest of the board. */
const MEDALS = [
  { label: "1st", color: "var(--signal)" },
  { label: "2nd", color: "#c3ccd4" },
  { label: "3rd", color: "var(--copper)" },
];

export default function LeaderboardPage() {
  const contest = useContest();
  const { team, setTeam, refresh: refreshTeam } = useTeamSession();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");

  const openAuth = (mode: "register" | "login" = "register") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };
  const [teams, setTeams] = useState<RankedTeam[]>([]);
  const [stats, setStats] = useState({ totalTeams: 0, totalSolves: 0, totalChallenges: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [celebrated, setCelebrated] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setTeams(data.teams || []);
      if (data.stats) setStats(data.stats);

      if (data.status === "ENDED" && !celebrated && data.teams?.length > 0) {
        setCelebrated(true);
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          confetti({
            particleCount: 110,
            spread: 78,
            origin: { y: 0.6 },
            colors: ["#ffd81f", "#c9793c", "#f2f4f6"],
          });
        }
      }
    } catch {
      // The next poll covers it.
    } finally {
      setLoading(false);
    }
  }, [celebrated]);

  usePoll(fetchLeaderboard, 4000);

  const ended = contest.status === "ENDED";
  const podium = teams.slice(0, 3);
  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const formatLast = (value: string | null) =>
    value
      ? new Date(value).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "—";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        team={team}
        status={contest.status}
        remaining={contest.remaining}
        duration={contest.duration}
        loaded={contest.loaded}
        onOpenAuth={openAuth}
        onLogout={async () => {
          await fetch("/api/auth/team/logout", { method: "POST" });
          setTeam(null);
        }}
      />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-20 pt-10 sm:px-6 lg:px-10">
        {/* Header */}
        <section className="flex flex-wrap items-end justify-between gap-6 border-b border-edge pb-8">
          <div>
            <div className="silkscreen mb-3">
              {ended ? "Final result" : "Live standings"}
            </div>
            <h1 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-none tracking-[-0.035em] text-foreground">
              {ended ? "Final coin balances" : "Who is ahead"}
            </h1>
            <p className="mt-3.5 max-w-lg text-[14px] leading-relaxed text-muted-foreground">
              Coins are the bidding currency for round 2, so this board is the money
              board. It refreshes every four seconds on its own.
            </p>
          </div>

          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-edge bg-edge">
            <Stat label="Teams" value={stats.totalTeams} />
            <Stat label="Flags taken" value={stats.totalSolves} accent />
            <Stat label="Objectives" value={stats.totalChallenges} />
          </dl>
        </section>

        {/* Podium */}
        {podium.length > 0 && (
          <section className="grid grid-cols-1 gap-4 pt-8 sm:grid-cols-3">
            {podium.map((t, i) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={`panel relative overflow-hidden p-5 ${
                  i === 0 ? "sm:-translate-y-2" : ""
                }`}
                style={i === 0 ? { borderColor: "color-mix(in srgb, var(--signal) 40%, transparent)" } : undefined}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: MEDALS[i].color }}
                />

                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: MEDALS[i].color }}
                  >
                    {MEDALS[i].label}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {t.solvesCount} flag{t.solvesCount === 1 ? "" : "s"}
                  </span>
                </div>

                <h2 className="mt-3 truncate font-display text-lg font-semibold tracking-tight text-foreground">
                  {t.name}
                </h2>

                <div className="mt-3 flex items-baseline gap-2">
                  <span
                    className="font-mono text-[34px] font-bold leading-none"
                    style={{ color: i === 0 ? "var(--signal)" : "var(--foreground)" }}
                  >
                    {formatINR(t.score)}
                  </span>
                  <span className="silkscreen">reward</span>
                </div>
              </motion.div>
            ))}
          </section>
        )}

        {/* Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 pt-10">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Find a team"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-edge bg-board py-2.5 pl-9 pr-3 text-[13px] text-foreground transition-colors placeholder:text-muted-foreground/50 focus:border-signal focus:outline-none"
            />
          </div>
          <span className="silkscreen">
            {filtered.length} of {teams.length} shown
          </span>
        </div>

        {/* Table */}
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-edge bg-rail/40">
                  <Th className="w-16 text-center">#</Th>
                  <Th>Team</Th>
                  <Th className="text-center">Flags</Th>
                  <Th className="text-center">Last capture</Th>
                  <Th className="text-right">Reward</Th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((t) => {
                    const mine = team?.id === t.id;
                    const medal = t.rank <= 3 ? MEDALS[t.rank - 1] : null;

                    return (
                      <motion.tr
                        layout
                        key={t.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 380, damping: 34 }}
                        className={`border-b border-edge/70 transition-colors last:border-0 hover:bg-rail/40 ${
                          mine ? "bg-signal/[0.04]" : ""
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className="inline-flex h-6 min-w-6 items-center justify-center rounded-sm px-1 font-mono text-[11px] font-bold"
                            style={
                              medal
                                ? {
                                    color: medal.color,
                                    border: `1px solid color-mix(in srgb, ${medal.color} 45%, transparent)`,
                                    background: `color-mix(in srgb, ${medal.color} 10%, transparent)`,
                                  }
                                : { color: "var(--muted-foreground)" }
                            }
                          >
                            {t.rank}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="flex items-center gap-2.5">
                            <span className="font-display text-[14px] font-semibold text-foreground">
                              {t.name}
                            </span>
                            {mine && (
                              <span className="chip border-signal/40 text-signal">you</span>
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center font-mono text-[13px] text-foreground">
                          {t.solvesCount}
                        </td>

                        <td className="px-4 py-3.5 text-center font-mono text-[12px] text-muted-foreground">
                          {formatLast(t.lastSubmissionAt)}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <span className="font-mono text-[16px] font-bold text-signal">
                            {formatINR(t.score)}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16">
                      <div className="mx-auto max-w-sm text-center">
                        <Trophy className="mx-auto h-6 w-6 text-copper" />
                        <h3 className="mt-4 font-display text-[15px] font-semibold text-foreground">
                          {search ? "No team by that name" : "Nobody on the board yet"}
                        </h3>
                        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                          {search
                            ? "Check the spelling, or clear the search to see everyone."
                            : "Register a team and you will be the first name here."}
                        </p>
                        {!search && !team && contest.status !== "ENDED" && (
                          <button
                            onClick={() => openAuth("register")}
                            className="mt-5 rounded-md bg-signal px-4 py-2.5 font-display text-[13px] font-semibold text-ink transition-colors hover:bg-signal/85"
                          >
                            Register a team
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AuthModal
        key={`${authModalOpen}-${authMode}`}
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(loggedTeam) => {
          setTeam(loggedTeam);
          void refreshTeam();
          void fetchLeaderboard();
        }}
      />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-board px-5 py-4 text-center sm:min-w-[110px]">
      <dt className="silkscreen">{label}</dt>
      <dd
        className={`mt-2.5 font-mono text-[24px] font-bold leading-none ${
          accent ? "text-signal" : "text-foreground"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}
