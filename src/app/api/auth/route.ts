import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "비밀번호를 입력해 주세요" }, { status: 400 });
  }

  const config = await prisma.accessConfig.findFirst();
  if (!config) {
    return NextResponse.json({ error: "시스템 설정 오류" }, { status: 500 });
  }

  // 사장님 비번 먼저 체크 (두 비번이 같은 값이면 서버 거부 — 정의서 2-2)
  const isOwner = await bcryptjs.compare(password, config.ownerPasswordHash);
  if (isOwner) {
    const session = await getSession();
    session.role = "owner";
    session.expiresAt = new Date(
      Date.now() + config.sessionDays * 24 * 60 * 60 * 1000
    ).toISOString();
    await session.save();
    return NextResponse.json({ role: "owner" });
  }

  const isViewer = await bcryptjs.compare(password, config.viewerPasswordHash);
  if (isViewer) {
    const session = await getSession();
    session.role = "viewer";
    session.expiresAt = new Date(
      Date.now() + config.sessionDays * 24 * 60 * 60 * 1000
    ).toISOString();
    await session.save();
    return NextResponse.json({ role: "viewer" });
  }

  return NextResponse.json(
    { error: "비밀번호가 일치하지 않습니다" },
    { status: 401 }
  );
}

export async function DELETE() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}
