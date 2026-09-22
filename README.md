# REWIRED — Hardware CTF Platform

> **High-Intensity Hardware Capture The Flag & Embedded Security Platform**  
> Organized by the **SNUC Potential Robotics Club**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Neon PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=flat&logo=postgresql)](https://neon.tech/)

---

## ⚡ Overview

**Rewired** is a 30-minute Capture The Flag (CTF) competition engine built specifically for hardware and embedded systems security challenges. Contestants deconstruct microcontrollers, analyze oscilloscope wave captures, sniff UART/I2C/SPI/CAN buses, inspect PCB layers, and exploit embedded interfaces in real time.

The platform is designed to effortlessly handle concurrent participants, enforce strict anti-cheat rules, and provide organizers with full real-time control over the contest lifecycle.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript 5.9 (Strict Type Safety)
- **Styling**: Tailwind CSS v4 with custom `#ffd81f` amber theme tokens
- **Database**: Neon Serverless PostgreSQL with connection pooling
- **Icons**: Lucide React
- **Animations**: Framer Motion (dynamic leaderboard layout transitions) + Canvas Confetti (podium celebration)
- **Sessions & Auth**: Edge-compatible JWT cookies via `jose` + `bcryptjs`

---

## 🎯 Key Capabilities

### 1. Synchronized 30-Minute Contest Clock
- Central database-backed contest state singleton (`contest_state`).
- Live digital countdown timer displayed in the navigation bar for all connected teams.
- Time remaining turns into an urgent pulsing red alert when under 5 minutes.
- When the timer hits `00:00`, the contest transitions to `ENDED` and all flag submissions lock immediately.

### 2. Pre-Contest Standby & Blur Mode
- While in `PENDING` state, teams can register and sign in to their dashboard.
- Challenges are locked behind an opaque frosted glass blur overlay (*"Hardware CTF Starts in a Few Minutes • Awaiting Admin Signal"*).
- Sensitive problem briefs, flags, and technical details are redacted on the server side to prevent browser devtools inspection.

### 3. Team Registration with Unique Access Codes
- Teams register with a unique team name (duplicate names are rejected with clear user feedback).
- Each team receives a 6-character alphanumeric access code (e.g. `RW-FCB0FC`) with a 1-click copy button.
- Teams can log back in at any time from any device using their Team Name + Unique Code.

### 4. Hardware CTF Categories & Tags
The challenge engine supports specialized hardware domains:
- 🔌 **Microcontrollers & Firmware**
- 📈 **Signal Analysis & Oscilloscope**
- 🚌 **Bus Protocols (I2C / SPI / CAN / UART)**
- 🔍 **PCB & Reverse Engineering**
- ⚡ **Side-Channel & Fault Injection**
- 📡 **Wireless, RF & SDR**
- 🛰️ **IoT & Sensor Security**
- 🔐 **Hardware Cryptography**
- ⚙️ **General Hardware / Robotics**

### 5. Anti-Cheat & Rate Limiting Engine
- **Duplicate Prevention**: Once a team solves a challenge, points are awarded atomically and that challenge is locked permanently for that team.
- **Strict Rate Limiting**: Built-in 4-second sliding window cooldown per team prevents automated brute-force scripts and spam.
- **Dynamic Feedback**: Visual toasts and cooldown timers indicate submission progress.

### 6. Dynamic Animated Leaderboard & Top-3 Podium
- Real-time ranking table dynamically re-orders using `framer-motion` layout animations as points are scored.
- Upon contest conclusion, an Olympic-style podium crowns the winners:
  - 🥇 **1st Place Champion** (Gold `#ffd81f`)
  - 🥈 **2nd Place** (Silver `#d3ccc7`)
  - 🥉 **3rd Place** (Bronze `#87a1bd`)
- Confetti explosion triggers when the contest ends.

### 7. Organizer Command Center (`/admin`)
- Accessible only at `/admin` (hidden from public navigation).
- **Credentials**:
  - **Email**: `robotics@snuchennai.edu.in`
  - **Password**: `password@123`
- **Timer Command Bar**: Start CTF (30 min or custom duration), Pause, Resume, +5 Min Extend, End Early, and Reset.
- **Hardware Challenge Management**: Add, edit, or delete challenges with point presets (`50` to `500`), technical hints, and secret flags.
- **Live Submissions Monitor**: Auto-refreshing feed of all team flag submissions with timestamps.
- **Registered Teams Overview**: Directory of all registered teams and access codes.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20.x or v24.x
- **pnpm**: v10.x (recommended) or npm/yarn

### 2. Environment Setup
Create a `.env.local` file in the root directory:

```env
DATABASE_URL="postgresql://neondb_owner:npg_PqJRKdjE9Cl7@ep-fancy-darkness-b32xs1ho-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
ADMIN_EMAIL="robotics@snuchennai.edu.in"
ADMIN_PASSWORD="password@123"
JWT_SECRET="rewired_super_secret_jwt_key_2026_snuc_robotics_ctf"
NEXT_PUBLIC_APP_NAME="Rewired"
```

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Database Setup & Initialization
Initialize tables and the organizer account:
```bash
npx tsx -e "import { initDatabase } from './lib/init-db'; initDatabase().then(() => process.exit(0));"
```

### 5. Run in Development Mode
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Build and Run in Production
```bash
pnpm build
pnpm start -p 3000
```

---

## 🧪 Verification & Testing

An end-to-end automated test suite validates the entire contest workflow (registration, codes, blur state, synchronized timer, rate-limiting, correct/wrong flags, duplicate protection, admin controls, dynamic leaderboard, and podium):

```bash
npx tsx scripts/test-e2e.ts
```

---

## 🧭 Page Routes

| Route | Access | Description |
| :--- | :--- | :--- |
| `/` | Public | Main Hardware CTF dashboard, team registration, challenges grid |
| `/leaderboard` | Public | Dynamic animated rankings and top-3 podium celebration |
| `/admin` | Organizers Only | Admin command center for timer controls and challenge CRUD |

---

## 👥 SNUC Potential Robotics Club

Built with precision for the **SNUC Potential Robotics Club** hardware capture-the-flag competitions.
