import { notFound } from "next/navigation";
import { Hero, CourseDetails, RegistrationForm } from "@/components/landing";
import type { LandingPageData } from "@/types/landing";

// Fetch landing data from API (server-side)
async function getLandingData(id: string): Promise<LandingPageData | null> {
  try {
    // In production, use absolute URL or environment variable
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/landing/${id}`, {
      cache: "no-store", // Always fetch fresh data
    });

    if (!response.ok) {
      return null;
    }

    const landing: LandingPageData = await response.json();
    return landing ?? null;
  } catch (error) {
    console.error("Failed to fetch landing data:", error);
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getLandingData(id);

  if (!data) {
    return { title: "דף לא נמצא | CourseFlow" };
  }

  return {
    title: `${data.course.title} | הרשמה לקורס`,
    description: data.course.description,
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getLandingData(id);

  if (!data) {
    notFound();
  }

  return (
    <>
      {/* Hero Section */}
      <Hero
        title={data.course.title}
        description={data.course.description}
        backgroundUrl={data.assets.backgroundUrl}
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Course Info (2/3) */}
          <CourseDetails course={data.course} />

          {/* Registration Form (1/3) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm sticky top-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">הרשמה לקורס</h2>
              <p className="text-sm text-gray-500 mb-6">מלא את הפרטים ונחזור אליך בהקדם</p>
              <RegistrationForm landingId={data.id} form={data.form} />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">נוצר באמצעות CourseFlow</p>
        </div>
      </footer>
    </>
  );
}
