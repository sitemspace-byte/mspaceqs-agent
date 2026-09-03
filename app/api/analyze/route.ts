import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { computeCost } from "@/lib/estimator/pricing";
import type { AnalysisResult, AreaCategory, DetectedArea } from "@/lib/estimator/types";

export const maxDuration = 60;

const analysisSchema = z.object({
  areas: z
    .array(
      z.object({
        name: z.string().describe("ชื่อพื้นที่/ห้องเป็นภาษาไทย เช่น ห้องนอน, โถงทางเดิน, ระเบียง"),
        category: z
          .enum(["RM", "FA", "EX"])
          .describe("RM = ห้องภายในทั่วไป, FA = พื้นที่พิเศษ/ผนังเอียง/โค้ง, EX = พื้นที่ภายนอก/ระเบียง"),
        areaSqm: z.number().describe("พื้นที่โดยประมาณเป็นตารางเมตร"),
        bbox: z
          .object({
            x: z.number().describe("มุมซ้ายบน X (0..1)"),
            y: z.number().describe("มุมซ้ายบน Y (0..1)"),
            w: z.number().describe("ความกว้าง (0..1)"),
            h: z.number().describe("ความสูง (0..1)"),
          })
          .describe("กรอบตำแหน่งพื้นที่ อ้างอิงกับขนาดภาพแบบ normalize 0..1 จุดกำเนิดมุมซ้ายบน"),
        note: z.string().optional().describe("หมายเหตุสั้น ๆ (ถ้ามี)"),
      }),
    )
    .describe("รายการพื้นที่ที่ตรวจจับได้จากแบบแปลน"),
  scaleNote: z.string().optional().describe("ข้อสังเกตเรื่องมาตราส่วนหรือสมมติฐานที่ใช้"),
});

const PROMPT = `คุณเป็นผู้เชี่ยวชาญถอดปริมาณงานก่อสร้าง (Quantity Surveyor) กำลังวิเคราะห์แบบแปลนสถาปัตยกรรม (floor plan)

หน้าที่ของคุณ:
1. ตรวจจับพื้นที่ปิดล้อม/ห้อง/โซนที่ชัดเจนแต่ละส่วนในแบบ
2. ประเมินพื้นที่ของแต่ละส่วนเป็นตารางเมตร โดยใช้เส้นบอกระยะ (dimension) หรือมาตราส่วนที่เห็นในภาพ หากไม่มีให้ประมาณจากสัดส่วนที่สมเหตุสมผลของอาคารพักอาศัยทั่วไป
3. จัดหมวดหมู่แต่ละพื้นที่: RM (ห้องภายในทั่วไป), FA (พื้นที่พิเศษ ผนังเอียงหรือโค้ง งานสถาปัตย์พิเศษ), EX (พื้นที่ภายนอก ระเบียง เฉลียง)
4. ระบุกรอบตำแหน่ง (bounding box) ของแต่ละพื้นที่แบบ normalize 0..1 เทียบกับขนาดภาพ จุดกำเนิดที่มุมซ้ายบน

ให้ตรวจจับเฉพาะพื้นที่ที่มองเห็นได้จริง หากภาพไม่ใช่แบบแปลนให้คืนค่า areas เป็นลิสต์ว่าง
ตอบกลับเป็นภาษาไทยสำหรับชื่อและหมายเหตุ`;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ไม่พบไฟล์แบบแปลน" }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mediaType = file.type || "image/png";

    const { object } = await generateObject({
      model: "google/gemini-2.5-flash",
      schema: analysisSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "file", mediaType, data: bytes },
          ],
        },
      ],
    });

    const items: DetectedArea[] = object.areas.map((a, i) => {
      const category = a.category as AreaCategory;
      const areaSqm = Math.max(0, Number(a.areaSqm) || 0);
      const { materialRate, laborRate, unitRate, cost } = computeCost(category, areaSqm);
      const seq = String(i + 1).padStart(2, "0");
      return {
        id: `${category}-${seq}`,
        name: a.name,
        category,
        status: "DETECTED",
        areaSqm,
        materialRate,
        laborRate,
        unitRate,
        cost,
        bbox: {
          x: clamp01(a.bbox.x),
          y: clamp01(a.bbox.y),
          w: clamp01(a.bbox.w),
          h: clamp01(a.bbox.h),
        },
        note: a.note,
      };
    });

    const result: AnalysisResult = {
      items,
      totalCost: items.reduce((s, it) => s + it.cost, 0),
      totalGFA: items.reduce((s, it) => s + it.areaSqm, 0),
      currency: "THB",
      scaleNote: object.scaleNote,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[v0] analyze error:", err);
    const message = err instanceof Error ? err.message : String(err);

    // Surface the AI Gateway billing gate clearly instead of a generic error.
    if (/credit card|customer_verification_required/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "ต้องเพิ่มบัตรเครดิตใน Vercel AI Gateway ก่อนจึงจะใช้ AI ได้ (ไปที่ Vercel > AI Gateway เพื่อเพิ่มบัตรและปลดล็อกเครดิตฟรี)",
        },
        { status: 402 },
      );
    }

    return NextResponse.json({ error: "วิเคราะห์แบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
