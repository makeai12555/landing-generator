"use client";

import { useState, useEffect, useRef } from "react";

interface BannerPreviewProps {
  bannerUrl?: string;
  backgroundUrl?: string;
  isLoading?: boolean;
  status?: string;
  // Refinement callbacks
  onBannerReplace?: (newDataUri: string, colors: { primary: string; accent: string }) => void;
  onBackgroundReplace?: (newDataUri: string) => void;
  bannerRefinementsLeft?: number;
  backgroundRefinementsLeft?: number;
  originalBannerUrl?: string;
  originalBackgroundUrl?: string;
  onBannerRevert?: () => void;
  onBackgroundRevert?: () => void;
  onRefinementUsed?: (type: "banner" | "background") => void;
}

const BANNER_PLACEHOLDER_EXAMPLES = [
  "תכהה קצת את הרקע",
  "הגדל את הכותרת",
  "תוסיף מעט צבע כחול",
  "תשנה את הסגנון ליותר מודרני",
  "הוסף יותר ניגודיות",
];

const BACKGROUND_PLACEHOLDER_EXAMPLES = [
  "תכהה את הרקע",
  "תוסיף גוונים חמים",
  "תעשה את התמונה יותר בהירה",
  "הוסף אפקט טשטוש עדין",
  "שנה את הצבעים לכחול",
];

