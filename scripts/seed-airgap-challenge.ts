import { query } from "../lib/db";

export async function seedAirGapChallenges() {
  console.log("Seeding Air-Gap Server Room Infiltration challenges...");

  // Wipe previous questions to ensure clean state
  await query("DELETE FROM submissions");
  await query("DELETE FROM questions");

  const challenges = [
    {
      title: "Phase 1: Username Discovery",
      category: "Phase 1",
      points: 50000,
      description: `You guys have been contracted to breach a physically isolated server room. Standard attacks over this server have failed because the system is completely air-gapped. We have 45 minutes before the security changes shift.

Your target is a lazy systems administrator who has a habit of reusing credentials and leaving equipment lying around. We believe he dropped his company-issued wireless earphones in the lobby.

[SUBMISSION]
Enter the recovered username wrapped in flag format: **\`flag{username}\`**`,
      flag: "Rathimaa",
      hint: null,
      order_index: 1,
    },
    {
      title: "Phase 2: Password Dump",
      category: "Phase 2",
      points: 150000,
      description: `[STORY]
The target administrator left his physical access card on a desk outside the secure perimeter. (You can ask the organisers for the additional components if you need!)

[SUBMISSION]
Enter the recovered access card password wrapped in flag format: **\`flag{password}\`**`,
      flag: "mudinchaullapo!!",
      hint: null,
      order_index: 2,
    },
    {
      title: "Phase 3: System Compromise",
      category: "Phase 3",
      points: 300000,
      description: `[STORY]
You have successfully authenticated into the server room workstation! However, full control requires the master system authentication key that coordinates all slave units.

[SUBMISSION]
Enter the captured master authentication key wrapped in flag format: **\`flag{auth_key}\`**`,
      flag: "vazhthukalfriend",
      hint: null,
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

  console.log("Successfully seeded 3 Air-Gap Infiltration challenges with canonical ground-truth flags!");
}

seedAirGapChallenges()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
