import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("data/contributions.json", "utf8"));
const weeks = data.weeks.slice(-52);
const activeWeeks = weeks.filter((week) => week.total > 0).length;
let weekRun = 0;
for (let index = weeks.length - 1; index >= 0 && weeks[index].total > 0; index -= 1) weekRun += 1;

const publicRepos = Number(process.env.PUBLIC_REPO_COUNT || 17);
const refreshed = new Date(data.generatedAt).toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
}).toUpperCase();

const themes = {
  dark: { background: "#0d1117", border: "#30363d", ink: "#f0f6fc", muted: "#8b949e", accent: "#39d353", soft: "#161b22" },
  light: { background: "#ffffff", border: "#d0d7de", ink: "#1f2328", muted: "#59636e", accent: "#1f883d", soft: "#f6f8fa" },
};

const metrics = [
  [publicRepos, "PUBLIC REPOS"],
  [data.total, "CONTRIBUTIONS"],
  [activeWeeks, "ACTIVE WEEKS"],
  [4, "FLAGSHIP SYSTEMS"],
];

function render(themeName) {
  const colour = themes[themeName];
  const cards = metrics.map(([value, label], index) => {
    const x = 20 + index * 213;
    return `<g><rect x="${x}" y="38" width="197" height="78" rx="5" fill="${colour.soft}" stroke="${colour.border}"/><text x="${x + 16}" y="75" class="metric">${value}</text><text x="${x + 16}" y="98" class="label mono">${label}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 154" width="880" height="154" role="img" aria-labelledby="numbers-title numbers-desc">
  <title id="numbers-title">Kavya Jain by the numbers</title><desc id="numbers-desc">${data.total} contributions, ${activeWeeks} active weeks, ${publicRepos} public repositories and four flagship systems.</desc>
  <style>text{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;fill:${colour.ink}}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.eyebrow{font-size:9px;font-weight:700;letter-spacing:.14em;fill:${colour.accent}}.date{font-size:8px;font-weight:650;letter-spacing:.08em;fill:${colour.muted}}.metric{font-size:26px;font-weight:780}.label{font-size:8px;font-weight:700;letter-spacing:.11em;fill:${colour.muted}}.run{font-size:9px;font-weight:700;fill:${colour.muted}}</style>
  <rect x=".5" y=".5" width="879" height="153" rx="6" fill="${colour.background}" stroke="${colour.border}"/><text x="20" y="23" class="eyebrow mono">~/ THE NUMBERS</text><text x="860" y="23" text-anchor="end" class="date mono">REFRESHED ${refreshed}</text>${cards}<circle cx="28" cy="135" r="3" fill="${colour.accent}"/><text x="40" y="139" class="run mono">CURRENT ACTIVITY RUN · ${weekRun} WEEKS</text><text x="860" y="139" text-anchor="end" class="run mono">PUBLIC GITHUB DATA · NO THIRD-PARTY STATS CARD</text>
</svg>`;
}

mkdirSync("assets", { recursive: true });
for (const themeName of Object.keys(themes)) writeFileSync(`assets/numbers-${themeName}.svg`, render(themeName), "utf8");
console.log(`Built profile numbers: ${data.total} contributions, ${activeWeeks} active weeks, ${weekRun}-week run.`);
