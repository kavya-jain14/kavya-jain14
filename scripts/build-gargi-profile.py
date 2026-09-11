"""Build the portrait and repo-driven profile visuals.

The portrait pipeline is deterministic: it cleans the supplied transparent PNG,
converts it to a dot-pixel rendering, and embeds that single intact image inside
an animated SVG clip. Toolbox and radar data come from profile-signals.json.
"""

from __future__ import annotations

import base64
import json
import math
import re
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
README = ROOT / "README.md"
TOOLBOX_DIR = ROOT / "assets" / "toolbox"
ICON_DIR = ROOT / "assets" / "icons"
TOOLBOX_START = "<!-- GENERATED:TOOLBOX:START -->"
TOOLBOX_END = "<!-- GENERATED:TOOLBOX:END -->"

ICON_ALIASES = {
    "TypeScript": ("typescript", "#3178C6", "#FFFFFF"),
    "JavaScript": ("javascript", "#F7DF1E", "#111111"),
    "CSS": ("css", "#663399", "#FFFFFF"),
    "HTML": ("html5", "#E34F26", "#FFFFFF"),
    "Python": ("python", "#3776AB", "#FFFFFF"),
    "PLpgSQL": ("postgresql", "#4169E1", "#FFFFFF"),
    "Java": ("openjdk", "#437291", "#FFFFFF"),
    "Dockerfile": ("docker", "#2496ED", "#FFFFFF"),
    "C++": ("cplusplus", "#00599C", "#FFFFFF"),
}


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


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "language"


def badge_slug(language_name: str) -> str:
    icon_name = ICON_ALIASES.get(language_name, ("", "", ""))[0]
    return slugify(icon_name or language_name)


def human_bytes(value: int) -> str:
    amount = float(value)
    for unit in ("B", "KB", "MB", "GB"):
        if amount < 1024 or unit == "GB":
            return f"{amount:.1f} {unit}" if unit != "B" else f"{int(amount)} B"
        amount /= 1024
    return f"{int(value)} B"


def icon_path(icon_name: str) -> str | None:
    source = ICON_DIR / f"{icon_name}.svg"
    if not source.exists():
        return None
    match = re.search(r'<path[^>]+d="([^"]+)"', source.read_text(encoding="utf-8"))
    return match.group(1) if match else None


def fallback_colour(name: str) -> str:
    palette = ["#1F883D", "#0E7490", "#7C3AED", "#B45309", "#BE123C", "#4F46E5"]
    return palette[sum((index + 1) * ord(character) for index, character in enumerate(name)) % len(palette)]


def toolbox_badge_svg(language: dict) -> str:
    name = language["name"]
    icon_name, background, foreground = ICON_ALIASES.get(name, ("", fallback_colour(name), "#FFFFFF"))
    path = icon_path(icon_name) if icon_name else None
    label = display_label(name, 12)
    share = "<0.1%" if 0 < language["share"] < 0.0005 else f'{language["share"] * 100:.1f}%'
    tooltip = f'{name}: {share} · {human_bytes(int(language["bytes"]))}'
    if path:
        glyph = f'<path d="{path}" fill="{foreground}" transform="translate(20 10) scale(1.3333)"/>'
    else:
        glyph = f'<text x="36" y="39" text-anchor="middle" class="fallback" fill="{foreground}">&lt;/&gt;</text>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72" role="img" aria-labelledby="title desc">
  <title id="title">{escape_xml(tooltip)}</title><desc id="desc">Live GitHub language badge for {escape_xml(name)}.</desc>
  <style>.label{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:7px;font-weight:800;letter-spacing:.02em}}.fallback{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:15px;font-weight:900}}</style>
  <rect width="72" height="72" rx="10" fill="{background}"/>{glyph}
  <rect y="54" width="72" height="18" fill="#000" fill-opacity=".16"/>
  <text x="36" y="66" text-anchor="middle" class="label" fill="{foreground}">{escape_xml(label)}</text>
