#!/usr/bin/env python3
"""
Overlay 🍚 on every detected face.
- SKIP_FILES:   whole file copied untouched
- SKIP_FACES:   {filename: [(cx, cy), ...]} — leave face near these coords uncovered
- FORCE_COVER:  {filename: [(cx, cy, size), ...]} — manually cover faces model missed
                size = approx face width in px (default 120)

Run:  .venv/bin/python3 blur-faces.py
"""

from pathlib import Path
import shutil

import cv2
import requests
from insightface.app import FaceAnalysis
from PIL import Image

INPUT_DIR  = Path("picture holder temp")
OUTPUT_DIR = Path("faces-covered")
CACHE_DIR  = Path(".emoji-cache")

EMOJI = "🍚"

# --- config ------------------------------------------------------------------

SKIP_FILES = {
    "adult-holding-up-seedlings.png",
    "farmer-holding-crab.png",
}

SKIP_FACES: dict[str, list[tuple[int, int]]] = {
    "group-photo-in-paddy.png": [
        (610, 338),
    ],
    "farmer-demonstrating-planting.png": [
        (2030, 1600),
    ],
}

FORCE_COVER: dict[str, list[tuple]] = {
    # "some-photo.jpeg": [(cx, cy), (cx2, cy2, size)],
}

# -----------------------------------------------------------------------------


def get_emoji_img(emoji_char: str) -> Image.Image:
    """Download and cache the Twemoji PNG for an emoji character."""
    CACHE_DIR.mkdir(exist_ok=True)
    codepoint = "-".join(f"{ord(c):x}" for c in emoji_char if ord(c) != 0xFE0F)
    cached = CACHE_DIR / f"{codepoint}.png"
    if not cached.exists():
        url = f"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/{codepoint}.png"
        print(f"  downloading emoji PNG from CDN...")
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        cached.write_bytes(r.content)
    return Image.open(cached).convert("RGBA")


def overlay(img: Image.Image, cx: int, cy: int, face_size: int, emoji_src: Image.Image) -> None:
    size = max(int(face_size * 1.1), 40)
    stamp = emoji_src.resize((size, size), Image.LANCZOS)
    img.paste(stamp, (cx - size // 2, cy - size // 2), stamp)


def near_skip(cx: int, cy: int, face_size: int, skips: list) -> bool:
    tol = face_size * 0.7
    return any(abs(cx - sx) < tol and abs(cy - sy) < tol for sx, sy in skips)


def process(src: Path, dst: Path, emoji_src: Image.Image) -> None:
    if src.name in SKIP_FILES:
        shutil.copy2(src, dst)
        print(f"  [skip] {src.name}")
        return

    bgr = cv2.imread(str(src))
    if bgr is None:
        print(f"  [error] could not read {src.name}")
        return

    faces   = fa.get(bgr)
    img     = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
    skips   = SKIP_FACES.get(src.name, [])
    forced  = FORCE_COVER.get(src.name, [])
    covered = 0

    for face in faces:
        x1, y1, x2, y2 = (int(v) for v in face.bbox)
        w, h = x2 - x1, y2 - y1
        face_size = max(w, h)
        cx, cy = x1 + w // 2, y1 + h // 2

        if near_skip(cx, cy, face_size, skips):
            print(f"    skipped (coord exclusion) at ({cx},{cy})")
            continue

        overlay(img, cx, cy, face_size, emoji_src)
        print(f"    covered at ({cx},{cy}) size={face_size}px")
        covered += 1

    for entry in forced:
        cx, cy = entry[0], entry[1]
        size   = entry[2] if len(entry) > 2 else 120
        overlay(img, cx, cy, size, emoji_src)
        print(f"    force-covered at ({cx},{cy})")
        covered += 1

    img.save(dst)
    print(f"  [done] {src.name} — {covered} covered\n")


print("Loading face model...")
fa = FaceAnalysis(allowed_modules=["detection"])
fa.prepare(ctx_id=0, det_size=(640, 640))
print("Model ready.")

emoji_src = get_emoji_img(EMOJI)
print(f"Emoji ready: {EMOJI}\n")

OUTPUT_DIR.mkdir(exist_ok=True)

for img_path in sorted(INPUT_DIR.glob("*.png")):
    print(img_path.name)
    process(img_path, OUTPUT_DIR / img_path.name, emoji_src)

print(f"Done. Output → {OUTPUT_DIR}/")
