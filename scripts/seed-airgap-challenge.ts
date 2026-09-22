import { query } from "../lib/db";

export async function seedAirGapChallenges() {
  console.log("Seeding Air-Gap Server Room Infiltration challenges...");

  // Wipe previous questions to ensure clean state
  await query("DELETE FROM submissions");
  await query("DELETE FROM questions");

  const challenges = [
    {
      title: "Phase 1: BLE Wireless Extraction (Username Discovery)",
      category: "Phase 1",
      points: 150,
      description: `[STORY]
You guys have been contracted to breach a physically isolated server room. Standard attacks over this server have failed because the system is completely air-gapped. We have 45 minutes before the security changes shift.

Your target is a lazy systems administrator who has a habit of reusing credentials and leaving equipment lying around. We believe he dropped his company-issued wireless earphones in the lobby.

[MISSION]
Intercept and inspect the Bluetooth Low Energy (BLE) advertisements of the dropped device to recover the administrator's raw username.

[ADDITIONAL INFO]
The company is giving the same username for every product the employee gets from the company.

[SUBMISSION]
Enter the recovered username wrapped in flag format: flag{username}`,
      flag: "flag{sysadmin_snuc_2026}",
      hint: "The company earphones broadcast raw advertisement frames. Inspect the BLE device name and manufacturer payload.",
      order_index: 1,
    },
    {
      title: "Phase 2: Physical RFID Card Emulation (Password Dump)",
      category: "Phase 2",
      points: 200,
      description: `[STORY]
The target administrator left his physical access card on a desk outside the secure perimeter.

[MISSION]
Build an RFID reader using your team's RC522 module and ESP32 breadboard kit. Bring your scanner near the employee's physical access card to read the card memory/UID to extract the server room password. Once the username and password are known, update them in the laptop terminal provided by the organizers.

[COMPONENTS REQUIRED PER TEAM]
- 1x RC522 RFID Reader
- 1x ESP32 Microcontroller
- Breadboard & Jumper Wires

[SUBMISSION]
Enter the recovered access card password wrapped in flag format: flag{password}`,
      flag: "flag{rfid_rc522_access_granted}",
      hint: "Wire the RC522 to the ESP32 SPI pins (MOSI, MISO, SCK, SS/SDA, RST) and read the card UID / sector data.",
      order_index: 2,
    },
    {
      title: "Phase 3: Master-Slave Protocol Intercept (System Compromise)",
      category: "Phase 3",
      points: 250,
      description: `[STORY]
You have successfully authenticated into the server room workstation! However, full control requires the master system authentication key that coordinates all slave units.

[MISSION]
The master system transmits an authentication key to all slave units across the local air-gapped interface. Intercept this key from the live transmissions between the master and slave systems to achieve full compromise.

[SUBMISSION]
Enter the captured master authentication key wrapped in flag format: flag{auth_key}`,
      flag: "flag{master_esp_slave_auth_key}",
      hint: "Sniff the wireless frames exchanged between the Master ESP and Slave ESP units. The master broadcasts the authentication token periodically.",
      order_index: 3,
    },
  ];

  for (const c of challenges) {
    await query(
      `INSERT INTO questions (title, category, points, description, flag, hint, order_index, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
      [c.title, c.category, c.points, c.description, c.flag, c.hint, c.order_index]
    );
  }

  console.log("Successfully seeded 3 Air-Gap Infiltration challenges!");
}

seedAirGapChallenges()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
