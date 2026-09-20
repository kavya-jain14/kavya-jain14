"""Build the portrait and repo-driven profile visuals.

The portrait pipeline keeps the supplied RGB source byte-for-byte, softly blends
the outer crop into the page, and creates a lossless top-to-bottom line reveal.
Toolbox and radar data come from profile-signals.json.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HERO_DIR = ROOT / "assets" / "hero"
PORTRAIT_SOURCE = HERO_DIR / "kavya-portrait-exact.png"
PORTRAIT_ALPHA = HERO_DIR / "portrait-alpha-mask.png"
PORTRAIT_STATIC = HERO_DIR / "portrait-exact-static.png"
REVEAL = HERO_DIR / "portrait-reveal-v2.webp"
PORTRAIT_SOURCE_SHA256 = "fd03bc35e0b89e2eec21b36e8d03ca3579ef1125efd4e7adf02e9363e356078c"
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


def build_portrait_assets(source_path: Path, alpha_path: Path) -> None:
    """Create lossless portrait assets while preserving every supplied RGB value."""

    source_bytes = source_path.read_bytes()
    if hashlib.sha256(source_bytes).hexdigest() != PORTRAIT_SOURCE_SHA256:
        raise SystemExit("Locked portrait source changed; use the exact approved PNG.")

    try:
        from PIL import Image, ImageChops, ImageDraw
    except ImportError as error:
        raise SystemExit("Pillow is required when rebuilding the portrait asset.") from error

    with Image.open(source_path) as source_image, Image.open(alpha_path) as alpha_image:
        if source_image.mode != "RGB" or source_image.size != (1008, 1179):
            raise SystemExit("Exact portrait source must remain 1008x1179 RGB.")
        if alpha_image.size != source_image.size:
            raise SystemExit("Portrait alpha mask must match the exact source dimensions.")
        exact_rgb = source_image.copy()
        alpha = alpha_image.convert("L")

    # The supplied cut-out reaches the side and bottom canvas edges. Feathering
    # only those outermost pixels keeps the face, hair and clothing crisp while
    # preventing the portrait from looking pasted onto the README background.
    side_fade = 48
    bottom_fade = 88
    edge_blend = Image.new("L", exact_rgb.size, 255)
    edge_pixels = edge_blend.load()
    width, height = exact_rgb.size
    for y in range(height):
        bottom_distance = height - 1 - y
        bottom_progress = min(1.0, bottom_distance / bottom_fade)
        bottom_opacity = bottom_progress * bottom_progress * (3 - 2 * bottom_progress)
        for x in range(width):
            side_distance = min(x, width - 1 - x)
            side_progress = min(1.0, side_distance / side_fade)
            side_opacity = side_progress * side_progress * (3 - 2 * side_progress)
            edge_pixels[x, y] = round(255 * side_opacity * bottom_opacity)

    blended_alpha = ImageChops.multiply(alpha, edge_blend)
    if blended_alpha.getpixel((width // 2, height // 2)) != alpha.getpixel((width // 2, height // 2)):
        raise RuntimeError("Portrait edge blend reached the protected centre detail.")
    if blended_alpha.getpixel((0, height - 1)) >= alpha.getpixel((0, height - 1)):
        raise RuntimeError("Portrait crop corners must fade into the page background.")
    portrait = exact_rgb.convert("RGBA")
    portrait.putalpha(blended_alpha)
    portrait.save(PORTRAIT_STATIC, format="PNG", optimize=True)

    # Build the animation at its actual README presentation width. Nearest-
    # neighbour scaling preserves the approved pixel colours and crisp texture,
    # while keeping the complete binary below the publishing transport limit.
    reveal_width = 520
    reveal_height = round(height * reveal_width / width)
    reveal_size = (reveal_width, reveal_height)
    reveal_rgb = exact_rgb.resize(reveal_size, Image.Resampling.NEAREST)
    reveal_base_alpha = blended_alpha.resize(reveal_size, Image.Resampling.NEAREST)

    # Twelve crisp opacity bands make the moving boundary read as pixel rows.
    # The first frame begins at y=0 rather than travelling in from above.
    edge_height = 48
    layer_opacities = (240, 222, 201, 179, 156, 130, 105, 79, 56, 36, 18, 6)
    layer_height = edge_height // len(layer_opacities)
    frame_count = 31
    frames = []

    for frame_index in range(frame_count):
        progress = frame_index / (frame_count - 1)
        solid_end = min(reveal_height, round((progress * reveal_height) / layer_height) * layer_height)
        reveal_alpha = Image.new("L", reveal_size, 0)
        draw = ImageDraw.Draw(reveal_alpha)
        if solid_end > 0:
            draw.rectangle((0, 0, reveal_width, min(reveal_height, solid_end) - 1), fill=255)
        for layer_index, opacity in enumerate(layer_opacities):
            top = solid_end + layer_index * layer_height
            bottom = top + layer_height
            if bottom > 0 and top < reveal_height:
                draw.rectangle((0, max(0, top), reveal_width, min(reveal_height, bottom) - 1), fill=opacity)

        frame = reveal_rgb.convert("RGBA")
        frame.putalpha(ImageChops.multiply(reveal_base_alpha, reveal_alpha))
        frames.append(frame)

    durations = [147] * len(frames)
    durations[-1] = 16_000_000
    frames[0].save(
        REVEAL,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        format="WEBP",
        lossless=True,
        quality=100,
        method=4,
        minimize_size=True,
    )

    with Image.open(REVEAL) as animation:
        if animation.n_frames != len(frames):
            raise RuntimeError("Portrait reveal frame count changed during encoding.")
        animation.seek(0)
        first_visible_bounds = animation.convert("RGBA").getchannel("A").getbbox()
        if first_visible_bounds is None or first_visible_bounds[1] != 0:
            raise RuntimeError("Portrait reveal must begin on the very first pixel row.")
        animation.seek(animation.n_frames - 1)
        decoded = animation.convert("RGBA")
        if decoded.getchannel("A").tobytes() != reveal_base_alpha.tobytes():
            raise RuntimeError("Lossless portrait reveal altered the approved transparency.")
        visible = reveal_base_alpha.point(lambda value: 255 if value else 0)
        colour_delta = ImageChops.difference(decoded.convert("RGB"), reveal_rgb)
        visible_delta = ImageChops.composite(colour_delta, Image.new("RGB", reveal_size), visible)
        if visible_delta.getbbox() is not None:
            raise RuntimeError("Lossless portrait reveal altered a visible approved RGB value.")


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
        if not PORTRAIT_SOURCE.exists() or not PORTRAIT_ALPHA.exists():
            raise SystemExit("Missing locked portrait source or transparency mask.")
        build_portrait_assets(PORTRAIT_SOURCE, PORTRAIT_ALPHA)
    render_toolbox(signals)
    for theme in ("light", "dark"):
        (ROOT / "assets" / f"skill-radar-{theme}.svg").write_text(radar_svg(theme, signals), encoding="utf-8")
        (ROOT / "assets" / f"skill-radar-{theme}-compact.svg").write_text(radar_svg(theme, signals, compact=True), encoding="utf-8")
    mode = "signals only" if "--signals-only" in sys.argv else "portrait and signals"
    print(f"Built live toolbox and repo-driven skill radars ({mode}).")


if __name__ == "__main__":
    main()
