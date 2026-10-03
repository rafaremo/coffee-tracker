import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  valueColor: string;
}

export default function StatCard({ title, value, icon: Icon, iconBg, iconColor, valueColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-coffee-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-coffee-500 font-medium">{title}</p>
          <p className={`text-3xl font-bold ${valueColor} mt-1`}>{value}</p>
        </div>
        <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
