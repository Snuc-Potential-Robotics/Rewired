"use client";

import React from "react";
import { ContestStatus, formatClock } from "@/lib/use-contest";

interface MissionClockProps {
  status: ContestStatus;
  remaining: number;
  duration: number;
  /** False until the first contest poll lands. */
  loaded?: boolean;
}

const CRITICAL_SECONDS = 300;

/**
 * The burn-down fuse.
 *
 * A single hairline spanning the viewport under the header. The bright signal
 * segment is the time you have left; it is eaten from the left by a travelling
 * marker as the window closes. Under five minutes the whole thing turns red
 * and blinks. It is the one element every team will keep glancing at, so it
 * gets the page's full width and none of its decoration.
 */
export function FuseTrace({ status, remaining, duration }: MissionClockProps) {
  const running = status === "RUNNING";
  const critical = running && remaining <= CRITICAL_SECONDS;
  const burntPct = running
    ? Math.min(100, Math.max(0, ((duration - remaining) / duration) * 100))
    : status === "ENDED"
      ? 100
      : 0;

  const live = critical ? "var(--breach)" : status === "PAUSED" ? "var(--copper)" : "var(--signal)";

  return (
    <div
      className="relative h-[3px] w-full bg-edge/60 overflow-hidden"
      role="progressbar"
      aria-label="Time remaining in the infiltration window"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={running ? remaining : status === "ENDED" ? 0 : duration}
    >
      {/* Quarter vias, so you can read roughly where you are without the number. */}
      {[25, 50, 75].map((pct) => (
        <span
          key={pct}
          aria-hidden
          className="absolute top-0 h-full w-px bg-edge-strong"
          style={{ left: `${pct}%` }}
        />
      ))}

      {/* Unburnt fuse: the time still on the clock. Only lit once the window
          is actually open — a bright bar before launch would read as running. */}
      {(status === "RUNNING" || status === "PAUSED") && (
        <div
          className={`absolute top-0 h-full transition-[left] duration-1000 ease-linear ${
            critical ? "animate-signal-blink" : ""
          }`}
          style={{ left: `${burntPct}%`, right: 0, background: live }}
        />
      )}

      {/* The travelling marker sitting on the burn point. */}
      {running && (
        <span
          aria-hidden
          className="absolute top-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rotate-45 transition-[left] duration-1000 ease-linear"
          style={{ left: `${burntPct}%`, background: live }}
        />
      )}

      {/* Before launch the line idles with an analyzer sweep instead of sitting dead. */}
      {status === "PENDING" && (
        <span
          aria-hidden
          className="absolute inset-y-0 w-1/3 animate-sweep bg-gradient-to-r from-transparent via-signal/45 to-transparent"
        />
      )}
    </div>
  );
}

/** The readout itself: status word above, clock below. */
export function ClockReadout({ status, remaining, duration, loaded = true }: MissionClockProps) {
  const running = loaded && status === "RUNNING";
  const critical = running && remaining <= CRITICAL_SECONDS;

  const label = !loaded
    ? "Reading clock"
    : status === "RUNNING"
        ? critical
          ? "Window closing"
          : "Window open"
        : status === "PAUSED"
          ? "Held"
          : status === "ENDED"
            ? "Window closed"
            : "Awaiting launch";

  // Before the first poll lands there is no real number to show, and a
  // placeholder duration would flash the wrong window length.
  const value = !loaded
    ? "--:--"
    : status === "RUNNING"
      ? formatClock(remaining)
      : status === "ENDED"
        ? "00:00"
        : formatClock(duration);

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className={`h-1.5 w-1.5 shrink-0 rotate-45 ${
          running
            ? critical
              ? "bg-breach animate-signal-blink"
              : "bg-signal animate-signal-blink"
            : status === "PAUSED"
              ? "bg-copper"
              : "bg-muted-foreground"
        }`}
      />
      <div className="leading-none">
        <div className="silkscreen mb-1.5">{label}</div>
        <div
          className={`font-mono text-2xl font-bold leading-none tracking-tight ${
            critical ? "text-breach" : running ? "text-signal" : "text-muted-foreground"
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
