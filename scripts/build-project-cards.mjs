import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const config = JSON.parse(readFileSync("data/profile-config.json", "utf8"));
const projects = config.projects;
const activity = JSON.parse(readFileSync("data/project-activity.json", "utf8"));
const themes = {
  dark: { background: "#0d1117", border: "#30363d", ink: "#f0f6fc", muted: "#8b949e", accent: "#39d353", faint: "#132217" },
  light: { background: "#ffffff", border: "#d0d7de", ink: "#1f2328", muted: "#59636e", accent: "#1f883d", faint: "#dafbe1" },
};

const escapeXml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const escapeHtml = escapeXml;

function glyph(type, colour) {
  const common = `fill="none" stroke="${colour.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`;
  if (type === "route") return `<g ${common}><path d="M322 53H349L361 41H391"/><path d="M349 53l12 12h30"/><circle cx="322" cy="53" r="4" fill="${colour.accent}"/><circle cx="391" cy="41" r="4"/><circle cx="391" cy="65" r="4"/></g>`;
  if (type === "graph") return `<g ${common}><path d="M326 63l18-24 20 17 24-19M344 39l20 17-8 20M364 56l24-19"/><circle cx="326" cy="63" r="4" fill="${colour.accent}"/><circle cx="344" cy="39" r="4"/><circle cx="364" cy="56" r="4"/><circle cx="356" cy="76" r="4"/><circle cx="388" cy="37" r="4"/></g>`;
  if (type === "cycle") return `<g ${common}><path d="M329 55a28 22 0 0 1 49-14"/><path d="M379 34l1 12-12-2"/><path d="M386 58a28 22 0 0 1-49 14"/><path d="M336 79l-1-12 12 2"/><circle cx="357" cy="57" r="5" fill="${colour.accent}" stroke="none"/></g>`;
  if (type === "conflict") return `<g ${common}><path d="M326 39h20l14 14 14-14h17M326 67h20l14-14 14 14h17"/><circle cx="360" cy="53" r="4" fill="${colour.accent}" stroke="none"/></g>`;
  if (type === "market") return `<g ${common}><path d="M326 70V46m13 31V35m14 34V43m14 30V31m14 39V48"/><path d="M321 59h10m3-13h10m4 9h10m4-10h10m4 14h10"/></g>`;
  return `<g ${common}><path d="M326 39h22l12 14-12 14h-22M391 39h-20l-11 14 11 14h20"/><circle cx="360" cy="53" r="4" fill="${colour.accent}" stroke="none"/></g>`;
}

function card(project, themeName) {
  const colour = themes[themeName];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 170" width="420" height="170" role="img" aria-labelledby="${project.id}-title ${project.id}-desc">
  <title id="${project.id}-title">${escapeXml(project.name)} project card</title>
  <desc id="${project.id}-desc">${escapeXml(project.summary)} Kavya's contribution: ${escapeXml(project.contribution)}.</desc>
  <style>text{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;fill:${colour.ink}}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.index{font-size:9px;font-weight:700;letter-spacing:.14em;fill:${colour.accent}}.type{font-size:9px;font-weight:700;letter-spacing:.11em;fill:${colour.muted}}.name{font-size:21px;font-weight:760;letter-spacing:-.025em}.summary{font-size:11px;fill:${colour.muted}}.label{font-size:8px;font-weight:700;letter-spacing:.12em;fill:${colour.muted}}.contribution{font-size:8.3px;font-weight:700;letter-spacing:.035em}.proof{font-size:7.8px;font-weight:700;letter-spacing:.06em;fill:${colour.accent}}</style>
  <rect x=".5" y=".5" width="419" height="169" rx="7" fill="${colour.background}" stroke="${colour.border}"/>
  <path d="M16 17H72" stroke="${colour.accent}" stroke-width="2"/><text x="16" y="33" class="index mono">${project.index}</text><text x="44" y="33" class="type mono">${escapeXml(project.type)}</text>
  <text x="16" y="69" class="name">${escapeXml(project.name)}</text><text x="16" y="91" class="summary">${escapeXml(project.summary)}</text>${glyph(project.glyph, colour)}
  <path d="M16 108H404" stroke="${colour.border}"/><text x="16" y="126" class="label mono">MY CONTRIBUTION</text><text x="16" y="149" class="contribution mono">${escapeXml(project.contribution)}</text>
  <rect x="278" y="124" width="126" height="26" rx="13" fill="${colour.faint}"/><text x="341" y="140" text-anchor="middle" class="proof mono">${escapeXml(project.capability)}</text>
</svg>\n`;
}

function picture(project) {
  const url = `https://github.com/${project.repo}`;
  return `  <a href="${url}">\n    <picture>\n      <source media="(prefers-color-scheme: dark)" srcset="./assets/projects/${project.id}-dark.svg">\n      <source media="(prefers-color-scheme: light)" srcset="./assets/projects/${project.id}-light.svg">\n      <img src="./assets/projects/${project.id}-light.svg" width="420" alt="${escapeHtml(project.name)}, ${escapeHtml(project.summary)}">\n    </picture>\n  </a>`;
}

