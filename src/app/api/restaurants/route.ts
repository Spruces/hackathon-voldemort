import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRole } from "@/lib/session";

export async function GET() {
  const role = await getRole();
  if (!role) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const restaurants = await prisma.restaurant.findMany({
    orderBy: { nameKor: "asc" },
    select: {
      id: true,
      nameKor: true,
      nameEng: true,
      locationNorm: true,
      categoryNorm: true,
      categoryRaw: true,
      tel: true,
      address: true,
      lat: true,
      lng: true,
      publicDesc: true,
      hours: true,
      parking: true,
      catchtableAlias: true,
      catchtableMatched: true,
      ...(role === "owner" ? { internalMemo: true } : {}),
    },
  });

  return NextResponse.json({ restaurants, role });
}
