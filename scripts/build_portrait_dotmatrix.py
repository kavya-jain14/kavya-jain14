"""Build a transparent, animated dot-matrix portrait from the source photo."""

from __future__ import annotations

import colorsys
import math
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps


SOURCE = Path("assets/portrait-source.png")
OUTPUT = Path("assets/portrait-dotmatrix.svg")
COLS = 74
CELL = 7
BATCHES = 42


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def foreground_confidence(red: int, green: int, blue: int) -> float:
    """Separate the dark/coloured subject from the neutral studio backdrop."""
    luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
    chroma = max(red, green, blue) - min(red, green, blue)
    dark_confidence = clamp((184 - luminance) / 32)
    colour_confidence = clamp((chroma - 5) / 24)
    return max(dark_confidence, colour_confidence)


def display_colour(red: int, green: int, blue: int) -> str:
    """Preserve the source colour while lifting near-black detail for dark mode."""
    hue, saturation, value = colorsys.rgb_to_hsv(red / 255, green / 255, blue / 255)
    value = max(value, 0.19)
    saturation = min(1.0, saturation * 1.05)
    out_red, out_green, out_blue = colorsys.hsv_to_rgb(hue, saturation, value)
    return f"#{round(out_red * 255):02x}{round(out_green * 255):02x}{round(out_blue * 255):02x}"


def deterministic_noise(column: int, row: int) -> float:
    value = (column * 374761393 + row * 668265263) & 0xFFFFFFFF
    value = ((value ^ (value >> 13)) * 1274126177) & 0xFFFFFFFF
    return value / 0xFFFFFFFF


def main() -> None:
    source = ImageOps.exif_transpose(Image.open(SOURCE)).convert("RGB")
    source = ImageEnhance.Contrast(source).enhance(1.05)
    # A square head-and-shoulders crop keeps the hero compact without stretching
    # or regenerating the user's identity.
    source_width, source_height = source.size
    crop_height = min(source_width, source_height)
    source = source.crop((0, 0, source_width, crop_height))
    width, height = source.size
    rows = round(COLS * height / width)
    sampled = source.resize((COLS, rows), Image.Resampling.LANCZOS)
    pixels = sampled.load()

    dots: list[list[str]] = [[] for _ in range(BATCHES)]
    output_width = COLS * CELL
    output_height = rows * CELL

    for row in range(rows):
        for column in range(COLS):
            red, green, blue = pixels[column, row]
            confidence = foreground_confidence(red, green, blue)
            if confidence < 0.13:
                continue

            radius = CELL * (0.29 + 0.16 * math.sqrt(confidence))
            centre_x = column * CELL + CELL / 2
            centre_y = row * CELL + CELL / 2

            # Resolve the whole portrait in distributed focus. There is no wipe,
            # disappearing centre or directional edge; every dot only moves toward
            # its final state and stays there.
            wave = deterministic_noise(column, row)
            batch = min(BATCHES - 1, round(wave * (BATCHES - 1)))

            dots[batch].append(
                f'<circle class="dot b{batch}" cx="{centre_x:.1f}" cy="{centre_y:.1f}" '
                f'r="{radius:.2f}" fill="{display_colour(red, green, blue)}"/>'
            )

    delays = "".join(
        f".b{index}{{animation-delay:{0.05 + index * 0.036:.3f}s}}"
        for index in range(BATCHES)
    )
    circles = "\n  ".join(circle for batch in dots for circle in batch)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {output_width} {output_height}" role="img" aria-labelledby="portrait-title portrait-desc">
  <title id="portrait-title">Dot-matrix portrait of Kavya Jain</title>
  <desc id="portrait-desc">Kavya Jain in a dark suit, rendered as coloured dots on a transparent background. The portrait resolves once through a softly distributed focus animation.</desc>
  <style>
    @keyframes assemble{{
      0%{{opacity:.08;transform:scale(.62)}}
      72%{{opacity:1;transform:scale(1.06)}}
      100%{{opacity:1;transform:scale(1)}}
    }}
    .dot{{
      animation:assemble .68s cubic-bezier(.2,.78,.2,1) both;
      transform-box:fill-box;
      transform-origin:center;
    }}
    {delays}
    @media (prefers-reduced-motion:reduce){{.dot{{animation:none}}}}
  </style>
  {circles}
</svg>
'''
    OUTPUT.write_text(svg, encoding="utf-8")
    print(f"Built {OUTPUT} with {sum(map(len, dots))} visible dots ({COLS} x {rows} grid)")


if __name__ == "__main__":
    main()
