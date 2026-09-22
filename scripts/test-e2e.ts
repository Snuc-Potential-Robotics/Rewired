import assert from "assert";

const BASE = "http://localhost:3000";

async function runTests() {
  console.log("=== STARTING REWIRED E2E VERIFICATION SUITE ===");

  // 1. Check Contest Initial State
  console.log("\n[TEST 1] Checking contest initial state...");
  const cRes = await fetch(`${BASE}/api/contest`);
  assert.strictEqual(cRes.status, 200);
  const contest = await cRes.json();
  console.log("Contest status:", contest.status, "Duration:", contest.duration_seconds);
  assert(contest.duration_seconds === 1800, "Duration should default to 1800s (30m)");

  // Reset contest to PENDING and clear previous test submissions
  console.log("\n[SETUP] Logging in as Admin to reset clean state...");
  const adminLoginRes = await fetch(`${BASE}/api/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "robotics@snuchennai.edu.in",
      password: "password@123",
    }),
  });
  assert.strictEqual(adminLoginRes.status, 200);
  const adminCookie = adminLoginRes.headers.get("set-cookie") || "";

  const resetRes = await fetch(`${BASE}/api/contest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({ action: "reset", clearSubmissions: true }),
  });
  assert.strictEqual(resetRes.status, 200);
  console.log("Contest reset to PENDING and clean test slate.");

  // 2. Questions locked during PENDING state
  console.log("\n[TEST 2] Verifying challenge masking during PENDING state...");
  const qPendingRes = await fetch(`${BASE}/api/questions`);
  const qPending = await qPendingRes.json();
  assert.strictEqual(qPending.contestStatus, "PENDING");
  assert.strictEqual(qPending.isLocked, true);
  assert(qPending.questions.length > 0);
  assert(qPending.questions[0].title.includes("[LOCKED]"), "Challenge titles should be locked");
  console.log(`Verified ${qPending.questions.length} challenges are locked & blurred.`);

  // 3. Team Registration with Unique Code & Duplicate Rejection
  console.log("\n[TEST 3] Testing team registration and duplicate handling...");
  const testTeamName = `CyberTitans_${Date.now()}`;
  const regRes = await fetch(`${BASE}/api/auth/team/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: testTeamName }),
  });
  assert.strictEqual(regRes.status, 200);
  const regData = await regRes.json();
  const teamCookie = regRes.headers.get("set-cookie") || "";
  console.log("Registered team:", regData.team.name, "Unique Code:", regData.team.code);
  assert(regData.team.code.startsWith("RW-"), "Team code should start with RW-");

  // Attempt duplicate registration
  const dupRes = await fetch(`${BASE}/api/auth/team/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: testTeamName }),
  });
  assert.strictEqual(dupRes.status, 409, "Duplicate team name should return 409 Conflict");
  console.log("Duplicate registration successfully rejected.");

  // 4. Team Login with Code
  console.log("\n[TEST 4] Testing team login with access code...");
  const loginRes = await fetch(`${BASE}/api/auth/team/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: testTeamName, code: regData.team.code }),
  });
  assert.strictEqual(loginRes.status, 200);
  console.log("Team login verified.");

  // 5. Submit flag while contest is PENDING (should fail)
  console.log("\n[TEST 5] Submitting flag while contest is PENDING...");
  const earlySubmitRes = await fetch(`${BASE}/api/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: teamCookie,
    },
    body: JSON.stringify({ questionId: 1, flag: "flag{pwm_servo_angle_180}" }),
  });
  assert.strictEqual(earlySubmitRes.status, 403, "Submissions before contest start must return 403");
  console.log("Early submission correctly blocked.");

  // 6. Admin starts the 30-minute CTF
  console.log("\n[TEST 6] Admin starts 30-minute CTF...");
  const startRes = await fetch(`${BASE}/api/contest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({ action: "start", durationMinutes: 30 }),
  });
  assert.strictEqual(startRes.status, 200);
  const startData = await startRes.json();
  console.log("Contest start response:", startData.message);

  // Verify contest is now RUNNING
  const cRunningRes = await fetch(`${BASE}/api/contest`);
  const cRunning = await cRunningRes.json();
  assert.strictEqual(cRunning.status, "RUNNING");
  console.log("Contest state RUNNING, seconds remaining:", cRunning.time_remaining_seconds);

  // 7. Unmasked questions after contest starts
  console.log("\n[TEST 7] Checking unlocked questions...");
  const qUnlockedRes = await fetch(`${BASE}/api/questions`, {
    headers: { Cookie: teamCookie },
  });
  const qUnlocked = await qUnlockedRes.json();
  assert.strictEqual(qUnlocked.isLocked, false);
  assert(!qUnlocked.questions[0].title.includes("[LOCKED]"));
  console.log("First unlocked challenge:", qUnlocked.questions[0].title, "(", qUnlocked.questions[0].points, "pts )");

  // 8. Flag submission: Wrong flag -> rate limit cooldown -> Correct flag
  console.log("\n[TEST 8] Flag submission, rate limiting & points evaluation...");
  console.log("Waiting 4.2 seconds for initial submission cooldown to clear...");
  await new Promise((r) => setTimeout(r, 4200));

  // Wrong flag
  const wrongRes = await fetch(`${BASE}/api/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: teamCookie,
    },
    body: JSON.stringify({ questionId: 1, flag: "flag{incorrect_guess}" }),
  });
  assert.strictEqual(wrongRes.status, 200);
  const wrongData = await wrongRes.json();
  assert.strictEqual(wrongData.isCorrect, false);
  console.log("Incorrect flag handled:", wrongData.error);

  // Immediate resubmit (should trigger 429 rate limit)
  console.log("Testing submission cooldown rate limiting...");
  const spamRes = await fetch(`${BASE}/api/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: teamCookie,
    },
    body: JSON.stringify({ questionId: 1, flag: "flag{spam_guess}" }),
  });
  assert.strictEqual(spamRes.status, 429, "Immediate re-submission should trigger 429 Cooldown");
  const spamData = await spamRes.json();
  console.log("Rate limiter enforced:", spamData.error);

  // Wait 4 seconds for cooldown to clear
  console.log("Waiting 4.2 seconds for cooldown to clear...");
  await new Promise((r) => setTimeout(r, 4200));

  // Submit correct flag
  console.log("Submitting correct flag...");
  const correctRes = await fetch(`${BASE}/api/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: teamCookie,
    },
    body: JSON.stringify({ questionId: 1, flag: "flag{pwm_servo_angle_180}" }),
  });
  assert.strictEqual(correctRes.status, 200);
  const correctData = await correctRes.json();
  assert.strictEqual(correctData.isCorrect, true);
  assert.strictEqual(correctData.pointsAwarded, 100);
  console.log("Correct flag awarded points:", correctData.newScore, "PTS");

  // Attempt duplicate solve
  console.log("Waiting 4.2s for cooldown before duplicate solve test...");
  await new Promise((r) => setTimeout(r, 4200));
  console.log("Testing duplicate solve protection...");
  const dupSolveRes = await fetch(`${BASE}/api/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: teamCookie,
    },
    body: JSON.stringify({ questionId: 1, flag: "flag{pwm_servo_angle_180}" }),
  });
  assert.strictEqual(dupSolveRes.status, 400, "Duplicate solve should return 400");
  console.log("Duplicate solve strictly blocked.");

  // 9. Admin Question CRUD
  console.log("\n[TEST 9] Admin Question CRUD verification...");
  const newQRes = await fetch(`${BASE}/api/questions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      title: "Autonomous Sensor Fusion",
      category: "Hardware",
      points: 200,
      description: "Sensor fusion telemetry packet verification.",
      flag: "flag{sensor_fusion_lidar_imu}",
      hint: "Inspect the Kalman filter output.",
      order_index: 10,
    }),
  });
  assert.strictEqual(newQRes.status, 200);
  const newQData = await newQRes.json();
  console.log("Admin created challenge ID:", newQData.question.id, newQData.question.title);

  // 10. Check Leaderboard Standings
  console.log("\n[TEST 10] Verifying dynamic leaderboard standings...");
  const lbRes = await fetch(`${BASE}/api/leaderboard`);
  assert.strictEqual(lbRes.status, 200);
  const lbData = await lbRes.json();
  assert(lbData.teams.length > 0);
  const leader = lbData.teams[0];
  console.log("Leaderboard #1:", leader.name, leader.score, "PTS, Solves:", leader.solvesCount);
  assert(leader.score >= 100);

  // 11. Admin Ends Contest & Submissions Locked
  console.log("\n[TEST 11] Admin ends CTF & verifying top 3 podium...");
  const endRes = await fetch(`${BASE}/api/contest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({ action: "end" }),
  });
  assert.strictEqual(endRes.status, 200);

  // Attempt submission after contest ended
  await new Promise((r) => setTimeout(r, 4200));
  const postEndSubmit = await fetch(`${BASE}/api/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: teamCookie,
    },
    body: JSON.stringify({ questionId: 2, flag: "flag{x_robotics_auth_bypass}" }),
  });
  assert.strictEqual(postEndSubmit.status, 403, "Submissions after contest end must return 403");
  console.log("Post-contest submission successfully blocked.");

  // Verify leaderboard top 3
  const finalLbRes = await fetch(`${BASE}/api/leaderboard`);
  const finalLb = await finalLbRes.json();
  assert.strictEqual(finalLb.status, "ENDED");
  assert(finalLb.topThree.length > 0);
  console.log("Final Top 3 Podium Count:", finalLb.topThree.length);
  console.log("Champion Team:", finalLb.topThree[0].name, "Score:", finalLb.topThree[0].score);

  console.log("\n🎉 ALL E2E AUTOMATED TESTS PASSED SUCCESSFULLY! 🎉\n");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
