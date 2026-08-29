import { mkdirSync, writeFileSync } from "node:fs";

const projects = [
  {
    id: "trinetra",
    index: "01",
    name: "TRINETRA",
    type: "PAYMENT RISK SYSTEM",
    lines: ["Explainable pre-authorisation risk and", "recovery orchestration for UPI partners."],
    role: "SYSTEM ARCHITECTURE · BACKEND · QA",
    proof: "DURABLE LEDGER / RECOVERY",
    stack: ["TYPESCRIPT", "FASTIFY", "POSTGRESQL"],
  },
  {
    id: "trishul",
    index: "02",
    name: "TRISHUL",
    type: "FINANCIAL INTELLIGENCE",
    lines: ["Case-to-cash-out intelligence for authorised", "financial cyber-fraud response."],
    role: "PRODUCT + INTELLIGENCE ARCHITECTURE",
    proof: "EVIDENCE-GATED PREDICTION",
    stack: ["NODE.JS", "POSTGRESQL", "GRAPH INTELLIGENCE"],
  },
  {
    id: "mira",
    index: "03",
    name: "MIRA",
    type: "AUTONOMOUS AI EDITOR",
    lines: ["Discovers, decides, remembers and publishes", "with durable scheduling and visible evidence."],
    role: "PRODUCT · FRONTEND · SHARED CONTRACTS",
    proof: "AUDITABLE AUTONOMY",
    stack: ["REACT", "TYPESCRIPT", "WORKERS"],
  },
  {
    id: "socrates",
    index: "04",
    name: "PROJECT SOCRATES",
    type: "TEACH-BACK LEARNING",
    lines: ["Catches the understanding gaps hidden", "behind confident explanations."],
    role: "LEARNING UX · FRONTEND · EVALUATION",
    proof: "DETERMINISTIC FEEDBACK",
    stack: ["NEXT.JS", "PRISMA", "POSTGRESQL"],
  },
];

const themes = {
  dark: {
    background: "#0d1117",
    border: "#30363d",
    ink: "#f0f6fc",
    muted: "#8b949e",
    accent: "#e0a6ff",
    soft: "#161b22",
  },
  light: {
    background: "#ffffff",
    border: "#d0d7de",
    ink: "#1f2328",
    muted: "#59636e",
    accent: "#7a35c7",
    soft: "#f6f8fa",
  },
};

const xml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

function card(project, theme) {
  const colour = themes[theme];
  let cursor = 22;
  const tags = project.stack.map((tag) => {
    const width = tag.length * 6.25 + 18;
    const markup = `<rect x="${cursor}" y="145" width="${width}" height="23" rx="11.5" fill="${colour.soft}" stroke="${colour.border}"/><text x="${cursor + 9}" y="160" class="tag">${xml(tag)}</text>`;
    cursor += width + 8;
    return markup;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 184" width="420" height="184" role="img" aria-labelledby="${project.id}-title ${project.id}-desc">
  <title id="${project.id}-title">${xml(project.name)} project card</title>
  <desc id="${project.id}-desc">${xml(project.lines.join(" "))} Kavya's role: ${xml(project.role)}.</desc>
  <style>
    text{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;fill:${colour.ink}}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
    .eyebrow{font-size:9px;font-weight:700;letter-spacing:.13em;fill:${colour.muted}}
    .name{font-size:18px;font-weight:750;letter-spacing:-.02em}
    .summary{font-size:11.5px;fill:${colour.muted}}
    .role{font-size:9px;font-weight:700;letter-spacing:.07em;fill:${colour.ink}}
    .tag{font-size:8.5px;font-weight:700;letter-spacing:.05em;fill:${colour.muted}}
  </style>
  <rect x=".5" y=".5" width="419" height="183" rx="12" fill="${colour.background}" stroke="${colour.border}"/>
  <circle cx="24" cy="24" r="4" fill="${colour.accent}"/>
  <text x="36" y="28" class="eyebrow mono">${project.index} / ${xml(project.type)}</text>
  <text x="396" y="28" text-anchor="end" class="eyebrow mono" fill="${colour.accent}">${xml(project.proof)}</text>
  <text x="22" y="62" class="name">${xml(project.name)}</text>
  <text x="22" y="84" class="summary">${xml(project.lines[0])}</text>
  <text x="22" y="101" class="summary">${xml(project.lines[1])}</text>
  <path d="M22 116H398" stroke="${colour.border}"/>
  <text x="22" y="134" class="role mono">MY LANE · ${xml(project.role)}</text>
  ${tags}
</svg>
`;
}

mkdirSync("assets/projects", { recursive: true });
for (const project of projects) {
  for (const theme of Object.keys(themes)) {
    writeFileSync(`assets/projects/${project.id}-${theme}.svg`, card(project, theme), "utf8");
  }
}

console.log(`Built ${projects.length * Object.keys(themes).length} project card assets.`);
