import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

export interface GuidePhase {
  phase: number;
  title: string;
  points: number;
  mechanism: string;
  groundTruth: string;
  solutionMethod: string;
  flag: string;
  organizerAction?: string;
}

export interface HintScheduleItem {
  minute: string;
  label: string;
  hint: string;
}

export interface EquipmentChecklistItem {
  category: string;
  items: string[];
}

export interface OrganizerGuideData {
  title: string;
  subtitle: string;
  confidentialNotice: string;
  phases: GuidePhase[];
  hintSchedule: HintScheduleItem[];
  equipmentChecklist: EquipmentChecklistItem[];
}

const ORGANIZER_GUIDE: OrganizerGuideData = {
  title: "Air-Gap Server Room Breach — Attack Vectors & Orchestration Guide",
  subtitle:
    "Ground truth attack vectors, hardware execution paths, credential locations, and official hint release schedule for organizers and proctors.",
  confidentialNotice:
    "STRICTLY CONFIDENTIAL • ORGANIZER MASTER SHEET • DO NOT SHARE WITH PARTICIPANTS",
  phases: [
    {
      phase: 1,
      title: "Username Extraction: BLE Raw Data",
      points: 50000,
      mechanism: "The target dropped his company-issued wireless earphones in the lobby.",
      groundTruth:
        "The username is printed in the raw BLE advertisement data of the wireless device.",
      solutionMethod:
        "Teams must use an ESP32 (BLE scanner sketch) or mobile BLE packet analyzer to inspect advertising payload packets and extract the embedded username.",
      flag: "Rathimaa",
    },
    {
      phase: 2,
      title: "Password: RC522 RFID + Laptop Update",
      points: 150000,
      mechanism: "Sysadmin left his physical RFID access badge on the desk outside the perimeter.",
      groundTruth:
        "The team must read the physical access card using an RC522 RFID reader and an ESP32.",
      solutionMethod:
        "Read UID and sector memory with RC522 module, extract password, and verify against the organizers' laptop station.",
      flag: "mudinchaullapo!!",
      organizerAction:
        "After obtaining credentials from the RFID card, teams must report to the organizers' laptop to verify and update access.",
    },
    {
      phase: 3,
      title: "Master-Slave Authentication Key Intercept",
      points: 300000,
      mechanism: "Server room system is air-gapped from traditional Ethernet/WAN.",
      groundTruth:
        "The authentication key is transmitted wirelessly from the master system node to slave units.",
      solutionMethod:
        "Teams must intercept/sniff the key transmission between the master ESP32 and slave node to compromise the full system.",
      flag: "vazhthukalfriend",
    },
  ],
  hintSchedule: [
    {
      minute: "MINUTE 10:00 (T+10)",
      label: "Phase 1 Hint",
      hint: "Inspect raw BLE advertising packets. Earphones broadcast identification metadata inside custom manufacturer data and complete local name attributes.",
    },
    {
      minute: "MINUTE 20:00 (T+20)",
      label: "Phase 2 Hint",
      hint: "Wire RC522 SPI bus (SDA, SCK, MOSI, MISO, RST) to ESP32. Read the UID and memory blocks from the card, then report to the organizer laptop station to authenticate.",
    },
    {
      minute: "MINUTE 30:00 (T+30)",
      label: "Phase 3 Hint",
      hint: "The Master node transmits heartbeats and security tokens to slave nodes. Sniff this communication channel to capture the master auth handshake.",
    },
  ],
  equipmentChecklist: [
    {
      category: "1. Hardware Required for Each Team",
      items: [
        "RC522 RFID reader – 1 unit per team",
        "ESP32 Development Board – 1 unit per team",
        "Breadboard & Connecting Jumper Wires – Dupont male-to-female / male-to-male",
      ],
    },
    {
      category: "2. Hardware Required for Competition Environment",
      items: [
        "Organizer Laptop – 1 unit (for verifying & updating credentials)",
        "ESP Nodes – 2 units (Master node & Slave system node)",
        "RFID Tag / Physical Access Card – 1 unit",
      ],
    },
  ],
};

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized. Admin credentials required to access the organizer master sheet." },
      { status: 403 }
    );
  }

  return NextResponse.json(ORGANIZER_GUIDE);
}
