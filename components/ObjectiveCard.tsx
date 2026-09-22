"use client";

import React from "react";
import { ArrowRight, Check, Lock } from "lucide-react";
import type { QuestionItem } from "./ChallengeModal";

interface ObjectiveCardProps {
  question: QuestionItem;
  index: number;
  locked: boolean;
  onOpen: () => void;
}

/**
 * One objective, drawn as a module on a board: a silkscreen header carrying
 * its reference designator and payout, the brief in the middle, and a copper
 * pad strip along the bottom edge.
 *
 * The designator is real structure, not decoration — the objectives run in
 * order (get close, clone the card, take the key), so U1 through Un tells a
 * team where in the attack chain they are.
 */
export function ObjectiveCard({ question, index, locked, onOpen }: ObjectiveCardProps) {
  const solved = Boolean(question.isSolved);
  const designator = `U${index + 1}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={locked}
      aria-label={`${question.title}, ${question.points} coins`}
      className={`panel group relative flex w-full flex-col overflow-hidden text-left transition-all duration-200 ${
        locked
          ? "cursor-not-allowed"
          : "hover:-translate-y-0.5 hover:border-edge-strong hover:shadow-lift"
      } ${solved ? "border-verified/30" : ""}`}
    >
      {/* Silkscreen header */}
      <div className="flex items-center justify-between gap-3 border-b border-edge bg-rail/40 px-4 py-2.5">
        <span className="flex items-center gap-2.5">
          <span
            className={`flex h-[22px] min-w-[26px] items-center justify-center rounded-sm border px-1 font-mono text-[10px] font-bold ${
              solved
                ? "border-verified/45 bg-verified/10 text-verified"
                : "border-copper/45 bg-copper/10 text-copper"
            }`}
          >
            {designator}
          </span>
          <span className="silkscreen">
            {solved ? "Captured" : locked ? "Sealed" : "Live"}
          </span>
        </span>

        <span
          className={`font-mono text-[13px] font-bold ${
            solved ? "text-verified" : "text-signal"
          }`}
        >
          {question.current_points ?? question.points}
          <span className="ml-1 text-[10px] font-medium text-muted-foreground">coins</span>
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <h3
          className={`font-display text-[17px] font-semibold leading-snug tracking-tight transition-colors ${
            solved ? "text-verified" : "text-foreground group-hover:text-signal"
          }`}
        >
          {question.title}
        </h3>
        <p className="line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
          {question.description}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-edge px-5 py-3">
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          {question.isFirstBloodAvailable && !solved && !locked && (
            <span className="inline-block rounded-xs bg-signal/15 px-1 py-0.5 text-[9px] font-semibold uppercase text-signal">
              First Blood
            </span>
          )}
          <span>
            {Number(question.solves_count ?? 0)} team
            {Number(question.solves_count ?? 0) === 1 ? "" : "s"} solved
          </span>
        </span>

        <span
          className={`flex items-center gap-1.5 font-display text-[12px] font-semibold ${
            solved ? "text-verified" : locked ? "text-muted-foreground" : "text-signal"
          }`}
        >
          {solved ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Solved
            </>
          ) : locked ? (
            <>
              <Lock className="h-3.5 w-3.5" />
              Sealed
            </>
          ) : (
            <>
              Open
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </span>
      </div>

      {/* Copper edge connector in the bottom-left corner of the module. Kept
          short on purpose — run full width it reads as a broken border. */}
      <span aria-hidden className="pads absolute bottom-0 left-0 h-[3px] w-20" />
    </button>
  );
}
