"""Build the benchmark-style hero and supporting profile visuals.

The portrait pipeline is deterministic: it cleans the supplied transparent PNG,
converts it to a dot-pixel rendering, and embeds that single intact image inside
an animated SVG clip. The SVG moves only the mask, so pixels never disappear or
arrive as partial delta frames while GitHub is loading the asset.
"""

from __future__ import annotations

import base64
import math
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageStat


ROOT = Path(__file__).resolve().parents[1]
HERO_DIR = ROOT / "assets" / "hero"
SOURCE = HERO_DIR / "portrait-source.png"
CUTOUT = HERO_DIR / "portrait-cutout.png"
PIXEL = HERO_DIR / "portrait-pixel.png"
REVEAL = HERO_DIR / "portrait-reveal.svg"
TYPING = HERO_DIR / "role-typing.svg"


def clean_cutout(source: Image.Image) -> Image.Image:
    image = source.convert("RGBA")
    alpha = image.getchannel("A")
    eroded = alpha.filter(ImageFilter.MinFilter(5))
    edge = ImageChops.subtract(alpha, eroded)
    pixels = image.load()
    edge_pixels = edge.load()

    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, opacity = pixels[x, y]
            neutral_white = min(red, green, blue) > 165 and max(red, green, blue) - min(red, green, blue) < 35
            if opacity < 28 or (neutral_white and edge_pixels[x, y] > 16):
                pixels[x, y] = (red, green, blue, 0)
            elif opacity < 150:
                pixels[x, y] = (red, green, blue, int((opacity - 28) / 122 * 255))

    return image


