import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { statusFromActivity } from "./lib/project-activity.mjs";

const about = readFileSync("data/about.txt", "utf8").trimEnd();
const config = JSON.parse(readFileSync("data/profile-config.json", "utf8"));
const activity = JSON.parse(readFileSync("data/project-activity.json", "utf8"));
const xml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const duration = 1.8;
const cell = 7.8;

function wrap(text, columns) {
  return text.split("\n").flatMap((paragraph) => {
    if (!paragraph) return [""];
    const lines = [];
    let line = "";
    for (const word of paragraph.split(" ")) {
      if (line.length + word.length + 1 > columns) { lines.push(line); line = "  "; }
      line += `${line.trim() ? " " : ""}${word}`;
    }
    lines.push(line);
    return lines;
  });
}

function terminalSvg(theme, compact) {
  const width = compact ? 440 : 880;
  const lines = wrap(about, compact ? 50 : 102);
  const height = 38 + lines.length * 22;
  const colour = theme === "dark"
    ? { background: "#0d1117", border: "#30363d", ink: "#c9d1d9", accent: "#39d353" }
    : { background: "#f6f8fa", border: "#d0d7de", ink: "#1f2328", accent: "#1f883d" };
  const outputCharacters = lines.slice(1).join("").length;
  let elapsed = 0;
  const defs = [], text = [];
  lines.forEach((line, index) => {
    if (!line) return;
    const lineDuration = index === 0 ? 0.3 : 1.5 * line.length / outputCharacters;
    const steps = [{ time: 0, width: 0 }];
    for (let character = 1; character <= line.length; character += 1) {
      steps.push({ time: (elapsed + lineDuration * character / line.length) / duration, width: character * cell });
    }
    if (steps.at(-1).time < 1 - 1e-8) steps.push({ time: 1, width: line.length * cell });
    else steps.at(-1).time = 1;
    const y = 28 + index * 22;
    defs.push(`<clipPath id="line-${index}"><rect x="20" y="${y - 15}" width="${line.length * cell}" height="22"><animate attributeName="width" values="${steps.map((step) => step.width.toFixed(1)).join(";")}" keyTimes="${steps.map((step) => step.time.toFixed(7)).join(";")}" dur="${duration}s" calcMode="discrete" repeatCount="1" fill="freeze"/></rect></clipPath>`);
    text.push(`<text class="output" x="20" y="${y}" textLength="${(line.length * cell).toFixed(1)}" lengthAdjust="spacingAndGlyphs" xml:space="preserve" fill="${index === 0 ? colour.accent : colour.ink}" clip-path="url(#line-${index})">${xml(line)}</text>`);
    elapsed += lineDuration;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="title desc">
<title id="title">cat about.txt — Kavya Jain</title><desc id="desc">${xml(about)}. Text reveals once in 1.8 seconds, then stays visible.</desc>
<style>text{font:13px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}@media(prefers-reduced-motion:reduce){.output{clip-path:none}}</style>
<defs>${defs.join("")}</defs>
<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="6" fill="${colour.background}" stroke="${colour.border}"/>
${text.join("\n")}
</svg>\n`;
}

mkdirSync("assets/generated", { recursive: true });
for (const theme of ["light", "dark"]) for (const compact of [false, true]) {
  writeFileSync(`assets/generated/about-terminal-${theme}${compact ? "-compact" : ""}.svg`, terminalSvg(theme, compact));
}

let readme = readFileSync("README.md", "utf8");
const status = statusFromActivity(activity, config.projects);
const statusBlock = `<p align="center"><a href="${xml(status.url)}" title="${xml(status.scope)}"><code>${xml(status.text)}</code></a></p>`;
const aboutBlock = `<picture>
  <source media="(max-width: 600px) and (prefers-color-scheme: dark)" srcset="./assets/generated/about-terminal-dark-compact.svg">
  <source media="(max-width: 600px)" srcset="./assets/generated/about-terminal-light-compact.svg">
  <source media="(prefers-color-scheme: dark)" srcset="./assets/generated/about-terminal-dark.svg">
  <img src="./assets/generated/about-terminal-light.svg" width="880" loading="lazy" alt="${xml(about.replaceAll("\n", " "))}">
</picture>
<sub><a href="./data/about.txt">Read about.txt</a></sub>`;
for (const [name, block] of [["STATUS", statusBlock], ["ABOUT", aboutBlock]]) {
  const start = `<!-- GENERATED:${name}:START -->`, end = `<!-- GENERATED:${name}:END -->`;
  if (!readme.includes(start) || !readme.includes(end)) throw new Error(`README ${name} markers are missing`);
  readme = readme.replace(new RegExp(`${start}[\\s\\S]*?${end}`), () => `${start}\n${block}\n${end}`);
}
writeFileSync("README.md", readme);
console.log(`Built a ${duration}s one-shot terminal and live status: ${status.text}`);
