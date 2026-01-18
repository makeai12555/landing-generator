import { DetailItem } from "./DetailItem";
import type { LandingPageData } from "@/types/landing";

interface CourseDetailsProps {
  course: LandingPageData["course"];
}

export function CourseDetails({ course }: CourseDetailsProps) {
  const details = [
    { icon: "calendar_month", label: "תאריכים", value: course.schedule.dates },
    { icon: "schedule", label: "שעות", value: course.schedule.time },
    { icon: "event_repeat", label: "ימים", value: course.schedule.days },
    { icon: "location_on", label: "מיקום", value: course.location },
    { icon: "hourglass_top", label: "משך הקורס", value: course.duration },
    { icon: "group", label: "קהל יעד", value: course.targetAudience },
  ].filter((d) => d.value); // Only show items with values

  return (
    <div className="lg:col-span-2 space-y-8">
      {/* Extended Description */}
      {course.extendedDescription && (
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">על הקורס</h2>
          <div className="text-gray-600 leading-relaxed whitespace-pre-line">
            {course.extendedDescription}
          </div>
        </div>
      )}

      {/* Course Details Grid */}
      {details.length > 0 && (
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">פרטי הקורס</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {details.map((detail) => (
              <DetailItem
                key={detail.icon}
                icon={detail.icon}
                label={detail.label}
                value={detail.value!}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
