export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { GoogleGenAI } from "@google/genai";
import { createCanvas, loadImage, registerFont } from "canvas";
import { join } from "path";

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const ASPECT_RATIO = "16:9";

// Register Hebrew fonts
const fontsDir = join(process.cwd(), "public", "fonts");
try {
  registerFont(join(fontsDir, "NotoSansHebrew-Regular.ttf"), {
    family: "NotoSansHebrew",
  });
  registerFont(join(fontsDir, "NotoSansHebrew-Bold.ttf"), {
    family: "NotoSansHebrew",
    weight: "bold",
  });
} catch (e) {
  console.warn("Failed to register fonts:", e);
}

interface CourseData {
  title_en: string;
  subtitle_en: string;
  dates_en: string;
  time_en: string;
  day_en: string;
  location_en: string;
  duration_en: string;
  cta_en: string;
  title_he: string;
  subtitle_he: string;
  dates_he: string;
  time_he: string;
  day_he: string;
  location_he: string;
  duration_he: string;
  cta_he: string;
}

interface DesignPreferences {
  aesthetic_style?: string;
  color_palette?: string;
  lighting_and_atmosphere?: string;
}

interface ColorScheme {
  overlay: string;
  text: string;
  ctaOverlay: string;
  ctaText: string;
}

async function analyzeImageBrightness(imageBytes: Uint8Array): Promise<"light" | "dark"> {
  const image = await loadImage(Buffer.from(imageBytes));
  const width = image.width;
  const height = image.height;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);

  // Sample pixels from center area (where text will be placed)
  const centerX = Math.floor(width * 0.25);
  const centerY = Math.floor(height * 0.2);
  const sampleWidth = Math.floor(width * 0.5);
  const sampleHeight = Math.floor(height * 0.6);

  const imageData = ctx.getImageData(centerX, centerY, sampleWidth, sampleHeight);
  const data = imageData.data;

  let totalBrightness = 0;
  let pixelCount = 0;

  // Sample every 10th pixel for performance
  for (let i = 0; i < data.length; i += 40) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Calculate perceived brightness (human eye is more sensitive to green)
    const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
    totalBrightness += brightness;
    pixelCount++;
  }

  const avgBrightness = totalBrightness / pixelCount;
  console.log(`Image brightness analysis: ${avgBrightness.toFixed(1)} (threshold: 128)`);

  return avgBrightness > 128 ? "light" : "dark";
}

function getColorScheme(brightness: "light" | "dark"): ColorScheme {
  if (brightness === "light") {
    // Light background → use light overlay with dark text
    return {
      overlay: "rgba(255, 255, 255, 0.85)",
      text: "#1a1a2e",
      ctaOverlay: "rgba(37, 99, 235, 0.95)",
      ctaText: "#FFFFFF",
    };
  } else {
    // Dark background → use dark overlay with light text
    return {
      overlay: "rgba(0, 0, 0, 0.7)",
      text: "#FFFFFF",
      ctaOverlay: "rgba(37, 99, 235, 0.95)",
      ctaText: "#FFFFFF",
    };
  }
}

function extractImageFromResponse(response: unknown): Uint8Array | null {
  const resp = response as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: {
            mimeType?: string;
            data?: string;
          };
        }>;
      };
    }>;
  };

  const parts = resp.candidates?.[0]?.content?.parts;
  if (!parts) return null;

  for (const part of parts) {
    if (part.inlineData?.data) {
      const base64 = part.inlineData.data;
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
  }
  return null;
}

// Map Hebrew design preferences to English descriptions
const STYLE_MAP: Record<string, string> = {
  minimalist: "minimalist, clean, lots of white space",
  modern_tech: "modern tech, sleek, digital",
  luxury: "luxury, elegant, premium feel",
  retro: "retro, vintage, nostalgic",
  playful: "playful, colorful, fun",
};

const COLOR_MAP: Record<string, string> = {
  brand_colors: "professional brand colors",
  light_airy: "light, airy, white and soft pastels",
  dark_mode: "dark, dramatic, deep colors",
  pastel: "soft pastel colors",
  vibrant: "vibrant, bold, saturated colors",
};

const LIGHTING_MAP: Record<string, string> = {
  natural_light: "natural daylight, bright and clear",
  studio: "studio lighting, professional",
  warm: "warm, cozy, golden tones",
  neon: "neon, futuristic, glowing",
  soft: "soft, diffused, gentle",
};

async function generateCleanBackground(
  client: GoogleGenAI,
  courseTitle: string,
  courseDescription: string,
  design?: DesignPreferences
): Promise<Uint8Array> {
  // Build dynamic design instructions based on course topic and preferences
  const style = STYLE_MAP[design?.aesthetic_style || "modern_tech"] || "modern professional";
  const colors = COLOR_MAP[design?.color_palette || "light_airy"] || "professional colors";
  const lighting = LIGHTING_MAP[design?.lighting_and_atmosphere || "natural_light"] || "bright and inviting";

  const prompt = `
Create a beautiful, professional 16:9 background image for a course banner.

Topic: "${courseTitle}"
Context: "${courseDescription}"

Design style:
- ${style} aesthetic
- ${colors}
- ${lighting}
- subtle depth, soft shadows, crisp edges
- use imagery that FITS THE COURSE TOPIC (${courseTitle})

CRITICAL RULES:
- DO NOT include ANY text, letters, words, numbers, or typography
- DO NOT include any buttons, UI elements, labels, or overlays with text
- Create ONLY a pure visual background image with NO TEXT whatsoever
- The image should represent the course topic through imagery alone
- Leave clean space in center area where text will be added later
- Consider composition: darker/blurred areas in center work well for text overlay
- Make it visually appealing and professional
- Absolutely NO text of any kind - this is a background only
`;

  const response = await client.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio: ASPECT_RATIO },
    },
  });

  console.log("Gemini response:", JSON.stringify(response, null, 2));

  const imageBytes = extractImageFromResponse(response);
  if (!imageBytes) {
    throw new Error(`No image returned from background generation. Model: ${MODEL}`);
  }
  return imageBytes;
}

