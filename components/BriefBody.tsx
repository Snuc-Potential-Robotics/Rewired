"use client";

import React from "react";

interface BriefSection {
  /** The bracketed marker, e.g. STORY — null for text before the first one. */
  heading: string | null;
  body: string;
}

/**
 * Organisers write challenge briefs with bracketed section markers on their
 * own line:
 *
 *   [STORY]
 *   You have been contracted to...
 *
 *   [MISSION]
 *   Intercept the BLE advertisements...
 *
 * Rendered as one pre-wrapped blob those markers carried no more weight than
 * the prose around them, so a team under time pressure had to read the whole
 * thing to find what it actually had to submit.
 */
function parseBrief(description: string): BriefSection[] {
  const sections: BriefSection[] = [];
  let current: BriefSection = { heading: null, body: "" };

  for (const line of description.split("\n")) {
    const marker = line.trim().match(/^\[([^\]]+)\]$/);
    if (marker) {
      if (current.heading !== null || current.body.trim()) sections.push(current);
      current = { heading: marker[1].trim(), body: "" };
    } else {
      current.body += current.body ? `\n${line}` : line;
    }
  }

  if (current.heading !== null || current.body.trim()) sections.push(current);
  return sections;
}

/** Flags and code-ish tokens get monospaced so they stand out from prose. */
function highlightTokens(text: string): React.ReactNode[] {
  return text.split(/(flag\{[^}]*\})/g).map((part, i) =>
    /^flag\{[^}]*\}$/.test(part) ? (
      <code
        key={i}
        className="rounded-sm border border-signal/30 bg-signal/10 px-1.5 py-0.5 font-mono text-[13px] font-semibold text-signal"
      >
        {part}
      </code>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

/**
 * The section a team has to act on gets the signal colour; the narrative
 * sections stay quiet. Anything unrecognised falls back to copper so a new
 * marker an organiser invents still reads as a heading.
 */
function toneFor(heading: string): string {
  const key = heading.toUpperCase();
  if (key.includes("SUBMISSION") || key.includes("MISSION")) return "text-signal";
  if (key.includes("STORY") || key.includes("BRIEF")) return "text-foreground";
  return "text-copper";
}

export function BriefBody({ description }: { description: string }) {
  const sections = parseBrief(description);
  const hasMarkers = sections.some((s) => s.heading !== null);

  // Briefs written without markers keep their original plain rendering.
  if (!hasMarkers) {
    return (
      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/90">
        {highlightTokens(description)}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {sections.map((section, i) => (
        <section key={i}>
          {section.heading && (
            <h4 className="mb-2 flex items-center gap-2.5">
              <span
                aria-hidden
                className={`h-1 w-1 shrink-0 rotate-45 ${
                  toneFor(section.heading) === "text-signal"
                    ? "bg-signal"
                    : "bg-copper"
                }`}
              />
              <span
                className={`font-display text-[15px] font-bold uppercase tracking-[0.08em] ${toneFor(
                  section.heading
                )}`}
              >
                {section.heading}
              </span>
              <span aria-hidden className="h-px flex-1 bg-edge" />
            </h4>
          )}
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-muted-foreground">
            {highlightTokens(section.body.trim())}
          </p>
        </section>
      ))}
    </div>
  );
}
