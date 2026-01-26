import os
import json
import logging
import base64
import uuid
from pathlib import Path
from datetime import datetime, timezone
from io import BytesIO

from google import genai
from google.genai import types
from PIL import Image
from colorthief import ColorThief

# Try to import Wand for SVG support
try:
    from wand.image import Image as WandImage
    HAS_WAND = True
except ImportError:
    HAS_WAND = False

from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify

load_dotenv()
assert os.getenv("GEMINI_API_KEY"), "GEMINI_API_KEY is missing!"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Gemini model for image generation
MODEL = "gemini-3-pro-image-preview"


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


def load_logo_as_pil(logo_url: str) -> Image.Image | None:
    """Load logo file and return PIL Image. Converts SVG to PNG."""
    logo_data = load_logo_as_base64(logo_url)
    if not logo_data:
        return None

    b64_data, _ = logo_data
    image_bytes = base64.b64decode(b64_data)
    return Image.open(BytesIO(image_bytes))


def extract_palette_from_image(base64_data: str) -> dict | None:
    """Extract dominant colors from base64 image data."""
    try:
        image_data = base64.b64decode(base64_data)
        color_thief = ColorThief(BytesIO(image_data))

        dominant = color_thief.get_color(quality=1)
        palette = color_thief.get_palette(color_count=5, quality=1)

        def rgb_to_hex(rgb):
            return '#{:02x}{:02x}{:02x}'.format(*rgb)

        return {
            "primary": rgb_to_hex(palette[0]),
            "accent": rgb_to_hex(palette[1]),
            "background": rgb_to_hex(palette[2]),
            "text": rgb_to_hex(dominant),
            "palette": [rgb_to_hex(c) for c in palette]
        }
    except Exception as e:
        logger.error(f"Failed to extract palette: {e}")
        return None


def extract_image_from_response(response) -> Image.Image | None:
    """Extract PIL Image from Gemini response."""
    parts = getattr(response, "parts", None)
    if parts is None and hasattr(response, "candidates"):
        try:
            parts = response.candidates[0].content.parts
        except Exception:
            parts = []

    for part in parts or []:
        try:
            # Get raw bytes from inline_data and convert to PIL Image
            if hasattr(part, "inline_data") and part.inline_data:
                img_bytes = part.inline_data.data
                return Image.open(BytesIO(img_bytes))
        except Exception as e:
            logger.error(f"Error extracting image: {e}")
            continue
    return None


def image_to_base64_url(img: Image.Image) -> str:
    """Convert PIL Image to data URL."""
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def build_background_prompt(course_data: dict) -> str:
    """Build prompt for clean background image (no text)."""
    details = course_data.get("course_details", {})
    design = course_data.get("design_preferences", {})

    title = details.get('title', 'Course')
    description = details.get('description', '')[:100]

    return f"""Create a beautiful, professional background image for a course landing page.

TOPIC: {title}
CONTEXT: {description}

DESIGN REQUIREMENTS:
- Style: {design.get('aesthetic_style', 'modern professional')}
- Color scheme: {design.get('color_palette', 'professional colors')}
- Lighting: {design.get('lighting_and_atmosphere', 'bright and inviting')}
- 16:9 aspect ratio

CRITICAL RULES:
- DO NOT include ANY text, letters, words, or typography
- DO NOT include any buttons, UI elements, or overlays
- Create ONLY a pure visual background image
- The image should represent the course topic through imagery alone
- Leave space for text to be overlaid later (consider composition)
- Make it visually appealing and professional
- Soft focus or gradient areas are good for text placement
"""


