import { mkdirSync, writeFileSync } from "node:fs";

const projects = [
  { id: "trinetra", index: "01", name: "TRINETRA", type: "UPI RISK + RECOVERY", summary: "Explain the decision. Preserve the payment state.", contribution: "ARCHITECTURE · BACKEND · QA", proof: "DURABLE RECOVERY", glyph: "route" },
  { id: "trishul", index: "02", name: "TRISHUL", type: "FRAUD INTELLIGENCE", summary: "Trace evidence without overstating certainty.", contribution: "PRODUCT · DATA DESIGN · FRONTEND QA", proof: "EVIDENCE GATES", glyph: "graph" },
  { id: "mira", index: "03", name: "MIRA", type: "AUTONOMOUS CREATOR", summary: "Discover, decide, remember, then publish.", contribution: "FULL FRONTEND · FLOW · INTEGRATION", proof: "DECISION LEDGER", glyph: "cycle" },
  { id: "socrates", index: "04", name: "SOCRATES", type: "TEACH-BACK LEARNING", summary: "Find the gap behind a confident explanation.", contribution: "LEARNING UX · FRONTEND · EVALUATION", proof: "REPEATABLE SCORE", glyph: "teach" },
];

const themes = {
  dark: { background: "#0d1117", border: "#30363d", ink: "#f0f6fc", muted: "#8b949e", accent: "#39d353", faint: "#132217" },
  light: { background: "#ffffff", border: "#d0d7de", ink: "#1f2328", muted: "#59636e", accent: "#1f883d", faint: "#dafbe1" },
};

const escapeXml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");

function glyph(type, colour) {
  const common = `fill="none" stroke="${colour.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`;
  if (type === "route") return `<g ${common}><path d="M322 53H349L361 41H391"/><path d="M349 53l12 12h30"/><circle cx="322" cy="53" r="4" fill="${colour.accent}"/><circle cx="391" cy="41" r="4"/><circle cx="391" cy="65" r="4"/></g>`;
  if (type === "graph") return `<g ${common}><path d="M326 63l18-24 20 17 24-19M344 39l20 17-8 20M364 56l24-19"/><circle cx="326" cy="63" r="4" fill="${colour.accent}"/><circle cx="344" cy="39" r="4"/><circle cx="364" cy="56" r="4"/><circle cx="356" cy="76" r="4"/><circle cx="388" cy="37" r="4"/></g>`;
  if (type === "cycle") return `<g ${common}><path d="M329 55a28 22 0 0 1 49-14"/><path d="M379 34l1 12-12-2"/><path d="M386 58a28 22 0 0 1-49 14"/><path d="M336 79l-1-12 12 2"/><circle cx="357" cy="57" r="5" fill="${colour.accent}" stroke="none"/></g>`;
  return `<g ${common}><path d="M326 39h22l12 14-12 14h-22M391 39h-20l-11 14 11 14h20"/><circle cx="360" cy="53" r="4" fill="${colour.accent}" stroke="none"/></g>`;
}

function card(project, themeName) {
  const colour = themes[themeName];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 158" width="420" height="158" role="img" aria-labelledby="${project.id}-title ${project.id}-desc">
  <title id="${project.id}-title">${escapeXml(project.name)} project card</title>
  <desc id="${project.id}-desc">${escapeXml(project.summary)} Kavya's contribution: ${escapeXml(project.contribution)}.</desc>
  <style>
    text{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;fill:${colour.ink}}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.index{font-size:9px;font-weight:700;letter-spacing:.14em;fill:${colour.accent}}.type{font-size:9px;font-weight:700;letter-spacing:.11em;fill:${colour.muted}}.name{font-size:21px;font-weight:760;letter-spacing:-.025em}.summary{font-size:11.5px;fill:${colour.muted}}.label{font-size:8px;font-weight:700;letter-spacing:.12em;fill:${colour.muted}}.contribution{font-size:9px;font-weight:700;letter-spacing:.045em}.proof{font-size:8.5px;font-weight:700;letter-spacing:.08em;fill:${colour.accent}}
  </style>
  <rect x=".5" y=".5" width="419" height="157" rx="7" fill="${colour.background}" stroke="${colour.border}"/>
  <path d="M16 17H72" stroke="${colour.accent}" stroke-width="2"/><text x="16" y="33" class="index mono">${project.index}</text><text x="44" y="33" class="type mono">${escapeXml(project.type)}</text>
  <text x="16" y="69" class="name">${escapeXml(project.name)}</text><text x="16" y="91" class="summary">${escapeXml(project.summary)}</text>${glyph(project.glyph, colour)}
  <path d="M16 108H404" stroke="${colour.border}"/><text x="16" y="124" class="label mono">MY CONTRIBUTION</text><text x="16" y="143" class="contribution mono">${escapeXml(project.contribution)}</text>
  <rect x="294" y="121" width="110" height="24" rx="12" fill="${colour.faint}"/><text x="349" y="136" text-anchor="middle" class="proof mono">${escapeXml(project.proof)}</text>
</svg>\n`;
}

mkdirSync("assets/projects", { recursive: true });
for (const project of projects) for (const themeName of Object.keys(themes)) writeFileSync(`assets/projects/${project.id}-${themeName}.svg`, card(project, themeName), "utf8");
console.log(`Built ${projects.length * Object.keys(themes).length} compact project cards.`);
