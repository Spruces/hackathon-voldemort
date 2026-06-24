import { NextRequest, NextResponse } from "next/server";
import { getRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getTimeSlots } from "@/lib/catchtable";

export async function GET(request: NextRequest) {
  const role = await getRole();
  if (!role) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");
  const date = searchParams.get("date");
  const persons = parseInt(searchParams.get("persons") || "2");

  if (!restaurantId || !date) {
    return NextResponse.json(
      { error: "restaurantId, date 필수" },
      { status: 400 }
    );
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: parseInt(restaurantId) },
    include: { catchtableCache: true },
  });

  if (!restaurant || !restaurant.catchtableMatched) {
    return NextResponse.json({
      available: false,
      reason: "catchtable_not_matched",
      timeSlots: null,
    });
  }

  const shopRef = restaurant.catchtableCache?.shopRef;
  if (!shopRef) {
    return NextResponse.json({
      available: false,
      reason: "no_shop_ref",
      timeSlots: null,
    });
  }

  if (!process.env.CT_SESSION_COOKIE) {
    return NextResponse.json({
      available: null,
      reason: "no_session_cookie",
      message: "시간대별 조회에는 캐치테이블 세션이 필요합니다. scripts/catchtable-auth.py를 실행하세요.",
      timeSlots: null,
    });
  }

  const timeSlots = getTimeSlots(shopRef, date, persons);

  if (!timeSlots) {
    return NextResponse.json({
      available: null,
      reason: "api_error",
      timeSlots: null,
    });
  }

  const availableSlots = timeSlots.filter((s) => s.available);

  return NextResponse.json({
    available: availableSlots.length > 0,
    restaurantId: parseInt(restaurantId),
    date,
    persons,
    timeSlots,
    availableCount: availableSlots.length,
  });
}
