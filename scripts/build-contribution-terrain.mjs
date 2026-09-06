import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("data/contributions.json", "utf8"));
const weeks = data.weeks.slice(-52);
const weekVector = { x: 14, y: -4.7 };
const dayVector = { x: 7, y: 4.7 };
const origin = { x: 70, y: 320 };

const themes = {
  dark: {
    background: "#0d1117", border: "#30363d", ink: "#f0f6fc", muted: "#8b949e",
    grid: "#21262d", gridStroke: "#30363d", levels: ["#0e4429", "#006d32", "#26a641", "#39d353"],
  },
  light: {
    background: "#ffffff", border: "#d0d7de", ink: "#1f2328", muted: "#59636e",
    grid: "#f6f8fa", gridStroke: "#d0d7de", levels: ["#aceebb", "#6bdc82", "#39d353", "#1f883d"],
  },
};

function point(week, day, height = 0) {
  return {
    x: origin.x + week * weekVector.x + day * dayVector.x,
    y: origin.y + week * weekVector.y + day * dayVector.y - height,
  };
}

function cellCorners(week, day, height = 0) {
  const a = point(week, day, height);
  const b = { x: a.x + weekVector.x, y: a.y + weekVector.y };
  const d = { x: a.x + dayVector.x, y: a.y + dayVector.y };
  const c = { x: b.x + dayVector.x, y: b.y + dayVector.y };
  return { a, b, c, d };
}

function points(...nodes) {
  return nodes.map((node) => `${node.x.toFixed(1)},${node.y.toFixed(1)}`).join(" ");
}

function contributionCells() {
  return weeks.flatMap((week, weekIndex) => {
    if (Array.isArray(week.days) && week.days.length) {
      return week.days.slice(0, 7).map((day, dayIndex) => ({
        week: weekIndex,
        day: dayIndex,
        count: Number(day.count || 0),
        date: day.date,
      }));
    }
    return Array.from({ length: 7 }, (_, dayIndex) => ({
      week: weekIndex,
      day: dayIndex,
      count: dayIndex === 3 ? Number(week.total || 0) : 0,
      date: week.start,
    }));
  });
}

function level(count) {
  if (count <= 1) return 0;
  if (count <= 3) return 1;
  if (count <= 7) return 2;
  return 3;
}

function barHeight(count) {
  return Math.min(50, 6 + 9 * Math.log2(count + 1));
}

function monthLabels(colour) {
  let previousMonth = "";
  const labels = [];
  weeks.forEach((week, index) => {
    const date = new Date(`${week.start}T00:00:00Z`);
    const month = date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
    if (month === previousMonth) return;
    previousMonth = month;
    const anchor = point(index, 7.8);
    labels.push(`<text x="${anchor.x.toFixed(1)}" y="${(anchor.y + 8).toFixed(1)}" class="month" fill="${colour.muted}">${month}</text>`);
  });
  return labels.join("");
}

function render(themeName) {
  const colour = themes[themeName];
  const cells = contributionCells();
  const plane = cells.map((cell) => {
    const { a, b, c, d } = cellCorners(cell.week, cell.day);
    return `<polygon points="${points(a, b, c, d)}" fill="${colour.grid}" stroke="${colour.gridStroke}" stroke-width=".7"/>`;
  }).join("");
  const bars = cells.filter((cell) => cell.count > 0).sort((left, right) => {
    return point(left.week, left.day).y - point(right.week, right.day).y;
  }).map((cell) => {
    const height = barHeight(cell.count);
    const base = cellCorners(cell.week, cell.day);
    const top = cellCorners(cell.week, cell.day, height);
    const fill = colour.levels[level(cell.count)];
    return `<g aria-label="${cell.date}: ${cell.count} contributions"><polygon points="${points(top.d, top.c, base.c, base.d)}" fill="${fill}" opacity=".68"/><polygon points="${points(top.b, top.c, base.c, base.b)}" fill="${fill}" opacity=".84"/><polygon points="${points(top.a, top.b, top.c, top.d)}" fill="${fill}" stroke="${colour.background}" stroke-opacity=".18" stroke-width=".7"/></g>`;
  }).join("");
  const refreshed = new Date(data.generatedAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  }).toUpperCase();
  const legend = colour.levels.map((fill, index) => `<rect x="${735 + index * 24}" y="356" width="16" height="10" rx="2" fill="${fill}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 380" width="880" height="380" role="img" aria-labelledby="terrain-title terrain-desc">
  <title id="terrain-title">Kavya Jain contribution terrain</title>
  <desc id="terrain-desc">A deterministic isometric contribution grid. Every non-zero day is extruded from its exact grid cell, so no cube can detach from the plane.</desc>
  <style>.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.eyebrow{font-size:9px;font-weight:700;letter-spacing:.14em}.stamp,.month,.label{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:7.5px;font-weight:650;letter-spacing:.08em}</style>
  <rect x=".5" y=".5" width="879" height="379" rx="7" fill="${colour.background}" stroke="${colour.border}"/>
  <text x="20" y="25" class="eyebrow mono" fill="${colour.levels[3]}">~/ ACTIVITY TERRAIN</text><text x="860" y="25" text-anchor="end" class="stamp" fill="${colour.muted}">REFRESHED ${refreshed}</text>
  ${monthLabels(colour)}${plane}${bars}
  <text x="44" y="333" class="label" fill="${colour.muted}">MON</text><text x="51" y="343" class="label" fill="${colour.muted}">WED</text><text x="58" y="353" class="label" fill="${colour.muted}">FRI</text>
  <text x="724" y="365" text-anchor="end" class="label" fill="${colour.muted}">LESS</text>${legend}<text x="850" y="365" class="label" fill="${colour.muted}">MORE</text>
  </svg>`;
}

mkdirSync("assets/generated", { recursive: true });
for (const themeName of Object.keys(themes)) {
  writeFileSync(`assets/generated/calendar-3d-${themeName}.svg`, render(themeName), "utf8");
}
console.log(`Built anchored contribution terrain from ${weeks.length} weeks.`);
