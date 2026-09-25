"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Check, Copy, LogOut, Menu, X } from "lucide-react";
import { useToast } from "./Toast";
import { ClockReadout, FuseTrace } from "./MissionClock";
import { ContestStatus, TeamState, formatClock } from "@/lib/use-contest";
import { formatINR } from "@/lib/utils";

interface NavbarProps {
  team?: TeamState | null;
  status: ContestStatus;
  remaining: number;
  duration: number;
  loaded?: boolean;
  onOpenAuth?: (initialMode?: "register" | "login") => void;
  onLogout?: () => void;
}

const NAV_LINKS = [
  { href: "/", label: "Objectives" },
  { href: "/leaderboard", label: "Standings" },
];

export function Navbar({
  team,
  status,
  remaining,
  duration,
  loaded = true,
  onOpenAuth,
  onLogout,
}: NavbarProps) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const copyCode = () => {
    if (!team?.code) return;
    navigator.clipboard.writeText(team.code);
    setCopied(true);
    toast("Access code copied.", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-ink/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] w-full max-w-[1400px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-10">
        {/* Identity */}
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-edge bg-board p-1.5 transition-colors group-hover:border-signal/50">
            <Image
              src="/logo.png"
              alt=""
              width={32}
              height={32}
              className="h-full w-full object-contain"
              priority
            />
          </span>
          <span className="leading-none">
            <span className="block font-display text-[19px] font-bold tracking-[-0.02em] text-foreground">
              REWIRED
              <span className="ml-1.5 font-mono text-[13px] font-medium text-signal">26</span>
            </span>
            <span className="silkscreen mt-1.5 hidden sm:block">
              SNUC Potential Robotics
            </span>
          </span>
        </Link>

        {/* The clock sits dead centre. In a 45-minute event it is the most
            important number on the screen. */}
        <div className="hidden lg:block">
          <ClockReadout status={status} remaining={remaining} duration={duration} loaded={loaded} />
        </div>

        {/* Navigation and team readout */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative px-3 py-2 font-display text-[13px] font-medium transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-px bg-signal" />
                )}
              </Link>
            );
          })}

          <span className="mx-2 h-6 w-px bg-edge" />

          {team ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-edge bg-board px-3 py-1.5">
              <span className="leading-none">
                <span className="block max-w-[140px] truncate font-display text-[13px] font-semibold text-foreground">
                  {team.name}
                </span>
                <span className="mt-1 block font-mono text-[11px] font-semibold text-signal">
                  {formatINR(team.score)}
                </span>
              </span>

              <button
                onClick={copyCode}
                className="chip flex items-center gap-1.5 text-copper transition-colors hover:border-copper/60"
                title="Copy your team access code"
              >
                {team.code}
                {copied ? (
                  <Check className="h-3 w-3 text-verified" />
                ) : (
                  <Copy className="h-3 w-3 opacity-50" />
                )}
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sign out"
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-breach/10 hover:text-breach"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth?.("login")}
                className="px-3 py-2 font-display text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </button>
              <button
                onClick={() => onOpenAuth?.("register")}
                className="rounded-md bg-signal px-4 py-2 font-display text-[13px] font-semibold text-ink transition-colors hover:bg-signal/85"
              >
                Register a team
              </button>
            </div>
          )}
        </div>

        {/* Compact rail. The clock stays on screen at every width — there used
            to be a band between the tablet and desktop layouts where neither
            version showed and the timer vanished entirely. */}
        <div className="flex items-center gap-3 lg:hidden">
          <span
            className={`font-mono text-lg font-bold leading-none ${
              loaded && status === "RUNNING"
                ? remaining <= 300
                  ? "text-breach animate-signal-blink"
                  : "text-signal"
                : "text-muted-foreground"
            }`}
          >
            {loaded && status === "RUNNING"
              ? formatClock(remaining)
              : loaded && status === "ENDED"
                ? "00:00"
                : "--:--"}
          </span>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="rounded-md border border-edge bg-board p-2 text-foreground md:hidden"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* The fuse: full bleed, right under the rail. */}
      <FuseTrace status={status} remaining={remaining} duration={duration} />

      {menuOpen && (
        <div className="space-y-4 border-b border-edge bg-board px-4 py-5 md:hidden">
          {team ? (
            <div className="flex items-center justify-between rounded-lg border border-edge bg-rail px-3 py-3">
              <span>
                <span className="block font-display text-sm font-semibold text-foreground">
                  {team.name}
                </span>
                <span className="mt-1 block font-mono text-xs font-semibold text-signal">
                  {formatINR(team.score)}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <button onClick={copyCode} className="chip text-copper">
                  {team.code}
                </button>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    aria-label="Sign out"
                    className="rounded p-1.5 text-muted-foreground hover:text-breach"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenAuth?.("register");
                }}
                className="rounded-md bg-signal py-2.5 font-display text-[13px] font-semibold text-ink"
              >
                Register a team
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenAuth?.("login");
                }}
                className="rounded-md border border-edge bg-rail py-2.5 font-display text-[13px] font-semibold text-foreground"
              >
                Sign in
              </button>
            </div>
          )}

          <nav className="flex flex-col border-t border-edge pt-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`px-1 py-2.5 font-display text-sm font-medium ${
                  pathname === link.href ? "text-signal" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
