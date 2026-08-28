import { mkdirSync, writeFileSync } from "node:fs";

const username = process.env.GITHUB_REPOSITORY_OWNER || "kavya-jain14";
const token = process.env.GITHUB_TOKEN;
const apiHeaders = {
  Accept: "application/vnd.github+json",
  "User-Agent": "kavya-profile-observatory",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};
const flagshipOrder = ["TRINETRA", "TRISHUL", "MIRA", "COUNSEL-FLOW", "PAPER_TRADE"];

const xml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...apiHeaders, ...options.headers },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  return response;
}

async function contributionsFromGraphql() {
  if (!token) return null;
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 370);
  const query = `
    query ProfileContributions($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks { contributionDays { contributionCount contributionLevel date weekday } }
          }
        }
      }
    }
  `;
  const response = await request("https://api.github.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login: username, from: from.toISOString(), to: to.toISOString() } }),
  });
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message).join("; "));
  const calendar = payload.data.user.contributionsCollection.contributionCalendar;
  const levels = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
  return {
    total: calendar.totalContributions,
    days: calendar.weeks.flatMap((week) => week.contributionDays.map((day) => ({
      date: day.date,
      count: day.contributionCount,
      level: levels[day.contributionLevel] ?? 0,
      weekday: day.weekday,
    }))),
  };
}

async function contributionsFromProfile() {
  const response = await request(`https://github.com/users/${username}/contributions`, { headers: { Accept: "text/html" } });
  const html = await response.text();
  const total = Number(html.match(/<h2[^>]*>[\s\n]*(\d[\d,]*)[\s\n]*contributions/)?.[1]?.replaceAll(",", "") || 0);
  const days = [];
  const cells = /<td[^>]*data-date="([^"]+)"[^>]*id="([^"]+)"[^>]*data-level="([0-4])"[^>]*><\/td>\s*<tool-tip[^>]*for="\2"[^>]*>([^<]*)<\/tool-tip>/g;
  for (const match of html.matchAll(cells)) {
    const count = Number(match[4].match(/^(\d[\d,]*) contribution/)?.[1]?.replaceAll(",", "") || 0);
    days.push({
      date: match[1],
      count,
      level: Number(match[3]),
      weekday: new Date(`${match[1]}T00:00:00Z`).getUTCDay(),
    });
  }
  if (!days.length) throw new Error("GitHub contribution calendar could not be parsed");
  return { total, days };
}

async function getContributionCalendar() {
  try {
    return await contributionsFromGraphql() || await contributionsFromProfile();
  } catch (error) {
    console.warn(`GraphQL contribution query failed; using public profile fallback: ${error.message}`);
    return contributionsFromProfile();
  }
}

async function getBuildProof() {
  const repositories = await request(`https://api.github.com/users/${username}/repos?type=owner&sort=pushed&per_page=100`).then((response) => response.json());
  const flagships = repositories
    .filter((repository) => flagshipOrder.includes(repository.name))
    .sort((left, right) => new Date(right.pushed_at) - new Date(left.pushed_at));
  const active = flagships[0] || repositories[0];
  let status = "NO CHECKS";

  if (active?.default_branch) {
    try {
      const branch = await request(`https://api.github.com/repos/${username}/${active.name}/branches/${active.default_branch}`).then((response) => response.json());
      const checks = await request(`https://api.github.com/repos/${username}/${active.name}/commits/${branch.commit.sha}/check-runs?per_page=100`).then((response) => response.json());
      const conclusions = checks.check_runs?.map((check) => check.conclusion || check.status) || [];
      if (conclusions.includes("failure") || conclusions.includes("cancelled")) status = "CHECKS NEED ATTENTION";
      else if (conclusions.some((result) => result === "in_progress" || result === "queued")) status = "CHECKS RUNNING";
      else if (conclusions.length && conclusions.every((result) => ["success", "skipped", "neutral"].includes(result))) status = "CHECKS PASSING";
    } catch (error) {
      console.warn(`Could not read checks for ${active?.name}: ${error.message}`);
    }
  }

  let latestPullRequest = {
    number: 22,
    repository_url: `https://api.github.com/repos/${username}/TRISHUL`,
  };
  try {
    const query = encodeURIComponent(`author:${username} type:pr is:merged`);
    const search = await request(`https://api.github.com/search/issues?q=${query}&sort=updated&order=desc&per_page=1`).then((response) => response.json());
    latestPullRequest = search.items?.[0] || latestPullRequest;
  } catch (error) {
    console.warn(`Could not read latest merged PR: ${error.message}`);
  }

  return {
    active: active?.name || "PROFILE",
    pushedAt: active?.pushed_at || new Date().toISOString(),
    status,
    latestPullRequest,
  };
}

function activityStats(calendar) {
  const days = [...calendar.days].sort((left, right) => left.date.localeCompare(right.date));
  let longest = 0;
  let running = 0;
  for (const day of days) {
    if (day.count > 0) {
      running += 1;
      longest = Math.max(longest, running);
    } else running = 0;
  }
  let current = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].count > 0) current += 1;
    else if (current > 0 || days[index].date < new Date().toISOString().slice(0, 10)) break;
  }
  return { activeDays: days.filter((day) => day.count > 0).length, longest, current };
}

