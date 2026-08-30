import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Pass the generated profile-green-animate.svg path.");

const source = readFileSync(sourcePath, "utf8");
const nextPanelMarker = '</g><g transform="translate(980,';
const markerIndex = source.indexOf(nextPanelMarker);
if (markerIndex === -1) throw new Error("The upstream 3D calendar structure changed; refusing to publish a broken crop.");

// Keep the animated contribution terrain (the first top-level group) and drop
// the radar, language donut and footer stats that make the preset feel busy.
const terrainOnly = `${source.slice(0, markerIndex + 4)}</svg>`.replace(
  'width="1280" height="850" viewBox="0 0 1280 850"',
  'width="1280" height="720" viewBox="0 100 1280 720"',
);

const themes = {
  light: {
    "#00000f": "#1f2328",
    "#ffffff": "#ffffff",
    gray: "#8c959f",
    "rgb(239, 239, 239)": "#f6f8fa",
    "rgb(200, 200, 200)": "#d0d7de",
    "rgb(167, 167, 167)": "#afb8c1",
    "rgb(216, 232, 135)": "#dafbe1",
    "rgb(181, 194, 113)": "#aceebb",
    "rgb(151, 162, 95)": "#6bdc82",
    "rgb(140, 197, 105)": "#7ee787",
    "rgb(117, 165, 88)": "#56d364",
    "rgb(98, 138, 74)": "#3fb950",
    "rgb(71, 160, 66)": "#39d353",
    "rgb(59, 134, 55)": "#2ea043",
    "rgb(50, 112, 46)": "#238636",
    "rgb(29, 106, 35)": "#1f883d",
    "rgb(24, 89, 29)": "#1a7f37",
    "rgb(20, 74, 25)": "#116329",
  },
  dark: {
    "#00000f": "#f0f6fc",
    "#ffffff": "#0d1117",
    gray: "#6e7681",
    "rgb(239, 239, 239)": "#21262d",
    "rgb(200, 200, 200)": "#161b22",
    "rgb(167, 167, 167)": "#0d1117",
    "rgb(216, 232, 135)": "#132217",
    "rgb(181, 194, 113)": "#173b20",
    "rgb(151, 162, 95)": "#1a4d25",
    "rgb(140, 197, 105)": "#1f6f32",
    "rgb(117, 165, 88)": "#238636",
    "rgb(98, 138, 74)": "#2ea043",
    "rgb(71, 160, 66)": "#39d353",
    "rgb(59, 134, 55)": "#46dd5b",
    "rgb(50, 112, 46)": "#56d364",
    "rgb(29, 106, 35)": "#7ee787",
    "rgb(24, 89, 29)": "#56d364",
    "rgb(20, 74, 25)": "#39d353",
  },
};

mkdirSync("assets/generated", { recursive: true });
for (const [themeName, replacements] of Object.entries(themes)) {
  let themed = terrainOnly;
  for (const [original, replacement] of Object.entries(replacements)) themed = themed.replaceAll(original, replacement);
  writeFileSync(`assets/generated/calendar-3d-${themeName}.svg`, themed, "utf8");
}

console.log("Built light and dark GitHub-green animated 3D contribution terrains.");
