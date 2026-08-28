import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const sourcePath = "assets/portrait-source.png";
const outputPath = "assets/portrait-pixel-reveal.svg";
const image = readFileSync(sourcePath).toString("base64");

const width = 520;
const height = 700;
const columns = 13;
const rows = 18;
const cellWidth = width / columns;
const cellHeight = height / rows;
const cells = [];

for (let row = 0; row < rows; row += 1) {
  for (let column = 0; column < columns; column += 1) {
    const x = (column * cellWidth).toFixed(2);
    const y = (row * cellHeight).toFixed(2);
    const jitter = ((column * 17 + row * 11) % 9) * 0.012;
    const begin = (0.04 + row * 0.052 + jitter).toFixed(3);

    cells.push(`
      <rect x="${x}" y="${y}" width="${(cellWidth + 0.7).toFixed(2)}" height="${(cellHeight + 0.7).toFixed(2)}" fill="white" opacity="1">
        <animate attributeName="opacity" values="0;0;1" keyTimes="0;0.28;1" begin="${begin}s" dur="0.46s" repeatCount="1" fill="freeze"/>
      </rect>`);
  }
}

const svg = `<svg width="520" height="700" viewBox="0 0 520 700" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="portrait-title portrait-desc">
  <title id="portrait-title">Portrait of Kavya Jain</title>
  <desc id="portrait-desc">A formal studio portrait that assembles once from top to bottom in pixel-sized layers, then remains complete.</desc>
  <defs>
    <clipPath id="portrait-frame">
      <rect width="520" height="700" rx="18"/>
    </clipPath>
    <mask id="pixel-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="520" height="700">
      ${cells.join("")}
    </mask>
  </defs>
  <g clip-path="url(#portrait-frame)">
    <image href="data:image/png;base64,${image}" x="0" y="0" width="520" height="780" preserveAspectRatio="xMidYMin slice" mask="url(#pixel-reveal)"/>
  </g>
</svg>
`;

mkdirSync("assets", { recursive: true });
writeFileSync(outputPath, svg, "utf8");
console.log(`Built ${outputPath}`);
