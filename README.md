<div align="center">

<!-- GENERATED:STATUS:START -->
<p align="center"><a href="https://github.com/kavya-jain14/TRISHUL/commit/55b09c321af0f7ee163b134f4b44f695cf7211ec" title="Latest default-branch activity across 6 selected repositories; all authors. 0 commits in the last 7 days through 2026-09-11T08:08:06.901Z."><code>$ open to software engineering internships · latest work: TRISHUL</code></a></p>
<!-- GENERATED:STATUS:END -->

<picture>
  <source type="image/svg+xml" srcset="./assets/hero/portrait-reveal.svg">
  <img src="./assets/hero/portrait-pixel.png" width="520" alt="Kavya Jain in a transparent dot-pixel portrait">
</picture>

<h1>Kavya Jain</h1>

<p><code>systems engineering · product architecture · evidence-first software</code></p>

<p><strong>B.Tech CSE @ ABES Engineering College</strong><br>Building reliable product systems and solving DSA in C++.</p>

<a href="#-selected-work"><img alt="Selected work" src="https://img.shields.io/badge/SELECTED_WORK-1f883d?style=flat-square&logo=github&logoColor=white"></a>
<a href="https://github.com/kavya-jain14/kavya-jain14/issues/new?title=Let%27s%20build%20something"><img alt="Start a conversation" src="https://img.shields.io/badge/START_A_CONVERSATION-30363d?style=flat-square&logo=github&logoColor=white"></a>
<a href="https://github.com/kavya-jain14?tab=repositories"><img alt="Repositories" src="https://img.shields.io/badge/REPOSITORIES-181717?style=flat-square&logo=github&logoColor=white"></a>
<a href="https://leetcode.com/u/Kavya_Jain_14/"><img alt="LeetCode" src="https://img.shields.io/badge/LEETCODE-FFA116?style=flat-square&logo=leetcode&logoColor=111111"></a>
<a href="https://codeforces.com/profile/kavya_jain"><img alt="Codeforces" src="https://img.shields.io/badge/CODEFORCES-1F8ACB?style=flat-square&logo=codeforces&logoColor=white"></a>
<a href="https://www.codechef.com/users/kavya_jain_14"><img alt="CodeChef" src="https://img.shields.io/badge/CODECHEF-5B4638?style=flat-square&logo=codechef&logoColor=white"></a>

</div>
---

## `~/` selected work

<!-- GENERATED:PROJECTS:START -->
<p align="center">
  <a href="https://github.com/kavya-jain14/TRINETRA">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./assets/projects/trinetra-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="./assets/projects/trinetra-light.svg">
      <img src="./assets/projects/trinetra-light.svg" width="760" alt="TRINETRA, Recover once when the provider times out. Stack: TypeScript · Fastify · PostgreSQL · Redis · React. Role: ARCHITECTURE · BACKEND · QA.">
    </picture>
  </a>
</p>
<p align="center">
  <a href="https://github.com/kavya-jain14/TRISHUL">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./assets/projects/trishul-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="./assets/projects/trishul-light.svg">
      <img src="./assets/projects/trishul-light.svg" width="760" alt="TRISHUL, Trace money while uncertainty stays visible. Stack: TypeScript · Fastify · PostgreSQL · React · Vitest. Role: PRODUCT · DATA DESIGN · FRONTEND QA.">
    </picture>
  </a>
</p>
<p align="center">
  <a href="https://github.com/kavya-jain14/MIRA">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./assets/projects/mira-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="./assets/projects/mira-light.svg">
      <img src="./assets/projects/mira-light.svg" width="760" alt="MIRA, Publish only after evidence clears the gate. Stack: TypeScript · Node.js · React · SQLite · Docker. Role: FRONTEND · PRODUCT FLOW · INTEGRATION.">
    </picture>
  </a>
</p>
<p align="center">
  <a href="https://github.com/gargibhardwaj24/Socrates">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./assets/projects/socrates-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="./assets/projects/socrates-light.svg">
      <img src="./assets/projects/socrates-light.svg" width="760" alt="SOCRATES, Teach the AI. Expose the misconception. Stack: Next.js · TypeScript · Prisma · PostgreSQL. Role: LEARNING UX · FRONTEND · EVALUATION.">
    </picture>
  </a>
