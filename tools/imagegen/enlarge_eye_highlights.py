from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi


def _component_bounds(mask: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.nonzero(mask)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def enlarge_highlights(path: Path, *, scale: float) -> dict[str, object]:
    image = Image.open(path).convert("RGBA")
    pixels = np.asarray(image).copy()
    rgb = pixels[..., :3].astype(np.float32)
    alpha = pixels[..., 3]
    luminance = rgb.mean(axis=2)
    chroma = rgb.max(axis=2) - rgb.min(axis=2)

    dark = (alpha > 220) & (luminance < 58)
    labels, count = ndi.label(dark)
    pupils: list[tuple[int, np.ndarray, np.ndarray]] = []

    for label_index in range(1, count + 1):
        component = labels == label_index
        area = int(component.sum())
        if area < 450:
            continue

        left, top, right, bottom = _component_bounds(component)
        width = right - left
        height = bottom - top
        if width < 24 or height < 24 or not 0.58 <= width / height <= 1.72:
            continue
        if top > image.height * 0.72:
            continue

        filled = ndi.binary_fill_holes(component)
        fill_ratio = area / max(1, int(filled.sum()))
        if fill_ratio < 0.58:
            continue

        bright = filled & (alpha > 220) & (luminance > 225) & (chroma < 24)
        highlight_labels, highlight_count = ndi.label(bright)
        highlight_candidates: list[tuple[int, np.ndarray]] = []
        for highlight_index in range(1, highlight_count + 1):
            highlight = highlight_labels == highlight_index
            highlight_area = int(highlight.sum())
            if 6 <= highlight_area <= 500:
                highlight_candidates.append((highlight_area, highlight))

        if not highlight_candidates:
            continue

        highlight_area, highlight = max(highlight_candidates, key=lambda item: item[0])
        pupils.append((area, filled, highlight))

    pupils.sort(key=lambda item: item[0], reverse=True)
    pupils = pupils[:2]
    if len(pupils) != 2:
        raise RuntimeError(f"Expected two pupils in {path.name}, detected {len(pupils)}")

    changes: list[dict[str, object]] = []
    warm_white = np.array([255.0, 253.0, 247.0], dtype=np.float32)

    for _, pupil, highlight in pupils:
        original_area = int(highlight.sum())
        equivalent_radius = np.sqrt(original_area / np.pi)
        target_radius = max(2.0, equivalent_radius * scale)
        ys, xs = np.nonzero(highlight)
        center_x = float(xs.mean())
        center_y = float(ys.mean())
        yy, xx = np.mgrid[: image.height, : image.width]
        distance = np.sqrt((xx - center_x) ** 2 + (yy - center_y) ** 2)
        circle = np.clip(target_radius + 0.65 - distance, 0.0, 1.0)
        soft_mask = (circle * pupil.astype(np.float32))[..., None]
        rgb = rgb * (1.0 - soft_mask) + warm_white * soft_mask

        changes.append(
            {
                "center": [round(center_x, 1), round(center_y, 1)],
                "original_area": original_area,
                "target_radius": round(float(target_radius), 2),
                "solid_circle_area": int((circle >= 1.0).sum()),
            }
        )

    pixels[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    output = Image.fromarray(pixels, "RGBA")
    temporary = path.with_name(f"{path.stem}.highlight-tmp.png")
    output.save(temporary, optimize=True)
    temporary.replace(path)

    return {"file": str(path), "highlights": changes}


def main() -> None:
    parser = argparse.ArgumentParser(description="Enlarge the two white eye highlights without regenerating cat art.")
    parser.add_argument("files", nargs="+", type=Path)
    parser.add_argument("--scale", type=float, default=1.4)
    args = parser.parse_args()

    reports = [enlarge_highlights(path, scale=args.scale) for path in args.files]
    print(json.dumps(reports, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
