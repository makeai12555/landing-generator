import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

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

    // Build landing data for Apps Script
    const landingData = {
      action: "createLanding",
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
        backgroundUrl: assets.background_url || "",
        bannerUrl: assets.banner_url || "",
      },
      theme: {
        primary: colors.primary || "#FFD700",
        accent: colors.accent || "#1a1a2e",
        fontFamily,
      },
      form: {
        requiresInterview: landingConfig.requires_interview || false,
        referralOptions: landingConfig.referral_options || [
          "חבר/ה",
          "פייסבוק",
          "גוגל",
          "אחר",
        ],
      },
    };

    // Also save locally as JSON file for fallback
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
        backgroundUrl: assets.background_url || "",
        bannerUrl: assets.banner_url || "",
      },
      theme: {
        primary: colors.primary || "#13ecda",
        accent: colors.accent || "#1a1a2e",
        fontFamily,
      },
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

    // Save to local file (fallback storage)
    try {
      const dataDir = join(process.cwd(), "data", "landings");
      await mkdir(dataDir, { recursive: true });
      const filePath = join(dataDir, `${landingId}.json`);
      await writeFile(filePath, JSON.stringify(localLandingData, null, 2));
      console.log(`Saved landing locally: ${filePath}`);
    } catch (error) {
      console.error("Failed to save landing locally:", error);
    }

    // Send to Apps Script if URL is configured
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    if (appsScriptUrl) {
      try {
        const response = await fetch(appsScriptUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(landingData),
        });

        const result = await response.json();
        console.log("Apps Script response:", result);

        if (!result.success) {
          console.error("Apps Script error:", result);
        }
      } catch (error) {
        console.error("Failed to send to Apps Script:", error);
      }
    } else {
      console.warn("APPS_SCRIPT_URL not configured, skipping Apps Script call");
    }

    console.log(`Created landing page: ${landingId}`);

    // Return the landing URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
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
