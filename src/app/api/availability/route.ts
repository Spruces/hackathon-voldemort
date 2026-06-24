import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRole } from "@/lib/session";
import { getDaySlots } from "@/lib/catchtable";

export async function GET(request: NextRequest) {
  const role = await getRole();
  if (!role) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const persons = searchParams.get("persons")
    ? parseInt(searchParams.get("persons")!)
    : undefined;

  if (!date) {
    return NextResponse.json({ error: "date 필수" }, { status: 400 });
  }

  const restaurants = await prisma.restaurant.findMany({
    where: { catchtableMatched: true },
    select: {
      id: true,
      catchtableAlias: true,
      daySlots: {
        where: { date },
      },
    },
  });

  const now = Date.now();
  const TTL_MS = 30 * 60 * 1000; // 30분

  const results: Array<{
    restaurantId: number;
    available: boolean;
    personCounts: number[];
    benefit: string | null;
  }> = [];

  for (const r of restaurants) {
    if (!r.catchtableAlias) continue;

    const cached = r.daySlots[0];
    const cacheValid =
      cached && now - new Date(cached.fetchedAt).getTime() < TTL_MS;

    if (cacheValid) {
      const available = cached.availableStatus === "AVAILABLE";
      const personCounts = cached.availablePersons
        ? JSON.parse(cached.availablePersons)
        : [];

      if (persons && !personCounts.includes(persons)) {
        results.push({ restaurantId: r.id, available: false, personCounts, benefit: cached.benefit });
      } else {
        results.push({ restaurantId: r.id, available, personCounts, benefit: cached.benefit });
      }
    } else {
      // 캐시 만료 → 실시간 조회
      try {
        const slots = getDaySlots(r.catchtableAlias);
        const slot = slots.find((s) => s.date === date);

        // 전체 슬롯 캐시 갱신
        for (const s of slots) {
          await prisma.daySlotCache.upsert({
            where: {
              restaurantId_date: { restaurantId: r.id, date: s.date },
            },
            update: {
              availableStatus: s.availableStatus,
              availablePersons: JSON.stringify(s.availablePersonCounts),
              benefit: s.benefit ? JSON.stringify(s.benefit) : null,
              fetchedAt: new Date(),
            },
            create: {
              restaurantId: r.id,
              date: s.date,
              availableStatus: s.availableStatus,
              availablePersons: JSON.stringify(s.availablePersonCounts),
              benefit: s.benefit ? JSON.stringify(s.benefit) : null,
              fetchedAt: new Date(),
            },
          });
        }

        if (slot && slot.availableStatus === "AVAILABLE") {
          const personCounts = slot.availablePersonCounts;
          if (persons && !personCounts.includes(persons)) {
            results.push({ restaurantId: r.id, available: false, personCounts, benefit: null });
          } else {
            results.push({ restaurantId: r.id, available: true, personCounts, benefit: null });
          }
        } else {
          results.push({ restaurantId: r.id, available: false, personCounts: [], benefit: null });
        }
      } catch {
        results.push({ restaurantId: r.id, available: false, personCounts: [], benefit: null });
      }
    }
  }

  return NextResponse.json({ date, persons, results });
}
