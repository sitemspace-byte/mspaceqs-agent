"use client";

import { FileUp, Loader2 } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/estimator/pricing";
import type { DetectedArea } from "@/lib/estimator/types";

export function PlanViewer({
  imageUrl,
  items,
  analyzing,
  activeId,
  onHover,
  onPickFile,
}: {
  imageUrl: string | null;
  items: DetectedArea[];
  analyzing: boolean;
  activeId: string | null;
  onHover: (id: string | null) => void;
  onPickFile: () => void;
}) {
  return (
    <div className="relative flex min-h-[60vh] items-center justify-center overflow-hidden rounded-xl border border-border bg-[repeating-linear-gradient(45deg,var(--muted),var(--muted)_10px,transparent_10px,transparent_20px)] lg:min-h-[600px]">
      {!imageUrl ? (
        <button
          type="button"
          onClick={onPickFile}
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/80 px-10 py-12 text-center backdrop-blur transition hover:border-primary hover:bg-card"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <FileUp className="size-6" aria-hidden />
          </span>
          <span className="text-sm font-medium text-card-foreground">อัปโหลดแบบแปลน (PDF หรือรูปภาพ)</span>
          <span className="text-xs text-muted-foreground">ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์</span>
        </button>
      ) : (
        <div className="relative max-h-full max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="แบบแปลนที่อัปโหลด" className="max-h-[600px] w-auto rounded-md shadow-sm" />

          {/* AI mark-up overlay */}
          <div className="pointer-events-none absolute inset-0">
            {items.map((item) => {
              const color = CATEGORY_COLORS[item.category];
              const dim = activeId !== null && activeId !== item.id;
              return (
                <div
                  key={item.id}
                  className="absolute rounded-sm transition-opacity"
                  style={{
                    left: `${item.bbox.x * 100}%`,
                    top: `${item.bbox.y * 100}%`,
                    width: `${item.bbox.w * 100}%`,
                    height: `${item.bbox.h * 100}%`,
                    border: `2px solid ${color}`,
                    backgroundColor: `${color}22`,
                    opacity: dim ? 0.25 : 1,
                  }}
                  onMouseEnter={() => onHover(item.id)}
                  onMouseLeave={() => onHover(null)}
                >
                  <span
                    className="absolute left-0 top-0 -translate-y-full rounded-t-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {item.id}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {analyzing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
          <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
          <p className="text-sm font-medium text-foreground">กำลังประมวลผลด้วย AI...</p>
        </div>
      )}
    </div>
  );
}
