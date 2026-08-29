import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("data/contributions.json", "utf8"));
const weeks = data.weeks.slice(-52);
const total = weeks.reduce((sum, week) => sum + week.total, 0);
const activeWeeks = weeks.filter((week) => week.total > 0).length;
const peak = Math.max(...weeks.map((week) => week.total), 1);
let currentRun = 0;
for (let index = weeks.length - 1; index >= 0 && weeks[index].total > 0; index -= 1) currentRun += 1;

const themes = {
  dark: { background: "#0b1014", border: "#26363a", ink: "#f2f7f5", muted: "#91a09f", accent: "#55d8c7", grid: "#1a282c" },
  light: { background: "#fcfdfb", border: "#d4dfdc", ink: "#172220", muted: "#5f6f6b", accent: "#007e70", grid: "#e7efec" },
};
const width = 880, height = 208, left = 24, right = 856, top = 72, baseline = 166, plotHeight = baseline - top;
const step = (right - left) / (weeks.length - 1);
const points = weeks.map((week, index) => ({ x: left + index * step, y: baseline - Math.sqrt(week.total / peak) * plotHeight, ...week }));

function smoothPath(items) {
  if (items.length < 2) return "";
  let path = `M${items[0].x.toFixed(1)} ${items[0].y.toFixed(1)}`;
  for (let index = 1; index < items.length; index += 1) {
    const previous = items[index - 1], current = items[index], midX = (previous.x + current.x) / 2;
    path += ` C${midX.toFixed(1)} ${previous.y.toFixed(1)},${midX.toFixed(1)} ${current.y.toFixed(1)},${current.x.toFixed(1)} ${current.y.toFixed(1)}`;
  }
  return path;
}

const trace = smoothPath(points);
const area = `${trace} L${right} ${baseline} L${left} ${baseline} Z`;
const monthLabels = [0, 13, 26, 39, 51].map((index) => {
  const date = new Date(`${weeks[index].start}T00:00:00Z`);
  return { x: points[index].x, label: date.toLocaleString("en", { month: "short", year: index === 0 ? "numeric" : undefined, timeZone: "UTC" }).toUpperCase() };
});
const refreshed = new Date(data.generatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();

function render(themeName) {
  const colour = themes[themeName];
  const labels = monthLabels.map((item, index) => `<text x="${item.x.toFixed(1)}" y="190" text-anchor="${index === 0 ? "start" : index === monthLabels.length - 1 ? "end" : "middle"}" class="axis">${item.label}</text>`).join("");
  const dots = points.filter((point) => point.total > 0).map((point, index) => `<circle class="signal-dot d${index % 8}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="2.7"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="pulse-title pulse-desc">
  <title id="pulse-title">Kavya Jain's 52-week GitHub build pulse</title><desc id="pulse-desc">A single-colour signal line showing ${total} public contributions across ${activeWeeks} active weeks. The strongest week contains ${peak} contributions.</desc>
  <style>text{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;fill:${colour.ink}}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.label{font-size:9px;font-weight:700;letter-spacing:.14em;fill:${colour.muted}}.metric{font-size:22px;font-weight:750;letter-spacing:-.03em}.unit{font-size:9px;font-weight:700;letter-spacing:.1em;fill:${colour.muted}}.axis{font-size:8px;font-weight:700;letter-spacing:.08em;fill:${colour.muted}}.trace{fill:none;stroke:${colour.accent};stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1800;stroke-dashoffset:1800;animation:draw 1.7s cubic-bezier(.2,.75,.25,1) .15s forwards}.signal-dot{fill:${colour.accent};opacity:0;animation:appear .3s ease-out 1.55s forwards}.d1,.d5{animation-delay:1.62s}.d2,.d6{animation-delay:1.69s}.d3,.d7{animation-delay:1.76s}@keyframes draw{to{stroke-dashoffset:0}}@keyframes appear{to{opacity:1}}@media (prefers-reduced-motion:reduce){.trace{animation:none;stroke-dashoffset:0}.signal-dot{animation:none;opacity:1}}</style>
  <rect x=".5" y=".5" width="879" height="207" rx="7" fill="${colour.background}" stroke="${colour.border}"/><text x="24" y="22" class="label mono">BUILD PULSE / LAST 52 WEEKS</text><text x="856" y="20" text-anchor="end" class="axis mono">REFRESHED ${refreshed}</text>
  <text x="24" y="55" class="metric">${total}</text><text x="${24 + String(total).length * 14 + 8}" y="55" class="unit mono">CONTRIBUTIONS</text><text x="445" y="46" text-anchor="middle" class="metric">${activeWeeks}</text><text x="445" y="61" text-anchor="middle" class="unit mono">ACTIVE WEEKS</text><text x="856" y="46" text-anchor="end" class="metric">${currentRun}</text><text x="856" y="61" text-anchor="end" class="unit mono">WEEK RUN</text>
  <path d="M24 96H856M24 131H856M24 166H856" stroke="${colour.grid}"/><path d="${area}" fill="${colour.accent}" opacity=".07"/><path class="trace" d="${trace}"/>${dots}${labels}
</svg>`;
}

mkdirSync("assets", { recursive: true });
for (const themeName of Object.keys(themes)) writeFileSync(`assets/activity-pulse-${themeName}.svg`, render(themeName), "utf8");
console.log(`Built activity pulse: ${total} contributions, ${activeWeeks} active weeks, ${currentRun}-week run.`);