</svg>'''


def render_toolbox(signals: dict) -> None:
    TOOLBOX_DIR.mkdir(parents=True, exist_ok=True)
    for stale in TOOLBOX_DIR.glob("*.svg"):
        stale.unlink()

    images = []
    used_slugs: set[str] = set()
    for language in signals["languages"]:
        slug = badge_slug(language["name"])
        suffix = 2
        while slug in used_slugs:
            slug = f"{slug}-{suffix}"
            suffix += 1
        used_slugs.add(slug)
        (TOOLBOX_DIR / f"{slug}.svg").write_text(toolbox_badge_svg(language), encoding="utf-8")
        share = "<0.1%" if 0 < language["share"] < 0.0005 else f'{language["share"] * 100:.1f}%'
        tooltip = escape_xml(f'{language["name"]} · {share} · {human_bytes(int(language["bytes"]))}')
        images.append(f'<img src="./assets/toolbox/{slug}.svg" width="72" height="72" alt="{escape_xml(language["name"])}" title="{tooltip}">')

    block = (
        f"{TOOLBOX_START}\n"
        '<p align="center">\n  '
        + "\n  ".join(images)
        + "\n</p>\n"
        f'<sub>Detected from GitHub Linguist bytes across {signals["languageRepositoryCount"]} public repositories. Hover any badge for its live share and byte count.</sub>\n'
        f"{TOOLBOX_END}"
    )
    readme = README.read_text(encoding="utf-8")
    pattern = re.compile(re.escape(TOOLBOX_START) + r".*?" + re.escape(TOOLBOX_END), re.DOTALL)
    if not pattern.search(readme):
        raise RuntimeError("README toolbox markers are missing.")
    README.write_text(pattern.sub(block, readme), encoding="utf-8")


def radar_points(center_x: float, center_y: float, radius: float, values: list[float]) -> str:
    points = []
    for index, value in enumerate(values):
        angle = -math.pi / 2 + 2 * math.pi * index / len(values)
        points.append(f"{center_x + math.cos(angle) * radius * value:.1f},{center_y + math.sin(angle) * radius * value:.1f}")
    return " ".join(points)


def radar_panel(y: int, entries: list[dict], theme: str, title: str) -> str:
    dark = theme == "dark"
    muted = "#8b949e" if dark else "#59636e"
    border = "#30363d" if dark else "#d0d7de"
    background = "#0d1117" if dark else "#ffffff"
    accent = "#39d353" if dark else "#1f883d"
    labels = [display_label(entry["label"].upper(), 13) for entry in entries]
    values = [float(entry["value"]) for entry in entries]
    center_x, center_y, radius = 440, y + 158, 112
    axes = []
    label_nodes = []
    for index, label in enumerate(labels):
        angle = -math.pi / 2 + 2 * math.pi * index / len(labels)
        end_x = center_x + math.cos(angle) * radius
        end_y = center_y + math.sin(angle) * radius
        label_x = center_x + math.cos(angle) * (radius + 39)
        label_y = center_y + math.sin(angle) * (radius + 31) + 4
        anchor = "middle" if abs(math.cos(angle)) < 0.2 else ("start" if math.cos(angle) > 0 else "end")
        axes.append(f'<path d="M{center_x} {center_y}L{end_x:.1f} {end_y:.1f}" stroke="{border}"/>')
        label_nodes.append(f'<text x="{label_x:.1f}" y="{label_y:.1f}" text-anchor="{anchor}" class="axis">{escape_xml(label)}</text>')
    rings = [f'<polygon points="{radar_points(center_x, center_y, radius, [scale] * len(labels))}" fill="none" stroke="{border}"/>' for scale in (0.25, 0.5, 0.75, 1)]
    data_points = radar_points(center_x, center_y, radius, values)
    circles = "".join(f'<circle cx="{point.split(",")[0]}" cy="{point.split(",")[1]}" r="3"/>' for point in data_points.split())
    return f'''<g><rect x=".5" y="{y + .5}" width="879" height="307" rx="7" fill="{background}" stroke="{border}"/><text x="24" y="{y + 29}" class="title">{title}</text>{''.join(rings)}{''.join(axes)}<polygon points="{data_points}" fill="{accent}" fill-opacity=".24" stroke="{accent}" stroke-width="2.4"/><g fill="{accent}">{circles}</g>{''.join(label_nodes)}<text x="24" y="{y + 289}" class="source" fill="{muted}">REPO-DRIVEN SIGNAL · NOT SELF-RATING</text></g>'''


def radar_svg(theme: str, signals: dict) -> str:
    dark = theme == "dark"
    ink = "#f0f6fc" if dark else "#1f2328"
    muted = "#8b949e" if dark else "#59636e"
    engineering = radar_panel(0, signals["engineeringRange"], theme, "ENGINEERING RANGE")
    footprint = radar_panel(326, signals["workingLanguages"], theme, "REPOSITORY FOOTPRINT")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 634" width="880" height="634" role="img" aria-labelledby="radar-title radar-desc"><title id="radar-title">Kavya Jain repo-driven engineering range and repository footprint</title><desc id="radar-desc">Two large radar panels. Engineering axes combine configured project relevance with authored commits, recency and language bytes. Repository-footprint axes come directly from GitHub language bytes. They are not proficiency percentages.</desc><style>.title{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;font-weight:750;fill:{ink};letter-spacing:.1em}}.axis{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;font-weight:700;fill:{muted};letter-spacing:.05em}}.source{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:8.5px;font-weight:700;letter-spacing:.07em}}</style>{engineering}{footprint}</svg>'''


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
    render_toolbox(signals)
    for theme in ("light", "dark"):
        (ROOT / "assets" / f"skill-radar-{theme}.svg").write_text(radar_svg(theme, signals), encoding="utf-8")
    mode = "signals only" if "--signals-only" in sys.argv else "portrait and signals"
    print(f"Built live toolbox and repo-driven skill radars ({mode}).")


if __name__ == "__main__":
    main()
