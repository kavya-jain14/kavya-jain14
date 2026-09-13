"""Generate the detailed green/black line-art source for the README hero.

The pipeline deliberately separates the stable two-tone fill from the fine
detail pass:

1. A single global brightness cutoff keeps dark clothing consistently black.
2. Shadow-lifted Canny edges restore seams, buttons, hair strands and folds.

Background removal is designed for a bright, border-connected studio
background. It intentionally stops with a clear error when that assumption is
not met instead of silently producing an opaque black rectangle.

Usage:
    python scripts/generate_portrait.py input.jpg output.png

This is a manual preprocessing step. The scheduled README workflow consumes
the committed output and does not rerun OpenCV against the portrait.
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


GREEN = np.array([45, 235, 86], dtype=np.uint8)
UPSCALE = 1.8
CROP_BOTTOM_FRAC = 0.72
BG_BRIGHTNESS = 172
FILL_CUTOFF_FLOOR = 135
SHADOW_LIFT_GAMMA = 0.55
CANNY_LO = 40
CANNY_HI = 110


def generate(src_path: str | Path, out_path: str | Path) -> None:
    """Render one bright-background portrait as a transparent RGBA PNG."""

    source = Path(src_path)
    destination = Path(out_path)
    image = cv2.imread(str(source))
    if image is None:
        raise FileNotFoundError(source)

    height, _ = image.shape[:2]
    image = image[: int(height * CROP_BOTTOM_FRAC), :]
    height, width = image.shape[:2]
    image_up = cv2.resize(
        image,
        (int(width * UPSCALE), int(height * UPSCALE)),
        interpolation=cv2.INTER_CUBIC,
    )
    output_height, output_width = image_up.shape[:2]
    gray = cv2.cvtColor(image_up, cv2.COLOR_BGR2GRAY)

    # Bright components touching any edge are background; enclosed highlights
    # remain part of the person.
    gray_segmented = cv2.GaussianBlur(gray, (7, 7), 0)
    background_candidate = (gray_segmented > BG_BRIGHTNESS).astype(np.uint8)
    _, labels = cv2.connectedComponents(background_candidate, connectivity=8)
    border_labels = (
        set(labels[0, :].tolist())
        | set(labels[-1, :].tolist())
        | set(labels[:, 0].tolist())
        | set(labels[:, -1].tolist())
    )
    border_labels.discard(0)
    if not border_labels:
        raise ValueError(
            "No bright border-connected background was found. "
            "Use the original bright-background photo or tune BG_BRIGHTNESS."
        )

    real_background = np.isin(labels, list(border_labels)).astype(np.uint8)
    foreground_mask = 1 - real_background
    foreground_mask = cv2.morphologyEx(
        foreground_mask, cv2.MORPH_CLOSE, np.ones((11, 11), np.uint8)
    )
    foreground_mask = cv2.morphologyEx(
        foreground_mask, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8)
    )

    component_count, component_labels, stats, _ = cv2.connectedComponentsWithStats(
        foreground_mask, connectivity=8
    )
    if component_count <= 1:
        raise ValueError("No foreground subject survived background removal.")
    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    foreground_mask = np.where(component_labels == largest, 1, 0).astype(np.uint8)

    # Restore holes enclosed by the selected foreground component, such as the
    # regions inside glasses frames.
    inverse = 1 - foreground_mask
    _, hole_labels = cv2.connectedComponents(inverse, connectivity=8)
    exterior_label = hole_labels[0, 0]
    holes = np.where(
        (hole_labels != exterior_label) & (inverse == 1), 1, 0
    ).astype(np.uint8)
    foreground_mask |= holes
    foreground = foreground_mask.astype(bool)
    alpha = cv2.GaussianBlur(foreground_mask * 255, (3, 3), 0)

    # One global threshold prevents lit jacket folds from becoming large green
    # patches while retaining skin and hair highlights.
    gray_smooth = cv2.medianBlur(gray, 5)
    foreground_values = gray_smooth[foreground]
    if foreground_values.size == 0:
        raise ValueError("Foreground mask contains no pixels.")
    otsu_value, _ = cv2.threshold(
        foreground_values, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )
    cutoff = max(float(otsu_value) * 1.05, FILL_CUTOFF_FLOOR)
    bright_fill = gray_smooth.astype(np.float32) > cutoff

    # Lift shadows before detecting detail so black clothing still exposes its
    # construction lines against GitHub's dark canvas.
    normalized = gray.astype(np.float32) / 255.0
    lifted = (np.power(normalized, SHADOW_LIFT_GAMMA) * 255).astype(np.uint8)
    equalized = cv2.createCLAHE(clipLimit=5.0, tileGridSize=(8, 8)).apply(lifted)
    denoised = cv2.bilateralFilter(equalized, 7, 55, 55)
    edges = cv2.Canny(denoised, CANNY_LO, CANNY_HI)
    edges = cv2.dilate(edges, np.ones((2, 2), np.uint8), iterations=1)
    edges &= foreground_mask * 255

    bright_final = bright_fill | (edges > 0)
    output = np.zeros((output_height, output_width, 4), dtype=np.uint8)
    output[..., :3] = np.where(
        (foreground & bright_final)[..., None], GREEN, np.array([0, 0, 0], dtype=np.uint8)
    )
    output[..., 3] = alpha

    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(output, "RGBA").save(destination, optimize=True)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(
            "usage: python scripts/generate_portrait.py <input photo> <output png>"
        )
    generate(sys.argv[1], sys.argv[2])
    print(f"saved: {sys.argv[2]}")


if __name__ == "__main__":
    main()
