import type { AreaCategory } from "./types";

/** Unit rates in THB per square meter, split into material + labor. */
export const RATES: Record<
  AreaCategory,
  { material: number; labor: number; label: string; scope: string }
> = {
  RM: { material: 450, labor: 150, label: "งานพื้นที่ภายใน", scope: "งานพื้น ผนัง ฝ้า (ห้องปิด)" },
  FA: { material: 650, labor: 220, label: "งานพื้นที่พิเศษ", scope: "ผนังเอียง/โค้ง งานสถาปัตย์พิเศษ" },
  EX: { material: 350, labor: 120, label: "งานพื้นที่ภายนอก", scope: "ระเบียง เฉลียง พื้นที่กึ่งเปิดโล่ง" },
};

/** Marker colors used both for the plan overlay and Excel tags. */
export const CATEGORY_COLORS: Record<AreaCategory, string> = {
  RM: "#2563EB",
  FA: "#D97706",
  EX: "#059669",
};

export const CURRENCY = "THB";

export function computeCost(category: AreaCategory, areaSqm: number) {
  const { material, labor } = RATES[category];
  const unitRate = material + labor;
  return {
    materialRate: material,
    laborRate: labor,
    unitRate,
    cost: Math.round(areaSqm * unitRate),
  };
}
