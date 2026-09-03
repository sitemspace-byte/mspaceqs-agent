"use client";

import { Building2, Ruler } from "lucide-react";
import type { AnalysisResult } from "@/lib/estimator/types";

export function SummaryPanel({ result }: { result: AnalysisResult | null }) {
  const totalCost = result?.totalCost ?? 0;
  const totalGfa = result?.totalGFA ?? 0;
  const count = result?.items.length ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ราคาก่อสร้างรวม (บาท)</p>
      <p className="mt-1 text-4xl font-semibold text-card-foreground">
        <span className="font-sans">฿</span>{" "}
        <span className="font-mono tabular-nums">{Math.round(totalCost).toLocaleString("en-US")}</span>
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-secondary/60 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Ruler className="size-3.5" aria-hidden />
            <span className="text-xs">GFA รวม</span>
          </div>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-card-foreground">
            {totalGfa.toFixed(2)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">ตร.ม.</span>
          </p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/60 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="size-3.5" aria-hidden />
            <span className="text-xs">พื้นที่ตรวจพบ</span>
          </div>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-card-foreground">
            {count}
            <span className="ml-1 text-xs font-normal text-muted-foreground">รายการ</span>
          </p>
        </div>
      </div>
    </div>
  );
}
