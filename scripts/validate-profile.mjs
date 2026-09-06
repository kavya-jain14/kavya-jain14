import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const config = JSON.parse(read("data/profile-config.json"));
const signals = JSON.parse(read("data/profile-signals.json"));
const contributions = JSON.parse(read("data/contributions.json"));
const readme = read("README.md");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(config.projects.length === 6, "Exactly six selected projects are required.");
assert(new Set(config.projects.map((project) => project.id)).size === config.projects.length, "Project IDs must be unique.");
assert(signals.languages.every((language, index, list) => index === 0 || list[index - 1].bytes >= language.bytes), "Languages must remain sorted by bytes.");
assert(signals.workingLanguages.length === 6, "Working-language radar requires six API-derived axes.");
assert(signals.engineeringRange.length === 6, "Engineering radar requires six configured axes.");
assert([...signals.workingLanguages, ...signals.engineeringRange].every((axis) => axis.value >= 0 && axis.value <= 1), "Radar values must be normalized to 0..1.");
assert(new Set(signals.decisionLog.map((event) => event.repo)).size === signals.decisionLog.length, "Decision log must not repeat a repository.");

assert(!readme.toLowerCase().includes("snake"), "Generic contribution snake must not return.");
assert(!readme.includes("role-typing.svg"), "Generic role typing animation must not return.");
assert((readme.match(/<details>/g) || []).length === config.projects.length, "README evidence-chain count must match project config.");
assert(readme.includes('width="520"'), "Hero portrait must retain its wider 520px presentation.");

for (const project of config.projects) {
  for (const theme of ["light", "dark"]) {
    assert(existsSync(`assets/projects/${project.id}-${theme}.svg`), `Missing ${theme} card for ${project.id}.`);
  }
}

const expectedBars = contributions.weeks.slice(-52).reduce((sum, week) => {
  if (Array.isArray(week.days) && week.days.length) return sum + week.days.filter((day) => Number(day.count || 0) > 0).length;
  return sum + (Number(week.total || 0) > 0 ? 1 : 0);
}, 0);
for (const theme of ["light", "dark"]) {
  const terrain = read(`assets/generated/calendar-3d-${theme}.svg`);
  const renderedBars = (terrain.match(/<g aria-label=/g) || []).length;
  assert(renderedBars === expectedBars, `${theme} terrain rendered ${renderedBars} bars for ${expectedBars} non-zero cells.`);
  assert(!terrain.includes("<animate"), `${theme} terrain must not move cubes away from anchored cells.`);
}

const generatedSvgPaths = [
  "assets/toolbox-light.svg", "assets/toolbox-dark.svg",
  "assets/skill-radar-light.svg", "assets/skill-radar-dark.svg",
  "assets/numbers-light.svg", "assets/numbers-dark.svg",
  "assets/decision-log-light.svg", "assets/decision-log-dark.svg",
  "assets/generated/calendar-3d-light.svg", "assets/generated/calendar-3d-dark.svg",
  ...config.projects.flatMap((project) => [
    `assets/projects/${project.id}-light.svg`, `assets/projects/${project.id}-dark.svg`,
  ]),
];
for (const path of generatedSvgPaths) {
  const source = read(path);
  assert(source.startsWith("<svg") && source.trimEnd().endsWith("</svg>"), `${path} is not a complete SVG.`);
  assert(!/NaN|undefined|null/.test(source), `${path} contains an invalid generated value.`);
}

console.log(`Validated ${generatedSvgPaths.length} SVGs, ${config.projects.length} evidence chains and ${expectedBars} anchored contribution bars.`);