</p>
<p align="center">
  <a href="https://github.com/kavya-jain14/COUNSEL-FLOW">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./assets/projects/counselflow-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="./assets/projects/counselflow-light.svg">
      <img src="./assets/projects/counselflow-light.svg" width="760" alt="COUNSELFLOW, Resolve conflicts before locking a list. Stack: React · TypeScript · Vite · Zod · Vitest. Role: PRODUCT ARCHITECTURE · DECISION UX.">
    </picture>
  </a>
</p>
<p align="center">
  <a href="https://github.com/kavya-jain14/PAPER_TRADE">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./assets/projects/papertrade-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="./assets/projects/papertrade-light.svg">
      <img src="./assets/projects/papertrade-light.svg" width="760" alt="PAPERTRADE, Keep price and portfolio state authoritative. Stack: React · Express · MongoDB · SSE · Yahoo Finance. Role: FULL-STACK PRODUCT ENGINEERING.">
    </picture>
  </a>
</p>

### Evidence chains

<details>
<summary><strong>01 · TRINETRA</strong> · accepted timeout → one replay-safe recovery path</summary>

<p><strong>Problem</strong><br>A provider can accept a payment and time out before confirmation. A blind retry risks a duplicate submission, while the payer and operator still need one explainable history.</p>
<p><strong>Constraint</strong><br>Replay safety, provider recovery and ordered risk evidence must survive across API replicas without turning a pending state into a retry instruction.</p>
<p><strong>Decision</strong><br>Keep payment and provider-attempt history in a tenant-scoped ledger, reuse the original idempotent resource on replay, then resolve uncertainty through status inquiry.</p>
<p><strong>Result</strong><br>The synthetic accepted-timeout checkpoint and PostgreSQL/Redis integration test exercise one provider submission, cross-replica replay and recovery to the original payment.</p>
<p><strong>Stack</strong><br><code>TypeScript · Fastify · PostgreSQL · Redis · React</code></p>
<p><strong>My contribution</strong><br>ARCHITECTURE · BACKEND · QA</p>
<p><strong>Proof</strong></p>
<ul>
<li><a href="https://github.com/kavya-jain14/TRINETRA#third-integration-checkpoint">Accepted-timeout recovery checkpoint</a></li>
<li><a href="https://github.com/kavya-jain14/TRINETRA/blob/main/apps/api/test/postgres-redis.integration.test.ts">PostgreSQL and Redis integration test</a></li>
<li><a href="https://github.com/kavya-jain14/TRINETRA/commit/e92175890855a52a17fa604a6b79c7d128c3e4eb">Recovery checkpoint change</a></li>
</ul>
<p><a href="https://github.com/kavya-jain14/TRINETRA">Inspect repository →</a></p>

</details>

<details>
<summary><strong>02 · TRISHUL</strong> · cash-out forecast → explicit PASS or ABSTAIN</summary>

<p><strong>Problem</strong><br>After a fraud complaint, investigators need to trace attributable exposure and assess probable cash-out behaviour without presenting incomplete signals as certainty.</p>
<p><strong>Constraint</strong><br>Money can commingle, records arrive from authorised sources at different times, and location and time may have different levels of support.</p>
<p><strong>Decision</strong><br>Build a provenance-backed case graph, represent exposure as a range, and gate geo and time forecasts independently so either dimension can abstain.</p>
<p><strong>Result</strong><br>The prediction and API tests cover supported forecasts, partial evidence, stationary funds and intentional abstention without inventing candidates.</p>
<p><strong>Stack</strong><br><code>TypeScript · Fastify · PostgreSQL · React · Vitest</code></p>
<p><strong>My contribution</strong><br>PRODUCT · DATA DESIGN · FRONTEND QA</p>
<p><strong>Proof</strong></p>
<ul>
<li><a href="https://github.com/kavya-jain14/TRISHUL/blob/main/packages/prediction/test/evidence-gate.test.ts">Evidence-gate unit tests</a></li>
<li><a href="https://github.com/kavya-jain14/TRISHUL/blob/main/apps/api/test/exit-evidence-flow.test.ts">Exit-mode and forecast API flow</a></li>
<li><a href="https://github.com/kavya-jain14/TRISHUL#product-boundary">Locked product boundary</a></li>
</ul>
<p><a href="https://github.com/kavya-jain14/TRISHUL">Inspect repository →</a></p>

