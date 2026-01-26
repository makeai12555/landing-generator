# banner_pipeline.py
import os
from pathlib import Path
from io import BytesIO


from dotenv import load_dotenv
from PIL import Image

from google import genai
from google.genai import types


# ---------- Config ----------
MODEL_IMAGE = os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
ASPECT_RATIO = "16:9"
OUT_DIR = Path("outputs")
OUT_DIR.mkdir(exist_ok=True)


def _save_first_image_from_response(response, out_path: Path) -> bool:
    """
    Tries to extract the first image from a Gemini response and save it.
    Supports common response shapes from google-genai.
    """
    # Newer/typical: response.candidates[0].content.parts
    parts = []
    if hasattr(response, "candidates") and response.candidates:
        c0 = response.candidates[0]
        if hasattr(c0, "content") and c0.content and hasattr(c0.content, "parts"):
            parts = c0.content.parts

    # Some examples use response.parts
    if not parts and hasattr(response, "parts"):
        parts = response.parts

    for part in parts:
        try:
            if hasattr(part, "inline_data") and part.inline_data:
                img = part.as_image()
                if img:
                    img.save(out_path)
                    return True
        except Exception:
            # If as_image() fails for a part, continue.
            continue
    return False


def _make_client() -> genai.Client:
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY in .env or environment")
    return genai.Client(api_key=api_key)


def generate_banner_en(course: dict, out_path: Path) -> Path:
    """
    Step 1: Generate a strong English banner (anchors composition + typography).
    """
    client = _make_client()

    prompt_en = f"""
Create a premium, modern 16:9 course banner advertisement.
Language: English ONLY.

Design style:
- high-end, clean, modern, tech-friendly
- excellent typography, clear hierarchy, perfect alignment
- subtle depth, soft shadows, crisp edges
- readable text (no broken letters), high contrast
- use a blurred/soft background that fits a web coding theme (laptop/code), but keep text area clean

Layout:
- Big title (top/upper-center): "{course["title_en"]}"
- Subtitle under it: "{course["subtitle_en"]}"
- One slim rounded info bar (single row) with separators (|) containing:
  Dates: {course["dates_en"]} | Time: {course["time_en"]} | Day: {course["day_en"]} | Location: {course["location_en"]} | Duration: {course["duration_en"]}
- CTA button centered below info bar: "{course["cta_en"]}"

Rules:
- Keep generous safe margins.
- No clutter. Everything aligned and balanced.
- Make it look like a real professional ad for a youth course.
"""

    # Use single generate_content call (more stable than chat for some accounts)
    resp = client.models.generate_content(
        model=MODEL_IMAGE,
        contents=[prompt_en],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(aspect_ratio=ASPECT_RATIO),
        ),
    )

    ok = _save_first_image_from_response(resp, out_path)
    if not ok:
        raise RuntimeError("No image returned from EN generation")
    return out_path


def edit_banner_to_hebrew(en_image_path: Path, course: dict, out_path: Path) -> Path:
    """
    Step 2: HARD edit: replace text to Hebrew only (keep design locked).
    We send the image as inline_data (Blob) so the API treats it as an edit target.
    """
    client = _make_client()

    img_en = Image.open(en_image_path).convert("RGBA")
    buf = BytesIO()
    img_en.save(buf, format="PNG")
    img_bytes = buf.getvalue()

    prompt_he = f"""
You MUST edit the provided image (do not generate a new design).

Task:
- Replace ALL visible English text with the Hebrew text below.
- Do NOT change layout, positions, sizing, colors, background, or typography style.
- Keep the same hierarchy and alignment.
- Ensure Hebrew is correct RTL and looks native.
- After editing: there must be ZERO English text left.

Hebrew to place:

Title:
{course["title_he"]}

Subtitle:
{course["subtitle_he"]}

Info bar (single row, same structure, with separators):
תאריכים: {course["dates_he"]} | שעות: {course["time_he"]} | יום: {course["day_he"]} | מיקום: {course["location_he"]} | משך: {course["duration_he"]}

CTA button:
{course["cta_he"]}

If you cannot keep layout identical, keep it as identical as possible and ONLY change the letters.
"""

    image_part = types.Part(
        inline_data=types.Blob(mime_type="image/png", data=img_bytes)
    )
    text_part = types.Part(text=prompt_he)

    resp = client.models.generate_content(
        model=MODEL_IMAGE,
        contents=[types.Content(parts=[image_part, text_part])],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(aspect_ratio=ASPECT_RATIO),
        ),
    )

    ok = _save_first_image_from_response(resp, out_path)
    if not ok:
        raise RuntimeError("No image returned from Hebrew edit")
    return out_path




def run_demo():
    # דמו זהה לשלך כדי שנראה שזה עובד בפרויקט האמיתי
    course = {
        "title_en": "WEB CODING — BEGINNER TRACK",
        "subtitle_en": "HTML, CSS & JavaScript — build your first real website",
        "dates_en": "14.1–20.4",
        "time_en": "18:00–20:00",
        "day_en": "Thursdays",
        "location_en": "Jerusalem, Talpiot",
        "duration_en": "5 weeks",
        "cta_en": "SIGN UP NOW",

        "title_he": "תכנות למתחילים — Web Coding",
        "subtitle_he": "HTML, CSS ו-JavaScript — בונים אתר ראשון אמיתי",
        "dates_he": "14.1–20.4",
        "time_he": "18:00–20:00",
        "day_he": "ימי חמישי",
        "location_he": "ירושלים, תלפיות",
        "duration_he": "5 שבועות",
        "cta_he": "להרשמה עכשיו",
    }

    en_path = OUT_DIR / "banner_step1_en.png"
    he_path = OUT_DIR / "banner_step2_he.png"

    print("Generating EN banner...")
    generate_banner_en(course, en_path)
    print("Saved:", en_path)

    print("Editing to Hebrew...")
    edit_banner_to_hebrew(en_path, course, he_path)
    print("Saved:", he_path)

    print("✅ Done.")


if __name__ == "__main__":
    run_demo()
