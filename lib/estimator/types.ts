export type AreaCategory = "RM" | "FA" | "EX";

export interface BoundingBox {
  /** Normalized 0..1 coordinates, origin top-left. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DetectedArea {
  id: string;
  name: string;
  category: AreaCategory;
  status: "DETECTED";
  areaSqm: number;
  materialRate: number;
  laborRate: number;
  unitRate: number;
  cost: number;
  bbox: BoundingBox;
  note?: string;
}

export interface AnalysisResult {
  items: DetectedArea[];
  totalCost: number;
  totalGFA: number;
  currency: string;
  scaleNote?: string;
}
