import { NextRequest, NextResponse } from "next/server";
import { getRole } from "@/lib/session";
import { getBatchETA } from "@/lib/kakao-mobility";

export async function POST(request: NextRequest) {
  const role = await getRole();
  if (!role) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await request.json();
  const { origin, destinations } = body;

  if (
    !origin ||
    typeof origin.lat !== "number" ||
    typeof origin.lng !== "number"
  ) {
    return NextResponse.json({ error: "origin 필수 (lat, lng)" }, { status: 400 });
  }

  if (!Array.isArray(destinations) || destinations.length === 0) {
    return NextResponse.json({ error: "destinations 필수" }, { status: 400 });
  }

  // 최대 50건으로 제한 (API 호출 과다 방지)
  const limited = destinations.slice(0, 50);

  const results = await getBatchETA(origin, limited);

  const eta: Array<{
    id: number;
    durationMin: number;
    distanceKm: number;
  }> = [];

  for (const [id, data] of results) {
    eta.push({ id, ...data });
  }

  // 시간순 정렬
  eta.sort((a, b) => a.durationMin - b.durationMin);

  return NextResponse.json({ origin, eta });
}