export function BannerPreview({
  bannerUrl,
  backgroundUrl,
  isLoading,
  status,
  onBannerReplace,
  onBackgroundReplace,
  bannerRefinementsLeft = 0,
  backgroundRefinementsLeft = 0,
  originalBannerUrl,
  originalBackgroundUrl,
  onBannerRevert,
  onBackgroundRevert,
  onRefinementUsed,
}: BannerPreviewProps) {
  // Input state
  const [bannerRefineInput, setBannerRefineInput] = useState("");
  const [backgroundRefineInput, setBackgroundRefineInput] = useState("");

  // Loading state per image
  const [bannerRefining, setBannerRefining] = useState(false);
  const [backgroundRefining, setBackgroundRefining] = useState(false);

  // Preview state per image
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [bannerPreviewColors, setBannerPreviewColors] = useState<{
    primary: string;
    accent: string;
  } | null>(null);

  // Rotating placeholder index
  const [bannerPlaceholderIdx, setBannerPlaceholderIdx] = useState(0);
  const [backgroundPlaceholderIdx, setBackgroundPlaceholderIdx] = useState(0);

  // Rotate banner placeholder every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setBannerPlaceholderIdx((i) => (i + 1) % BANNER_PLACEHOLDER_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Rotate background placeholder every 3 seconds (offset start)
  const bgOffsetRef = useRef(false);
  useEffect(() => {
    const timeout = setTimeout(() => {
      bgOffsetRef.current = true;
      const interval = setInterval(() => {
        setBackgroundPlaceholderIdx((i) => (i + 1) % BACKGROUND_PLACEHOLDER_EXAMPLES.length);
      }, 3000);
      return () => clearInterval(interval);
    }, 1500);
    return () => clearTimeout(timeout);
  }, []);

  // Current display URL for banner (preview takes priority)
  const displayBannerUrl = bannerPreview || bannerUrl;

  const handleDownload = async () => {
    if (!displayBannerUrl) return;

    if (displayBannerUrl.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = displayBannerUrl;
      a.download = "banner.png";
      a.click();
    } else {
      try {
        const response = await fetch(displayBannerUrl);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = "banner.png";
        a.click();
        URL.revokeObjectURL(objectUrl);
      } catch (err) {
        console.error("Failed to download banner:", err);
      }
    }
  };

  const handleBannerRefine = async () => {
    if (!bannerUrl || !bannerRefineInput.trim() || bannerRefining) return;

    setBannerRefining(true);
    try {
      const response = await fetch("/api/refine-banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUri: bannerUrl,
          instruction: bannerRefineInput.trim(),
          isBanner: true,
        }),
      });
      const result = await response.json();
      if (result.ok) {
        setBannerPreview(result.image);
        if (result.colors) setBannerPreviewColors(result.colors);
      } else {
        alert(`שגיאה בשיפור הבאנר: ${result.error || "שגיאה לא ידועה"}`);
      }
    } catch (err) {
      console.error("Banner refine error:", err);
      alert("שגיאה בחיבור לשרת. נסה שוב.");
    } finally {
      setBannerRefining(false);
    }
  };

  const handleBackgroundRefine = async () => {
    if (!backgroundRefineInput.trim() || backgroundRefining) return;
    const currentBg = backgroundUrl || bannerUrl;
    if (!currentBg) return;

    setBackgroundRefining(true);
    try {
      const response = await fetch("/api/refine-banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUri: currentBg,
          instruction: backgroundRefineInput.trim(),
          isBanner: false,
        }),
      });
      const result = await response.json();
      if (result.ok) {
        setBackgroundPreview(result.image);
      } else {
        alert(`שגיאה בשיפור הרקע: ${result.error || "שגיאה לא ידועה"}`);
      }
    } catch (err) {
      console.error("Background refine error:", err);
      alert("שגיאה בחיבור לשרת. נסה שוב.");
    } finally {
      setBackgroundRefining(false);
    }
  };

  const handleBannerReplace = () => {
    if (!bannerPreview) return;
    onBannerReplace?.(bannerPreview, bannerPreviewColors || { primary: "#13ecda", accent: "#1a1a2e" });
    setBannerPreview(null);
    setBannerPreviewColors(null);
    setBannerRefineInput("");
  };

  const handleBannerCancel = () => {
    setBannerPreview(null);
    setBannerPreviewColors(null);
    onRefinementUsed?.("banner");
  };

  const handleBackgroundReplace = () => {
    if (!backgroundPreview) return;
    onBackgroundReplace?.(backgroundPreview);
    setBackgroundPreview(null);
    setBackgroundRefineInput("");
  };

  const handleBackgroundCancel = () => {
    setBackgroundPreview(null);
    onRefinementUsed?.("background");
  };

  // Current display URL for background (preview takes priority)
  const displayBackgroundUrl = backgroundPreview || backgroundUrl || bannerUrl;

  // Whether current banner differs from original (revert available)
  const bannerDiffersFromOriginal =
    originalBannerUrl && bannerUrl && bannerUrl !== originalBannerUrl;

  // Whether current background differs from original (revert available)
  const effectiveBgUrl = backgroundUrl || bannerUrl;
  const effectiveOriginalBg = originalBackgroundUrl || originalBannerUrl;
  const backgroundDiffersFromOriginal =
    effectiveOriginalBg && effectiveBgUrl && effectiveBgUrl !== effectiveOriginalBg;

  return (
    <div className="space-y-4">
      {/* Banner Preview */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">באנר הקורס</h3>
        <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">{status || "מייצר באנר..."}</p>
            </div>
          ) : displayBannerUrl ? (
            <img
              src={displayBannerUrl}
              alt="Banner Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <p className="text-sm text-gray-400">לא נוצר באנר עדיין</p>
          )}

          {/* Refinement loading overlay — banner */}
          {bannerRefining && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3 rounded-xl">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-white font-medium">משפר תמונה...</p>
            </div>
          )}
        </div>

        {/* Download button — shows current displayed banner (preview or committed) */}
        {!isLoading && displayBannerUrl && (
          <button
            type="button"
            onClick={handleDownload}
            className="w-full mt-3 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              download
            </span>
            הורד באנר
          </button>
        )}

        {/* Replace / Cancel buttons after preview */}
        {bannerPreview && !bannerRefining && (
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleBannerReplace}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-gray-900 font-bold text-sm transition-colors hover:opacity-90"
            >
              החלף תמונה
            </button>
            <button
              type="button"
              onClick={handleBannerCancel}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm transition-colors hover:bg-gray-50"
            >
              בטל
            </button>
          </div>
        )}

        {/* Refinement input — only when image exists, no active preview, refinements left */}
        {!isLoading && bannerUrl && !bannerPreview && (
          <div className="mt-4 space-y-2">
            {bannerRefinementsLeft > 0 ? (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    dir="rtl"
                    value={bannerRefineInput}
                    onChange={(e) => setBannerRefineInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleBannerRefine()}
                    placeholder={BANNER_PLACEHOLDER_EXAMPLES[bannerPlaceholderIdx]}
                    disabled={bannerRefining}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleBannerRefine}
                    disabled={!bannerRefineInput.trim() || bannerRefining}
                    className="px-3 py-2 rounded-lg bg-primary text-gray-900 font-bold text-sm transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
                    title="שלח"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                      send
                    </span>
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-right">
                  נותרו {bannerRefinementsLeft} שיפורים
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-400 text-right">מיצית את מכסת השיפורים</p>
            )}

            {/* Revert to original */}
            {bannerDiffersFromOriginal && (
              <button
                type="button"
                onClick={onBannerRevert}
                className="text-xs text-gray-400 underline hover:text-gray-600 transition-colors block text-right w-full"
              >
                חזור לתמונה המקורית
              </button>
            )}
          </div>
        )}
      </div>

      {/* Background Preview */}
      {(backgroundUrl || bannerUrl) && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">תמונת רקע לדף נחיתה</h3>
          <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
            <img
              src={displayBackgroundUrl}
              alt="Background Preview"
              className="w-full h-full object-cover"
            />

            {/* Refinement loading overlay — background */}
            {backgroundRefining && (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3 rounded-xl">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-white font-medium">משפר תמונה...</p>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-2">
            תמונה זו תשמש כרקע ה-Hero בדף הנחיתה
          </p>

          {/* Replace / Cancel buttons after preview */}
          {backgroundPreview && !backgroundRefining && (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={handleBackgroundReplace}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-gray-900 font-bold text-sm transition-colors hover:opacity-90"
              >
                החלף תמונה
              </button>
              <button
                type="button"
                onClick={handleBackgroundCancel}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm transition-colors hover:bg-gray-50"
              >
                בטל
              </button>
            </div>
          )}

          {/* Refinement input for background */}
          {!backgroundPreview && (
            <div className="mt-4 space-y-2">
              {backgroundRefinementsLeft > 0 ? (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      dir="rtl"
                      value={backgroundRefineInput}
                      onChange={(e) => setBackgroundRefineInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleBackgroundRefine()}
                      placeholder={BACKGROUND_PLACEHOLDER_EXAMPLES[backgroundPlaceholderIdx]}
                      disabled={backgroundRefining}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={handleBackgroundRefine}
                      disabled={!backgroundRefineInput.trim() || backgroundRefining}
                      className="px-3 py-2 rounded-lg bg-primary text-gray-900 font-bold text-sm transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
                      title="שלח"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                        send
                      </span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 text-right">
                    נותרו {backgroundRefinementsLeft} שיפורים
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400 text-right">מיצית את מכסת השיפורים</p>
              )}

              {/* Revert to original */}
              {backgroundDiffersFromOriginal && (
                <button
                  type="button"
                  onClick={onBackgroundRevert}
                  className="text-xs text-gray-400 underline hover:text-gray-600 transition-colors block text-right w-full"
                >
                  חזור לתמונה המקורית
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
