"""Create a smooth, borderless portrait reveal from the supplied halftone image."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter, ImageOps


STATIC_OUTPUT = Path("assets/portrait-v3.png")
ANIMATED_OUTPUT = Path("assets/portrait-reveal.webp")
SOURCE = STATIC_OUTPUT


def smoothstep(value: float) -> float:
    return value * value * (3 - 2 * value)


def main() -> None:
    source = ImageOps.exif_transpose(Image.open(SOURCE)).convert("RGB")
    side = min(source.width, source.height)
    portrait = source.crop((0, 0, side, side))
    portrait.save(STATIC_OUTPUT, optimize=True)

    black = Image.new("RGB", portrait.size, "#000000")
    frames: list[Image.Image] = [black]
    durations: list[int] = [260]
    reveal_frames = 28
    for frame_index in range(1, reveal_frames + 1):
        progress = smoothstep(frame_index / reveal_frames)
        blur_radius = (1 - progress) * 4.2
        focused = portrait.filter(ImageFilter.GaussianBlur(blur_radius)) if blur_radius > 0.08 else portrait
        frames.append(Image.blend(black, focused, progress))
        durations.append(46)

    frames.append(portrait)
    durations.append(5200)
    for frame_index in range(1, 9):
        progress = smoothstep(frame_index / 8)
        frames.append(Image.blend(portrait, black, progress))
        durations.append(42)

    frames[0].save(ANIMATED_OUTPUT, save_all=True, append_images=frames[1:], duration=durations, loop=0, format="WEBP", quality=94, method=6, minimize_size=True)
    print(f"Built {STATIC_OUTPUT} and {ANIMATED_OUTPUT} from the exact supplied portrait.")


if __name__ == "__main__":
    main()