def build_english_prompt(course_data: dict, has_logo: bool) -> str:
    """Build the English prompt for step 1 (locks composition)."""
    details = course_data.get("course_details", {})
    design = course_data.get("design_preferences", {})

    title = details.get('title', 'Course')
    description = details.get('description', '')[:100]

    logo_instruction = ""
    if has_logo:
        logo_instruction = """
LOGO INTEGRATION:
- Place the attached logo image in the TOP RIGHT corner of the banner
- Size the logo appropriately (visible but not dominant)
- Ensure good contrast - add subtle white/light background behind logo if needed
- The logo should look naturally integrated into the design
"""

    return f"""Create a professional course banner image.

Topic: {title}
Context: {description}
{logo_instruction}
DESIGN REQUIREMENTS:
- Style: {design.get('aesthetic_style', 'modern professional')}
- Color scheme: {design.get('color_palette', 'professional colors')}
- Lighting: {design.get('lighting_and_atmosphere', 'bright and inviting')}
- 16:9 aspect ratio (1200x675)

TEXT TO INCLUDE (in English for now - will be translated):
- TITLE (large, prominent): "{title}"
- SUBTITLE (smaller): "{description[:60]}..."
- INFO LINE (small): "Dates | Time | Location | Duration"
- BUTTON (call to action): "Register Now"

LAYOUT:
- Title and subtitle in upper area with semi-transparent dark overlay
- Info line in middle area
- Button/CTA at bottom with gradient background
- Beautiful, relevant imagery that represents the course topic
- Professional marketing aesthetic
"""


def build_hebrew_edit_prompt(course_data: dict) -> str:
    """Build the Hebrew edit prompt for step 2."""
    details = course_data.get("course_details", {})

    title = details.get("title", "קורס")
    description = details.get("description", "")[:80]
    dates = details.get("schedule", {}).get("dates", "")
    time = details.get("schedule", {}).get("time", "")
    days = details.get("schedule", {}).get("days", "")
    location = details.get("location", "")
    duration = details.get("duration", "")

    return f"""
TASK:
You are given an existing banner image.
Replace ALL visible English text with Hebrew text ONLY.
Do NOT change layout, colors, background photo, shapes, spacing, shadows, or composition.
Only change the text. Keep everything else pixel-identical.

TYPOGRAPHY + RTL RULES (VERY IMPORTANT):
- Hebrew must be proper RTL. Do not reverse letters.
- Keep the same hierarchy: title > subtitle > info > button.
- Keep the same font style/weight/size as close as possible.
- Keep all text sharp and readable.
- For Latin tech terms, keep them in English inside the Hebrew text.

HEBREW TEXT (use exactly):

TITLE:
"{title}"

SUBTITLE:
"{description}"

INFO LINE:
"תאריכים: {dates} | שעות: {time} | יום: {days} | מיקום: {location} | משך: {duration}"

BUTTON:
"להרשמה עכשיו"

FINAL CHECK:
- No English remains except tech terms.
- Numbers stay in the same format.
- Hebrew reads naturally RTL.
"""


