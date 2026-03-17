/**
 * CourseFlow - End of Course Automation
 *
 * Runs daily via time-driven trigger.
 * 1. Sends feedback form to instructor when course ends (immediate)
 * 2. Sends follow-up email 30 days after course ends with link to
 *    registration sheet to update placement status
 */

const ADMIN_SHEET_ID = "1AUYdi_KCY96zPLD9l5wDpjk3GOuCSCFhbVfnv6bWnoI";
const TEMPLATE_FORM_ID = "1IfuiESooYh0NprRXq5VZ4iM1xOsj1xvOioAn75Mqmes";
const FOLLOWUP_DAYS = 30;

// Column indices (0-based)
const COL = {
  CREATED:       0, // A - תאריך יצירה
  TITLE:         1, // B - שם הקורס
  DESC:          2, // C - תיאור
  INSTRUCTOR:    3, // D - מדריך (email)
  DATES:         4, // E - תאריכים (YYYY-MM-DD - YYYY-MM-DD)
  LOCATION:      5, // F - מיקום
  DURATION:      6, // G - משך
  AUDIENCE:      7, // H - קהל יעד
  LANDING:       8, // I - דף נחיתה
  SHEET_URL:     9, // J - שיטס נרשמים
  FORM_SENT:    10, // K - טופס נשלח
  FOLLOWUP_SENT:11, // L - מייל מעקב נשלח
};

// =============================================
// MAIN - runs daily via trigger
// =============================================

function checkAndSendForms() {
  const sheet = SpreadsheetApp.openById(ADMIN_SHEET_ID).getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const instructorEmail = row[COL.INSTRUCTOR];
    const datesStr = row[COL.DATES];

    if (!instructorEmail || !datesStr) continue;

    const endDateStr = String(datesStr).split(" - ")[1];
    if (!endDateStr) continue;

    const endDate = new Date(endDateStr.trim());
    endDate.setHours(0, 0, 0, 0);

    const courseTitle = row[COL.TITLE];

    // --- End-of-course form (immediate after end date) ---
    if (!row[COL.FORM_SENT] && endDate <= today) {
      try {
        const formUrl = duplicateAndGetFormUrl(courseTitle);
        sendFormEmail(instructorEmail, courseTitle, formUrl);
        markCell(sheet, i + 1, COL.FORM_SENT);
        Logger.log("Sent end-of-course form for: " + courseTitle);
      } catch (e) {
        Logger.log("Error (form) for '" + courseTitle + "': " + e.message);
      }
    }

    // --- Follow-up email (30 days after end date) ---
    if (!row[COL.FOLLOWUP_SENT] && row[COL.SHEET_URL]) {
      const followupDate = new Date(endDate);
      followupDate.setDate(followupDate.getDate() + FOLLOWUP_DAYS);

      if (followupDate <= today) {
        try {
          sendFollowupEmail(instructorEmail, courseTitle, row[COL.SHEET_URL]);
          markCell(sheet, i + 1, COL.FOLLOWUP_SENT);
          Logger.log("Sent follow-up email for: " + courseTitle);
        } catch (e) {
          Logger.log("Error (followup) for '" + courseTitle + "': " + e.message);
        }
      }
    }
  }
}

// =============================================
// END-OF-COURSE FORM
// =============================================

function duplicateAndGetFormUrl(courseTitle) {
  const templateFile = DriveApp.getFileById(TEMPLATE_FORM_ID);
  const copy = templateFile.makeCopy("טופס סיום - " + courseTitle);

  const parentFolders = templateFile.getParents();
  if (parentFolders.hasNext()) {
    const folder = parentFolders.next();
    folder.addFile(copy);
    DriveApp.getRootFolder().removeFile(copy);
  }

  const form = FormApp.openById(copy.getId());
  return form.getPublishedUrl();
}

function sendFormEmail(email, courseTitle, formUrl) {
  const subject = "טופס סיום קורס - " + courseTitle;
  const body = [
    "שלום רב,",
    "",
    'הקורס "' + courseTitle + '" הסתיים.',
    "נשמח אם תמלא/י את טופס הסיום בלינק הבא:",
    "",
    formUrl,
    "",
    "תודה רבה,",
    "צוות אגף הנוער ירושלים"
  ].join("\n");

  const htmlBody = [
    '<div dir="rtl" style="font-family: Arial, sans-serif; font-size: 14px;">',
    "<p>שלום רב,</p>",
    '<p>הקורס "<strong>' + courseTitle + '</strong>" הסתיים.</p>',
    "<p>נשמח אם תמלא/י את טופס הסיום בלינק הבא:</p>",
    '<p><a href="' + formUrl + '">מלא/י טופס סיום קורס</a></p>',
    "<p>תודה רבה,<br>צוות אגף הנוער ירושלים</p>",
    "</div>"
  ].join("");

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body,
    htmlBody: htmlBody,
  });
}

// =============================================
// FOLLOW-UP EMAIL (30 days after course end)
// =============================================

function sendFollowupEmail(email, courseTitle, sheetUrl) {
  const subject = "מעקב השמה - " + courseTitle;
  const body = [
    "שלום רב,",
    "",
    'חודש חלף מאז סיום הקורס "' + courseTitle + '".',
    "נבקש לעדכן את טבלת הנרשמים - מי הושם לעבודה ולאן.",
    "",
    "קישור לטבלה:",
    sheetUrl,
    "",
    'יש למלא את העמודות "הושם (כן/לא)" ו-"הושם לאן" עבור כל משתתף.',
    "",
    "תודה רבה,",
    "צוות אגף הנוער ירושלים"
  ].join("\n");

  const htmlBody = [
    '<div dir="rtl" style="font-family: Arial, sans-serif; font-size: 14px;">',
    "<p>שלום רב,</p>",
    '<p>חודש חלף מאז סיום הקורס "<strong>' + courseTitle + '</strong>".</p>',
    "<p>נבקש לעדכן את טבלת הנרשמים - מי הושם לעבודה ולאן.</p>",
    '<p><a href="' + sheetUrl + '">פתח/י את טבלת הנרשמים</a></p>',
    '<p>יש למלא את העמודות "<strong>הושם (כן/לא)</strong>" ו-"<strong>הושם לאן</strong>" עבור כל משתתף.</p>',
    "<p>תודה רבה,<br>צוות אגף הנוער ירושלים</p>",
    "</div>"
  ].join("");

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body,
    htmlBody: htmlBody,
  });
}

// =============================================
// HELPERS
// =============================================

function markCell(sheet, rowNumber, colIndex) {
  const now = Utilities.formatDate(new Date(), "Asia/Jerusalem", "dd/MM/yyyy HH:mm");
  sheet.getRange(rowNumber, colIndex + 1).setValue("כן - " + now);
}

/**
 * One-time setup: create a daily trigger at 9:00 AM Israel time.
 * Run this function manually once from the Apps Script editor.
 */
function createDailyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === "checkAndSendForms") {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger("checkAndSendForms")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .inTimezone("Asia/Jerusalem")
    .create();

  Logger.log("Daily trigger created - will run at 9:00 AM Israel time");
}
