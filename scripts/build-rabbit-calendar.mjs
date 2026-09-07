import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const contributions = JSON.parse(readFileSync("data/contributions.json", "utf8"));
const outputDirectory = "assets/generated";
const duration = 8.8;
const groundY = 266;
const rabbitHeight = 32;

function hashSeed(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthlyTotals() {
  const end = new Date(contributions.generatedAt);
  const months = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - offset, 1));
    months.push({
      key: monthKey(date),
      label: date.toLocaleString("en", { month: "short", timeZone: "UTC" }).toUpperCase(),
      count: 0,
    });
  }
  const lookup = new Map(months.map((month) => [month.key, month]));
  for (const week of contributions.weeks || []) {
    if (Array.isArray(week.days) && week.days.length) {
      for (const day of week.days) {
        const month = lookup.get(String(day.date).slice(0, 7));
        if (month) month.count += Number(day.count || 0);
      }
    } else {
      const month = lookup.get(String(week.start).slice(0, 7));
      if (month) month.count += Number(week.total || 0);
    }
  }
  const maximum = Math.max(1, ...months.map((month) => month.count));
  return months.map((month, index) => ({
    ...month,
    index,
    x: 52 + index * 68,
    width: 32,
    height: month.count > 0 ? 10 + Math.round(84 * Math.sqrt(month.count / maximum)) : 5,
  }));
}

function shuffledOrder(length, seed) {
  const order = Array.from({ length }, (_, index) => index);
  const random = seededRandom(seed);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [order[index], order[target]] = [order[target], order[index]];
  }
  return order;
}

function buildTimeline(months, order) {
  const positions = [];
  const times = [];
  const states = [];
  const directions = [];
  let elapsed = 0;
  let current = { x: 28, y: groundY - rabbitHeight };
  let facing = 1;

  const push = (position, time, state, direction = facing) => {
    positions.push(`${position.x.toFixed(1)} ${position.y.toFixed(1)}`);
    times.push(time);
    states.push(state);
    directions.push(direction);
  };

  push(current, 0, "land", facing);
  for (const index of order) {
    const pillar = months[index];
    const target = {
      x: pillar.x + pillar.width / 2,
      y: groundY - pillar.height - 5 - rabbitHeight,
    };
    facing = target.x >= current.x ? 1 : -1;
    const arc = 30 + pillar.height * 0.46;
    const interpolate = (progress, lift) => ({
      x: current.x + (target.x - current.x) * progress,
      y: current.y + (target.y - current.y) * progress - arc * lift,
    });
    push(current, elapsed + 0.045, "crouch", facing);
    push(interpolate(0.25, 0.72), elapsed + 0.16, "air", facing);
    push(interpolate(0.5, 1), elapsed + 0.28, "air", facing);
    push(interpolate(0.75, 0.72), elapsed + 0.40, "air", facing);
    push(target, elapsed + 0.52, "land", facing);
    push(target, elapsed + 0.62, "land", facing);
    current = target;
    elapsed += 0.62;
  }

  const groundTarget = { x: 840, y: groundY - rabbitHeight };
  facing = groundTarget.x >= current.x ? 1 : -1;
  const finalArc = 42;
  const finalInterpolate = (progress, lift) => ({
    x: current.x + (groundTarget.x - current.x) * progress,
    y: current.y + (groundTarget.y - current.y) * progress - finalArc * lift,
  });
  push(current, elapsed + 0.045, "crouch", facing);
  push(finalInterpolate(0.25, 0.72), elapsed + 0.16, "air", facing);
  push(finalInterpolate(0.5, 1), elapsed + 0.28, "air", facing);
  push(finalInterpolate(0.75, 0.72), elapsed + 0.40, "air", facing);
  push(groundTarget, elapsed + 0.52, "land", facing);
  push(groundTarget, elapsed + 0.62, "land", facing);
  push(groundTarget, duration, "land", facing);

  return {
    positions,
    keyTimes: times.map((time) => (time / duration).toFixed(6)),
    states,
    directions,
  };
}