def generate_banner_with_hebrew(course_data: dict, logo_img: Image.Image | None = None) -> dict | None:
    """Generate banner using 3-step approach: clean background -> EN banner -> HE edit.

    Returns dict with:
        - banner: Hebrew banner (full with text)
        - background: Clean image without text (for landing page hero)
    """

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    # Step 0: Create clean background (no text) for landing page
    logger.info("Step 0: Creating clean background image...")

    prompt_bg = build_background_prompt(course_data)

    response_bg = client.models.generate_content(
        model=MODEL,
        contents=[types.Content(parts=[types.Part(text=prompt_bg)])],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(aspect_ratio="16:9"),
        ),
    )

    img_bg = extract_image_from_response(response_bg)
    background_url = None

    if img_bg:
        background_url = image_to_base64_url(img_bg)
        logger.info("Step 0 complete: Clean background generated")
    else:
        logger.warning("Failed to generate clean background, will use EN banner as fallback")

    # Step 1: Create EN banner (locks composition)
    logger.info("Step 1: Creating English banner...")

    prompt_en = build_english_prompt(course_data, has_logo=logo_img is not None)

    # Build parts list for EN generation
    parts_en = []
    if logo_img:
        # Convert PIL image to bytes for inline_data
        buf = BytesIO()
        logo_img.save(buf, format="PNG")
        logo_bytes = buf.getvalue()
        parts_en.append(types.Part(inline_data=types.Blob(mime_type="image/png", data=logo_bytes)))

    parts_en.append(types.Part(text=prompt_en))

    logger.info(f"Sending EN prompt with {len(parts_en)} parts")

    response_en = client.models.generate_content(
        model=MODEL,
        contents=[types.Content(parts=parts_en)],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(aspect_ratio="16:9"),
        ),
    )

    img_en = extract_image_from_response(response_en)

    if not img_en:
        logger.error("Failed to generate English banner")
        return None

    logger.info("Step 1 complete: English banner generated")

    # Use EN banner as fallback background if clean background failed
    if not background_url:
        background_url = image_to_base64_url(img_en)

    # Step 2: Edit to Hebrew
    logger.info("Step 2: Editing to Hebrew...")

    # Convert EN image to bytes
    buf_en = BytesIO()
    img_en.save(buf_en, format="PNG")
    img_en_bytes = buf_en.getvalue()

    prompt_he = build_hebrew_edit_prompt(course_data)

    # Build parts for HE edit: image first, then text
    image_part = types.Part(inline_data=types.Blob(mime_type="image/png", data=img_en_bytes))
    text_part = types.Part(text=prompt_he)

    response_he = client.models.generate_content(
        model=MODEL,
        contents=[types.Content(parts=[image_part, text_part])],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(aspect_ratio="16:9"),
        ),
    )

    img_he = extract_image_from_response(response_he)

    if not img_he:
        logger.error("Failed to edit to Hebrew, returning English version for both")
        return {
            "banner": background_url,
            "background": background_url
        }

    logger.info("Step 2 complete: Hebrew banner generated")
    return {
        "banner": image_to_base64_url(img_he),
        "background": background_url
    }


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


