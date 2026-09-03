"use client";

import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Sparkles, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { AnalysisResult } from "@/lib/estimator/types";
import { AreaList } from "./area-list";
import { dataUrlToBlob, prepareImage } from "./file-to-image";
import { PlanViewer } from "./plan-viewer";
import { SummaryPanel } from "./summary-panel";

type Phase = "idle" | "ready" | "analyzing" | "done" | "error";

export function Estimator() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const analyzing = phase === "analyzing";

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    setActiveId(null);
    setFileName(file.name);
    try {
      const prepared = await prepareImage(file);
      setImageUrl(prepared.dataUrl);
      setPhase("ready");
    } catch (err) {
      console.error("[v0] prepare error:", err);
      setError("เตรียมไฟล์ไม่สำเร็จ กรุณาลองไฟล์อื่น");
      setPhase("error");
    }
  }

  async function runAnalysis() {
    if (!imageUrl) {
      fileInputRef.current?.click();
      return;
    }
    setPhase("analyzing");
    setError(null);
    try {
      const blob = await dataUrlToBlob(imageUrl);
      const form = new FormData();
      form.append("file", blob, "plan.png");

      const res = await fetch("/api/analyze", { method: "POST", body: form });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "วิเคราะห์แบบไม่สำเร็จ");
      }
      const data = (await res.json()) as AnalysisResult;
      setResult(data);
      setPhase("done");
      if (data.items.length === 0) {
        setError("ไม่พบพื้นที่ในแบบนี้ ลองใช้แบบแปลนที่ชัดเจนขึ้น");
      }
    } catch (err) {
      console.error("[v0] analysis failed:", err);
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      setPhase("error");
    }
  }

  async function downloadExcel() {
    if (!result || result.items.length === 0) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: result.items }),
      });
      if (!res.ok) throw new Error("สร้างไฟล์ Excel ไม่สำเร็จ");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "M_SPACE_AI_COST_ESTIMATOR.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[v0] download failed:", err);
      setError(err instanceof Error ? err.message : "ดาวน์โหลดไม่สำเร็จ");
    } finally {
      setDownloading(false);
    }
  }

  const hasResult = phase === "done" && (result?.items.length ?? 0) > 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            M SPACE <span className="font-normal text-muted-foreground">| AI ESTIMATOR</span>
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {fileName ? `ไฟล์: ${fileName}` : "ระบบประเมินราคาก่อสร้างจากแบบแปลนด้วย AI"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground transition hover:bg-secondary"
          >
            <Upload className="size-4" aria-hidden />
            อัปโหลดแบบ
          </button>

          <button
            type="button"
            onClick={() => void runAnalysis()}
            disabled={analyzing || !imageUrl}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {analyzing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            {analyzing ? "กำลังประมวลผล..." : "วิเคราะห์แบบด้วย AI"}
          </button>

          {hasResult && (
            <button
              type="button"
              onClick={() => void downloadExcel()}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <FileSpreadsheet className="size-4" aria-hidden />
              )}
              ดาวน์โหลด Excel BOQ
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {hasResult && !error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          <span>
            วิเคราะห์เสร็จสิ้น พบ {result?.items.length} พื้นที่
            {result?.scaleNote ? ` — ${result.scaleNote}` : ""}
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PlanViewer
            imageUrl={imageUrl}
            items={result?.items ?? []}
            analyzing={analyzing}
            activeId={activeId}
            onHover={setActiveId}
            onPickFile={() => fileInputRef.current?.click()}
          />
        </div>

        <div className="flex flex-col gap-4 lg:h-[600px]">
          <SummaryPanel result={result} />
          <AreaList items={result?.items ?? []} activeId={activeId} onHover={setActiveId} />
        </div>
      </div>
    </main>
  );
}
