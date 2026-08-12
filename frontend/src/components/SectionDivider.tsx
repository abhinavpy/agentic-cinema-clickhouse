import type { ReactNode } from "react";

interface SectionDividerProps {
  label: string;
  note?: string;
  children?: ReactNode;
}

function SectionDivider({ label, note, children }: SectionDividerProps) {
  return (
    <div className="mt-10 mb-4.5 flex items-center gap-3.5">
      <span className="font-sans text-[10.5px] font-semibold tracking-[0.18em] whitespace-nowrap text-ink uppercase">
        {label}
      </span>
      <span className="h-px flex-1 bg-rule" />
      {note && <span className="text-[11.5px] whitespace-nowrap text-ink3 italic">{note}</span>}
      {children}
    </div>
  );
}

export default SectionDivider;
