import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  return NextResponse.json({ available: !!apiKey });
}
