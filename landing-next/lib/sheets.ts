import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
];

// Owner email — all sheets are shared with this account
const OWNER_EMAIL = "makeai12555@gmail.com";

function getAuth() {
  const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyBase64) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not set");

  const keyJson = JSON.parse(Buffer.from(keyBase64, "base64").toString("utf8"));

  return new google.auth.GoogleAuth({
    credentials: keyJson,
    scopes: SCOPES,
  });
}

/**
 * Create a new Google Sheet for a course's registrations.
 * Uses Apps Script (running under owner account) since the Service Account
 * has no Drive storage quota and cannot create files.
 */
export async function createCourseSheet(
  courseTitle: string,
  landingId: string,
  instructorEmail?: string
): Promise<{ sheetId: string; sheetUrl: string }> {
  const scriptUrl = process.env.SHEETS_SCRIPT_URL;
  if (!scriptUrl) throw new Error("SHEETS_SCRIPT_URL not set");

  const res = await fetch(scriptUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "createSheet",
      title: courseTitle,
      instructorEmail,
    }),
  });

  const result = await res.json();
  if (!result.success) {
    throw new Error(`Apps Script error: ${result.error}`);
  }

  console.log(`Created course sheet: ${result.sheetId} for "${courseTitle}"`);
  return { sheetId: result.sheetId, sheetUrl: result.sheetUrl };
}

/**
 * Append a registration row to a course's Google Sheet.
 */
export async function addRegistration(
  sheetId: string,
  data: {
    fullName: string;
    phone: string;
    email: string;
    referral: string;
    notes?: string;
  }
): Promise<{ success: boolean }> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const now = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "נרשמים!A:F",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [now, data.fullName, data.phone, data.email, data.referral, data.notes || ""],
      ],
    },
  });

  console.log(`Added registration to sheet ${sheetId}: ${data.fullName}`);
  return { success: true };
}

/**
 * Log course details to the admin master sheet.
 */
export async function logCourseToAdminSheet(courseData: {
  title: string;
  description: string;
  instructorEmail: string;
  dates?: string;
  location?: string;
  duration?: string;
  targetAudience?: string;
  landingUrl: string;
  sheetUrl: string;
}): Promise<void> {
  const adminSheetId = process.env.ADMIN_SHEET_ID;
  if (!adminSheetId) {
    console.error("ADMIN_SHEET_ID not set, skipping admin sheet logging");
    return;
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  // Check if header row exists, add if not
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: adminSheetId,
    range: "A1:J1",
  });

  if (!existing.data.values || existing.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: adminSheetId,
      range: "A1:J1",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            "תאריך יצירה",
            "שם הקורס",
            "תיאור",
            "מדריך",
            "תאריכים",
            "מיקום",
            "משך",
            "קהל יעד",
            "דף נחיתה",
            "שיטס נרשמים",
          ],
        ],
      },
    });
  }

  const now = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });

  await sheets.spreadsheets.values.append({
    spreadsheetId: adminSheetId,
    range: "A:J",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [
          now,
          courseData.title,
          courseData.description,
          courseData.instructorEmail,
          courseData.dates || "",
          courseData.location || "",
          courseData.duration || "",
          courseData.targetAudience || "",
          courseData.landingUrl,
          courseData.sheetUrl,
        ],
      ],
    },
  });

  console.log(`Logged course "${courseData.title}" to admin sheet`);
}
