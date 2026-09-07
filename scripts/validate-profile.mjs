import { existsSync, readFileSync, readdirSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const config = JSON.parse(read("data/profile-config.json"));
const signals = JSON.parse(read("data/profile-signals.json"));
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
assert(!readme.toLowerCase().includes("snake"), "Generic contribution snake must not return.");
assert(!readme.includes("role-typing.svg"), "Generic role typing animation must not return.");
assert(!readme.toLowerCase().includes("decision log"), "Decision log must remain removed.");
assert(!existsSync("assets/decision-log-light.svg") && !existsSync("assets/decision-log-dark.svg"), "Decision-log assets must remain removed.");
assert(!existsSync("scripts/build-decision-log.mjs"), "Decision-log data generator must remain removed.");
assert((readme.match(/<details>/g) || []).length === config.projects.length, "README evidence-chain count must match project config.");
assert(readme.includes('width="520"'), "Hero portrait must retain its wider 520px presentation.");

const toolboxAssets = readdirSync("assets/toolbox").filter((name) => name.endsWith(".svg"));
assert(toolboxAssets.length === signals.languages.length, "Toolbox badge count must match detected GitHub languages.");
assert((readme.match(/assets\/toolbox\/[^"]+\.svg/g) || []).length === signals.languages.length, "README toolbox must list every generated badge exactly once.");
assert(!existsSync("assets/toolbox-light.svg") && !existsSync("assets/toolbox-dark.svg"), "Legacy toolbox bar assets must remain removed.");

for (const project of config.projects) {
  for (const theme of ["light", "dark"]) {
    assert(existsSync(`assets/projects/${project.id}-${theme}.svg`), `Missing ${theme} card for ${project.id}.`);
  }
}

const generatedSvgPaths = [
  ...toolboxAssets.map((name) => `assets/toolbox/${name}`),
  "assets/skill-radar-light.svg", "assets/skill-radar-dark.svg",
  "assets/numbers-light.svg", "assets/numbers-dark.svg",
  "assets/generated/rabbit-calendar-light.svg", "assets/generated/rabbit-calendar-dark.svg",
  ...config.projects.flatMap((project) => [
    `assets/projects/${project.id}-light.svg`, `assets/projects/${project.id}-dark.svg`,
  ]),
];
for (const path of generatedSvgPaths) {
  const source = read(path);
  assert(source.startsWith("<svg") && source.trimEnd().endsWith("</svg>"), `${path} is not a complete SVG.`);
  assert(!/NaN|undefined|null/.test(source), `${path} contains an invalid generated value.`);
}

for (const theme of ["light", "dark"]) {
  const rabbit = read(`assets/generated/rabbit-calendar-${theme}.svg`);
  assert((rabbit.match(/aria-label="[A-Z]{3}: \d+ contributions"/g) || []).length === 12, `${theme} rabbit calendar must render twelve monthly pillars.`);
  assert(rabbit.includes('id="rabbit-crouch"') && rabbit.includes('id="rabbit-air"') && rabbit.includes('id="rabbit-land"'), `${theme} rabbit calendar needs crouch, air and land frames.`);
  assert(rabbit.includes('data-seed=') && rabbit.includes('repeatCount="indefinite"'), `${theme} rabbit calendar must use a seeded looping animation.`);
  const loop = Number(rabbit.match(/dur="([\d.]+)s"/)?.[1]);
  assert(loop > 0 && loop <= 10, `${theme} rabbit loop must remain under ten seconds.`);
}

console.log(`Validated ${generatedSvgPaths.length} SVGs, ${toolboxAssets.length} live toolbox badges, two rabbit calendars and ${config.projects.length} evidence chains.`);