function projectGrid() {
  const rows = [];
  for (let index = 0; index < projects.length; index += 2) {
    const left = projects[index];
    const right = projects[index + 1];
    rows.push(`<tr>\n<td width="50%">\n${picture(left)}\n</td>\n<td width="50%">\n${picture(right)}\n</td>\n</tr>`);
  }
  return `<table>\n${rows.join("\n")}\n</table>`;
}

function evidenceChain(project) {
  const url = `https://github.com/${project.repo}`;
  const changes = activity.projects.find((entry) => entry.id === project.id)?.recent || [];
  const trail = changes.length
    ? `<ol>\n${[...changes].reverse().map((commit) => `<li><code>${escapeHtml(commit.date.slice(0, 10))}</code> · <a href="${escapeHtml(commit.url)}">${escapeHtml(commit.title)}</a> <small>(${escapeHtml(commit.author)})</small></li>`).join("\n")}\n</ol>`
    : "<p>No commits published on this repository's default branch yet.</p>";
  return `<details>
<summary><strong>${project.index} · ${escapeHtml(project.name)}</strong> · expand reasoning + changes</summary>

<p><strong>Problem</strong><br>${escapeHtml(project.problem)}</p>
<p><strong>Constraint</strong><br>${escapeHtml(project.constraint)}</p>
<p><strong>Decision</strong><br>${escapeHtml(project.decision)}</p>
<p><strong>Engineering focus</strong><br>${escapeHtml(project.proof)}</p>
<p><strong>My contribution</strong><br>${escapeHtml(project.contribution)}</p>
<p><strong>Repository trail</strong> · latest three default-branch changes, oldest first</p>
${trail}
<p><sub>Commit titles link to the actual diffs. All repository authors are credited; refreshed ${escapeHtml(activity.generatedAt.slice(0, 10))}.</sub></p>
<p><a href="${url}">Inspect repository →</a></p>

</details>`;
}

function updateReadme() {
  const path = "README.md";
  const start = "<!-- GENERATED:PROJECTS:START -->";
  const end = "<!-- GENERATED:PROJECTS:END -->";
  const readme = readFileSync(path, "utf8");
  if (!readme.includes(start) || !readme.includes(end)) throw new Error("README project markers are missing; refusing an unsafe rewrite.");
  const generated = `${start}\n${projectGrid()}\n\n### Evidence chains\n\n${projects.map(evidenceChain).join("\n\n")}\n${end}`;
  const next = readme.replace(new RegExp(`${start}[\\s\\S]*?${end}`), () => generated);
  writeFileSync(path, next, "utf8");
}

mkdirSync("assets/projects", { recursive: true });
for (const project of projects) for (const themeName of Object.keys(themes)) writeFileSync(`assets/projects/${project.id}-${themeName}.svg`, card(project, themeName), "utf8");
updateReadme();
console.log(`Built ${projects.length * Object.keys(themes).length} project cards and ${projects.length} evidence chains from one config.`);
