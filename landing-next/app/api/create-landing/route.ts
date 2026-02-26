import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { saveLanding, saveImage, getBaseUrl } from "@/lib/storage";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

interface CourseData {
  course_details?: {
    title?: string;
    description?: string;
    schedule?: {
      dates?: string;
      time?: string;
      days?: string;
    };
    location?: string;
    duration?: string;
    target_audience?: string;
  };
  generated_assets?: {
    banner_url?: string;
    background_url?: string;
  };
  branding?: {
    logo?: {
      id?: string;
      name?: string;
      url?: string;
    };
    theme?: {
      font_family?: string;
      colors?: {
        primary?: string;
        accent?: string;
      };
    };
  };
  landing_config?: {
    extended_description?: string;
    requires_interview?: boolean;
    referral_options?: string[];
  };
}

// Generate a unique 8-character landing ID
function generateLandingId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// POST /api/create-landing - Create a landing page
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const courseData: CourseData = body.courseData || {};

    console.log("=== CREATE LANDING PAGE ===");
    console.log(JSON.stringify(courseData, null, 2));

    // Generate unique ID
    const landingId = generateLandingId();

    // Extract data
    const details = courseData.course_details || {};
    const assets = courseData.generated_assets || {};
    const branding = courseData.branding || {};
    const landingConfig = courseData.landing_config || {};
    const colors = branding.theme?.colors || {};

    // Get font family from branding
    const fontFamily = branding.theme?.font_family || "Heebo";

    // Extract instructorEmail from session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    let instructorEmail = "";
    if (token) {
      const session = await verifySessionToken(token);
      if (session) instructorEmail = session.username;
    }

    // Create a dedicated Google Sheet for this course's registrations
    let sheetId = "";
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    if (appsScriptUrl) {
      try {
        console.log("Creating registration sheet for:", details.title);
        const sheetResponse = await fetch(appsScriptUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createSheet",
            courseTitle: details.title || "קורס חדש",
            landingId,
          }),
        });

        const sheetResult = await sheetResponse.json();
        console.log("CreateSheet response:", sheetResult);

        if (sheetResult.success && sheetResult.sheetId) {
          sheetId = sheetResult.sheetId;
          console.log(`Created sheet: ${sheetId} (${sheetResult.sheetUrl})`);
        } else {
          console.error("Failed to create sheet:", sheetResult);
        }
      } catch (error) {
        console.error("Failed to create registration sheet:", error);
      }
    }

    // Upload base64 banner images to Blob, get back public URLs
    let bannerUrl = assets.banner_url || "";
    let backgroundUrl = assets.background_url || "";
    if (bannerUrl.startsWith("data:image/")) {
      bannerUrl = await saveImage(`banners/${landingId}-banner.png`, bannerUrl);
    }
    if (backgroundUrl.startsWith("data:image/")) {
      backgroundUrl = await saveImage(
        `banners/${landingId}-background.png`,
        backgroundUrl
      );
    }

    // Build landing data with blob URLs (not base64) and instructorEmail
    const localLandingData = {
      id: landingId,
      course: {
        title: details.title || "",
        description: details.description || "",
        extendedDescription: landingConfig.extended_description || "",
        schedule: details.schedule || {},
        location: details.location || "",
        duration: details.duration || "",
        targetAudience: details.target_audience || "",
      },
      assets: {
        backgroundUrl,
        bannerUrl,
      },
      theme: {
        primary: colors.primary || "#13ecda",
        accent: colors.accent || "#1a1a2e",
        fontFamily,
      },
      sheetId,
      instructorEmail,
      form: {
        requiresInterview: landingConfig.requires_interview || false,
        referralOptions: landingConfig.referral_options || [
          "חבר/ה",
          "פייסבוק",
          "גוגל",
          "אחר",
        ],
      },
      createdAt: new Date().toISOString(),
    };

    // Save landing JSON to Vercel Blob
    await saveLanding(landingId, localLandingData);
    console.log(`Saved landing to Blob: ${landingId}`);

    console.log(`Created landing page: ${landingId}`);

    // Return the landing URL
    const baseUrl = getBaseUrl();
    return NextResponse.json({
      success: true,
      landingId,
      url: `${baseUrl}/l/${landingId}`,
    });
  } catch (error) {
    console.error("Error creating landing page:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
