import os
import json
import logging
import base64
from pathlib import Path
from datetime import datetime, timezone

# Try to import Wand for SVG support
try:
    from wand.image import Image as WandImage
    HAS_WAND = True
except ImportError:
    HAS_WAND = False
import requests
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify

load_dotenv()
assert os.getenv("GEMINI_API_KEY"), "GEMINI_API_KEY is missing!"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent"


def load_logo_as_base64(logo_url: str) -> tuple[str, str] | None:
    """Load logo file and return (base64_data, mime_type). Converts SVG to PNG."""
    if not logo_url:
        return None

    # Convert URL path to file path
    if logo_url.startswith("/static/"):
        file_path = Path(app.root_path) / logo_url.lstrip("/")
    else:
        return None

    if not file_path.exists():
        logger.warning(f"Logo file not found: {file_path}")
        return None

    suffix = file_path.suffix.lower()

    # SVG needs conversion to PNG (Gemini doesn't support SVG)
    if suffix == ".svg":
        if not HAS_WAND:
            logger.warning("SVG support requires ImageMagick. Please use PNG logos or install ImageMagick.")
            return None
        try:
            with WandImage(filename=str(file_path)) as img:
                img.format = 'png'
                # Resize to reasonable size
                img.transform(resize='200x200>')
                png_data = img.make_blob()
            data = base64.b64encode(png_data).decode("utf-8")
            return data, "image/png"
        except Exception as e:
            logger.error(f"Failed to convert SVG to PNG: {e}")
            return None

    # PNG/JPG - read directly
    mime_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }
    mime_type = mime_types.get(suffix, "image/png")

    with open(file_path, "rb") as f:
        data = base64.b64encode(f.read()).decode("utf-8")

    return data, mime_type


@app.get("/")
def home():
    return render_template("create_course.html")


@app.post("/api/save-course")
def save_course():
    data = request.get_json(silent=True) or {}
    logger.info("=== SAVE COURSE ===")
    logger.info(json.dumps(data, indent=2, ensure_ascii=False))
    return jsonify({
        "success": True,
        "courseId": "local-dev",
        "savedAt": datetime.now(timezone.utc).isoformat(),
        "received": data
    })


def generate_single_image(prompt: str, logos: list[tuple[str, str]] = None) -> str | None:
    """Generate a single image using Gemini API with optional logo images."""
    # Build parts list - start with logos, then prompt
    parts = []

    # Add logo images if provided
    if logos:
        for logo_data, mime_type in logos:
            parts.append({
                "inlineData": {
                    "mimeType": mime_type,
                    "data": logo_data
                }
            })

    # Add text prompt
    parts.append({"text": prompt})

    response = requests.post(
        GEMINI_API_URL,
        headers={
            "x-goog-api-key": os.getenv("GEMINI_API_KEY"),
            "Content-Type": "application/json"
        },
        json={
            "contents": [{"parts": parts}],
            "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]}
        },
        timeout=90
    )

    if response.status_code != 200:
        logger.error(f"Gemini API error: {response.status_code} - {response.text}")
        return None

    for candidate in response.json().get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            if "inlineData" in part:
                mime = part["inlineData"].get("mimeType", "image/png")
                data = part["inlineData"]["data"]
                return f"data:{mime};base64,{data}"
    return None


@app.post("/api/generate-banner")
def generate_banner():
    payload = request.get_json(silent=True) or {}
    course_data = payload.get("courseData") or {}

    # Log the received JSON for debugging
    logger.info("=== GENERATE BANNER REQUEST ===")
    logger.info(json.dumps(course_data, indent=2, ensure_ascii=False))

    # Extract from correct structure: course_details, design_preferences, branding
    details = course_data.get("course_details", {})
    design = course_data.get("design_preferences", {})
    branding = course_data.get("branding", {})

    # Extract basic info for prompt
    title = details.get('title', 'קורס')
    description = details.get('description', '')[:100]

    # Load logo if available
    logos = []
    logo_info = branding.get("logo", {})
    logo_url = logo_info.get("url") if logo_info else None
    logo_name = logo_info.get("name", "Logo") if logo_info else None

    if logo_url:
        logo_data = load_logo_as_base64(logo_url)
        if logo_data:
            logos.append(logo_data)
            logger.info(f"Loaded logo: {logo_name} (converted to PNG)")

    # Build prompt with logo instructions
    logo_instruction = ""
    if logos:
        logo_instruction = f"""
LOGO INTEGRATION:
- Place the attached logo image in the TOP RIGHT corner of the banner
- Size the logo appropriately (visible but not dominant)
- Ensure good contrast - add subtle white/light background behind logo if needed
- The logo should look naturally integrated into the design
"""

    prompt = f"""Create a professional course banner image.

Topic: {title}
Context: {description}
{logo_instruction}
DESIGN REQUIREMENTS:
- Style: {design.get('aesthetic_style', 'modern professional')}
- Color scheme: {design.get('color_palette', 'professional colors')}
- Lighting: {design.get('lighting_and_atmosphere', 'bright and inviting')}
- 16:9 aspect ratio (1200x675)
- Do NOT include any text except the logo
- Leave space in upper area for title overlay (will be added later)
- Leave the BOTTOM 15% with darker gradient area for CTA overlay
- Beautiful, relevant imagery that represents the course topic
- Professional marketing aesthetic"""

    logger.info(f"=== PROMPT ===\n{prompt}")
    logger.info(f"Logos count: {len(logos)}")

    images = []
    for i in range(3):
        img = generate_single_image(f"{prompt}\n\nVariation {i+1}: unique style.", logos=logos)
        if img:
            images.append(img)
            logger.info(f"Generated image {i+1}")

    if not images:
        return jsonify({"success": False, "error": "Failed to generate images"}), 500

    return jsonify({
        "success": True,
        "images": images,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "courseData": course_data  # Return full data for future use
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
