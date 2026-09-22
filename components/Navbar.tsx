"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  Cpu, 
  Trophy, 
  Terminal, 
  ShieldAlert, 
  Clock, 
  Copy, 
  Check, 
  LogOut, 
  UserPlus, 
  Menu, 
  X,
  Flag
} from "lucide-react";
import { useToast } from "./Toast";

interface NavbarProps {
  team?: {
    id: number;
    name: string;
    code: string;
    score: number;
  } | null;
  onOpenAuth?: (initialMode?: "register" | "login") => void;
  onLogout?: () => void;
}

export function Navbar({ team, onOpenAuth, onLogout }: NavbarProps) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Contest timer state
  const [contestStatus, setContestStatus] = useState<string>("PENDING");
  const [remainingSeconds, setRemainingSeconds] = useState<number>(1800);

  // Poll contest state
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fetchContest = async () => {
      try {
        const res = await fetch("/api/contest");
        if (res.ok) {
          const data = await res.json();
          setContestStatus(data.status);
          setRemainingSeconds(data.time_remaining_seconds);
        }
      } catch (e) {
        console.error("Error fetching contest in navbar:", e);
      }
    };

    fetchContest();
    const interval = setInterval(fetchContest, 4000);

    return () => clearInterval(interval);
  }, []);

  // Local tick down
  useEffect(() => {
    if (contestStatus !== "RUNNING" || remainingSeconds <= 0) return;
    const tick = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [contestStatus, remainingSeconds]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCopyCode = () => {
    if (!team?.code) return;
    navigator.clipboard.writeText(team.code);
    setCopied(true);
    toast("Team code copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const navLinks = [
    { href: "/", label: "Challenges", icon: Terminal },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-card border border-border/80 flex items-center justify-center p-1 shadow-sm group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="Rewired Logo"
                width={32}
                height={32}
                className="object-contain w-full h-full"
                priority
              />
            </div>
            <div>
              <div className="font-mono font-bold tracking-tight text-lg text-foreground flex items-center gap-1.5">
                REWIRED
                <span className="text-[10px] tracking-wider uppercase font-semibold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                  HARDWARE CTF
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                SNUC Potential Robotics
              </p>
            </div>
          </Link>
        </div>

        {/* Contest Timer Badge (Synced across contestants) */}
        <div className="hidden md:flex items-center">
          <div
            className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border text-xs font-mono font-medium transition-all ${
              contestStatus === "RUNNING"
                ? remainingSeconds < 300
                  ? "bg-destructive/15 border-destructive/40 text-destructive animate-pulse"
                  : "bg-primary/10 border-primary/30 text-primary"
                : contestStatus === "ENDED"
                ? "bg-muted/80 border-border text-muted-foreground"
                : "bg-secondary border-border text-foreground"
            }`}
          >
            {contestStatus === "RUNNING" ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <Clock className="w-3.5 h-3.5" />
                <span className="tracking-wider">{formatTime(remainingSeconds)} REMAINING</span>
              </>
            ) : contestStatus === "ENDED" ? (
              <>
                <Flag className="w-3.5 h-3.5 text-muted-foreground" />
                <span>CONTEST CONCLUDED</span>
              </>
            ) : contestStatus === "PAUSED" ? (
              <>
                <Clock className="w-3.5 h-3.5 text-yellow-400" />
                <span>CONTEST PAUSED</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>AWAITING LAUNCH (30M)</span>
              </>
            )}
          </div>
        </div>

        {/* Desktop Nav Links & Team Pill */}
        <div className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-secondary text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}

          <div className="h-5 w-[1px] bg-border mx-1" />

          {/* Team Session or Register Button */}
          {team ? (
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-2.5 py-1 text-xs">
              <div className="flex flex-col">
                <span className="font-semibold text-foreground max-w-[120px] truncate">
                  {team.name}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {team.score} PTS
                </span>
              </div>

              {/* Unique Code Pill with 1-click Copy */}
              <button
                onClick={handleCopyCode}
                title="Click to copy team code"
                className="flex items-center gap-1 bg-secondary/80 hover:bg-secondary border border-border/80 rounded-lg px-2 py-1 font-mono text-[11px] text-primary transition-colors"
              >
                <span>{team.code}</span>
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sign out of team"
                  className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => onOpenAuth?.("register")}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Register Team
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Mobile timer compact */}
          <div className="text-[11px] font-mono px-2 py-1 rounded bg-secondary border border-border text-foreground">
            {contestStatus === "RUNNING" ? formatTime(remainingSeconds) : contestStatus}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl border border-border bg-card text-foreground"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card/95 backdrop-blur-lg px-4 pt-3 pb-5 space-y-3">
          {team ? (
            <div className="p-3 rounded-xl bg-secondary/60 border border-border flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-foreground">{team.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{team.score} PTS</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 bg-card border border-border px-2.5 py-1 rounded-lg text-xs font-mono text-primary"
                >
                  <span>{team.code}</span>
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth?.("register");
                }}
                className="flex-1 bg-primary text-primary-foreground font-medium text-xs py-2.5 rounded-xl text-center"
              >
                Register New Team
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth?.("login");
                }}
                className="flex-1 bg-secondary border border-border text-foreground font-medium text-xs py-2.5 rounded-xl text-center"
              >
                Enter with Code
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-border flex flex-col gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium ${
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
