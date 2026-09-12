"""Build the portrait and repo-driven profile visuals.

The portrait pipeline traces a supplied two-tone raster into native SVG blocks
and gives each occupied block one non-looping hop into place. Toolbox and radar
data come from profile-signals.json.
"""

from __future__ import annotations

import json
import math
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HERO_DIR = ROOT / "assets" / "hero"
DUOTONE_MAP = ROOT / "data" / "portrait-duotone.map"
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


def portrait_reveal_svg(source: list[str]) -> str:
    """Quantise to two colours and animate coarse SVG tiles, not scan lines."""

    columns = 80
    rows = 68
    cell = 8
    tile_cells = 5
    tiles: dict[tuple[int, int], list[str]] = {}

    for row in range(rows):
        for column in range(columns):
            pixel = source[row][column]
            if pixel == ".":
                continue
            colour = "#39d353" if pixel == "L" else "#0d1117"
            tile = (column // tile_cells, row // tile_cells)
            tiles.setdefault(tile, []).append(
                f'<rect x="{column * cell}" y="{row * cell}" width="{cell}" height="{cell}" fill="{colour}"/>'
            )

    rng = random.Random(1407)
    ordered_tiles = list(tiles.items())
    # Assemble from the face outward so intermediate frames read as intentional,
    # not as random missing chunks. Seeded jitter prevents a mechanical ring wipe.
    ordered_tiles.sort(
        key=lambda item: math.hypot(item[0][0] - 7.5, (item[0][1] - 5.0) * 0.86)
        + rng.uniform(-0.85, 0.85)
    )
    final_begin = 1.34
    geometry_definitions = []
    blueprint_uses = []
    tile_groups = []
    for index, ((tile_x, tile_y), rects) in enumerate(ordered_tiles):
        progress = index / max(1, len(ordered_tiles) - 1)
        begin = 0.10 + progress * final_begin + rng.uniform(-0.025, 0.025)
        offset_x = rng.choice((-1, 1)) * rng.randint(4, 11)
        offset_y = rng.randint(11, 19)
        apex_x = round(offset_x * 0.22, 1)
        apex_y = -rng.randint(4, 8)
        reveal_start = begin / 2
        reveal_end = (begin + 0.16) / 2
        geometry_id = f"portrait-geometry-{index}"
        geometry_definitions.append(f'<g id="{geometry_id}">{''.join(rects)}</g>')
        blueprint_uses.append(f'<use href="#{geometry_id}"/>')
        tile_groups.append(
            f'''<g class="portrait-tile" data-tile="{tile_x}-{tile_y}" opacity="1">
      <use href="#{geometry_id}"/>
      <animate attributeName="opacity" values="0;0;1;1" keyTimes="0;{reveal_start:.5f};{reveal_end:.5f};1" dur="2s" begin="0s" fill="freeze"/>
      <animateTransform attributeName="transform" type="translate" values="{offset_x} {offset_y};{apex_x} {apex_y};0 0" keyTimes="0;.58;1" dur=".32s" begin="{begin:.3f}s" calcMode="spline" keySplines=".2 .8 .3 1;.2 .8 .2 1" fill="freeze"/>
    </g>'''
        )

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 540" width="640" height="540" role="img" aria-labelledby="portrait-title portrait-desc" shape-rendering="crispEdges">
  <title id="portrait-title">Kavya Jain two-tone pixel portrait</title>
  <desc id="portrait-desc">A transparent black and terminal-green portrait assembles once as pixel blocks hop into place.</desc>
  <style>@media (prefers-reduced-motion:reduce){{.portrait-tile{{opacity:1!important;transform:none!important}}.portrait-tile animate,.portrait-tile animateTransform{{display:none}}}}</style>
  <defs>{''.join(geometry_definitions)}</defs>
  <g id="portrait-blueprint" opacity=".11">{''.join(blueprint_uses)}</g>
  {''.join(tile_groups)}
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


def radar_panel(y: int, entries: list[dict], theme: str, title: str, compact: bool) -> str:
    dark = theme == "dark"
    muted = "#8b949e" if dark else "#59636e"
    border = "#30363d" if dark else "#d0d7de"
    background = "#0d1117" if dark else "#ffffff"
    accent = "#39d353" if dark else "#1f883d"
    labels = [display_label(entry["label"].upper(), 13) for entry in entries]
    values = [float(entry["value"]) for entry in entries]
    width = 440 if compact else 880
    center_x, center_y, radius = width / 2, y + 158, 105 if compact else 112
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
    return f'''<g><rect x=".5" y="{y + .5}" width="{width - 1}" height="307" rx="7" fill="{background}" stroke="{border}"/><text x="{16 if compact else 24}" y="{y + 29}" class="title">{title}</text>{''.join(rings)}{''.join(axes)}<polygon points="{data_points}" fill="{accent}" fill-opacity=".24" stroke="{accent}" stroke-width="2.4"/><g fill="{accent}">{circles}</g>{''.join(label_nodes)}<text x="{16 if compact else 24}" y="{y + 289}" class="source" fill="{muted}">REPO-DRIVEN SIGNAL · NOT SELF-RATING</text></g>'''


def radar_svg(theme: str, signals: dict, compact: bool = False) -> str:
    dark = theme == "dark"
    ink = "#f0f6fc" if dark else "#1f2328"
    muted = "#8b949e" if dark else "#59636e"
    width = 440 if compact else 880
    engineering = radar_panel(0, signals["engineeringRange"], theme, "ENGINEERING RANGE", compact)
    footprint = radar_panel(326, signals["workingLanguages"], theme, "REPOSITORY FOOTPRINT", compact)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} 634" width="{width}" height="634" role="img" aria-labelledby="radar-title radar-desc"><title id="radar-title">Kavya Jain repo-driven engineering range and repository footprint</title><desc id="radar-desc">Two large radar panels. Engineering axes combine configured project relevance with authored commits, recency and language bytes. Repository-footprint axes come directly from GitHub language bytes. They are not proficiency percentages.</desc><style>.title{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;font-weight:750;fill:{ink};letter-spacing:.1em}}.axis{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:{9.5 if compact else 10}px;font-weight:700;fill:{muted};letter-spacing:.04em}}.source{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:8.5px;font-weight:700;letter-spacing:.06em}}</style>{engineering}{footprint}</svg>'''


