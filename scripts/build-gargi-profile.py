"""Build the portrait and repo-driven profile visuals.

The portrait pipeline is deterministic: it cleans the supplied transparent PNG,
converts it to a dot-pixel rendering, and embeds that single intact image inside
an animated SVG clip. Toolbox and radar data come from profile-signals.json.
"""

from __future__ import annotations

import base64
import json
import math
import sys
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageStat


ROOT = Path(__file__).resolve().parents[1]
HERO_DIR = ROOT / "assets" / "hero"
SOURCE = HERO_DIR / "portrait-source.png"
CUTOUT = HERO_DIR / "portrait-cutout.png"
PIXEL = HERO_DIR / "portrait-pixel.png"
REVEAL = HERO_DIR / "portrait-reveal.svg"
SIGNALS = ROOT / "data" / "profile-signals.json"


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
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 540" width="640" height="540" role="img" aria-labelledby="portrait-title portrait-desc">
  <title id="portrait-title">Kavya Jain pixel portrait</title>
  <desc id="portrait-desc">A wide transparent dot-pixel portrait revealed smoothly from hair to shoulders.</desc>
  <defs>
    <clipPath id="reveal">
      <rect x="0" y="0" width="640" height="0">
        <animate attributeName="height" dur="9.6s" repeatCount="indefinite" calcMode="spline" values="0;0;540;540;0;0" keyTimes="0;0.02;0.365;0.965;0.966;1" keySplines="0.16 1 0.3 1;0.16 1 0.3 1;0 0 1 1;0 0 1 1;0 0 1 1"/>
      </rect>
    </clipPath>
  </defs>
  <image x="0" y="0" width="640" height="640" clip-path="url(#reveal)" href="data:image/png;base64,{payload}"/>
</svg>'''


def escape_xml(value: str) -> str:
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def display_label(value: str, limit: int = 17) -> str:
    aliases = {"Jupyter Notebook": "Jupyter", "Objective-C++": "Obj-C++", "Visual Basic .NET": "VB.NET"}
    label = aliases.get(value, value)
    return label if len(label) <= limit else f"{label[: limit - 1]}…"


def language_colour(name: str) -> str:
    palette = ["#3178c6", "#3776ab", "#1f883d", "#7c3aed", "#b45309", "#0e7490", "#be123c", "#4f46e5"]
    return palette[sum((index + 1) * ord(character) for index, character in enumerate(name)) % len(palette)]


def toolbox_svg(theme: str, signals: dict) -> str:
    dark = theme == "dark"
    ink = "#f0f6fc" if dark else "#1f2328"
    muted = "#8b949e" if dark else "#59636e"
    border = "#30363d" if dark else "#d0d7de"
    soft = "#161b22" if dark else "#f6f8fa"
    languages = signals["languages"]
    columns = 4
    rows = max(1, math.ceil(len(languages) / columns))
    height = 62 + rows * 46
    badges = []
    for index, language in enumerate(languages):
        row, column = divmod(index, columns)
        x = 20 + column * 213
        y = 45 + row * 46
        colour = language_colour(language["name"])
        share = "&lt;0.1%" if 0 < language["share"] < 0.0005 else f'{language["share"] * 100:.1f}%'
        badges.append(
            f'<g><rect x="{x}" y="{y}" width="196" height="34" rx="7" fill="{soft}" stroke="{border}"/>'
            f'<circle cx="{x + 17}" cy="{y + 17}" r="5" fill="{colour}"/>'
            f'<text x="{x + 30}" y="{y + 21}" class="language">{escape_xml(display_label(language["name"]))}</text>'
            f'<text x="{x + 183}" y="{y + 21}" text-anchor="end" class="share">{share}</text></g>'
        )
    repo_count = signals["languageRepositoryCount"]
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 {height}" width="880" height="{height}" role="img" aria-labelledby="tools-title tools-desc">
  <title id="tools-title">Kavya Jain's live language toolbox</title><desc id="tools-desc">Languages derived from GitHub language bytes across {repo_count} public owned non-fork repositories.</desc>
  <style>.eyebrow{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9px;font-weight:700;letter-spacing:.14em;fill:{ink}}}.source{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:8px;font-weight:650;letter-spacing:.08em;fill:{muted}}}.language{{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:11px;font-weight:700;fill:{ink}}}.share{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:8px;font-weight:700;fill:{muted}}}</style>
  <text x="20" y="24" class="eyebrow">LANGUAGE FOOTPRINT</text><text x="860" y="24" text-anchor="end" class="source">GITHUB LINGUIST BYTES · {repo_count} REPOSITORIES</text>{''.join(badges)}
</svg>'''


