# Browser Game Concept: **Sky Salvagers**

## 1) High-Level Pitch
**Sky Salvagers** is a session-based browser strategy game where players command a small airborne crew scavenging ruins on floating islands. Runs are short (10–15 minutes), with meaningful progression between sessions.

- **Genre:** Strategy + light roguelite + resource management
- **Audience:** Casual-midcore players who enjoy decisions under pressure
- **Platform:** Desktop/mobile browser (single-player first, async leaderboard later)
- **Session Length:** 10–15 minutes

---

## 2) Design Pillars
1. **Fast strategic decisions** — each minute should force a tradeoff.
2. **Readable systems** — simple numbers, clear risks, transparent outcomes.
3. **“One more run” momentum** — frequent unlocks and visible mastery growth.
4. **Browser-friendly scope** — low asset complexity, deterministic simulation core.

---

## 3) Core Fantasy
You are a salvage captain choosing where to land, what to extract, and when to retreat before storms and rival scavengers destroy your expedition.

---

## 4) Core Loop (Moment-to-Moment)
1. **Scan map node** (island with rewards, hazards, and weather pressure).
2. **Commit crew actions** (extract, repair, scout, defend).
3. **Resolve timer tick** (resources gained, danger rises, events trigger).
4. **React to event** (injury, bonus cache, pirate ambush, engine fault).
5. **Decide: continue vs. evacuate**.
6. **Return to hub** and convert haul into upgrades.

This loop repeats until fuel/time runs out or the player aborts the run.

---

## 5) Meta Loop (Run-to-Run)
1. Start run with current ship loadout.
2. Complete short expedition.
3. Earn currencies/resources (Scrap, Intel, Artifacts).
4. Buy permanent unlocks (new crew traits, module slots, map tools).
5. Queue next run with improved options.

---

## 6) Resource Model
- **Fuel (hard timer):** limits map traversal.
- **Hull (health):** if 0, run fails.
- **Crew Stamina:** affects action speed/success.
- **Scrap (common currency):** repairs and basic upgrades.
- **Intel (planning currency):** reveals map info and hidden risk.
- **Artifacts (rare):** unlocks major tech branches.

### Tension rule
At any point, players should be short on at least one of: **fuel**, **hull**, or **stamina**.

---

## 7) Progression & Difficulty
- **Run scaling:** danger meter rises over time; later nodes get richer but riskier.
- **Soft fail:** failed runs still grant partial Scrap/Intel.
- **Long-term progression:**
  - Ship modules (cargo, armor, scanner, drone bay)
  - Crew roster with passive traits
  - Global contracts (optional run modifiers for bonus payout)

---

## 8) MVP Scope (First Playable)
### Must-have
- Procedural node map (8–12 nodes per run)
- 4 action types (extract, scout, repair, defend)
- Event deck (at least 15 events)
- 5 crew traits
- Hub upgrades (10 items)
- End-of-run summary + persistent save

### Nice-to-have (post-MVP)
- Daily seed challenge
- Async leaderboard by score seed
- Biome variants and event packs

---

## 9) UX Flow
1. **Main Menu** → Play / Upgrades / Settings
2. **Pre-run Loadout** → pick modules + crew
3. **Map Screen** → choose node
4. **Run Screen** → assign actions and handle events
5. **Extraction Screen** → loot and damage summary
6. **Hub** → purchase upgrades/unlocks

### UI priorities
- Persistent top bar: Fuel / Hull / Stamina / Danger
- Clear event cards with explicit consequences
- One-click retreat always available

---

## 10) Technical Plan for Browser Delivery
- **Engine:** vanilla JS or lightweight framework (Phaser optional)
- **Data-driven content:** JSON for events, upgrades, traits
- **State management:** single game state object + deterministic tick resolver
- **Persistence:** localStorage for profile and unlocks
- **Telemetry hooks (optional):** run length, fail causes, churn points

---

## 11) Balancing Targets (Initial)
- Average run time: **12 minutes**
- Win/clean-extract target: **35–45%** for new players
- First meaningful unlock: **within 2 runs**
- Decision cadence: **one meaningful choice every 20–30 seconds**

---

## 12) Score Model
`Score = Scrap + (Artifacts × 50) + (NodesCleared × 10) - HullDamageTaken`

Supports leaderboard and daily challenge variants.

---

## 13) Implementation Milestones
1. **Milestone 1: Simulation skeleton**
   - Tick system, resources, action resolution, fail states
2. **Milestone 2: Content pass**
   - Events, traits, upgrades data tables
3. **Milestone 3: UX pass**
   - Run HUD, event cards, end-run summary
4. **Milestone 4: Meta progression**
   - Hub unlocks, persistence, difficulty ramps
5. **Milestone 5: Polish**
   - Tooltips, onboarding, balancing iteration

---

## 14) Risks & Mitigations
- **Risk:** loop feels repetitive after 3 runs.
  - **Mitigation:** diversify event deck + contract modifiers early.
- **Risk:** too much RNG frustration.
  - **Mitigation:** Intel mechanic reveals partial future risks.
- **Risk:** mobile readability issues.
  - **Mitigation:** large cards, low text density, high-contrast HUD.

---

## 15) Next Design Outputs
- Event deck v1 (15 cards with probabilities)
- Upgrade tree v1 (10 unlocks with costs)
- Crew trait matrix (5–8 starter traits)
- Wireframe for Run Screen + Hub screen
