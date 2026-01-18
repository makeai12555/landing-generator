import { Icon } from "@/components/ui/Icon";

interface DetailItemProps {
  icon: string;
  label: string;
  value: string;
}

export function DetailItem({ icon, label, value }: DetailItemProps) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon name={icon} className="text-xl text-primary" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
