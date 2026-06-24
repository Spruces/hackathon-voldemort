import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRole } from "@/lib/session";
import { CATEGORY_NORM_MAP, LOCATION_NORM_MAP } from "@/lib/constants";

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

// 식당 추가 (사장님 전용) — 엑셀 형식 그대로 직접 입력
export async function POST(request: NextRequest) {
  const role = await getRole();
  if (role !== "owner") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const body = await request.json();
  const nameKor = (body.nameKor || "").trim();
  const locationRaw = (body.location || "").trim();
  const categoryRaw = (body.category || "").trim();
  const address = (body.address || "").trim();

  // 필수: 한글명·위치·종류·주소 (엑셀 기준 결측 0인 컬럼)
  if (!nameKor || !locationRaw || !categoryRaw || !address) {
    return NextResponse.json(
      { error: "식당명(한글)·위치·종류·주소는 필수입니다." },
      { status: 400 }
    );
  }

  // 정규화: 종류 → 7종, 위치 → 표기 통일 (07-2/07-3 규칙)
  const categoryNorm = CATEGORY_NORM_MAP[categoryRaw] || "아시안·기타";
  const locationNorm = LOCATION_NORM_MAP[locationRaw] || locationRaw;

  const created = await prisma.restaurant.create({
    data: {
      nameKor,
      nameEng: (body.nameEng || "").trim() || null,
      locationRaw,
      locationNorm,
      categoryRaw,
      categoryNorm,
      tel: (body.tel || "").trim() || null,
      address,
      internalMemo: (body.memo || "").trim() || null,
      updatedBy: "owner",
    },
    select: { id: true, nameKor: true },
  });

  return NextResponse.json({ ok: true, restaurant: created }, { status: 201 });
}
