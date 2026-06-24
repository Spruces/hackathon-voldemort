import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/db";
import { getRole } from "@/lib/session";

// 비밀번호 변경 — FR-08
export async function PATCH(request: NextRequest) {
  const role = await getRole();
  if (role !== "owner") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const { viewerPassword, ownerPassword } = await request.json();

  const config = await prisma.accessConfig.findFirst();
  if (!config) {
    return NextResponse.json({ error: "설정 없음" }, { status: 500 });
  }

  const updateData: Record<string, string> = {};

  if (viewerPassword) {
    if (viewerPassword.length !== 6 || !/^\d{6}$/.test(viewerPassword)) {
      return NextResponse.json(
        { error: "임원 비밀번호는 6자리 숫자여야 합니다" },
        { status: 400 }
      );
    }
    // 두 비번 동일값 거부 (정의서 2-2)
    if (ownerPassword && viewerPassword === ownerPassword) {
      return NextResponse.json(
        { error: "임원용과 사장님 비밀번호는 서로 달라야 합니다" },
        { status: 400 }
      );
    }
    updateData.viewerPasswordHash = await bcryptjs.hash(viewerPassword, 10);
  }

  if (ownerPassword) {
    if (ownerPassword.length !== 6 || !/^\d{6}$/.test(ownerPassword)) {
      return NextResponse.json(
        { error: "사장님 비밀번호는 6자리 숫자여야 합니다" },
        { status: 400 }
      );
    }
    if (viewerPassword && viewerPassword === ownerPassword) {
      return NextResponse.json(
        { error: "임원용과 사장님 비밀번호는 서로 달라야 합니다" },
        { status: 400 }
      );
    }
    // 기존 viewer 비번과 동일한지도 체크
    if (!viewerPassword) {
      const isSameAsViewer = await bcryptjs.compare(
        ownerPassword,
        config.viewerPasswordHash
      );
      if (isSameAsViewer) {
        return NextResponse.json(
          { error: "임원용과 사장님 비밀번호는 서로 달라야 합니다" },
          { status: 400 }
        );
      }
    }
    updateData.ownerPasswordHash = await bcryptjs.hash(ownerPassword, 10);
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.accessConfig.update({
      where: { id: config.id },
      data: updateData,
    });
  }

  return NextResponse.json({ ok: true });
}

// 전체 세션 강제 만료 — FR-08
export async function DELETE() {
  const role = await getRole();
  if (role !== "owner") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  await prisma.session.deleteMany();
  return NextResponse.json({ ok: true, message: "모든 세션이 만료되었습니다" });
}
