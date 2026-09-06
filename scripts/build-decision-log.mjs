import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const signals = JSON.parse(readFileSync("data/profile-signals.json", "utf8"));
const events = signals.decisionLog.slice(0, 5);
const themes = {
  dark: { background: "#0d1117", border: "#30363d", ink: "#f0f6fc", muted: "#8b949e", accent: "#39d353", soft: "#161b22" },
  light: { background: "#ffffff", border: "#d0d7de", ink: "#1f2328", muted: "#59636e", accent: "#1f883d", soft: "#f6f8fa" },
};

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function truncate(value, length) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= length ? clean : `${clean.slice(0, length - 1)}…`;
}

function timestamp(value) {
  const date = new Date(value);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${hour}:${minute}`;
}

function render(themeName) {
  const colour = themes[themeName];
  const rows = events.map((event, index) => {
    const y = 45 + index * 40;
    const kind = event.kind === "MERGED PR" ? "MERGE" : "COMMIT";
    return `<g><rect x="20" y="${y}" width="840" height="32" rx="5" fill="${colour.soft}" stroke="${colour.border}"/><text x="34" y="${y + 20}" class="stamp">[${timestamp(event.at)}]</text><text x="154" y="${y + 20}" class="repo">${escapeXml(event.repo)}</text><rect x="260" y="${y + 8}" width="58" height="17" rx="8.5" fill="${colour.background}" stroke="${colour.border}"/><text x="289" y="${y + 19.5}" text-anchor="middle" class="kind">${kind}</text><text x="332" y="${y + 20}" class="message">${escapeXml(truncate(event.message, 71))}</text></g>`;
  }).join("");
  const height = 61 + Math.max(1, events.length) * 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 ${height}" width="880" height="${height}" role="img" aria-labelledby="log-title log-desc">
  <title id="log-title">Kavya Jain verified decision log</title><desc id="log-desc">The latest distinct-repository commits or merged pull requests across six selected repositories.</desc>
  <style>.mono,.stamp,.repo,.kind{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.eyebrow{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9px;font-weight:700;letter-spacing:.14em;fill:${colour.accent}}.source{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:8px;font-weight:650;letter-spacing:.08em;fill:${colour.muted}}.stamp{font-size:8px;font-weight:650;fill:${colour.muted}}.repo{font-size:8.5px;font-weight:750;fill:${colour.accent}}.kind{font-size:6.8px;font-weight:750;fill:${colour.muted};letter-spacing:.06em}.message{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:9px;font-weight:650;fill:${colour.ink}}</style>
  <rect x=".5" y=".5" width="879" height="${height - 1}" rx="7" fill="${colour.background}" stroke="${colour.border}"/><text x="20" y="25" class="eyebrow">~/ DECISION.LOG</text><text x="860" y="25" text-anchor="end" class="source">VERIFIED FROM 6 SELECTED REPOSITORIES</text>${rows || `<text x="20" y="68" class="source">NO RECENT PUBLIC EVENTS</text>`}
  </svg>`;
}

mkdirSync("assets", { recursive: true });
for (const themeName of Object.keys(themes)) writeFileSync(`assets/decision-log-${themeName}.svg`, render(themeName), "utf8");
console.log(`Built decision log from ${events.length} recent repository events.`);
