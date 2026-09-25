import { query } from "../lib/db";

const prizes = [
  {
    oldTitle: "Phase 1: BLE Wireless Extraction (Username Discovery)",
    title: "Phase 1: Username Discovery",
    points: 50000,
    flag: "Rathimaa",
    description: `[STORY]
You guys have been contracted to breach a physically isolated server room. Standard attacks over this server have failed because the system is completely air-gapped. We have 45 minutes before the security changes shift.

Your target is a lazy systems administrator who has a habit of reusing credentials and leaving equipment lying around. We believe he dropped his company-issued wireless earphones in the lobby.

[SUBMISSION]
Enter the recovered username wrapped in flag format: flag{username}`,
  },
  {
    oldTitle: "Phase 2: Physical RFID Card Emulation (Password Dump)",
    title: "Phase 2: Password Dump",
    points: 150000,
    flag: "mudinchaullapo!!",
    description: `[STORY]
The target administrator left his physical access card on a desk outside the secure perimeter. (You can ask the organisers for the additional components if you need!)

[SUBMISSION]
Enter the recovered access card password wrapped in flag format: flag{password}`,
  },
  {
    oldTitle: "Phase 3: Master-Slave Protocol Intercept (System Compromise)",
    title: "Phase 3: System Compromise",
    points: 300000,
    flag: "vazhthukalfriend",
    description: `[STORY]
You have successfully authenticated into the server room workstation! However, full control requires the master system authentication key that coordinates all slave units.

[SUBMISSION]
Enter the captured master authentication key wrapped in flag format: flag{auth_key}`,
  },
] as const;

async function updateAirgapPrizes() {
  for (const prize of prizes) {
    await query(
      "UPDATE questions SET title = $1, points = $2, flag = $3, description = $4, hint = NULL WHERE title = $5",
      [prize.title, prize.points, prize.flag, prize.description, prize.oldTitle]
    );
  }
  console.log("Updated canonical air-gap challenge base rewards.");
}

updateAirgapPrizes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
