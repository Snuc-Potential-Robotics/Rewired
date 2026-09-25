"use client";

import React from "react";
import { Bot, Coins, Lock } from "lucide-react";
import type { Briefing } from "@/lib/briefing";

interface BriefingPanelProps {
  briefing: Briefing | null;
  sealed: boolean;
  loading: boolean;
}

/**
 * The operation briefing.
 *
 * Before launch this is challenge content, so the server does not send it at
 * all — the sealed state below is drawn from nothing. The blurred bars are
 * decoration over an empty panel, not real text with a filter on top, so
 * there is nothing to recover from the page source or DevTools.
 */
export function BriefingPanel({ briefing, sealed, loading }: BriefingPanelProps) {
  return (
    <section className="space-y-4">
      {/* Rules of engagement. These stay readable before the start: teams
          need to know what is allowed while they are still setting up. */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <RuleCard
          icon={<Bot className="h-4 w-4" />}
          tone="verified"
          title="AI tools are allowed"
          body="Use ChatGPT, Claude, Gemini, Copilot or anything else for firmware analysis, code generation and debugging. No restrictions."
        />
        <RuleCard
          icon={<Coins className="h-4 w-4" />}
          tone="signal"
          title="Coins carry into round 2"
          body="Every flag you capture pays coins. Your round 1 balance is the money you bid with in round 2, so nothing you earn here is spent."
        />
      </div>

      <div className="panel overflow-hidden">
        <header className="flex items-center justify-between gap-4 border-b border-edge px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="silkscreen">Operation briefing</span>
            <span className="hidden font-display text-sm font-semibold text-foreground sm:block">
              {sealed || !briefing ? "Sealed" : briefing.operation}
            </span>
          </div>

          {sealed && (
            <span className="chip flex items-center gap-1.5 text-muted-foreground">
              <Lock className="h-3 w-3" />
              Opens at launch
            </span>
          )}
        </header>

        {loading ? (
          <div className="px-5 py-14 text-center">
            <span className="silkscreen">Loading</span>
          </div>
        ) : sealed || !briefing ? (
          <SealedBriefing />
        ) : (
          <div className="grid grid-cols-1 divide-y divide-edge">
            {briefing.panels.map((panel) => (
              <article key={panel.designator} className="space-y-3 p-5">
                <h3 className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-copper/50 bg-copper/10 font-mono text-[10px] font-bold text-copper">
                    {panel.designator}
                  </span>
                  <span className="font-display text-sm font-semibold tracking-tight text-foreground">
                    {panel.heading}
                  </span>
                </h3>

                {panel.paragraphs.map((text, i) => (
                  <p key={i} className="text-[13px] leading-relaxed text-muted-foreground">
                    {text}
                  </p>
                ))}

                {panel.list && (
                  <div className="mt-4 rounded-md border border-edge bg-rail/60 p-3.5">
                    <div className="silkscreen mb-2.5">{panel.list.label}</div>
                    <ul className="space-y-1.5">
                      {panel.list.items.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 font-mono text-[12px] text-foreground"
                        >
                          <span
                            aria-hidden
                            className="mt-[7px] h-1 w-1 shrink-0 rotate-45 bg-copper"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** Three empty panel bays with redaction bars where the briefing will land. */
function SealedBriefing() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="grid grid-cols-1 divide-y divide-edge blur-[5px] select-none lg:grid-cols-3 lg:divide-x lg:divide-y-0"
      >
        {["A", "B", "C"].map((designator, panelIndex) => (
          <div key={designator} className="space-y-3 p-5 opacity-45">
            <div className="flex items-center gap-2.5">
              <span className="h-5 w-5 rounded-sm bg-copper/25" />
              <span className="h-3 w-24 rounded-sm bg-foreground/25" />
            </div>
            {[
              ["100%", "94%", "88%", "62%"],
              ["100%", "82%", "91%", "48%"],
              ["96%", "100%", "73%", "85%"],
            ][panelIndex].map((width, i) => (
              <div
                key={i}
                className="h-2.5 rounded-sm bg-foreground/12"
                style={{ width }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Analyzer sweep over the sealed bays, so the panel reads as armed
          rather than broken. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-sweep bg-gradient-to-r from-transparent via-signal/[0.07] to-transparent"
      />

      <div className="absolute inset-0 flex items-center justify-center p-5">
        <div className="max-w-md rounded-lg border border-edge bg-ink/85 px-6 py-5 text-center backdrop-blur-sm">
          <Lock className="mx-auto mb-3 h-5 w-5 text-signal" />
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
            The briefing opens when the clock starts
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            The story, the mission and the intelligence are part of the challenge, so
            they stay sealed until an organiser starts the window. Wire up your kit in
            the meantime.
          </p>
        </div>
      </div>
    </div>
  );
}

function RuleCard({
  icon,
  title,
  body,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: "verified" | "signal";
}) {
  const accent =
    tone === "verified"
      ? { border: "border-verified/25", bg: "bg-verified/[0.06]", text: "text-verified" }
      : { border: "border-signal/25", bg: "bg-signal/[0.06]", text: "text-signal" };

  return (
    <div className={`flex items-start gap-3.5 rounded-lg border ${accent.border} ${accent.bg} p-4`}>
      <span className={`mt-0.5 shrink-0 ${accent.text}`}>{icon}</span>
      <div>
        <h3 className={`font-display text-[13px] font-semibold tracking-tight ${accent.text}`}>
          {title}
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
