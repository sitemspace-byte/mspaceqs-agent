"use client";

import { CATEGORY_COLORS } from "@/lib/estimator/pricing";
import type { DetectedArea } from "@/lib/estimator/types";

export function AreaList({
  items,
  activeId,
  onHover,
}: {
  items: DetectedArea[];
  activeId: string | null;
  onHover: (id: string | null) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-card-foreground">รายการพื้นที่ (AI Detected)</h2>
        <span className="font-mono text-xs text-muted-foreground">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="px-4 text-center text-xs text-muted-foreground">
            ยังไม่มีรายการ — อัปโหลดแบบแล้วกด &quot;วิเคราะห์แบบด้วย AI&quot;
          </p>
        </div>
      ) : (
        <ul className="flex-1 space-y-2 overflow-y-auto pr-1">
          {items.map((item) => {
            const color = CATEGORY_COLORS[item.category];
            const active = activeId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseEnter={() => onHover(item.id)}
                  onMouseLeave={() => onHover(null)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    active ? "border-primary bg-secondary" : "border-border bg-card hover:bg-secondary/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                      <span className="font-mono text-sm font-semibold text-card-foreground">{item.id}</span>
                    </div>
                    <span
                      className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{item.name}</p>
                  <div className="mt-2 flex items-center justify-between font-mono text-xs tabular-nums">
                    <span className="text-muted-foreground">{item.areaSqm.toFixed(2)} ตร.ม.</span>
                    <span className="font-medium text-card-foreground">
                      <span className="font-sans">฿</span> {item.cost.toLocaleString("en-US")}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
