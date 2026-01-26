import { readFile } from "fs/promises";
import { join } from "path";

// GET /api/landing/[id] - Fetch from local file or Google Apps Script
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // First, try to load from local file (fallback storage)
  try {
    const filePath = join(process.cwd(), "data", "landings", `${id}.json`);
    const fileContent = await readFile(filePath, "utf-8");
    const landing = JSON.parse(fileContent);
    console.log(`Loaded landing from local file: ${id}`);
    return Response.json(landing);
  } catch {
    console.log(`Landing ${id} not found locally, trying Apps Script...`);
  }

  // Fallback to Apps Script
  const base = process.env.APPS_SCRIPT_URL;
  if (!base) {
    console.error("APPS_SCRIPT_URL missing and no local file found");
    return new Response("Not Found", { status: 404 });
  }

  const url = new URL(base);
  url.searchParams.set("action", "getLanding");
  url.searchParams.set("id", id);

  try {
    const r = await fetch(url.toString(), { cache: "no-store" });
    const data = await r.json();

    if (!data?.success) {
      console.error(`Apps Script returned no success for ${id}:`, data);
      return new Response("Not Found", { status: 404 });
    }

    return Response.json(data.landing);
  } catch (error) {
    console.error(`Failed to fetch from Apps Script:`, error);
    return new Response("Not Found", { status: 404 });
  }
}
