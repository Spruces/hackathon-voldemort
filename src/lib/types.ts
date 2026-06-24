export interface Restaurant {
  id: number;
  nameKor: string;
  nameEng: string | null;
  locationNorm: string;
  locationRaw: string | null;
  categoryNorm: string;
  categoryRaw: string | null;
  tel: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  publicDesc: string | null;
  hours: string | null;
  internalMemo: string | null;
  parking: string | null;
  country: string;
  updatedAt: string;
}

export type UserRole = "viewer" | "owner";