def place_bust(image: Image.Image) -> Image.Image:
    crop_bottom = min(505, image.height)
    bust = image.crop((0, 0, image.width, crop_bottom))
    target_height = 610
    target_width = round(bust.width * target_height / bust.height)
    bust = bust.resize((target_width, target_height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (640, 640), (0, 0, 0, 0))
    canvas.alpha_composite(bust, ((640 - target_width) // 2, 25))
    return canvas


def dot_pixel_portrait(cutout: Image.Image) -> Image.Image:
    boosted = ImageEnhance.Color(cutout).enhance(1.12)
    boosted = ImageEnhance.Contrast(boosted).enhance(1.18)
    boosted = ImageEnhance.Brightness(boosted).enhance(1.08)
    alpha = cutout.getchannel("A")
    output = Image.new("RGBA", cutout.size, (0, 0, 0, 0))
    grid = 5

    for top in range(0, cutout.height, grid):
        for left in range(0, cutout.width, grid):
            box = (left, top, min(left + grid, cutout.width), min(top + grid, cutout.height))
            alpha_mean = ImageStat.Stat(alpha.crop(box)).mean[0]
            if alpha_mean < 22:
                continue
            red, green, blue, _ = [round(channel) for channel in ImageStat.Stat(boosted.crop(box)).mean]
            luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
            if luminance < 34:
                red = max(red, 25)
                green = max(green, 34)
                blue = max(blue, 52)
            radius = 1.25 + 0.92 * (alpha_mean / 255) + 0.28 * (luminance / 255)
            center_x = left + grid / 2
            center_y = top + grid / 2
            opacity = min(255, round(alpha_mean * 1.12))
            for y in range(max(0, math.floor(center_y - radius)), min(output.height, math.ceil(center_y + radius + 1))):
                for x in range(max(0, math.floor(center_x - radius)), min(output.width, math.ceil(center_x + radius + 1))):
                    if (x + 0.5 - center_x) ** 2 + (y + 0.5 - center_y) ** 2 <= radius ** 2:
                        output.putpixel((x, y), (red, green, blue, opacity))

    return output


def portrait_reveal_svg(portrait: Image.Image) -> str:
    buffer = BytesIO()
    portrait.save(buffer, format="PNG", optimize=True)
    payload = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="640" height="640" role="img" aria-labelledby="portrait-title portrait-desc">
  <title id="portrait-title">Kavya Jain pixel portrait</title>
  <desc id="portrait-desc">A transparent dot-pixel portrait revealed smoothly from hair to shoulders.</desc>
  <defs>
    <clipPath id="reveal">
      <rect x="0" y="0" width="640" height="0">
        <animate attributeName="height" dur="8s" repeatCount="indefinite" calcMode="spline" values="0;0;640;640;0;0" keyTimes="0;0.025;0.31;0.965;0.966;1" keySplines="0.16 1 0.3 1;0.16 1 0.3 1;0 0 1 1;0 0 1 1;0 0 1 1"/>
      </rect>
    </clipPath>
  </defs>
  <image x="0" y="0" width="640" height="640" clip-path="url(#reveal)" href="data:image/png;base64,{payload}"/>
</svg>'''


def role_typing_svg() -> str:
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 92" width="760" height="92" role="img" aria-labelledby="role-title">
  <title id="role-title">Kavya Jain, Systems Engineering and Product</title>
  <defs>
    <clipPath id="name-type"><rect x="300" y="0" width="0" height="42"><animate attributeName="width" dur="8s" repeatCount="indefinite" values="0;0;160;160;0;0" keyTimes="0;0.04;0.23;0.965;0.966;1"/></rect></clipPath>
    <clipPath id="role-type"><rect x="128" y="40" width="0" height="52"><animate attributeName="width" dur="8s" repeatCount="indefinite" values="0;0;0;504;504;0;0" keyTimes="0;0.04;0.24;0.54;0.965;0.966;1"/></rect></clipPath>
  </defs>
  <style>.name{font:800 25px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:#39d353}.role{font:700 22px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:#39d353}.caret{fill:#39d353;animation:blink .78s steps(1,end) infinite}@keyframes blink{50%{opacity:0}}</style>
  <text x="380" y="30" text-anchor="middle" class="name" clip-path="url(#name-type)">Kavya Jain</text>
  <text x="380" y="72" text-anchor="middle" class="role" clip-path="url(#role-type)">Systems Engineering &amp; Product</text>
  <rect class="caret" x="300" y="7" width="3" height="27"><animate attributeName="x" dur="8s" repeatCount="indefinite" values="300;300;460;460;300;300" keyTimes="0;0.04;0.23;0.965;0.966;1"/><animate attributeName="opacity" dur="8s" repeatCount="indefinite" values="1;1;1;0;0" keyTimes="0;0.04;0.23;0.24;1"/></rect>
  <rect class="caret" x="128" y="49" width="3" height="27"><animate attributeName="x" dur="8s" repeatCount="indefinite" values="128;128;128;630;630;128;128" keyTimes="0;0.04;0.24;0.54;0.965;0.966;1"/><animate attributeName="opacity" dur="8s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0;0.23;0.24;0.965;0.966;1"/></rect>
</svg>'''


TOOLS = [
    ("C++", "#00599c"), ("JS", "#f7df1e"), ("TS", "#3178c6"), ("PY", "#3776ab"),
    ("RE", "#61dafb"), ("NX", "#ffffff"), ("NO", "#5fa04e"), ("FA", "#00a98f"),
    ("PG", "#4169e1"), ("RD", "#dc382d"), ("MG", "#47a248"), ("GT", "#f05032"),
    ("DK", "#2496ed"), ("BQ", "#e53d2e"),
]


def toolbox_svg(theme: str) -> str:
    dark = theme == "dark"
    ink = "#f0f6fc" if dark else "#1f2328"
    muted = "#8b949e" if dark else "#59636e"
    cells = []
    for index, (label, colour) in enumerate(TOOLS):
        row, column = divmod(index, 7)
        x = 166 + column * 76
        y = 16 + row * 66
        text_colour = "#111820" if colour in {"#f7df1e", "#61dafb", "#ffffff"} else "#ffffff"
        cells.append(f'<rect x="{x}" y="{y}" width="44" height="44" rx="10" fill="{colour}"/><text x="{x + 22}" y="{y + 28}" text-anchor="middle" class="icon" fill="{text_colour}">{label}</text>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 148" width="880" height="148" role="img" aria-labelledby="tools-title">
  <title id="tools-title">Kavya Jain's engineering toolbox</title>
  <style>.icon{{font:800 12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}}.legend{{font:700 9px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:{muted};letter-spacing:.12em}}.line{{stroke:{ink};opacity:.12}}</style>
  <path d="M24 74H132M748 74H856" class="line"/><text x="440" y="76" text-anchor="middle" class="legend">LANGUAGES · PRODUCT · SYSTEMS · DATA · DELIVERY</text>{''.join(cells)}
</svg>'''


def radar_points(center_x: float, center_y: float, radius: float, values: list[float]) -> str:
    points = []
    for index, value in enumerate(values):
        angle = -math.pi / 2 + 2 * math.pi * index / len(values)
        points.append(f"{center_x + math.cos(angle) * radius * value:.1f},{center_y + math.sin(angle) * radius * value:.1f}")
    return " ".join(points)


def radar_panel(x: int, labels: list[str], values: list[float], theme: str, title: str) -> str:
    dark = theme == "dark"
    ink = "#f0f6fc" if dark else "#1f2328"
    muted = "#8b949e" if dark else "#59636e"
    border = "#30363d" if dark else "#d0d7de"
    background = "#0d1117" if dark else "#ffffff"
    accent = "#39d353" if dark else "#1f883d"
    center_x, center_y, radius = x + 215, 145, 82
    axes = []
    label_nodes = []
    for index, label in enumerate(labels):
        angle = -math.pi / 2 + 2 * math.pi * index / len(labels)
        end_x = center_x + math.cos(angle) * radius
        end_y = center_y + math.sin(angle) * radius
        label_x = center_x + math.cos(angle) * (radius + 24)
        label_y = center_y + math.sin(angle) * (radius + 18) + 3
        anchor = "middle" if abs(math.cos(angle)) < 0.2 else ("start" if math.cos(angle) > 0 else "end")
        axes.append(f'<path d="M{center_x} {center_y}L{end_x:.1f} {end_y:.1f}" stroke="{border}"/>')
        label_nodes.append(f'<text x="{label_x:.1f}" y="{label_y:.1f}" text-anchor="{anchor}" class="axis">{label}</text>')
    rings = []
    for scale in (0.25, 0.5, 0.75, 1):
        rings.append(f'<polygon points="{radar_points(center_x, center_y, radius, [scale] * len(labels))}" fill="none" stroke="{border}"/>')
    data_points = radar_points(center_x, center_y, radius, values)
    return f'''<g><rect x="{x + .5}" y=".5" width="429" height="284" rx="6" fill="{background}" stroke="{border}"/><text x="{x + 18}" y="24" class="title">{title}</text>{''.join(rings)}{''.join(axes)}<polygon points="{data_points}" fill="{accent}" fill-opacity=".24" stroke="{accent}" stroke-width="2"/><g fill="{accent}">{''.join(f'<circle cx="{point.split(',')[0]}" cy="{point.split(',')[1]}" r="3"/>' for point in data_points.split())}</g>{''.join(label_nodes)}</g>'''


def radar_svg(theme: str) -> str:
    dark = theme == "dark"
    ink = "#f0f6fc" if dark else "#1f2328"
    muted = "#8b949e" if dark else "#59636e"
    left = radar_panel(0, ["PRODUCT", "FRONTEND", "BACKEND", "DATA", "RELIABILITY", "AI FLOW"], [.92, .86, .81, .78, .77, .76], theme, "ENGINEERING RANGE")
    right = radar_panel(450, ["TYPESCRIPT", "JAVASCRIPT", "C++", "SQL", "PYTHON", "REACT/NEXT"], [.88, .9, .74, .78, .68, .86], theme, "WORKING LANGUAGES")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 285" width="880" height="285" role="img" aria-labelledby="radar-title radar-desc"><title id="radar-title">Kavya Jain engineering range</title><desc id="radar-desc">Two relative radar charts describing engineering focus and working languages. They are not proficiency percentages.</desc><style>.title{{font:700 10px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:{ink};letter-spacing:.1em}}.axis{{font:650 7.5px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:{muted};letter-spacing:.05em}}</style>{left}{right}</svg>'''


def main() -> None:
    HERO_DIR.mkdir(parents=True, exist_ok=True)
    if not SOURCE.exists():
        raise SystemExit(f"Missing portrait source: {SOURCE}")
    source = clean_cutout(Image.open(SOURCE))
    cutout = place_bust(source)
    pixel = dot_pixel_portrait(cutout)
    cutout.save(CUTOUT, optimize=True)
    pixel.save(PIXEL, optimize=True)
    REVEAL.write_text(portrait_reveal_svg(pixel), encoding="utf-8")
    TYPING.write_text(role_typing_svg(), encoding="utf-8")
    for theme in ("light", "dark"):
        (ROOT / "assets" / f"toolbox-{theme}.svg").write_text(toolbox_svg(theme), encoding="utf-8")
        (ROOT / "assets" / f"skill-radar-{theme}.svg").write_text(radar_svg(theme), encoding="utf-8")
    print("Built benchmark-style hero, toolbox and skill radars.")


if __name__ == "__main__":
    main()
