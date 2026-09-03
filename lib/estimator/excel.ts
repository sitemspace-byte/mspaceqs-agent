import ExcelJS from "exceljs";
import type { AreaCategory, DetectedArea } from "./types";
import { RATES } from "./pricing";

const HEADER_FILL = "FFF3F4F6";
const HEADER_FONT = "FF334155";
const BORDER_COLOR = "FFE5E7EB";
const ACCENT_FILL = "FF1D4ED8";

function styleHeaderRow(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: HEADER_FONT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: BORDER_COLOR } },
      left: { style: "thin", color: { argb: BORDER_COLOR } },
      bottom: { style: "thin", color: { argb: BORDER_COLOR } },
      right: { style: "thin", color: { argb: BORDER_COLOR } },
    };
  });
}

function styleBody(ws: ExcelJS.Worksheet, fromRow: number) {
  for (let r = fromRow; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    row.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, color: { argb: "FF1F2937" } };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: BORDER_COLOR } },
        left: { style: "thin", color: { argb: BORDER_COLOR } },
        bottom: { style: "thin", color: { argb: BORDER_COLOR } },
        right: { style: "thin", color: { argb: BORDER_COLOR } },
      };
    });
  }
}

function bahtFmt(ws: ExcelJS.Worksheet, cols: string[]) {
  cols.forEach((col) => {
    ws.getColumn(col).numFmt = "#,##0.00";
  });
}

