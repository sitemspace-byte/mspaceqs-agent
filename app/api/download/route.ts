import { NextResponse } from "next/server";
import { buildWorkbook } from "@/lib/estimator/excel";
import type { DetectedArea } from "@/lib/estimator/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { items?: DetectedArea[] };
    const items = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "ยังไม่มีข้อมูลสำหรับส่งออก" }, { status: 400 });
    }

    const buffer = await buildWorkbook(items);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="M_SPACE_AI_COST_ESTIMATOR.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[v0] download error:", err);
    return NextResponse.json({ error: "สร้างไฟล์ Excel ไม่สำเร็จ" }, { status: 500 });
  }
}
