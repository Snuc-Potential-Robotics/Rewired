"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { AuthModal } from "@/components/AuthModal";
import { 
  Trophy, 
  Medal, 
  Search, 
  Clock, 
  Flame, 
  CheckCircle2, 
  Crown, 
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface RankedTeam {
  rank: number;
  id: number;
  name: string;
  score: number;
  solvesCount: number;
  lastSubmissionAt: string | null;
  createdAt: string;
}

export default function LeaderboardPage() {
  const [team, setTeam] = useState<{ id: number; name: string; code: string; score: number } | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [teams, setTeams] = useState<RankedTeam[]>([]);
  const [contestStatus, setContestStatus] = useState<string>("PENDING");
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(1800);
  const [stats, setStats] = useState({ totalTeams: 0, totalSolves: 0, totalChallenges: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [confettiFired, setConfettiFired] = useState(false);

  // Fetch current team
  useEffect(() => {
    fetch("/api/auth/team/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) setTeam(data.team);
      })
      .catch(() => {});
  }, []);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
        setContestStatus(data.status);
        setTimeRemainingSeconds(data.timeRemainingSeconds);
        if (data.stats) setStats(data.stats);

        // If contest ended and confetti not fired yet, fire celebration confetti!
        if (data.status === "ENDED" && !confettiFired && data.teams?.length > 0) {
          setConfettiFired(true);
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#ffd81f", "#ffffff", "#44576b", "#e6c300"],
          });
        }
      }
    } catch (e) {
      console.error("Leaderboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [confettiFired]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 3000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const isEnded = contestStatus === "ENDED";
  const topThree = teams.slice(0, 3);

  // Formatting last submission time
  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return "No solves yet";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar
        team={team}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={async () => {
          await fetch("/api/auth/team/logout", { method: "POST" });
          setTeam(null);
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Leaderboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <TrendingUp className="w-4 h-4" />
              Live Standings • Real-Time Dynamic Sync
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight font-mono text-foreground flex items-center gap-3">
              LEADERBOARD
              {isEnded && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-primary text-primary-foreground font-sans font-bold tracking-normal">
                  FINAL RESULTS
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Rankings automatically update with fluid animations upon verified flag submissions.
            </p>
          </div>

          {/* Aggregate Stats */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="px-3.5 py-2 rounded-xl bg-card border border-border text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Teams
              </div>
              <div className="text-base font-bold font-mono text-foreground">{stats.totalTeams}</div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-card border border-border text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Total Solves
              </div>
              <div className="text-base font-bold font-mono text-primary">{stats.totalSolves}</div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-card border border-border text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Challenges
              </div>
              <div className="text-base font-bold font-mono text-foreground">
                {stats.totalChallenges}
              </div>
            </div>
          </div>
        </div>

        {/* TOP 3 PODIUM CELEBRATION (Displayed prominently, especially when contest is concluded) */}
        {topThree.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground font-mono">
                <Crown className="w-4 h-4 text-primary" />
                TOP 3 PODIUM {isEnded ? "CHAMPIONS" : "LEADERS"}
              </div>
              {isEnded && (
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  Competition Finished
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
              {/* 2nd Place (Silver) */}
              {topThree[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="order-2 md:order-1 rounded-2xl bg-card border border-[#d3ccc7]/30 p-5 flex flex-col items-center text-center relative overflow-hidden shadow-lg"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-[#d3ccc7]" />
                  <div className="w-12 h-12 rounded-full bg-[#d3ccc7]/15 border border-[#d3ccc7]/40 flex items-center justify-center text-[#d3ccc7] mb-3 shadow-inner">
                    <Medal className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#d3ccc7]/20 text-[#d3ccc7] mb-2">
                    2ND PLACE
                  </span>
                  <h3 className="font-bold text-lg text-foreground truncate max-w-[200px]">
                    {topThree[1].name}
                  </h3>
                  <div className="font-mono text-2xl font-black text-foreground mt-2">
                    {topThree[1].score}{" "}
                    <span className="text-xs text-muted-foreground font-normal">PTS</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    {topThree[1].solvesCount} solves
                  </div>
                </motion.div>
              )}

              {/* 1st Place (Gold #ffd81f) - Highest & Center */}
              {topThree[0] && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="order-1 md:order-2 rounded-2xl bg-gradient-to-b from-card to-secondary/70 border-2 border-primary/60 p-6 flex flex-col items-center text-center relative overflow-hidden shadow-2xl md:-translate-y-2"
                >
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-primary shadow-[0_0_12px_#ffd81f]" />
                  <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-primary mb-3 shadow-[0_0_20px_rgba(255,216,31,0.2)]">
                    <Crown className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-primary text-primary-foreground mb-2 shadow-sm">
                    🥇 1ST PLACE CHAMPION
                  </span>
                  <h3 className="font-extrabold text-xl text-foreground truncate max-w-[220px]">
                    {topThree[0].name}
                  </h3>
                  <div className="font-mono text-3xl font-black text-primary mt-2">
                    {topThree[0].score}{" "}
                    <span className="text-xs text-muted-foreground font-normal">PTS</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {topThree[0].solvesCount} flags captured
                  </div>
                </motion.div>
              )}

              {/* 3rd Place (Bronze) */}
              {topThree[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="order-3 rounded-2xl bg-card border border-[#87a1bd]/30 p-5 flex flex-col items-center text-center relative overflow-hidden shadow-lg"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-[#87a1bd]" />
                  <div className="w-12 h-12 rounded-full bg-[#87a1bd]/15 border border-[#87a1bd]/40 flex items-center justify-center text-[#87a1bd] mb-3 shadow-inner">
                    <Medal className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#87a1bd]/20 text-[#87a1bd] mb-2">
                    3RD PLACE
                  </span>
                  <h3 className="font-bold text-lg text-foreground truncate max-w-[200px]">
                    {topThree[2].name}
                  </h3>
                  <div className="font-mono text-2xl font-black text-foreground mt-2">
                    {topThree[2].score}{" "}
                    <span className="text-xs text-muted-foreground font-normal">PTS</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    {topThree[2].solvesCount} solves
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* Search and Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search team name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 self-end sm:self-auto">
            <RefreshCw className="w-3 h-3 text-primary animate-spin" style={{ animationDuration: "6s" }} />
            Auto-refreshing every 3s
          </div>
        </div>

        {/* Dynamic Animated Standings Table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-mono uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                  <th className="py-3.5 px-4">Team</th>
                  <th className="py-3.5 px-4 text-center">Solves</th>
                  <th className="py-3.5 px-4 text-center">Last Submission</th>
                  <th className="py-3.5 px-4 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <AnimatePresence>
                  {filteredTeams.map((t) => {
                    const isUserTeam = team?.id === t.id;
                    const isTop1 = t.rank === 1;
                    const isTop2 = t.rank === 2;
                    const isTop3 = t.rank === 3;

                    return (
                      <motion.tr
                        layout
                        key={t.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 35,
                        }}
                        className={`transition-colors hover:bg-secondary/40 ${
                          isUserTeam ? "bg-primary/5 font-medium" : ""
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono font-bold text-xs ${
                              isTop1
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : isTop2
                                ? "bg-[#d3ccc7]/20 text-[#d3ccc7] border border-[#d3ccc7]/30"
                                : isTop3
                                ? "bg-[#87a1bd]/20 text-[#87a1bd] border border-[#87a1bd]/30"
                                : "bg-secondary text-muted-foreground border border-border"
                            }`}
                          >
                            {t.rank}
                          </span>
                        </td>

                        {/* Team Name */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">
                              {t.name}
                            </span>
                            {isUserTeam && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/20 text-primary border border-primary/30">
                                Your Team
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Solves */}
                        <td className="py-4 px-4 text-center font-mono text-foreground">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                            {t.solvesCount}
                          </span>
                        </td>

                        {/* Last Submission */}
                        <td className="py-4 px-4 text-center font-mono text-muted-foreground text-[11px]">
                          {formatTimeAgo(t.lastSubmissionAt)}
                        </td>

                        {/* Score */}
                        <td className="py-4 px-4 text-right">
                          <span className="font-mono text-base font-extrabold text-primary">
                            {t.score}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-1 font-mono">
                            PTS
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>

                {!loading && filteredTeams.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-muted-foreground text-xs">
                      <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                          <Trophy className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-bold text-sm text-foreground">
                            {searchQuery ? "No Matching Teams" : "Telemetry Standby • No Teams Registered Yet"}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {searchQuery
                              ? "No registered team matches your search query. Try another name."
                              : "Be the first team to enter the hardware arena and claim the top of the podium!"}
                          </p>
                        </div>
                        {!searchQuery && !team && (
                          <button
                            onClick={() => setAuthModalOpen(true)}
                            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:bg-primary/90 transition-all"
                          >
                            Register Team Now
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
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(loggedTeam) => {
          setTeam(loggedTeam);
          fetchLeaderboard();
        }}
      />
    </div>
  );
}
