import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const config = JSON.parse(readFileSync("data/profile-config.json", "utf8"));
const projects = config.projects;
const themes = {
  dark: { background: "#0d1117", border: "#30363d", ink: "#f0f6fc", muted: "#a6afb9", accent: "#39d353", faint: "#132217" },
  light: { background: "#ffffff", border: "#d0d7de", ink: "#1f2328", muted: "#4d5761", accent: "#1f883d", faint: "#dafbe1" },
};

const escapeXml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const escapeHtml = escapeXml;

function glyph(type, colour) {
  const common = `fill="none" stroke="${colour.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`;
  if (type === "route") return `<g ${common}><path d="M342 50h23l12-12h38"/><path d="M365 50l12 12h38"/><circle cx="342" cy="50" r="4" fill="${colour.accent}"/><circle cx="415" cy="38" r="4"/><circle cx="415" cy="62" r="4"/></g>`;
  if (type === "graph") return `<g ${common}><path d="M346 62l17-24 19 17 29-20M363 38l19 17-8 20M382 55l29-20"/><circle cx="346" cy="62" r="4" fill="${colour.accent}"/><circle cx="363" cy="38" r="4"/><circle cx="382" cy="55" r="4"/><circle cx="374" cy="75" r="4"/><circle cx="411" cy="35" r="4"/></g>`;
  if (type === "cycle") return `<g ${common}><path d="M348 53a28 22 0 0 1 49-14"/><path d="M398 32l1 12-12-2"/><path d="M405 56a28 22 0 0 1-49 14"/><path d="M355 77l-1-12 12 2"/><circle cx="376" cy="55" r="5" fill="${colour.accent}" stroke="none"/></g>`;
  if (type === "conflict") return `<g ${common}><path d="M346 37h19l13 14 14-14h23M346 65h19l13-14 14 14h23"/><circle cx="378" cy="51" r="4" fill="${colour.accent}" stroke="none"/></g>`;
  if (type === "market") return `<g ${common}><path d="M347 68V44m13 31V33m14 34V41m14 30V29m14 39V46"/><path d="M342 57h10m3-13h10m4 9h10m4-10h10m4 14h10"/></g>`;
  return `<g ${common}><path d="M346 37h21l11 14-11 14h-21M415 37h-20l-17 14 17 14h20"/><circle cx="378" cy="51" r="4" fill="${colour.accent}" stroke="none"/></g>`;
}

function card(project, themeName) {
  const colour = themes[themeName];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 132" width="440" height="132" role="img" aria-labelledby="${project.id}-title ${project.id}-desc">
  <title id="${project.id}-title">${escapeXml(project.name)} project card</title>
  <desc id="${project.id}-desc">${escapeXml(project.summary)} Stack: ${escapeXml(project.stack)}. Kavya's contribution: ${escapeXml(project.contribution)}.</desc>
  <style>text{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;fill:${colour.ink}}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.index{font-size:9.5px;font-weight:750;letter-spacing:.14em;fill:${colour.accent}}.type{font-size:9.5px;font-weight:750;letter-spacing:.1em;fill:${colour.muted}}.name{font-size:20px;font-weight:780;letter-spacing:-.02em}.summary{font-size:10.5px;fill:${colour.muted}}.label{font-size:7.6px;font-weight:750;letter-spacing:.11em;fill:${colour.muted}}.stack{font-size:8.6px;font-weight:700}.contribution{font-size:8px;font-weight:700;letter-spacing:.025em}.proof{font-size:7.5px;font-weight:750;letter-spacing:.055em;fill:${colour.accent}}</style>
  <rect x=".5" y=".5" width="439" height="131" rx="7" fill="${colour.background}" stroke="${colour.border}"/>
  <path d="M16 13H77" stroke="${colour.accent}" stroke-width="2"/><text x="16" y="28" class="index mono">${project.index}</text><text x="47" y="28" class="type mono">${escapeXml(project.type)}</text>
  <text x="16" y="55" class="name">${escapeXml(project.name)}</text><text x="16" y="74" class="summary">${escapeXml(project.summary)}</text>${glyph(project.glyph, colour)}
  <path d="M16 84H424" stroke="${colour.border}"/><text x="16" y="98" class="label mono">STACK</text><text x="16" y="112" class="stack mono">${escapeXml(project.stack)}</text>
  <text x="16" y="125" class="contribution mono">ROLE · ${escapeXml(project.contribution)}</text>
  <rect x="296" y="96" width="128" height="24" rx="12" fill="${colour.faint}"/><text x="360" y="111" text-anchor="middle" class="proof mono">${escapeXml(project.capability)}</text>
</svg>\n`;
}

function picture(project) {
  const url = `https://github.com/${project.repo}`;
  return `  <a href="${url}">\n    <picture>\n      <source media="(prefers-color-scheme: dark)" srcset="./assets/projects/${project.id}-dark.svg">\n      <source media="(prefers-color-scheme: light)" srcset="./assets/projects/${project.id}-light.svg">\n      <img src="./assets/projects/${project.id}-light.svg" width="760" alt="${escapeHtml(project.name)}, ${escapeHtml(project.summary)} Stack: ${escapeHtml(project.stack)}. Role: ${escapeHtml(project.contribution)}.">\n    </picture>\n  </a>`;
}

function projectGrid() {
  return projects.map((project) => `<p align="center">\n${picture(project)}\n</p>`).join("\n");
}

function evidenceChain(project) {
  const url = `https://github.com/${project.repo}`;
  const proof = project.proofLinks.map((item) => `<li><a href="${escapeHtml(item.url)}">${escapeHtml(item.label)}</a></li>`).join("\n");
  const demo = project.demo ? ` · <a href="${escapeHtml(project.demo)}">Open demo ↗</a>` : "";
  return `<details>
<summary><strong>${project.index} · ${escapeHtml(project.name)}</strong> · ${escapeHtml(project.evidenceTitle)}</summary>

<p><strong>Problem</strong><br>${escapeHtml(project.problem)}</p>
<p><strong>Constraint</strong><br>${escapeHtml(project.constraint)}</p>
<p><strong>Decision</strong><br>${escapeHtml(project.decision)}</p>
<p><strong>Result</strong><br>${escapeHtml(project.result)}</p>
<p><strong>Stack</strong><br><code>${escapeHtml(project.stack)}</code></p>
<p><strong>My contribution</strong><br>${escapeHtml(project.contribution)}</p>
<p><strong>Proof</strong></p>
<ul>
${proof}
</ul>
<p><a href="${url}">Inspect repository →</a>${demo}</p>

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
console.log(`Built ${projects.length * Object.keys(themes).length} project cards and ${projects.length} verified evidence chains.`);
