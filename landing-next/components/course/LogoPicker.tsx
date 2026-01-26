"use client";

import { useState, useEffect } from "react";
import type { Logo } from "@/types/course";

interface LogoPickerProps {
  selectedLogo: Logo | null;
  onSelect: (logo: Logo | null) => void;
}

export function LogoPicker({ selectedLogo, onSelect }: LogoPickerProps) {
  const [logos, setLogos] = useState<Logo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Load logos from API
  useEffect(() => {
    if (isModalOpen && logos.length === 0) {
      setIsLoading(true);
      fetch("/api/logos")
        .then((res) => res.json())
        .then((data) => {
          setLogos(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load logos:", err);
          setIsLoading(false);
        });
    }
  }, [isModalOpen, logos.length]);

  const filteredLogos = searchQuery
    ? logos.filter((logo) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          logo.name.toLowerCase().includes(searchLower) ||
          logo.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
        );
      })
    : logos;

  const handleSelect = (logo: Logo) => {
    onSelect(logo);
    setIsModalOpen(false);
    setSearchQuery("");
  };

  return (
    <>
      {/* Logo Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">לוגו</span>
          <button
            type="button"
            className="text-sm font-bold text-primary hover:opacity-80 transition-colors"
            onClick={() => setIsModalOpen(true)}
          >
            בחר לוגו מספרייה
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-16 h-10 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
              {selectedLogo?.url ? (
                <img
                  src={selectedLogo.url}
                  alt={selectedLogo.name}
                  className="max-h-10"
                />
              ) : (
                <span className="text-xs text-gray-400">לא נבחר</span>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                {selectedLogo?.name || "ללא לוגו"}
              </p>
              <p className="text-xs text-gray-500">
                הלוגו יוטמע בבאנר ובדף הנחיתה
              </p>
            </div>
          </div>

          {selectedLogo && (
            <button
              type="button"
              className="px-4 h-10 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-400 font-medium transition-colors"
              onClick={() => onSelect(null)}
            >
              נקה
            </button>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999]">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative max-w-3xl mx-auto mt-16 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">בחר לוגו</h3>
                <p className="text-sm text-gray-500">
                  בחר מתוך הספרייה. ניתן לחפש לפי שם או תגיות.
                </p>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-900"
                onClick={() => setIsModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5">
              <input
                type="text"
                placeholder="חיפוש לוגו..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400"
              />

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredLogos.length === 0 ? (
                <p className="text-sm text-gray-400 py-12 text-center">
                  לא נמצאו לוגואים.
                </p>
              ) : (
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                  {filteredLogos.map((logo) => (
                    <button
                      key={logo.id}
                      type="button"
                      className="text-right p-3 rounded-xl border border-gray-200 bg-white hover:border-primary transition-colors flex flex-col gap-3"
                      onClick={() => handleSelect(logo)}
                    >
                      <div className="w-full h-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={logo.url}
                          alt={logo.name}
                          className="max-h-14"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {logo.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {logo.tags?.slice(0, 3).join(" · ")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
