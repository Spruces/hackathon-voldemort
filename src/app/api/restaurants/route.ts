import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRole } from "@/lib/session";
import { CATEGORY_NORM_MAP, LOCATION_NORM_MAP, parseCategoryFromKakao } from "@/lib/constants";

export async function GET() {
  const role = await getRole();
  if (!role) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const raw = await prisma.restaurant.findMany({
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
      district: true,
      catchtableAlias: true,
      catchtableMatched: true,
      catchtableCache: { select: { imageUrl: true, rating: true } },
      ...(role === "owner" ? { internalMemo: true } : {}),
    },
  });

  const restaurants = raw.map((r) => ({
    ...r,
    imageUrl: r.catchtableCache?.imageUrl || null,
    rating: r.catchtableCache?.rating || null,
    catchtableCache: undefined,
  }));

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

  // 정규화: 종류 → 7종, 위치 → 표기 통일
  // kakaoCategory가 있으면 카카오맵 기반 자동 분류, 없으면 기존 매핑
  const kakaoCategory = (body.kakaoCategory || "").trim();
  const categoryNorm = kakaoCategory
    ? parseCategoryFromKakao(kakaoCategory)
    : (CATEGORY_NORM_MAP[categoryRaw] || "아시안·기타");
  const locationNorm = LOCATION_NORM_MAP[locationRaw] || locationRaw;

  // 주소에서 구 자동 추출
  const districtMatch = address.match(/^(서울시?\s+)?(\S+구)/);
  const district = districtMatch ? districtMatch[2] : null;

  // 캐치테이블 자동 매칭 시도
  let catchtableAlias: string | null = null;
  let catchtableMatched = false;
  try {
    const { searchShop, getShopInfo } = await import("@/lib/catchtable");
    const results = searchShop(nameKor);
    if (results.length > 0) {
      const match = results[0];
      catchtableAlias = match.code;
      catchtableMatched = true;
    }
  } catch {}

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
      district,
      lat: body.lat ? Number(body.lat) : null,
      lng: body.lng ? Number(body.lng) : null,
      catchtableAlias,
      catchtableMatched,
      internalMemo: (body.memo || "").trim() || null,
      updatedBy: "owner",
    },
    select: { id: true, nameKor: true },
  });

  // 캐치테이블 매칭됐으면 비동기로 상세(이미지/평점/영업시간) 수집
  if (catchtableAlias) {
    try {
      const { getShopInfo } = await import("@/lib/catchtable");
      const info = getShopInfo(catchtableAlias);
      if (info) {
        await prisma.catchtableCache.create({
          data: {
            restaurantId: created.id,
            alias: catchtableAlias,
            shopRef: info.shopRef || null,
            shopName: info.detail.shopName || null,
            bizHours: (info.detail as any).bizHourGuide || null,
            parkingGuide: (info.detail as any).parkingGuide || null,
            priceLunch: (info.detail as any).lunchPriceText || null,
            priceDinner: (info.detail as any).dinnerPriceText || null,
            rating: info.detail.review?.finalScore || null,
            imageUrl: info.detail.images?.[0]?.imgUrl || null,
            onlineYn: (info.detail as any).onlineCatchtableUseYn || null,
            serviceDesc: (info.detail as any).serviceDesc || null,
            fetchedAt: new Date(),
          },
        });

        // 좌표도 갱신 (카카오맵에서 안 받았을 경우)
        if (info.detail.lat && info.detail.lon) {
          await prisma.restaurant.update({
            where: { id: created.id },
            data: { lat: info.detail.lat, lng: info.detail.lon },
          });
        }
      }
    } catch {}
  }

  return NextResponse.json({ ok: true, restaurant: created }, { status: 201 });
}
