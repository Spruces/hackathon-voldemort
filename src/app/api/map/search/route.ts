import { NextRequest, NextResponse } from "next/server";
import { getRole } from "@/lib/session";

export async function GET(request: NextRequest) {
  const role = await getRole();
  if (role !== "owner") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const query = request.nextUrl.searchParams.get("query");
  if (!query) {
    return NextResponse.json({ error: "검색어 필요" }, { status: 400 });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ results: [], fallback: true });
  }

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=FD6&size=15`,
      {
        headers: { Authorization: `KakaoAK ${apiKey}` },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ results: [], error: "API 호출 실패" });
    }

    const data = await res.json();
    return NextResponse.json({
      results: data.documents || [],
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
