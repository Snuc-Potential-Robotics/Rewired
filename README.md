# REWIRED 2026 — Hardware CTF Platform

> **High-Intensity Hardware Capture The Flag & Embedded Systems Security Platform**  
> Organized with pride by the **SNUC Potential Robotics Club**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Radix UI](https://img.shields.io/badge/Radix_UI-Components-161618?style=flat&logo=radix-ui)](https://www.radix-ui.com/)
[![Neon PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=flat&logo=postgresql)](https://neon.tech/)

---

## ⚡ Overview

**Rewired** is a specialized 45-minute hardware and embedded security Capture The Flag (CTF) competition engine. Contestants analyze microcontroller pinouts, probe test points, reverse-engineer firmware dumps, sniff UART / SPI / I2C / CAN bus traffic, reconstruct logic-analyzer waveforms, and exploit physical device vulnerabilities in real time.

Coins captured during Round 1 serve as the team's official hardware auction budget for Round 2. The platform is engineered for zero-latency live telemetry, synchronized contest clocks, anti-cheat protection, and full organizer command control.

---

## 🛠️ Architecture & Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack) & React 19.
- **Language**: TypeScript 5.9 (Strict Type Safety)
- **Styling**: Tailwind CSS v4 with custom industrial hardware design tokens (copper, phosphor amber `#ffd81f`, verification emerald, breach crimson)
- **Typography**: Space Grotesk (mechanical display headers), Inter (body prose), JetBrains Mono (monospaced telemetry, clock, access codes)
- **Database**: Serverless PostgreSQL via Neon with connection pooling (`pg`)
- **Dialogs & Modals**: Radix UI Primitives (`@radix-ui/react-alert-dialog`, `@radix-ui/react-slot`)
- **Animations**: Framer Motion for smooth leaderboard layout transitions + Canvas Confetti for podium ceremonies
- **Authentication & Security**: Edge-compatible JSON Web Tokens via `jose` + `bcryptjs` hashing with sliding-window submission rate limiters

---

## 🎯 Key Features

### 1. Mission Clock & Live Telemetry Bar
- **Central Clock Synchronization**: Global database-backed singleton (`contest_state`) queried through the `/api/contest` polling hook.
- **Mission Phases**: Smooth automated transitions between `PENDING` (pre-launch standby), `RUNNING` (active mission), and `ENDED` (freeze & evaluation).
- **Urgent Thresholds**: Dynamic visual alerts when remaining mission time dips below 5 minutes.
- **Live Readouts**: Displays live contest status, mission time remaining, total coins in the pool, and objectives captured.

### 2. Live Organizer Briefing System
- Dynamic, real-time mission briefing board (`/api/briefing` and `components/BriefingPanel.tsx`).
- Provides teams with official operational directives, lab safety guidelines, air-gap challenge instructions, and live tournament broadcast announcements.
- Outlines tournament policies including permitted AI assistance (Claude, ChatGPT, Copilot) and Round 2 coin transfer mechanics.

### 3. Objective Cards & Structured Challenge Briefs
- **Interactive Objective Cards**: Display coin bounties, solve counts, completion status, and locked/unlocked state.
- **Structured Challenge Modal**: Challenge briefs feature contextual tags, schematic references, hint unlock toggles, and instant flag validation.
- **Pre-Contest Obfuscation**: While the contest is `PENDING`, objective contents and technical flags remain server-redacted to prevent browser devtools inspection.

### 4. Team Registration & Identity
- Quick registration generating a unique 6-character alphanumeric team access code (e.g. `RW-E82B14`).
- Frictionless session resumption: log in from any device or bench station using Team Name + Access Code.
- Auto-updating solve states and persistent coin tally.

### 5. Dynamic Leaderboard & Podium Celebration
- Live-sorting leaderboard with `framer-motion` layout animations as flags are captured.
- Olympic-style top-3 winner podium:
  - 🥇 **1st Place Champion** (Phosphor Gold)
  - 🥈 **2nd Place** (Steel Silver)
  - 🥉 **3rd Place** (Bronze)
- Automated confetti celebration upon contest completion.

### 6. Organizer Command Center (`/admin`)
- Direct administrative control over contest state:
  - **Start Contest** (default 45 min or custom duration)
  - **Pause / Resume** clock
  - **+5 Minutes Overtime** extension
  - **End CTF** with locked submissions
  - **Reset Contest** with optional score wipe checkbox
- **Destructive Action Confirmations**: Accessible Radix UI confirmation modals protect against accidental contest termination or score wipes.
- **Challenge CRUD**: Create, edit, preview, and delete hardware challenges and flags.
- **Live Submission Audit Log**: Real-time stream of all flag attempts (valid & rejected) with team names and timestamps.
- **Teams Directory**: Overview of all registered teams, access codes, and scores.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20.x or v22.x+
- **pnpm**: v9.x or v10.x (or npm / yarn)

### 2. Environment Configuration
Create a `.env.local` file in the project root:

```env
DATABASE_URL="postgresql://<username>:<password>@<host>/<database>?sslmode=require"
ADMIN_EMAIL="robotics@snuchennai.edu.in"
ADMIN_PASSWORD="your_secure_password"
JWT_SECRET="your_jwt_secret_key_change_me_in_production"
NEXT_PUBLIC_APP_NAME="Rewired"
```

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Initialize Database
Bootstrap tables, indexes, and initial organizer credentials:
```bash
npx tsx -e "import { initDatabase } from './lib/init-db'; initDatabase().then(() => process.exit(0));"
```

### 5. Run in Development
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to view the CTF mission dashboard.

### 6. Production Build
```bash
pnpm build
pnpm start -p 3000
```

---

## 🧭 Page Routes & API Endpoints

### Frontend Routes
| Route | Access | Purpose |
| :--- | :--- | :--- |
| `/` | Public | Main mission dashboard, team registration, objective grid |
| `/leaderboard` | Public | Real-time standings, podium rankings, coin scores |
| `/admin` | Organizers Only | Contest clock management, challenge editor, submissions log |

### API Endpoints
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/contest` | `GET`, `POST` | Fetch contest state or trigger admin contest actions |
| `/api/briefing` | `GET` | Fetch real-time briefing notices and contest rules |
| `/api/questions` | `GET`, `POST`, `PUT`, `DELETE` | Retrieve or manage challenge objectives |
| `/api/submit` | `POST` | Validate flag submissions with rate limiting |
| `/api/leaderboard` | `GET` | Fetch rank calculations and solved metrics |
| `/api/auth/team/*` | `POST`, `GET` | Team registration, authentication, session verification |
| `/api/auth/admin/*` | `POST`, `GET` | Organizer authentication and session verification |

---

## 🧪 Automated Testing

Run the end-to-end test suite to verify registration, rate limiting, flag validation, clock synchronization, and leaderboard mechanics:

```bash
ALLOW_DESTRUCTIVE_TESTS=true npx tsx scripts/test-e2e.ts
```

---

## 👥 SNUC Potential Robotics Club

Crafted with high precision for the **SNUC Potential Robotics Club** hardware security competitions.
