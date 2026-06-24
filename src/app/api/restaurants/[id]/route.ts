import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRole } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getRole();
  if (!role) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: parseInt(id) },
    include: {
      catchtableCache: true,
      daySlots: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "식당 없음" }, { status: 404 });
  }

  const result = {
    restaurant: {
      ...restaurant,
      internalMemo: role === "owner" ? restaurant.internalMemo : null,
      daySlots: undefined,
    },
    daySlots: restaurant.daySlots,
    role,
  };

  return NextResponse.json(result);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getRole();
  if (role !== "owner") {
    return NextResponse.json({ error: "편집 권한 없음" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const allowedFields = [
    "publicDesc",
    "hours",
    "internalMemo",
    "parking",
    "categoryNorm",
    "catchtableAlias",
  ];
  const updateData: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field];
    }
  }

  if ("catchtableAlias" in body) {
    updateData.catchtableMatched = !!body.catchtableAlias;
  }

  const updated = await prisma.restaurant.update({
    where: { id: parseInt(id) },
    data: {
      ...updateData,
      updatedBy: "owner",
    },
  });

  return NextResponse.json(updated);
}
