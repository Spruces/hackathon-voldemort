import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRole } from "@/lib/session";

interface TimeSlotInfo {
  time: string;
  available: boolean;
}

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
  const meal = searchParams.get("meal"); // "lunch" | "dinner" | null

  if (!date) {
    return NextResponse.json({ error: "date 필수" }, { status: 400 });
  }

  try {
    const daySlots = await prisma.daySlotCache.findMany({
      where: { date },
      select: {
        restaurantId: true,
        availableStatus: true,
        availablePersons: true,
        benefit: true,
      },
    });

    const results: Array<{
      restaurantId: number;
      available: boolean;
      personCounts: number[];
      timeSlots: TimeSlotInfo[] | null;
      availableTimes: string[];
    }> = [];

    for (const cached of daySlots) {
      const isAvailable = cached.availableStatus === "AVAILABLE";
      const personCounts = cached.availablePersons
        ? JSON.parse(cached.availablePersons)
        : [];

      let timeSlots: TimeSlotInfo[] | null = null;
      let availableTimes: string[] = [];

      if (cached.benefit) {
        try {
          const benefitData = JSON.parse(cached.benefit);
          if (benefitData.timeSlots && Array.isArray(benefitData.timeSlots)) {
            timeSlots = benefitData.timeSlots.map((s: any) => ({
              time: s.time,
              available: s.available,
            }));

            let filtered = timeSlots!.filter((s) => s.available);

            if (meal === "lunch") {
              filtered = filtered.filter((s) => {
                const hour = parseInt(s.time.split(":")[0]);
                return hour < 15;
              });
            } else if (meal === "dinner") {
              filtered = filtered.filter((s) => {
                const hour = parseInt(s.time.split(":")[0]);
                return hour >= 17;
              });
            }

            availableTimes = filtered.map((s) => s.time);
          }
        } catch {}
      }

      if (persons && personCounts.length > 0 && !personCounts.includes(persons)) {
        results.push({
          restaurantId: cached.restaurantId,
          available: false,
          personCounts,
          timeSlots,
          availableTimes: [],
        });
        continue;
      }

      const finalAvailable = meal ? availableTimes.length > 0 : isAvailable;

      results.push({
        restaurantId: cached.restaurantId,
        available: finalAvailable,
        personCounts,
        timeSlots,
        availableTimes,
      });
    }

    return NextResponse.json({ date, persons, meal, results });
  } catch (e) {
    console.error("Availability API error:", e);
    return NextResponse.json({ date, persons, meal, results: [] });
  }
}
