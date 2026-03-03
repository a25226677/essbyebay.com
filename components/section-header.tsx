import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  badge?: string;
  viewAllHref?: string;
}

export function SectionHeader({ title, badge, viewAllHref }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-gray-200">
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-bold text-[#1b233a] uppercase tracking-wide">{title}</h2>
        {badge && (
          <span className="bg-[#e53e3e] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase">
            {badge}
          </span>
        )}
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="text-[12px] text-[#f77f00] hover:text-[#e67300] flex items-center gap-1 font-semibold"
        >
          View all <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}