function commitSignalSvg(calendar) {
  const days = [...calendar.days].sort((left, right) => left.date.localeCompare(right.date));
  const stats = activityStats(calendar);
  const first = new Date(`${days[0].date}T00:00:00Z`);
  first.setUTCDate(first.getUTCDate() - first.getUTCDay());
  const origin = first.getTime();
  const cell = 10;
  const gap = 4;
  const x0 = 74;
  const y0 = 76;
  const maxCount = Math.max(1, ...days.map((day) => day.count));

  const cellMarkup = days.map((day) => {
    const date = new Date(`${day.date}T00:00:00Z`);
    const week = Math.floor((date.getTime() - origin) / (7 * 86400000));
    const x = x0 + week * (cell + gap);
    const y = y0 + day.weekday * (cell + gap);
    const delay = Math.min(1.35, week * 0.022 + day.weekday * 0.004).toFixed(3);
    return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="var(--level-${day.level})"><title>${xml(day.date)} · ${day.count} contribution${day.count === 1 ? "" : "s"}</title>${day.count ? `<animate attributeName="opacity" values="0.18;1" begin="${delay}s" dur="0.42s" repeatCount="1" fill="freeze"/>` : ""}</rect>`;
  }).join("\n    ");

  const waveform = days.map((day, index) => {
    const x = x0 + index * (756 / Math.max(1, days.length - 1));
    const y = 228 - (day.count / maxCount) * 42;
    return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  const monthLabels = [];
  let lastMonth = -1;
  for (const day of days) {
    const date = new Date(`${day.date}T00:00:00Z`);
    if (date.getUTCMonth() === lastMonth || date.getUTCDate() > 7) continue;
    lastMonth = date.getUTCMonth();
    const week = Math.floor((date.getTime() - origin) / (7 * 86400000));
    const label = date.toLocaleString("en", { month: "short", timeZone: "UTC" }).toUpperCase();
    monthLabels.push(`<text x="${x0 + week * (cell + gap)}" y="62" class="muted tiny">${label}</text>`);
  }

  return `<svg width="1000" height="310" viewBox="0 0 1000 310" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="signal-title signal-desc">
  <title id="signal-title">Kavya Jain's commit signal</title>
  <desc id="signal-desc">A one-year GitHub contribution calendar and daily activity waveform generated from public contribution data.</desc>
  <style>
    :root{--ink:#0D1117;--muted:#57606A;--line:#D0D7DE;--level-0:#EBF1F8;--level-1:#B6D4FF;--level-2:#78AEFF;--level-3:#3B82F6;--level-4:#175CD3;--pulse:#2563EB}
    @media (prefers-color-scheme:dark){:root{--ink:#F0F6FC;--muted:#8B949E;--line:#30363D;--level-0:#161B22;--level-1:#163B73;--level-2:#1F6FEB;--level-3:#388BFD;--level-4:#79C0FF;--pulse:#79C0FF}}
    text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:var(--ink)}
    .muted{fill:var(--muted)}.tiny{font-size:10px;letter-spacing:.08em}.label{font-size:13px;letter-spacing:.14em;font-weight:700}.value{font-size:24px;font-weight:700}
  </style>
  <text x="74" y="28" class="label">COMMIT SIGNAL / 365 DAYS</text>
  <text x="926" y="28" text-anchor="end" class="muted tiny">GENERATED FROM GITHUB</text>
  <path d="M74 42H926" stroke="var(--line)"/>
  ${monthLabels.join("\n  ")}
  <g>${cellMarkup}</g>
  <text x="74" y="174" class="muted tiny">DAILY ACTIVITY WAVEFORM</text>
  <path d="M74 228H830" stroke="var(--line)" stroke-dasharray="3 5"/>
  <path d="${waveform}" stroke="var(--pulse)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
    <animate attributeName="stroke-dasharray" values="0 1400;1400 0" dur="1.8s" repeatCount="1" fill="freeze"/>
  </path>
  <g transform="translate(74 274)">
    <text class="value">${calendar.total}</text><text x="76" class="muted tiny">CONTRIBUTIONS</text>
    <text x="270" class="value">${stats.activeDays}</text><text x="332" class="muted tiny">ACTIVE DAYS</text>
    <text x="506" class="value">${stats.longest}</text><text x="556" class="muted tiny">LONGEST RUN</text>
    <text x="726" class="value">${stats.current}</text><text x="776" class="muted tiny">CURRENT RUN</text>
  </g>
</svg>\n`;
}

function buildRelaySvg(proof) {
  const stages = ["IDEA", "ARCHITECT", "BUILD", "VERIFY", "SHIP"];
  const descriptions = ["Define the boundary", "Freeze the contracts", "Build the vertical slice", "Run the evidence", "Release the proof"];
  const points = stages.map((stage, index) => ({ stage, description: descriptions[index], x: 100 + index * 200 }));
  const statusColor = proof.status === "CHECKS PASSING" ? "var(--success)" : proof.status.includes("ATTENTION") ? "var(--danger)" : "var(--accent)";
  const latestPrRepo = proof.latestPullRequest?.repository_url?.split("/").pop();
  const latestPr = proof.latestPullRequest
    ? `PR #${proof.latestPullRequest.number} · ${latestPrRepo || username} · MERGED`
    : "NO MERGED PR VISIBLE YET";
  const updated = new Date(proof.pushedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();

  return `<svg width="1000" height="258" viewBox="0 0 1000 258" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="relay-title relay-desc">
  <title id="relay-title">Kavya Jain's build relay</title>
  <desc id="relay-desc">A five-stage engineering path from idea through architecture, build, verification and shipping, annotated with current GitHub proof.</desc>
  <style>
    :root{--ink:#0D1117;--muted:#57606A;--line:#D0D7DE;--soft:#F6F8FA;--accent:#2563EB;--success:#1A7F37;--danger:#CF222E}
    @media (prefers-color-scheme:dark){:root{--ink:#F0F6FC;--muted:#8B949E;--line:#30363D;--soft:#161B22;--accent:#79C0FF;--success:#3FB950;--danger:#FF7B72}}
    text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:var(--ink)}
    .muted{fill:var(--muted)}.tiny{font-size:10px;letter-spacing:.08em}.label{font-size:13px;letter-spacing:.14em;font-weight:700}.stage{font-size:12px;font-weight:700;letter-spacing:.08em}.detail{font-size:10px}
  </style>
  <text x="74" y="28" class="label">BUILD RELAY</text>
  <text x="926" y="28" text-anchor="end" class="muted tiny">PROCESS, NOT DECORATION</text>
  <path d="M74 42H926" stroke="var(--line)"/>
  <path d="M100 102H900" stroke="var(--line)" stroke-width="2"/>
  ${points.map((point, index) => `<g>
    <circle cx="${point.x}" cy="102" r="8" fill="var(--soft)" stroke="var(--accent)" stroke-width="2"/>
    <text x="${point.x}" y="79" text-anchor="middle" class="stage">${point.stage}</text>
    <text x="${point.x}" y="132" text-anchor="middle" class="muted detail">${xml(point.description)}</text>
    <animate attributeName="opacity" values=".35;1" begin="${(index * 0.48).toFixed(2)}s" dur=".42s" repeatCount="1" fill="freeze"/>
  </g>`).join("\n  ")}
  <circle cx="900" cy="102" r="5" fill="var(--accent)">
    <animateMotion path="M-800 0H0" dur="2.45s" repeatCount="1" fill="freeze"/>
  </circle>
  <path d="M74 162H926" stroke="var(--line)"/>
  <text x="74" y="190" class="muted tiny">ACTIVE SYSTEM</text>
  <text x="74" y="214" class="stage">${xml(proof.active)}</text>
  <text x="286" y="190" class="muted tiny">LATEST PUSH</text>
  <text x="286" y="214" class="stage">${updated}</text>
  <text x="478" y="190" class="muted tiny">VERIFICATION</text>
  <text x="478" y="214" class="stage" fill="${statusColor}">${xml(proof.status)}</text>
  <text x="680" y="190" class="muted tiny">LATEST MERGED PR</text>
  <text x="680" y="214" class="stage">${xml(latestPr)}</text>
</svg>\n`;
}

const [calendar, proof] = await Promise.all([getContributionCalendar(), getBuildProof()]);
mkdirSync("assets", { recursive: true });
writeFileSync("assets/commit-signal.svg", commitSignalSvg(calendar), "utf8");
writeFileSync("assets/build-relay.svg", buildRelaySvg(proof), "utf8");
console.log(`Generated profile assets for ${username}: ${calendar.total} contributions; ${proof.active} is the latest active flagship.`);
