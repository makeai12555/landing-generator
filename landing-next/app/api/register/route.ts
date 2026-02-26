// POST /api/register - Proxy registration to Apps Script (writes to course-specific Sheet)
export async function POST(req: Request) {
  const base = process.env.APPS_SCRIPT_URL;
  if (!base) {
    return Response.json({ success: false, error: "APPS_SCRIPT_URL missing" }, { status: 500 });
  }

  try {
    const body = await req.json();

    if (!body.sheetId) {
      return Response.json({ success: false, error: "Missing sheetId" }, { status: 400 });
    }

    // Forward to Apps Script with action: "register" and the course's sheetId
    const response = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register",
        sheetId: body.sheetId,
        landingId: body.landingId,
        fullName: body.fullName,
        phone: body.phone,
        email: body.email,
        referral: body.referral,
        notes: body.notes,
      }),
    });

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("Registration proxy error:", error);
    return Response.json({ success: false, error: "Failed to register" }, { status: 500 });
  }
}
