import { addRegistration } from "@/lib/sheets";

// POST /api/register - Write registration directly to course's Google Sheet
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.sheetId) {
      return Response.json({ success: false, error: "Missing sheetId" }, { status: 400 });
    }

    const result = await addRegistration(body.sheetId, {
      fullName: body.fullName,
      phone: body.phone,
      email: body.email,
      referral: body.referral,
      notes: body.notes,
    });

    return Response.json(result);
  } catch (error) {
    console.error("Registration error:", error);
    return Response.json({ success: false, error: "Failed to register" }, { status: 500 });
  }
}
