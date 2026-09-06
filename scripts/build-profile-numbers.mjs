import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const contributions = JSON.parse(readFileSync("data/contributions.json", "utf8"));
const signals = JSON.parse(readFileSync("data/profile-signals.json", "utf8"));
const weeks = contributions.weeks.slice(-52);
let weekRun = 0;
for (let index = weeks.length - 1; index >= 0 && weeks[index].total > 0; index -= 1) weekRun += 1;

const refreshed = new Date(signals.generatedAt).toLocaleDateString("en-GB", {
  day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
}).toUpperCase();
const current = signals.metrics.current;
const previous = signals.metrics.previous;

const themes = {
  dark: { background: "#0d1117", border: "#30363d", ink: "#f0f6fc", muted: "#8b949e", accent: "#39d353", soft: "#161b22", negative: "#ff7b72" },
  light: { background: "#ffffff", border: "#d0d7de", ink: "#1f2328", muted: "#59636e", accent: "#1f883d", soft: "#f6f8fa", negative: "#cf222e" },
};

const metrics = [
  [current.publicRepos, "PUBLIC REPOS", current.publicRepos - previous.publicRepos],
  [current.contributions, "CONTRIBUTIONS", current.contributions - previous.contributions],
  [current.activeWeeks, "ACTIVE WEEKS", current.activeWeeks - previous.activeWeeks],
  [current.flagshipSystems, "FLAGSHIP SYSTEMS", current.flagshipSystems - previous.flagshipSystems],
];

function deltaText(delta) {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return "±0";
}

function sparkline(colour) {
  const values = weeks.slice(-12).map((week) => Number(week.total || 0));
  const maximum = Math.max(1, ...values);
  const points = values.map((value, index) => {
    const x = 249 + index * 14.8;
    const y = 132 - (value / maximum) * 24;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<path d="M249 134H414" stroke="${colour.border}"/><polyline points="${points}" fill="none" stroke="${colour.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="414" y="105" text-anchor="end" class="micro mono">12W TREND</text>`;
}

function render(themeName) {
  const colour = themes[themeName];
  const cards = metrics.map(([value, label, delta], index) => {
    const x = 20 + index * 213;
    const deltaColour = delta > 0 ? colour.accent : (delta < 0 ? colour.negative : colour.muted);
    const chart = index === 1 ? sparkline(colour) : `<path d="M${x + 16} 126H${x + 181}" stroke="${colour.border}"/><text x="${x + 16}" y="137" class="micro mono">SINCE LAST REFRESH</text>`;
    return `<g><rect x="${x}" y="38" width="197" height="108" rx="5" fill="${colour.soft}" stroke="${colour.border}"/><text x="${x + 16}" y="75" class="metric">${value}</text><text x="${x + 181}" y="70" text-anchor="end" class="delta mono" fill="${deltaColour}">${deltaText(delta)}</text><text x="${x + 16}" y="97" class="label mono">${label}</text>${chart}</g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 184" width="880" height="184" role="img" aria-labelledby="numbers-title numbers-desc">
  <title id="numbers-title">Kavya Jain by the numbers</title><desc id="numbers-desc">${current.contributions} contributions, ${current.activeWeeks} active weeks, ${current.publicRepos} public repositories and ${current.flagshipSystems} flagship systems, with deltas since the previous refresh and a twelve-week contribution trend.</desc>
  <style>text{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;fill:${colour.ink}}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.eyebrow{font-size:9px;font-weight:700;letter-spacing:.14em;fill:${colour.accent}}.date{font-size:8px;font-weight:650;letter-spacing:.08em;fill:${colour.muted}}.metric{font-size:26px;font-weight:780}.delta{font-size:10px;font-weight:750}.label{font-size:8px;font-weight:700;letter-spacing:.11em;fill:${colour.muted}}.micro{font-size:6.8px;font-weight:700;letter-spacing:.08em;fill:${colour.muted}}.run{font-size:8.5px;font-weight:700;fill:${colour.muted}}</style>
  <rect x=".5" y=".5" width="879" height="183" rx="6" fill="${colour.background}" stroke="${colour.border}"/><text x="20" y="23" class="eyebrow mono">~/ THE NUMBERS</text><text x="860" y="23" text-anchor="end" class="date mono">REFRESHED ${refreshed}</text>${cards}<circle cx="28" cy="165" r="3" fill="${colour.accent}"/><text x="40" y="169" class="run mono">CURRENT ACTIVITY RUN · ${weekRun} WEEKS</text><text x="860" y="169" text-anchor="end" class="run mono">ONE API SNAPSHOT · DAILY DELTAS</text>
</svg>`;
}

mkdirSync("assets", { recursive: true });
for (const themeName of Object.keys(themes)) writeFileSync(`assets/numbers-${themeName}.svg`, render(themeName), "utf8");
console.log(`Built profile numbers with deltas and a twelve-week contribution trend.`);
