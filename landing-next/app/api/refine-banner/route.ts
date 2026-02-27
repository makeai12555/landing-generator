export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { GoogleGenAI } from "@google/genai";
import { Vibrant } from "node-vibrant/node";

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";

interface RefineRequest {
  imageDataUri: string; // "data:image/png;base64,..." OR a Vercel Blob URL
  instruction: string;  // Hebrew free-text instruction (e.g. "תכהה את הרקע")
  isBanner: boolean;    // true = banner with text, false = background (no text)
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

/**
 * Extract dominant colors from an image using node-vibrant
 */
async function extractColorsFromImage(imageBytes: Uint8Array): Promise<{
  primary: string;
  accent: string;
}> {
  try {
    const buffer = Buffer.from(imageBytes);
    const palette = await Vibrant.from(buffer).getPalette();

    // Use Vibrant as primary (bright, attention-grabbing)
    // Use DarkVibrant as accent (good for text, headers)
    const primary = palette.Vibrant?.hex || "#13ecda";
    const accent = palette.DarkVibrant?.hex || palette.Muted?.hex || "#1a1a2e";

    console.log("Extracted colors:", { primary, accent, fullPalette: Object.keys(palette) });

    return { primary, accent };
  } catch (error) {
    console.error("Failed to extract colors:", error);
    return { primary: "#13ecda", accent: "#1a1a2e" };
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ok: false, error: "GEMINI_API_KEY is missing" },
      { status: 500 }
    );
  }

  let body: RefineRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { imageDataUri, instruction, isBanner } = body;

  // Validate required fields
  if (!imageDataUri || typeof imageDataUri !== "string") {
    return Response.json(
      { ok: false, error: "Missing or invalid 'imageDataUri' in request body" },
      { status: 400 }
    );
  }
  if (!instruction || typeof instruction !== "string" || instruction.trim() === "") {
    return Response.json(
      { ok: false, error: "Missing or empty 'instruction' in request body" },
      { status: 400 }
    );
  }
  if (typeof isBanner !== "boolean") {
    return Response.json(
      { ok: false, error: "Missing or invalid 'isBanner' in request body — must be boolean" },
      { status: 400 }
    );
  }

  // Resolve image to base64 bytes + mimeType
  let mimeType: string;
  let base64String: string;

  try {
    if (imageDataUri.startsWith("data:")) {
      // Parse data URI: "data:<mimeType>;base64,<data>"
      const commaIdx = imageDataUri.indexOf(",");
      if (commaIdx === -1) {
        return Response.json(
          { ok: false, error: "Invalid data URI format" },
          { status: 400 }
        );
      }
      const meta = imageDataUri.substring(5, commaIdx); // strip "data:"
      const semicolonIdx = meta.indexOf(";");
      mimeType = semicolonIdx !== -1 ? meta.substring(0, semicolonIdx) : "image/png";
      base64String = imageDataUri.substring(commaIdx + 1);
    } else if (imageDataUri.startsWith("http")) {
      // Fetch from URL and convert to base64
      console.log("Fetching image from URL:", imageDataUri);
      const fetchResponse = await fetch(imageDataUri);
      if (!fetchResponse.ok) {
        return Response.json(
          { ok: false, error: `Failed to fetch image from URL: ${fetchResponse.status}` },
          { status: 400 }
        );
      }
      mimeType = fetchResponse.headers.get("Content-Type") || "image/png";
      // Strip any parameters (e.g. "image/png; charset=utf-8")
      mimeType = mimeType.split(";")[0].trim();
      const arrayBuffer = await fetchResponse.arrayBuffer();
      base64String = Buffer.from(arrayBuffer).toString("base64");
    } else {
      return Response.json(
        { ok: false, error: "imageDataUri must be a data URI or an http(s) URL" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Image resolution error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { ok: false, error: `Failed to resolve image: ${message}` },
      { status: 400 }
    );
  }

  // Build prompt based on whether this is a banner (with Hebrew text) or background (no text)
  const promptText = isBanner
    ? `Edit the following Hebrew course banner image according to this instruction: "${instruction.trim()}". CRITICAL: Preserve all existing Hebrew text exactly as it appears — do not change, remove, or alter any text. Only modify the visual aspects as instructed. Return the modified image.`
    : `Edit the following background image according to this instruction: "${instruction.trim()}". This is a background image with NO text. Do not add any text, letters, or characters. Only modify the visual aspects as instructed. Return the modified image.`;

  const client = new GoogleGenAI({ apiKey });

  try {
    console.log(`Refining ${isBanner ? "banner" : "background"} with instruction: ${instruction}`);

    const response = await client.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64String } },
            { text: promptText },
          ],
        },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const imageBytes = extractImageFromResponse(response);
    if (!imageBytes) {
      throw new Error(`No image returned from Gemini for refinement. Model: ${MODEL}`);
    }

    const refinedBase64 = Buffer.from(imageBytes).toString("base64");
    const refinedDataUri = `data:image/png;base64,${refinedBase64}`;

    // Extract colors only when refining a banner
    if (isBanner) {
      const colors = await extractColorsFromImage(imageBytes);
      return Response.json({
        ok: true,
        image: refinedDataUri,
        colors,
      });
    }

    return Response.json({
      ok: true,
      image: refinedDataUri,
    });
  } catch (error) {
    console.error("Refine banner error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { ok: false, error: message },
      { status: 502 }
    );
  }
}