</details>

<details>
<summary><strong>03 · MIRA</strong> · autonomous publishing → threshold, memory and audit</summary>

<p><strong>Problem</strong><br>An autonomous editor can repeat stories, amplify weak sources or publish hype while hiding why a candidate was accepted or rejected.</p>
<p><strong>Constraint</strong><br>The agent must continue after initialization, limit each cycle, survive refreshes and retain evidence for both publication and rejection.</p>
<p><strong>Decision</strong><br>Separate discovery, editorial scoring, durable decision memory and publishing; enforce source gates, a fixed threshold and duplicate fingerprints.</p>
<p><strong>Result</strong><br>The backend and policy tests exercise one-item pacing, rejected candidates, later backlog publication and duplicate suppression in durable memory.</p>
<p><strong>Stack</strong><br><code>TypeScript · Node.js · React · SQLite · Docker</code></p>
<p><strong>My contribution</strong><br>FRONTEND · PRODUCT FLOW · INTEGRATION</p>
<p><strong>Proof</strong></p>
<ul>
<li><a href="https://github.com/kavya-jain14/MIRA/blob/main/apps/api/src/backend.test.ts">Autonomous runtime behaviour tests</a></li>
<li><a href="https://github.com/kavya-jain14/MIRA/blob/main/packages/agent-core/src/editorial-policy.test.ts">Editorial threshold and rejection tests</a></li>
<li><a href="https://github.com/kavya-jain14/MIRA/commit/5bea458f09d27c274d811aa6a024e1f98e89e397">Decision-ledger repair change</a></li>
</ul>
<p><a href="https://github.com/kavya-jain14/MIRA">Inspect repository →</a></p>

</details>

<details>
<summary><strong>04 · SOCRATES</strong> · confident explanation → deterministic misconception test</summary>

<p><strong>Problem</strong><br>A learner can sound confident while missing a core misconception, so completion alone cannot show whether the concept was understood.</p>
<p><strong>Constraint</strong><br>Evaluation must remain repeatable and explainable even when no LLM key is available.</p>
<p><strong>Decision</strong><br>Seed known misconceptions and score the learner&apos;s correction, reasoning and evidence with a transparent stage-based rubric.</p>
<p><strong>Result</strong><br>The rubric maps each learning stage to observable signals and returns the evidence span used by the scoring flow.</p>
<p><strong>Stack</strong><br><code>Next.js · TypeScript · Prisma · PostgreSQL</code></p>
<p><strong>My contribution</strong><br>LEARNING UX · FRONTEND · EVALUATION</p>
<p><strong>Proof</strong></p>
<ul>
<li><a href="https://github.com/gargibhardwaj24/Socrates/blob/main/src/lib/rubric.ts">Transparent stage-based rubric</a></li>
<li><a href="https://github.com/gargibhardwaj24/Socrates/blob/main/src/components/MisconceptionFingerprint.tsx">Misconception evidence surface</a></li>
<li><a href="https://github.com/gargibhardwaj24/Socrates/commit/d01b1b6170568d0cd34960bb48c7e8249e04029e">Kavya&apos;s learning-catalogue and navigation change</a></li>
</ul>
<p><a href="https://github.com/gargibhardwaj24/Socrates">Inspect repository →</a> · <a href="https://socrates-one-coral.vercel.app">Open demo ↗</a></p>

</details>

<details>
<summary><strong>05 · COUNSELFLOW</strong> · preference list → conflict audit before lock</summary>