def radar_points(center_x: float, center_y: float, radius: float, values: list[float]) -> str:
    points = []
    for index, value in enumerate(values):
        angle = -math.pi / 2 + 2 * math.pi * index / len(values)
        points.append(f"{center_x + math.cos(angle) * radius * value:.1f},{center_y + math.sin(angle) * radius * value:.1f}")
    return " ".join(points)


def radar_panel(x: int, entries: list[dict], theme: str, title: str) -> str:
    dark = theme == "dark"
    muted = "#8b949e" if dark else "#59636e"
    border = "#30363d" if dark else "#d0d7de"
    background = "#0d1117" if dark else "#ffffff"
    accent = "#39d353" if dark else "#1f883d"
    labels = [display_label(entry["label"].upper(), 13) for entry in entries]
    values = [float(entry["value"]) for entry in entries]
    center_x, center_y, radius = x + 215, 151, 82
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
        label_nodes.append(f'<text x="{label_x:.1f}" y="{label_y:.1f}" text-anchor="{anchor}" class="axis">{escape_xml(label)}</text>')
    rings = [f'<polygon points="{radar_points(center_x, center_y, radius, [scale] * len(labels))}" fill="none" stroke="{border}"/>' for scale in (0.25, 0.5, 0.75, 1)]
    data_points = radar_points(center_x, center_y, radius, values)
    circles = "".join(f'<circle cx="{point.split(",")[0]}" cy="{point.split(",")[1]}" r="3"/>' for point in data_points.split())
    return f'''<g><rect x="{x + .5}" y=".5" width="429" height="296" rx="6" fill="{background}" stroke="{border}"/><text x="{x + 18}" y="24" class="title">{title}</text>{''.join(rings)}{''.join(axes)}<polygon points="{data_points}" fill="{accent}" fill-opacity=".24" stroke="{accent}" stroke-width="2"/><g fill="{accent}">{circles}</g>{''.join(label_nodes)}<text x="{x + 18}" y="281" class="source" fill="{muted}">REPO-DRIVEN SIGNAL · NOT SELF-RATING</text></g>'''


def radar_svg(theme: str, signals: dict) -> str:
    dark = theme == "dark"
    ink = "#f0f6fc" if dark else "#1f2328"
    muted = "#8b949e" if dark else "#59636e"
    left = radar_panel(0, signals["engineeringRange"], theme, "ENGINEERING RANGE")
    right = radar_panel(450, signals["workingLanguages"], theme, "WORKING LANGUAGES")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 297" width="880" height="297" role="img" aria-labelledby="radar-title radar-desc"><title id="radar-title">Kavya Jain repo-driven engineering range</title><desc id="radar-desc">Engineering axes combine configured project relevance with authored commits, recency and language bytes. Language axes come directly from GitHub language bytes. They are not proficiency percentages.</desc><style>.title{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;font-weight:700;fill:{ink};letter-spacing:.1em}}.axis{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:7.5px;font-weight:650;fill:{muted};letter-spacing:.05em}}.source{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:7px;font-weight:650;letter-spacing:.07em}}</style>{left}{right}</svg>'''


def main() -> None:
    HERO_DIR.mkdir(parents=True, exist_ok=True)
    if not SIGNALS.exists():
        raise SystemExit(f"Missing live signal snapshot: {SIGNALS}")
    signals = json.loads(SIGNALS.read_text(encoding="utf-8"))
    if "--signals-only" not in sys.argv:
        if not SOURCE.exists():
            raise SystemExit(f"Missing portrait source: {SOURCE}")
        source = clean_cutout(Image.open(SOURCE))
        cutout = place_bust(source)
        pixel = dot_pixel_portrait(cutout)
        cutout.save(CUTOUT, optimize=True)
        pixel.save(PIXEL, optimize=True)
        REVEAL.write_text(portrait_reveal_svg(pixel), encoding="utf-8")
    for theme in ("light", "dark"):
        (ROOT / "assets" / f"toolbox-{theme}.svg").write_text(toolbox_svg(theme, signals), encoding="utf-8")
        (ROOT / "assets" / f"skill-radar-{theme}.svg").write_text(radar_svg(theme, signals), encoding="utf-8")
    mode = "signals only" if "--signals-only" in sys.argv else "portrait and signals"
    print(f"Built live toolbox and repo-driven skill radars ({mode}).")


if __name__ == "__main__":
    main()
