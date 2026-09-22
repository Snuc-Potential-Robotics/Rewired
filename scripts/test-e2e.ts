import assert from "assert";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";

// Safety Guard: prevent running destructive tests against a live production deployment
if (process.env.ALLOW_DESTRUCTIVE_TESTS !== "true") {
  console.error(
    "\n⚠️  SAFETY GUARD: scripts/test-e2e.ts resets contest state and clears submissions.\n" +
    "To confirm you intend to run this test suite against your test database, set:\n" +
    "ALLOW_DESTRUCTIVE_TESTS=true npx tsx scripts/test-e2e.ts\n"
  );
  process.exit(1);
}

const adminEmail = (process.env.ADMIN_EMAIL || "robotics@snuchennai.edu.in").trim();
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) {
  console.error(
    "ADMIN_PASSWORD environment variable is required to run E2E tests. Please specify ADMIN_PASSWORD."
  );
  process.exit(1);
}

async function runTests() {
  console.log("=== STARTING REWIRED E2E VERIFICATION SUITE ===");

  // 1. Check Contest Initial State
  console.log("\n[TEST 1] Checking contest initial state...");
  const cRes = await fetch(`${BASE}/api/contest`);
  assert.strictEqual(cRes.status, 200);
  const contest = await cRes.json();
  console.log("Contest status:", contest.status, "Duration:", contest.duration_seconds);
  assert.strictEqual(
    contest.duration_seconds,
    2700,
    "Contest default duration must be exactly 2700 seconds (45 minutes)"
  );

  // Setup: Admin Login
  console.log("\n[SETUP] Logging in as Admin...");
  const adminLoginRes = await fetch(`${BASE}/api/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
  });
  assert.strictEqual(adminLoginRes.status, 200, "Admin login must succeed");
  const adminCookie = adminLoginRes.headers.get("set-cookie") || "";

  // Reset contest to PENDING and clear previous test submissions
  console.log("Resetting contest state to clean test slate...");
  const resetRes = await fetch(`${BASE}/api/contest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({ action: "reset", clearSubmissions: true }),
  });
  assert.strictEqual(resetRes.status, 200);
  console.log("Contest reset to PENDING with clean test slate.");

  // Ensure test fixture questions exist
  const adminQRes = await fetch(`${BASE}/api/questions`, {
    headers: { Cookie: adminCookie },
  });
  const adminQData = await adminQRes.json();
  let testQuestion = adminQData.questions?.[0];

  if (!testQuestion) {
    console.log("No questions present. Seeding fixture question...");
    const createQRes = await fetch(`${BASE}/api/questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        title: "Phase 1: BLE Wireless Extraction (Username Discovery)",
        category: "Phase 1",
        points: 150,
        description: "Recover administrator username from raw BLE advertisements.",
        flag: "flag{sysadmin_ble_airgap_user}",
        hint: "Inspect raw BLE advertising packets.",
        order_index: 1,
      }),
    });
    assert.strictEqual(createQRes.status, 200);
    const created = await createQRes.json();
    testQuestion = created.question;
  }

  assert(testQuestion, "A test question fixture must be available");
  console.log(`Using test fixture question ID ${testQuestion.id}: "${testQuestion.title}" (${testQuestion.points} coins)`);

  // 2. Questions locked during PENDING state
  console.log("\n[TEST 2] Verifying challenge masking during PENDING state...");
  const qPendingRes = await fetch(`${BASE}/api/questions`);
  const qPending = await qPendingRes.json();
  assert.strictEqual(qPending.contestStatus, "PENDING");
  assert.strictEqual(qPending.isLocked, true);
  assert(qPending.questions.length > 0);
  assert(qPending.questions[0].title.includes("[LOCKED]"), "Challenge titles should be masked while PENDING");
  console.log(`Verified ${qPending.questions.length} challenges are locked & obscured.`);

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

  // Attempt duplicate registration (case-insensitive)
  const dupRes = await fetch(`${BASE}/api/auth/team/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: testTeamName.toUpperCase() }),
  });
  assert.strictEqual(dupRes.status, 409, "Duplicate team name should return 409 Conflict");
  console.log("Duplicate registration successfully rejected (409).");

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
    body: JSON.stringify({ questionId: testQuestion.id, flag: testQuestion.flag }),
  });
  assert.strictEqual(earlySubmitRes.status, 403, "Submissions before contest start must return 403");
  console.log("Early submission correctly blocked.");

  // 6. Admin starts the 45-minute CTF
  console.log("\n[TEST 6] Admin starts CTF...");
  const startRes = await fetch(`${BASE}/api/contest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({ action: "start", durationMinutes: 45 }),
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
  console.log("First unlocked challenge:", qUnlocked.questions[0].title, "(", qUnlocked.questions[0].points, "coins )");

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
    body: JSON.stringify({ questionId: testQuestion.id, flag: "flag{incorrect_guess_xyz}" }),
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
    body: JSON.stringify({ questionId: testQuestion.id, flag: "flag{spam_guess}" }),
  });
  assert.strictEqual(spamRes.status, 429, "Immediate re-submission should trigger 429 Cooldown");
  const spamData = await spamRes.json();
  console.log("Rate limiter enforced:", spamData.error);

  // Wait 4.2 seconds for cooldown to clear
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
    body: JSON.stringify({ questionId: testQuestion.id, flag: testQuestion.flag }),
  });
  assert.strictEqual(correctRes.status, 200);
  const correctData = await correctRes.json();
  assert.strictEqual(correctData.isCorrect, true);
  assert.strictEqual(correctData.pointsAwarded, testQuestion.points);
  console.log("Correct flag awarded points:", correctData.newScore, "COINS");

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
    body: JSON.stringify({ questionId: testQuestion.id, flag: testQuestion.flag }),
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
  console.log("Leaderboard #1:", leader.name, leader.score, "COINS, Solves:", leader.solvesCount);
  assert(leader.score >= testQuestion.points);

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
    body: JSON.stringify({ questionId: testQuestion.id, flag: testQuestion.flag }),
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
