"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ContestStatus = "PENDING" | "RUNNING" | "PAUSED" | "ENDED";

export interface ContestState {
  status: ContestStatus;
  /** Seconds left on the clock. Ticked locally between polls. */
  remaining: number;
  /** Full contest length, used to draw the depletion trace. */
  duration: number;
  /** False until the first poll lands, so the UI can avoid showing a guess. */
  loaded: boolean;
}

/**
 * Poll `fn` on an interval.
 *
 * The first run always happens, even if the tab is in the background — a
 * scoreboard opened in a second window still has to fill in. Only the repeat
 * polls are skipped while hidden, and becoming visible again triggers an
 * immediate refresh so the page is never stale when someone looks at it.
 *
 * The first run is scheduled rather than called inline so the effect never
 * sets state on the render path that scheduled it.
 */
function usePoll(fn: () => void | Promise<void>, intervalMs: number) {
  useEffect(() => {
    let disposed = false;

    const run = () => {
      if (!disposed) void fn();
    };
    const runIfVisible = () => {
      if (document.visibilityState === "visible") run();
    };

    const kickoff = setTimeout(run, 0);
    const interval = setInterval(runIfVisible, intervalMs);
    document.addEventListener("visibilitychange", runIfVisible);

    return () => {
      disposed = true;
      clearTimeout(kickoff);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", runIfVisible);
    };
  }, [fn, intervalMs]);
}

/**
 * One poll of `/api/contest` for the whole page. The navbar and the page body
 * both need the clock, and polling it separately put two requests a second on
 * the server for every team in the room.
 */
export function useContest(pollMs = 3000): ContestState & { refresh: () => void } {
  const [state, setState] = useState<ContestState>({
    status: "PENDING",
    remaining: 0,
    duration: 0,
    loaded: false,
  });

  const fetchContest = useCallback(async () => {
    try {
      const res = await fetch("/api/contest", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setState({
        status: (data.status as ContestStatus) ?? "PENDING",
        remaining: Number(data.time_remaining_seconds ?? 0),
        duration: Math.max(1, Number(data.duration_seconds ?? 1)),
        loaded: true,
      });
    } catch {
      // A dropped poll is not worth surfacing; the next one covers it.
    }
  }, []);

  usePoll(fetchContest, pollMs);

  // Local one-second tick so the clock counts down smoothly between polls.
  useEffect(() => {
    if (state.status !== "RUNNING") return;
    const id = setInterval(() => {
      setState((prev) =>
        prev.status === "RUNNING"
          ? { ...prev, remaining: Math.max(0, prev.remaining - 1) }
          : prev
      );
    }, 1000);
    return () => clearInterval(id);
  }, [state.status]);

  return { ...state, refresh: fetchContest };
}

/** mm:ss, zero-padded, for a face that has tabular figures. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export interface TeamState {
  id: number;
  name: string;
  code: string;
  score: number;
  solvedQuestionIds?: number[];
}

/**
 * Polls the team session. Kept slow on purpose: the score also comes back
 * from a correct submission, so this only needs to catch changes made
 * elsewhere — a teammate on another device, or an organiser adjustment.
 */
export function useTeamSession(pollMs = 15000) {
  const [team, setTeam] = useState<TeamState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/team/me", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!mounted.current) return;
      setTeam(data.authenticated ? data.team : null);
    } catch {
      // Leave the last known session in place rather than signing a team out
      // on a flaky network mid-contest.
    } finally {
      if (mounted.current) setLoaded(true);
    }
  }, []);

  usePoll(refresh, pollMs);

  return { team, setTeam, loaded, refresh };
}

export { usePoll };
