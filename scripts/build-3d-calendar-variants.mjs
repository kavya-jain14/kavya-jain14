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
    "#00000f": "#172220",
    "#ffffff": "#fcfdfb",
    gray: "#8fa09b",
    "rgb(239, 239, 239)": "#edf5f2",
    "rgb(200, 200, 200)": "#d9e5e1",
    "rgb(167, 167, 167)": "#c2d2cd",
    "rgb(216, 232, 135)": "#b9e9df",
    "rgb(181, 194, 113)": "#8bcfc2",
    "rgb(151, 162, 95)": "#62b1a4",
    "rgb(140, 197, 105)": "#78d6c7",
    "rgb(117, 165, 88)": "#4fb9a9",
    "rgb(98, 138, 74)": "#33998c",
    "rgb(71, 160, 66)": "#3dbbaa",
    "rgb(59, 134, 55)": "#2c988b",
    "rgb(50, 112, 46)": "#227a70",
    "rgb(29, 106, 35)": "#007e70",
    "rgb(24, 89, 29)": "#00695e",
    "rgb(20, 74, 25)": "#005349",
  },
  dark: {
    "#00000f": "#f2f7f5",
    "#ffffff": "#0b1014",
    gray: "#60716e",
    "rgb(239, 239, 239)": "#162125",
    "rgb(200, 200, 200)": "#101a1d",
    "rgb(167, 167, 167)": "#0c1417",
    "rgb(216, 232, 135)": "#1c3435",
    "rgb(181, 194, 113)": "#18302f",
    "rgb(151, 162, 95)": "#132827",
    "rgb(140, 197, 105)": "#285c58",
    "rgb(117, 165, 88)": "#214b48",
    "rgb(98, 138, 74)": "#1a3d3a",
    "rgb(71, 160, 66)": "#368c82",
    "rgb(59, 134, 55)": "#2d746c",
    "rgb(50, 112, 46)": "#255e58",
    "rgb(29, 106, 35)": "#55d8c7",
    "rgb(24, 89, 29)": "#43b8a8",
    "rgb(20, 74, 25)": "#339385",
  },
};

mkdirSync("assets/generated", { recursive: true });
for (const [themeName, replacements] of Object.entries(themes)) {
  let themed = terrainOnly;
  for (const [original, replacement] of Object.entries(replacements)) themed = themed.replaceAll(original, replacement);
  writeFileSync(`assets/generated/calendar-3d-${themeName}.svg`, themed, "utf8");
}

console.log("Built light and dark solid-teal animated 3D contribution terrains.");
