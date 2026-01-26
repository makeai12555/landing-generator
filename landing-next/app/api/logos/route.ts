import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

// GET /api/logos - Return logos library
export async function GET() {
  try {
    const logosPath = join(process.cwd(), "public", "brand", "logos.json");
    const logosData = await readFile(logosPath, "utf-8");
    const logos = JSON.parse(logosData);

    return NextResponse.json(logos);
  } catch (error) {
    console.error("Failed to load logos:", error);
    return NextResponse.json(
      { error: "Failed to load logos library" },
      { status: 500 }
    );
  }
}