function rabbitFrames(theme, timeline) {
  const outline = theme.outline;
  const body = theme.rabbit;
  const eye = theme.eye;
  const opacity = (pose) => timeline.states.map((state) => (state === pose ? 1 : 0)).join(";");
  const keyTimes = timeline.keyTimes.join(";");
  const directionValues = timeline.directions.map((direction) => `${direction} 1`).join(";");
  return `<g id="rabbit-motion" shape-rendering="crispEdges">
    <animateTransform attributeName="transform" type="translate" values="${timeline.positions.join(";")}" keyTimes="${keyTimes}" dur="${duration}s" calcMode="linear" repeatCount="indefinite"/>
    <g id="rabbit-direction">
      <animateTransform attributeName="transform" type="scale" values="${directionValues}" keyTimes="${keyTimes}" dur="${duration}s" calcMode="discrete" repeatCount="indefinite"/>
      <g id="rabbit-crouch" opacity="0">
        <animate attributeName="opacity" values="${opacity("crouch")}" keyTimes="${keyTimes}" dur="${duration}s" calcMode="discrete" repeatCount="indefinite"/>
        <path d="M-17 17h5V8h5V1h5v13h5V3h5v11h7v4h4v10h-5v4h-27v-4h-7V20h3Z" fill="${body}" stroke="${outline}" stroke-width="2.5" stroke-linejoin="miter"/>
        <rect x="10" y="18" width="3" height="3" fill="${eye}"/>
      </g>
      <g id="rabbit-air" opacity="0">
        <animate attributeName="opacity" values="${opacity("air")}" keyTimes="${keyTimes}" dur="${duration}s" calcMode="discrete" repeatCount="indefinite"/>
        <path d="M-18 14h7V8h5V1h5v12h5V3h5v11h7v4h4v8h-6v4H2v-4h-8v4h-12v-5h-5v-7h5Z" fill="${body}" stroke="${outline}" stroke-width="2.5" stroke-linejoin="miter"/>
        <rect x="11" y="18" width="3" height="3" fill="${eye}"/>
      </g>
      <g id="rabbit-land" opacity="1">
        <animate attributeName="opacity" values="${opacity("land")}" keyTimes="${keyTimes}" dur="${duration}s" calcMode="discrete" repeatCount="indefinite"/>
        <path d="M-15 15h5V8h5V0h5v13h4V2h5v11h6v4h5v11h-5v4h-23v-4h-7v-5h-5v-6h5Z" fill="${body}" stroke="${outline}" stroke-width="2.5" stroke-linejoin="miter"/>
        <rect x="11" y="18" width="3" height="3" fill="${eye}"/>
      </g>
    </g>
  </g>`;
}

const themes = {
  light: {
    background: "#FFFFFF", border: "#D0D7DE", ink: "#1F2328", muted: "#59636E",
    ground: "#8C959F", front: ["#DDF4E4", "#ACEEBF", "#74D991", "#2DA44E"],
    top: "#7EE2A1", side: "#18783A", rabbit: "#FFFFFF", outline: "#111820", eye: "#1F883D",
  },
  dark: {
    background: "#0D1117", border: "#30363D", ink: "#F0F6FC", muted: "#8B949E",
    ground: "#484F58", front: ["#163C25", "#1F6F3D", "#2EA043", "#39D353"],
    top: "#56D77A", side: "#0E4429", rabbit: "#F0F6FC", outline: "#010409", eye: "#39D353",
  },
};

function render(themeName, months, order, seed) {
  const theme = themes[themeName];
  const maximum = Math.max(1, ...months.map((month) => month.count));
  const timeline = buildTimeline(months, order);
  const pillars = months.map((month) => {
    const ratio = month.count / maximum;
    const tier = Math.min(3, Math.floor(ratio * 3.999));
    const y = groundY - month.height;
    return `<g aria-label="${month.label}: ${month.count} contributions"><title>${month.label}: ${month.count} contributions</title>
      <rect x="${month.x}" y="${y}" width="${month.width}" height="${month.height}" fill="${theme.front[tier]}"/>
      <path d="M${month.x} ${y}l6 -5h${month.width}l-6 5Z" fill="${theme.top}"/>
      <path d="M${month.x + month.width} ${y}l6 -5v${month.height}l-6 5Z" fill="${theme.side}"/>
      <text x="${month.x + month.width / 2}" y="290" text-anchor="middle" class="month">${month.label}</text>
    </g>`;
  }).join("");
  const refreshed = new Date(contributions.generatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 322" width="880" height="322" role="img" aria-labelledby="title desc" data-seed="${seed}">
  <title id="title">Kavya Jain pixel rabbit contribution calendar</title>
  <desc id="desc">A pixel rabbit visits twelve monthly contribution pillars in a generation-seeded random order. Taller targets produce higher jump arcs.</desc>
  <style>.eyebrow{font:700 9px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.14em;fill:${theme.ink}}.stamp,.month,.note{font:650 7px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.08em;fill:${theme.muted}}.month{font-size:6.5px}</style>
  <rect x=".5" y=".5" width="879" height="321" rx="7" fill="${theme.background}" stroke="${theme.border}"/>
  <text x="20" y="25" class="eyebrow">~/ RANDOM HOP CONTRIBUTIONS</text>
  <text x="860" y="25" text-anchor="end" class="stamp">REFRESHED ${refreshed}</text>
  <path d="M24 ${groundY}H856" stroke="${theme.ground}" stroke-width="2" stroke-dasharray="2 5"/>
  ${pillars}
  ${rabbitFrames(theme, timeline)}
  <text x="20" y="309" class="note">HEIGHT = MONTHLY CONTRIBUTIONS · ORDER RESEEDED ON REFRESH</text>
  <text x="860" y="309" text-anchor="end" class="note">${months.reduce((sum, month) => sum + month.count, 0)} CONTRIBUTIONS · ${duration.toFixed(1)}S LOOP</text>
</svg>`;
}

const months = monthlyTotals();
const seed = hashSeed(`${contributions.generatedAt}:${contributions.total}`);
const order = shuffledOrder(months.length, seed);
mkdirSync(outputDirectory, { recursive: true });
for (const themeName of Object.keys(themes)) {
  writeFileSync(`${outputDirectory}/rabbit-calendar-${themeName}.svg`, render(themeName, months, order, seed), "utf8");
}
console.log(`Built seeded rabbit contribution calendar in order ${order.join(" → ")} (${duration.toFixed(1)}s loop).`);
