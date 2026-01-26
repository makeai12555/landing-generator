"use client";

interface BannerPreviewProps {
  bannerUrl?: string;
  backgroundUrl?: string;
  isLoading?: boolean;
  status?: string;
}

export function BannerPreview({
  bannerUrl,
  backgroundUrl,
  isLoading,
  status,
}: BannerPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Banner Preview */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">באנר הקורס</h3>
        <div className="aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">{status || "מייצר באנר..."}</p>
            </div>
          ) : bannerUrl ? (
            <img
              src={bannerUrl}
              alt="Banner Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <p className="text-sm text-gray-400">לא נוצר באנר עדיין</p>
          )}
        </div>
      </div>

      {/* Background Preview */}
      {(backgroundUrl || bannerUrl) && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">תמונת רקע לדף נחיתה</h3>
          <div className="aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
            <img
              src={backgroundUrl || bannerUrl}
              alt="Background Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            תמונה זו תשמש כרקע ה-Hero בדף הנחיתה
          </p>
        </div>
      )}
    </div>
  );
}
