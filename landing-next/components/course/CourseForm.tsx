"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CourseData, Logo } from "@/types/course";
import { defaultCourseData } from "@/types/course";
import { LogoPicker } from "./LogoPicker";
import { BannerPreview } from "./BannerPreview";

const STORAGE_KEY = "courseData";

export function CourseForm() {
  const router = useRouter();
  const [courseData, setCourseData] = useState<CourseData>(defaultCourseData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [bannerStatus, setBannerStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCourseData({ ...defaultCourseData, ...parsed });
      } catch (e) {
        console.error("Failed to parse saved course data:", e);
      }
    }
    setIsMounted(true);
  }, []);

  // Save to localStorage on change
  const saveToStorage = useCallback((data: CourseData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const updateCourseDetails = (
    field: keyof CourseData["course_details"],
    value: string
  ) => {
    setCourseData((prev) => {
      const updated = {
        ...prev,
        course_details: { ...prev.course_details, [field]: value },
      };
      saveToStorage(updated);
      return updated;
    });
  };

  const updateSchedule = (
    field: keyof CourseData["course_details"]["schedule"],
    value: string
  ) => {
    setCourseData((prev) => {
      const updated = {
        ...prev,
        course_details: {
          ...prev.course_details,
          schedule: { ...prev.course_details.schedule, [field]: value },
        },
      };
      saveToStorage(updated);
      return updated;
    });
  };

  const updateDesignPreferences = (
    field: keyof CourseData["design_preferences"],
    value: string
  ) => {
    setCourseData((prev) => {
      const updated = {
        ...prev,
        design_preferences: { ...prev.design_preferences, [field]: value },
      };
      saveToStorage(updated);
      return updated;
    });
  };

  const updateLogo = (logo: Logo | null) => {
    setCourseData((prev) => {
      const updated = {
        ...prev,
        branding: { ...prev.branding, logo },
      };
      saveToStorage(updated);
      return updated;
    });
  };

  const validateForm = (): boolean => {
    const fields = [
      { value: courseData.course_details.title, label: "שם הקורס" },
      { value: courseData.course_details.description, label: "תיאור הקורס" },
      { value: courseData.course_details.duration, label: "משך הקורס" },
      { value: courseData.course_details.target_audience, label: "קהל יעד" },
      { value: courseData.course_details.schedule.dates, label: "תאריכים" },
      { value: courseData.course_details.schedule.days, label: "ימים" },
      { value: courseData.course_details.schedule.time, label: "שעות" },
      { value: courseData.course_details.location, label: "מיקום" },
    ];

    for (const field of fields) {
      if (!field.value.trim()) {
        alert(`${field.label} הוא שדה חובה`);
        return false;
      }
    }
    return true;
  };

  const generateBanner = async () => {
    if (!validateForm()) return;

    setIsGenerating(true);
    setBannerStatus("שולח בקשה ליצירת באנר...");

    try {
      const response = await fetch("/api/banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: {
            title_en: courseData.course_details.title,
            subtitle_en: courseData.course_details.description.slice(0, 80),
            dates_en: courseData.course_details.schedule.dates,
            time_en: courseData.course_details.schedule.time,
            day_en: courseData.course_details.schedule.days,
            location_en: courseData.course_details.location,
            duration_en: courseData.course_details.duration,
            cta_en: "Register Now",
            title_he: courseData.course_details.title,
            subtitle_he: courseData.course_details.description.slice(0, 80),
            dates_he: courseData.course_details.schedule.dates,
            time_he: courseData.course_details.schedule.time,
            day_he: courseData.course_details.schedule.days,
            location_he: courseData.course_details.location,
            duration_he: courseData.course_details.duration,
            cta_he: "להרשמה עכשיו",
          },
          design: {
            aesthetic_style: courseData.design_preferences.aesthetic_style,
            color_palette: courseData.design_preferences.color_palette,
            lighting_and_atmosphere: courseData.design_preferences.lighting_and_atmosphere,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Banner generation failed");
      }

      // Response is image/png
      const blob = await response.blob();
      const bannerUrl = URL.createObjectURL(blob);

      setCourseData((prev) => {
        const updated = {
          ...prev,
          generated_assets: {
            ...prev.generated_assets,
            banner_url: bannerUrl,
            background_url: bannerUrl,
          },
        };
        // For localStorage, we'd need to convert to base64
        // For now, just save without the URL
        saveToStorage(updated);
        return updated;
      });

      setBannerStatus("באנר נוצר בהצלחה!");
    } catch (error) {
      console.error("Banner generation error:", error);
      setBannerStatus(
        `שגיאה ביצירת באנר: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const goToNextStep = () => {
    if (!validateForm()) return;

    setIsSaving(true);
    saveToStorage(courseData);

    // Navigate to config page
    router.push("/create/config");
  };

  // Show loading state until client-side hydration is complete
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
      {/* Form Section */}
      <div className="flex-1 w-full lg:w-2/3 space-y-8">
        <form className="space-y-8">
          {/* Course Details */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                פרטי הקורס
              </h1>
              <p className="text-gray-500">
                מלא את הפרטים הבסיסיים של הקורס. פרטים אלו יופיעו בדף הקורס
                ובחומרי השיווק.
              </p>
            </div>

            <div className="space-y-6">
              {/* Title */}
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  שם הקורס <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={courseData.course_details.title}
                  onChange={(e) => updateCourseDetails("title", e.target.value)}
                  className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                  placeholder="למשל: יסודות העיצוב הגרפי"
                  required
                />
              </label>

              {/* Description */}
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  תיאור הקורס <span className="text-red-500">*</span>
                </span>
                <textarea
                  value={courseData.course_details.description}
                  onChange={(e) =>
                    updateCourseDetails("description", e.target.value)
                  }
                  className="w-full p-4 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none placeholder:text-gray-400"
                  placeholder="פרט על מה נלמד בקורס, למי הוא מתאים ומה הערך המוסף..."
                  rows={4}
                  required
                />
              </label>

              {/* Duration & Target Audience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    משך הקורס <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={courseData.course_details.duration}
                    onChange={(e) =>
                      updateCourseDetails("duration", e.target.value)
                    }
                    className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                    placeholder="למשל: 10 שבועות, 60 שעות"
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    קהל יעד <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={courseData.course_details.target_audience}
                    onChange={(e) =>
                      updateCourseDetails("target_audience", e.target.value)
                    }
                    className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                    placeholder="למשל: מעצבים מתחילים, בעלי עסקים"
                    required
                  />
                </label>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    תאריכים <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={courseData.course_details.schedule.dates}
                    onChange={(e) => updateSchedule("dates", e.target.value)}
                    className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                    placeholder="למשל: 15.1.2025 - 30.3.2025"
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    ימים <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={courseData.course_details.schedule.days}
                    onChange={(e) => updateSchedule("days", e.target.value)}
                    className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                    placeholder="למשל: ימי ראשון וחמישי"
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    שעות <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={courseData.course_details.schedule.time}
                    onChange={(e) => updateSchedule("time", e.target.value)}
                    className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                    placeholder="למשל: 18:00-21:00"
                    required
                  />
                </label>
              </div>

              {/* Location */}
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  מיקום <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={courseData.course_details.location}
                  onChange={(e) =>
                    updateCourseDetails("location", e.target.value)
                  }
                  className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                  placeholder="למשל: זום / תל אביב, דרך בגין 12"
                  required
                />
              </label>
            </div>
          </div>

          {/* Design Preferences */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                העדפות עיצוב
              </h2>
              <p className="text-sm text-gray-500">
                הגדר את הסגנון הוויזואלי הרצוי לחומרי השיווק של הקורס.
              </p>
            </div>

            <div className="space-y-6">
              {/* Logo Picker */}
              <LogoPicker
                selectedLogo={courseData.branding.logo}
                onSelect={updateLogo}
              />

              {/* Design Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    סגנון אסתטי
                  </span>
                  <select
                    value={courseData.design_preferences.aesthetic_style}
                    onChange={(e) =>
                      updateDesignPreferences("aesthetic_style", e.target.value)
                    }
                    className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer"
                  >
                    <option value="minimalist">מינימליסטי ונקי</option>
                    <option value="modern_tech">הייטקי ומודרני</option>
                    <option value="luxury">יוקרתי ואלגנטי</option>
                    <option value="retro">רטרו / וינטג&apos;</option>
                    <option value="playful">שמח וצבעוני</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    פלטת צבעים
                  </span>
                  <select
                    value={courseData.design_preferences.color_palette}
                    onChange={(e) =>
                      updateDesignPreferences("color_palette", e.target.value)
                    }
                    className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer"
                  >
                    <option value="brand_colors">בהתאם למותג</option>
                    <option value="light_airy">בהיר ואוורירי</option>
                    <option value="dark_mode">כהה ודרמטי</option>
                    <option value="pastel">צבעי פסטל</option>
                    <option value="vibrant">נועז ורווי</option>
                  </select>
                </label>
              </div>

              {/* Banner Generation */}
              <div className="pt-4 space-y-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">
                    יצירת באנר
                  </p>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={generateBanner}
                    className="px-5 h-11 bg-primary hover:opacity-90 text-gray-900 text-sm font-bold rounded-lg shadow-sm shadow-primary/20 transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    {isGenerating ? "מייצר..." : "Generate Banner"}
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  ניצור באנר אוטומטי לפי פרטי הקורס והעדפות העיצוב.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
            <button
              type="button"
              disabled={isSaving}
              onClick={goToNextStep}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 h-12 bg-primary hover:opacity-90 text-gray-900 text-base font-bold rounded-lg shadow-sm shadow-primary/20 transition-all transform active:scale-95 disabled:opacity-50"
            >
              <span>{isSaving ? "שומר..." : "הבא: הגדרות דף נחיתה"}</span>
              <span className="material-symbols-outlined rtl:rotate-180">
                arrow_forward
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Preview Section */}
      <div className="w-full lg:w-1/3 lg:sticky lg:top-8">
        <BannerPreview
          bannerUrl={courseData.generated_assets.banner_url}
          backgroundUrl={courseData.generated_assets.background_url}
          isLoading={isGenerating}
          status={bannerStatus}
        />
      </div>
    </div>
  );
}