<p><strong>Problem</strong><br>A candidate can receive a plausible college list that violates their branch priority, budget, distance or hard exclusions and still lock it by mistake.</p>
<p><strong>Constraint</strong><br>Official cutoff evidence, hard constraints and soft preferences must remain distinguishable, deterministic and reviewable after every edit.</p>
<p><strong>Decision</strong><br>Generate an ordered strategy, surface coded contradictions, mark the audit stale after edits and block lock while a critical conflict remains.</p>
<p><strong>Result</strong><br>Domain tests exercise eight conflict rules, reproducible strategy hashes and the invariant that unresolved critical conflicts prevent lock.</p>
<p><strong>Stack</strong><br><code>React · TypeScript · Vite · Zod · Vitest</code></p>
<p><strong>My contribution</strong><br>PRODUCT ARCHITECTURE · DECISION UX</p>
<p><strong>Proof</strong></p>
<ul>
<li><a href="https://github.com/kavya-jain14/COUNSEL-FLOW/blob/main/src/domain/conflicts.test.ts">Eight deterministic conflict rules</a></li>
<li><a href="https://github.com/kavya-jain14/COUNSEL-FLOW/blob/main/src/domain/lock.test.ts">Lock invariants</a></li>
<li><a href="https://github.com/kavya-jain14/COUNSEL-FLOW/commit/d116e83f61be8f6e85bf1ef22b794ab830d9bd6b">Attention-first counselling flow change</a></li>
</ul>
<p><a href="https://github.com/kavya-jain14/COUNSEL-FLOW">Inspect repository →</a></p>

</details>

<details>
<summary><strong>06 · PAPERTRADE</strong> · changing market session → one authoritative execution path</summary>

<p><strong>Problem</strong><br>A trading simulator must keep orders and portfolio state credible when client prices drift, the exchange closes or the live price provider is unavailable.</p>
<p><strong>Constraint</strong><br>The server owns execution price and holdings while the interface still needs useful market behaviour outside NSE live hours.</p>
<p><strong>Decision</strong><br>Canonicalize symbols, resolve execution prices on the backend, persist transactions and switch between live and bounded simulated market sessions.</p>
<p><strong>Result</strong><br>Backend tests cover NSE live boundaries, weekends, published holidays, the special Sunday session and time-bucketed simulated candles.</p>
<p><strong>Stack</strong><br><code>React · Express · MongoDB · SSE · Yahoo Finance</code></p>
<p><strong>My contribution</strong><br>FULL-STACK PRODUCT ENGINEERING</p>
<p><strong>Proof</strong></p>
<ul>
<li><a href="https://github.com/kavya-jain14/PAPER_TRADE/blob/main/paper_trade_backend/test/marketSession.test.js">NSE market-session boundary tests</a></li>
<li><a href="https://github.com/kavya-jain14/PAPER_TRADE/blob/main/paper_trade_backend/test/marketBrain.test.js">Simulated candle time-bucket test</a></li>
<li><a href="https://github.com/kavya-jain14/PAPER_TRADE/commit/74c51023c86155ee62bbe8651e7f7599504e73ef">Terminal and authentication redesign</a></li>
</ul>
<p><a href="https://github.com/kavya-jain14/PAPER_TRADE">Inspect repository →</a> · <a href="https://paper-trade-phi.vercel.app">Open demo ↗</a></p>

</details>
<!-- GENERATED:PROJECTS:END -->
---

## `~/` whoami

<!-- GENERATED:ABOUT:START -->
<picture>
  <source media="(max-width: 600px) and (prefers-color-scheme: dark)" srcset="./assets/generated/about-terminal-dark-compact.svg">
  <source media="(max-width: 600px)" srcset="./assets/generated/about-terminal-light-compact.svg">
  <source media="(prefers-color-scheme: dark)" srcset="./assets/generated/about-terminal-dark.svg">
  <img src="./assets/generated/about-terminal-light.svg" width="880" loading="lazy" alt="$ cat about.txt  Hi, I'm Kavya Jain. I build systems for decisions that become difficult when evidence is incomplete, providers fail, or the happy path stops being honest.  - Currently building TRISHUL, a financial cyber-fraud intelligence system. - Strongest lane: product architecture, frontend QA, backend reliability and explainable state. - Learning track: DSA in C++ and production-grade full-stack systems. - I treat failure recovery as a product feature, not a cleanup task.">
