const KAKAO_REST_KEY = process.env.KAKAO_REST_API_KEY;

interface Coordinate {
  lat: number;
  lng: number;
}

interface DirectionResult {
  duration: number; // 초
  distance: number; // 미터
}

export async function getETA(
  origin: Coordinate,
  destination: Coordinate
): Promise<DirectionResult | null> {
  if (!KAKAO_REST_KEY) {
    console.error("KAKAO_REST_API_KEY not set");
    return null;
  }

  try {
    const url = new URL("https://apis-navi.kakaomobility.com/v1/directions");
    url.searchParams.set("origin", `${origin.lng},${origin.lat}`);
    url.searchParams.set("destination", `${destination.lng},${destination.lat}`);
    url.searchParams.set("priority", "RECOMMEND");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_KEY}`,
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`Kakao Mobility API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const route = data.routes?.[0];

    if (!route || route.result_code !== 0) {
      return null;
    }

    return {
      duration: route.summary.duration,
      distance: route.summary.distance,
    };
  } catch (e) {
    console.error("Kakao Mobility API failed:", e);
    return null;
  }
}

export async function getBatchETA(
  origin: Coordinate,
  destinations: Array<{ id: number; lat: number; lng: number }>
): Promise<Map<number, { durationMin: number; distanceKm: number }>> {
  const results = new Map<number, { durationMin: number; distanceKm: number }>();

  const promises = destinations.map(async (dest) => {
    const result = await getETA(origin, { lat: dest.lat, lng: dest.lng });
    if (result) {
      results.set(dest.id, {
        durationMin: Math.round(result.duration / 60),
        distanceKm: Math.round(result.distance / 100) / 10,
      });
    }
  });

  await Promise.all(promises);
  return results;
}