export async function buildWorkbook(items: DetectedArea[]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "M SPACE AI Estimator";
  wb.created = new Date();

  const totalCost = items.reduce((s, i) => s + i.cost, 0);
  const totalGfa = items.reduce((s, i) => s + i.areaSqm, 0);

  // Category rollup used by several sheets.
  const byCategory = new Map<AreaCategory, { count: number; area: number; cost: number }>();
  for (const it of items) {
    const cur = byCategory.get(it.category) ?? { count: 0, area: 0, cost: 0 };
    cur.count += 1;
    cur.area += it.areaSqm;
    cur.cost += it.cost;
    byCategory.set(it.category, cur);
  }

  // 01 — สรุปราคา
  const s1 = wb.addWorksheet("01_สรุปราคา");
  s1.columns = [
    { header: "ลำดับ", key: "no", width: 8 },
    { header: "หมวดงาน", key: "cat", width: 34 },
    { header: "ราคาประมาณการ (บาท)", key: "cost", width: 22 },
    { header: "สัดส่วน (%)", key: "pct", width: 14 },
  ];
  styleHeaderRow(s1.getRow(1));
  let n1 = 1;
  for (const [cat, v] of byCategory) {
    s1.addRow({
      no: n1++,
      cat: `${cat} — ${RATES[cat].label}`,
      cost: v.cost,
      pct: totalCost ? Number(((v.cost / totalCost) * 100).toFixed(2)) : 0,
    });
  }
  const s1total = s1.addRow({ no: "", cat: "รวมทั้งโครงการ", cost: totalCost, pct: 100 });
  s1total.font = { bold: true };
  bahtFmt(s1, ["C"]);
  styleBody(s1, 2);

  // 02 — พื้นที่อาคาร
  const s2 = wb.addWorksheet("02_พื้นที่อาคาร");
  s2.columns = [
    { header: "ลำดับ", key: "no", width: 8 },
    { header: "Area ID", key: "id", width: 12 },
    { header: "ชั้น", key: "floor", width: 8 },
    { header: "พื้นที่/ห้อง", key: "name", width: 28 },
    { header: "พื้นที่ (ตร.ม.)", key: "area", width: 16 },
    { header: "Status", key: "status", width: 14 },
  ];
  styleHeaderRow(s2.getRow(1));
  items.forEach((it, i) =>
    s2.addRow({ no: i + 1, id: it.id, floor: "1", name: it.name, area: Number(it.areaSqm.toFixed(2)), status: it.status }),
  );
  bahtFmt(s2, ["E"]);
  styleBody(s2, 2);

  // 03 — ถอดปริมาณ
  const s3 = wb.addWorksheet("03_ถอดปริมาณ");
  s3.columns = [
    { header: "ลำดับ", key: "no", width: 8 },
    { header: "รหัส", key: "id", width: 12 },
    { header: "วิธีคำนวณ", key: "method", width: 34 },
    { header: "ปริมาณ", key: "qty", width: 14 },
    { header: "หน่วย", key: "unit", width: 10 },
    { header: "Status", key: "status", width: 14 },
  ];
  styleHeaderRow(s3.getRow(1));
  items.forEach((it, i) =>
    s3.addRow({
      no: i + 1,
      id: it.id,
      method: "พื้นที่ปิดล้อมจาก AI Detection",
      qty: Number(it.areaSqm.toFixed(2)),
      unit: "ตร.ม.",
      status: it.status,
    }),
  );
  bahtFmt(s3, ["D"]);
  styleBody(s3, 2);

  // 04 — BOQ (with live formulas)
  const s4 = wb.addWorksheet("04_BOQ");
  s4.columns = [
    { header: "ลำดับ", key: "no", width: 8 },
    { header: "Area ID", key: "id", width: 12 },
    { header: "รายการ", key: "desc", width: 30 },
    { header: "ปริมาณ", key: "qty", width: 12 },
    { header: "ราคาวัสดุ", key: "mat", width: 12 },
    { header: "ค่าแรง", key: "labor", width: 12 },
    { header: "ราคาต่อหน่วย", key: "unit", width: 14 },
    { header: "จำนวนเงิน (บาท)", key: "amount", width: 18 },
  ];
  styleHeaderRow(s4.getRow(1));
  items.forEach((it, i) => {
    const r = i + 2;
    s4.addRow({
      no: i + 1,
      id: it.id,
      desc: `${RATES[it.category].scope} (AI Detected)`,
      qty: Number(it.areaSqm.toFixed(2)),
      mat: it.materialRate,
      labor: it.laborRate,
      unit: { formula: `E${r}+F${r}` },
      amount: { formula: `D${r}*G${r}` },
    });
  });
  const lastBoq = items.length + 1;
  const totalRow = s4.addRow({
    no: "",
    id: "",
    desc: "รวมทั้งหมด",
    qty: "",
    mat: "",
    labor: "",
    unit: "",
    amount: items.length ? { formula: `SUM(H2:H${lastBoq})` } : 0,
  });
  totalRow.font = { bold: true };
  bahtFmt(s4, ["D", "E", "F", "G", "H"]);
  styleBody(s4, 2);

  // 05 — วัสดุและราคา
  const s5 = wb.addWorksheet("05_วัสดุและราคา");
  s5.columns = [
    { header: "ลำดับ", key: "no", width: 8 },
    { header: "ภาพ", key: "img", width: 10 },
    { header: "หมวด", key: "cat", width: 12 },
    { header: "รายการ", key: "item", width: 30 },
    { header: "ราคาต่ำ", key: "low", width: 12 },
    { header: "ราคาสูง", key: "high", width: 12 },
    { header: "ราคากลาง", key: "mid", width: 12 },
  ];
  styleHeaderRow(s5.getRow(1));
  let n5 = 1;
  (Object.keys(RATES) as AreaCategory[]).forEach((cat) => {
    const unit = RATES[cat].material + RATES[cat].labor;
    s5.addRow({
      no: n5++,
      img: "-",
      cat,
      item: RATES[cat].scope,
      low: Math.round(unit * 0.85),
      high: Math.round(unit * 1.2),
      mid: unit,
    });
  });
  bahtFmt(s5, ["E", "F", "G"]);
  styleBody(s5, 2);

  // 06 — ที่มาราคา
  const s6 = wb.addWorksheet("06_ที่มาราคา");
  s6.columns = [
    { header: "ลำดับ", key: "no", width: 8 },
    { header: "รหัสราคา", key: "code", width: 14 },
    { header: "รายการ", key: "item", width: 34 },
    { header: "แหล่งข้อมูล", key: "src", width: 34 },
  ];
  styleHeaderRow(s6.getRow(1));
  let n6 = 1;
  (Object.keys(RATES) as AreaCategory[]).forEach((cat) => {
    s6.addRow({
      no: n6++,
      code: `PR-${cat}`,
      item: RATES[cat].label,
      src: "ราคากลางกรมบัญชีกลาง / ฐานข้อมูลผู้รับเหมา M SPACE",
    });
  });
  styleBody(s6, 2);

  // 07 — สมมติฐาน
  const s7 = wb.addWorksheet("07_สมมติฐาน");
  s7.columns = [
    { header: "ลำดับ", key: "no", width: 8 },
    { header: "ประเภท", key: "type", width: 20 },
    { header: "รายละเอียด", key: "detail", width: 60 },
  ];
  styleHeaderRow(s7.getRow(1));
  [
    ["มาตราส่วน", "พื้นที่ประเมินจากการตรวจจับด้วย AI อาจคลาดเคลื่อน ±10% ควรตรวจสอบกับแบบจริง"],
    ["ราคาต่อหน่วย", "รวมค่าวัสดุและค่าแรง ยังไม่รวมภาษีมูลค่าเพิ่มและค่าดำเนินการ"],
    ["ขอบเขตงาน", "ครอบคลุมงานพื้นที่ตามการตรวจจับ ไม่รวมงานระบบและงานตกแต่งพิเศษ"],
    ["สกุลเงิน", "บาท (THB)"],
  ].forEach((row, i) => s7.addRow({ no: i + 1, type: row[0], detail: row[1] }));
  styleBody(s7, 2);

  // 08 — ตรวจสอบพื้นที่
  const s8 = wb.addWorksheet("08_ตรวจสอบพื้นที่");
  s8.columns = [
    { header: "Area ID", key: "id", width: 12 },
    { header: "หน้า PDF", key: "page", width: 10 },
    { header: "สี Mark-up", key: "color", width: 16 },
    { header: "พื้นที่", key: "area", width: 14 },
    { header: "Designer Review", key: "review", width: 20 },
  ];
  styleHeaderRow(s8.getRow(1));
  items.forEach((it) =>
    s8.addRow({ id: it.id, page: 1, color: it.category, area: Number(it.areaSqm.toFixed(2)), review: "รอตรวจสอบ" }),
  );
  bahtFmt(s8, ["D"]);
  styleBody(s8, 2);

  // 09 — สรุปตามหมวด
  const s9 = wb.addWorksheet("09_สรุปตามหมวด");
  s9.columns = [
    { header: "หมวดงาน", key: "cat", width: 30 },
    { header: "จำนวนรายการ", key: "count", width: 16 },
    { header: "รวม (บาท)", key: "sum", width: 18 },
  ];
  styleHeaderRow(s9.getRow(1));
  for (const [cat, v] of byCategory) {
    s9.addRow({ cat: `${cat} — ${RATES[cat].label}`, count: v.count, sum: v.cost });
  }
  const s9total = s9.addRow({ cat: "รวมทั้งหมด", count: items.length, sum: totalCost });
  s9total.font = { bold: true };
  bahtFmt(s9, ["C"]);
  styleBody(s9, 2);

  // 10 — ประวัติแก้ไข
  const s10 = wb.addWorksheet("10_ประวัติแก้ไข");
  s10.columns = [
    { header: "Revision", key: "rev", width: 12 },
    { header: "วันที่", key: "date", width: 16 },
    { header: "รายการเปลี่ยนแปลง", key: "change", width: 44 },
    { header: "Cost Impact", key: "impact", width: 18 },
  ];
  styleHeaderRow(s10.getRow(1));
  s10.addRow({
    rev: "R0",
    date: new Date().toISOString().slice(0, 10),
    change: `ประเมินราคาเริ่มต้นจาก AI (${items.length} พื้นที่ / ${totalGfa.toFixed(2)} ตร.ม.)`,
    impact: totalCost,
  });
  bahtFmt(s10, ["D"]);
  styleBody(s10, 2);

  // Cover accent on the summary tab.
  s1.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT_FILL } };
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  });

  const buffer = await wb.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}