</picture>
<sub><a href="./data/about.txt">Read about.txt</a></sub>
<!-- GENERATED:ABOUT:END -->
---

## `~/` toolbox

<!-- GENERATED:TOOLBOX:START -->
<p align="center">
  <img src="./assets/toolbox/typescript.svg" width="72" height="72" alt="TypeScript" title="TypeScript · 65.6% · 1.6 MB">
  <img src="./assets/toolbox/javascript.svg" width="72" height="72" alt="JavaScript" title="JavaScript · 19.3% · 496.5 KB">
  <img src="./assets/toolbox/css.svg" width="72" height="72" alt="CSS" title="CSS · 11.0% · 283.6 KB">
  <img src="./assets/toolbox/html5.svg" width="72" height="72" alt="HTML" title="HTML · 1.7% · 44.2 KB">
  <img src="./assets/toolbox/python.svg" width="72" height="72" alt="Python" title="Python · 1.1% · 29.1 KB">
  <img src="./assets/toolbox/postgresql.svg" width="72" height="72" alt="PLpgSQL" title="PLpgSQL · 0.7% · 18.0 KB">
  <img src="./assets/toolbox/openjdk.svg" width="72" height="72" alt="Java" title="Java · 0.4% · 11.2 KB">
  <img src="./assets/toolbox/docker.svg" width="72" height="72" alt="Dockerfile" title="Dockerfile · &lt;0.1% · 897 B">
  <img src="./assets/toolbox/cplusplus.svg" width="72" height="72" alt="C++" title="C++ · &lt;0.1% · 403 B">
</p>
<sub>Detected from GitHub Linguist bytes across 16 public repositories. Hover any badge for its live share and byte count.</sub>
<!-- GENERATED:TOOLBOX:END -->
---

## `~/` skill radar

<picture>
  <source media="(max-width: 600px) and (prefers-color-scheme: dark)" srcset="./assets/skill-radar-dark-compact.svg">
  <source media="(max-width: 600px)" srcset="./assets/skill-radar-light-compact.svg">
  <source media="(prefers-color-scheme: dark)" srcset="./assets/skill-radar-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/skill-radar-light.svg">
  <img src="./assets/skill-radar-light.svg" width="880" alt="Relative radar charts of Kavya Jain's engineering focus and working languages">
</picture>

<p><sub>Relative working range, not proficiency percentages. Engineering range is project-driven; repository footprint reports the six largest GitHub Linguist byte totals. Current practice: TypeScript systems and DSA in C++.</sub></p>
---

## `~/` activity trail

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/generated/rabbit-calendar-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/generated/rabbit-calendar-light.svg">
  <img src="./assets/generated/rabbit-calendar-light.svg" width="880" alt="A pixel rabbit hops across Kavya Jain's monthly contribution pillars in a seeded random order">
</picture>
---

<div align="center">

### `~/` build the difficult thing

Open to software engineering internships and collaborations on systems with difficult state, incomplete evidence, or failure paths worth designing properly.

<a href="https://github.com/kavya-jain14/kavya-jain14/issues/new?title=Let%27s%20build%20something"><img alt="Start a conversation" src="https://img.shields.io/badge/START_A_CONVERSATION-1f883d?style=for-the-badge&logo=github&logoColor=white"></a>

<a href="https://github.com/kavya-jain14"><img alt="GitHub" src="https://img.shields.io/badge/GITHUB-181717?style=flat-square&logo=github&logoColor=white"></a>
<a href="https://leetcode.com/u/Kavya_Jain_14/"><img alt="LeetCode" src="https://img.shields.io/badge/LEETCODE-FFA116?style=flat-square&logo=leetcode&logoColor=111111"></a>
<a href="https://codeforces.com/profile/kavya_jain"><img alt="Codeforces" src="https://img.shields.io/badge/CODEFORCES-1F8ACB?style=flat-square&logo=codeforces&logoColor=white"></a>
<a href="https://www.codechef.com/users/kavya_jain_14"><img alt="CodeChef" src="https://img.shields.io/badge/CODECHEF-5B4638?style=flat-square&logo=codechef&logoColor=white"></a>

</div>