@app.post("/api/generate-banner")
def generate_banner():
    payload = request.get_json(silent=True) or {}
    course_data = payload.get("courseData") or {}

    # Log the received JSON for debugging
    logger.info("=== GENERATE BANNER REQUEST ===")
    logger.info(json.dumps(course_data, indent=2, ensure_ascii=False))

    # Extract branding info
    branding = course_data.get("branding", {})
    logo_info = branding.get("logo", {})
    logo_url = logo_info.get("url") if logo_info else None
    logo_name = logo_info.get("name", "Logo") if logo_info else None

    # Load logo as PIL Image
    logo_img = None
    if logo_url:
        logo_img = load_logo_as_pil(logo_url)
        if logo_img:
            logger.info(f"Loaded logo: {logo_name}")
        else:
            logger.warning(f"Failed to load logo: {logo_url}")

    # Generate banners (currently just 1 variation with 2-step approach)
    try:
        result = generate_banner_with_hebrew(course_data, logo_img)
        if not result:
            return jsonify({"success": False, "error": "Failed to generate images"}), 500
        logger.info("Generated Hebrew banner successfully")
    except Exception as e:
        logger.error(f"Banner generation failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

    # Extract color palette from banner
    extracted_colors = None
    banner_data = result["banner"].split(",")[1] if "," in result["banner"] else result["banner"]
    extracted_colors = extract_palette_from_image(banner_data)
    if extracted_colors:
        logger.info(f"Extracted colors: {extracted_colors}")

    return jsonify({
        "success": True,
        "images": [result["banner"]],  # Keep array for backward compatibility
        "background_url": result["background"],  # English image for landing page
        "extracted_colors": extracted_colors,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "courseData": course_data
    })


# In-memory storage for landing pages (will be replaced with DB later)
landing_pages = {}


@app.get("/landing-config")
def landing_config():
    """Step 2: Landing page configuration."""
    return render_template("landing_config.html")


@app.post("/api/create-landing")
def create_landing():
    """Create a landing page from course data."""
    payload = request.get_json(silent=True) or {}
    course_data = payload.get("courseData") or {}

    logger.info("=== CREATE LANDING PAGE ===")
    logger.info(json.dumps(course_data, indent=2, ensure_ascii=False))

    # Generate unique ID
    landing_id = str(uuid.uuid4())[:8]

    # Extract data for Apps Script
    details = course_data.get("course_details", {})
    assets = course_data.get("generated_assets", {})
    branding = course_data.get("branding", {})
    landing_config = course_data.get("landing_config", {})
    colors = branding.get("theme", {}).get("colors", {})

    # Build landing data for Apps Script
    landing_data = {
        "action": "createLanding",
        "id": landing_id,
        "course": {
            "title": details.get("title", ""),
            "description": details.get("description", ""),
            "extendedDescription": landing_config.get("extended_description", ""),
            "schedule": details.get("schedule", {}),
            "location": details.get("location", ""),
            "duration": details.get("duration", ""),
            "targetAudience": details.get("target_audience", ""),
        },
        "assets": {
            "backgroundUrl": assets.get("background_url", ""),
            "bannerUrl": assets.get("banner_url", ""),
        },
        "theme": {
            "primary": colors.get("primary", "#FFD700"),
            "accent": colors.get("accent", "#1a1a2e"),
        },
        "form": {
            "requiresInterview": landing_config.get("requires_interview", False),
            "referralOptions": landing_config.get("referral_options", []),
        },
    }

    # Send to Apps Script
    apps_script_url = os.environ.get("APPS_SCRIPT_URL")
    if apps_script_url:
        try:
            resp = requests.post(
                apps_script_url,
                json=landing_data,
                headers={"Content-Type": "application/json"},
                timeout=30,
            )
            result = resp.json()
            logger.info(f"Apps Script response: {result}")
            if not result.get("success"):
                logger.error(f"Apps Script error: {result}")
        except Exception as e:
            logger.error(f"Failed to send to Apps Script: {e}")

    # Also store locally for Flask landing page fallback
    landing_pages[landing_id] = {
        "course_data": course_data,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    logger.info(f"Created landing page: {landing_id}")

    # Return URL to Next.js landing page
    nextjs_base = os.environ.get("NEXTJS_BASE_URL", "http://localhost:3000")
    return jsonify({
        "success": True,
        "landingId": landing_id,
        "url": f"{nextjs_base}/l/{landing_id}",
    })


@app.get("/landing/<landing_id>")
def view_landing(landing_id: str):
    """View a landing page."""
    # Try to get from in-memory storage
    landing_data = landing_pages.get(landing_id)

    if not landing_data:
        # For demo: return empty template with message
        return render_template(
            "landing.html",
            landing_id=landing_id,
            course={
                "title": "דף לא נמצא",
                "description": "דף הנחיתה לא נמצא. ייתכן שפג תוקפו.",
                "schedule": {},
            },
            background_url=None,
            colors={},
            requires_interview=False,
            referral_options=[],
        )

    course_data = landing_data["course_data"]
    details = course_data.get("course_details", {})
    assets = course_data.get("generated_assets", {})
    branding = course_data.get("branding", {})
    landing_config = course_data.get("landing_config", {})

    # Extract colors from theme
    colors = branding.get("theme", {}).get("colors", {})

    return render_template(
        "landing.html",
        landing_id=landing_id,
        course={
            "title": details.get("title", ""),
            "description": details.get("description", ""),
            "duration": details.get("duration", ""),
            "target_audience": details.get("target_audience", ""),
            "location": details.get("location", ""),
            "schedule": details.get("schedule", {}),
        },
        background_url=assets.get("background_url"),
        colors=colors,
        extended_description=landing_config.get("extended_description", ""),
        requires_interview=landing_config.get("requires_interview", False),
        referral_options=landing_config.get("referral_options", ["חבר/ה", "פייסבוק", "גוגל", "אחר"]),
    )


@app.post("/api/register")
def register():
    """Handle registration form submission (placeholder)."""
    data = request.get_json(silent=True) or {}

    logger.info("=== REGISTRATION RECEIVED ===")
    logger.info(json.dumps(data, indent=2, ensure_ascii=False))

    # For now, just log and return success
    # Later: save to Google Sheets
    return jsonify({
        "success": True,
        "message": "Registration received",
        "data": data,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