interface TextPosition {
  x: number;
  y: number;
  fontSize: number;
  fontWeight: string;
  maxWidth: number;
}

function getTextPositions(width: number, height: number): {
  title: TextPosition;
  subtitle: TextPosition;
  info: TextPosition;
  cta: TextPosition;
} {
  return {
    title: {
      x: width / 2,
      y: height * 0.28,
      fontSize: Math.round(height * 0.08),
      fontWeight: "bold",
      maxWidth: width * 0.85,
    },
    subtitle: {
      x: width / 2,
      y: height * 0.42,
      fontSize: Math.round(height * 0.045),
      fontWeight: "normal",
      maxWidth: width * 0.8,
    },
    info: {
      x: width / 2,
      y: height * 0.58,
      fontSize: Math.round(height * 0.032),
      fontWeight: "normal",
      maxWidth: width * 0.9,
    },
    cta: {
      x: width / 2,
      y: height * 0.75,
      fontSize: Math.round(height * 0.045),
      fontWeight: "bold",
      maxWidth: width * 0.4,
    },
  };
}

async function renderHebrewText(
  imageBytes: Uint8Array,
  course: CourseData,
  colors: ColorScheme
): Promise<Buffer> {
  const image = await loadImage(Buffer.from(imageBytes));
  const width = image.width;
  const height = image.height;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);

  const positions = getTextPositions(width, height);

  const titleText = course.title_he;
  const subtitleText = course.subtitle_he;
  const infoText = `תאריכים: ${course.dates_he} | שעות: ${course.time_he} | יום: ${course.day_he} | מיקום: ${course.location_he} | משך: ${course.duration_he}`;
  const ctaText = course.cta_he;

  const drawTextWithCover = (
    text: string,
    pos: TextPosition,
    bgColor: string,
    textColor: string
  ) => {
    ctx.font = `${pos.fontWeight} ${pos.fontSize}px NotoSansHebrew`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const metrics = ctx.measureText(text);
    const textWidth = Math.min(metrics.width, pos.maxWidth);
    const textHeight = pos.fontSize * 1.4;
    const padding = pos.fontSize * 0.4;

    // Draw rounded rectangle background
    const rx = pos.x - textWidth / 2 - padding;
    const ry = pos.y - textHeight / 2 - padding / 2;
    const rw = textWidth + padding * 2;
    const rh = textHeight + padding;
    const radius = 8;

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.moveTo(rx + radius, ry);
    ctx.lineTo(rx + rw - radius, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
    ctx.lineTo(rx + rw, ry + rh - radius);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
    ctx.lineTo(rx + radius, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
    ctx.lineTo(rx, ry + radius);
    ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
    ctx.closePath();
    ctx.fill();

    // Draw Hebrew text
    ctx.fillStyle = textColor;
    ctx.fillText(text, pos.x, pos.y, pos.maxWidth);
  };

  drawTextWithCover(titleText, positions.title, colors.overlay, colors.text);
  drawTextWithCover(subtitleText, positions.subtitle, colors.overlay, colors.text);
  drawTextWithCover(infoText, positions.info, colors.overlay, colors.text);
  drawTextWithCover(ctaText, positions.cta, colors.ctaOverlay, colors.ctaText);

  return canvas.toBuffer("image/png");
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ok: false, error: "GEMINI_API_KEY is missing", details: null },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body", details: null },
      { status: 400 }
    );
  }

  const course: CourseData = (body as { course?: CourseData })
    .course as CourseData;
  if (!course) {
    return Response.json(
      { ok: false, error: "Missing 'course' in request body", details: null },
      { status: 400 }
    );
  }

  const design: DesignPreferences | undefined = (body as { design?: DesignPreferences }).design;

  const client = new GoogleGenAI({ apiKey });

  try {
    console.log("Generating clean background for:", course.title_en);
    console.log("Design preferences:", design);
    const backgroundBytes = await generateCleanBackground(
      client,
      course.title_en,
      course.subtitle_en,
      design
    );

    console.log("Analyzing background brightness...");
    const brightness = await analyzeImageBrightness(backgroundBytes);
    const colors = getColorScheme(brightness);
    console.log(`Background is ${brightness}, using ${brightness === "light" ? "light overlay + dark text" : "dark overlay + light text"}`);

    console.log("Rendering Hebrew text on background...");
    const finalImage = await renderHebrewText(backgroundBytes, course, colors);

    return new Response(new Uint8Array(finalImage), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'inline; filename="banner.png"',
      },
    });
  } catch (error) {
    console.error("Banner generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const details = error instanceof Error ? error.stack ?? null : null;
    return Response.json(
      { ok: false, error: message, details },
      { status: 502 }
    );
  }
}