def main() -> None:
    HERO_DIR.mkdir(parents=True, exist_ok=True)
    if not SIGNALS.exists():
        raise SystemExit(f"Missing live signal snapshot: {SIGNALS}")
    signals = json.loads(SIGNALS.read_text(encoding="utf-8"))
    if "--signals-only" not in sys.argv:
        if not DUOTONE_MAP.exists():
            raise SystemExit(f"Missing locked duotone portrait map: {DUOTONE_MAP}")
        portrait_map = DUOTONE_MAP.read_text(encoding="utf-8").splitlines()
        if len(portrait_map) != 68 or any(len(row) != 80 or set(row) - {".", "B", "L"} for row in portrait_map):
            raise SystemExit("Portrait map must contain exactly 68 rows × 80 columns of ., B and L.")
        REVEAL.write_text(portrait_reveal_svg(portrait_map), encoding="utf-8")
    render_toolbox(signals)
    for theme in ("light", "dark"):
        (ROOT / "assets" / f"skill-radar-{theme}.svg").write_text(radar_svg(theme, signals), encoding="utf-8")
        (ROOT / "assets" / f"skill-radar-{theme}-compact.svg").write_text(radar_svg(theme, signals, compact=True), encoding="utf-8")
    mode = "signals only" if "--signals-only" in sys.argv else "portrait and signals"
    print(f"Built live toolbox and repo-driven skill radars ({mode}).")


if __name__ == "__main__":
    main()
