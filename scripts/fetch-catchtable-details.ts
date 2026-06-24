import { PrismaClient } from "../src/generated/prisma";
import { execSync } from "child_process";

const prisma = new PrismaClient();
const CT_BIN = "/tmp/ct-test/bin/ct";

async function main() {
  const restaurants = await prisma.restaurant.findMany({
    where: { catchtableMatched: true, catchtableAlias: { not: null } },
    select: { id: true, catchtableAlias: true, nameKor: true },
  });

  console.log(`🔍 캐치테이블 상세 조회: ${restaurants.length}건`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < restaurants.length; i++) {
    const r = restaurants[i];
    if (!r.catchtableAlias) continue;

    try {
      const result = execSync(`${CT_BIN} shop info ${r.catchtableAlias} -f json`, {
        encoding: "utf-8",
        timeout: 15000,
      });

      const data = JSON.parse(result);
      const shop = data.shop?.data?.shopDetailVO;

      if (!shop) {
        failed++;
        continue;
      }

      // Restaurant 좌표 업데이트
      await prisma.restaurant.update({
        where: { id: r.id },
        data: {
          lat: shop.lat || null,
          lng: shop.lon || null,
        },
      });

      // CatchtableCache upsert
      await prisma.catchtableCache.upsert({
        where: { restaurantId: r.id },
        update: {
          shopRef: data.shop_ref || null,
          shopName: shop.shopName || null,
          bizHours: shop.bizHourGuide || null,
          parkingGuide: shop.parkingGuide || null,
          priceLunch: shop.lunchPriceText || null,
          priceDinner: shop.dinnerPriceText || null,
          rating: shop.review?.finalScore || null,
          imageUrl: shop.images?.[0]?.imgUrl || null,
          onlineYn: shop.onlineCatchtableUseYn || null,
          serviceDesc: shop.serviceDesc || null,
          fetchedAt: new Date(),
        },
        create: {
          restaurantId: r.id,
          alias: r.catchtableAlias!,
          shopRef: data.shop_ref || null,
          shopName: shop.shopName || null,
          bizHours: shop.bizHourGuide || null,
          parkingGuide: shop.parkingGuide || null,
          priceLunch: shop.lunchPriceText || null,
          priceDinner: shop.dinnerPriceText || null,
          rating: shop.review?.finalScore || null,
          imageUrl: shop.images?.[0]?.imgUrl || null,
          onlineYn: shop.onlineCatchtableUseYn || null,
          serviceDesc: shop.serviceDesc || null,
          fetchedAt: new Date(),
        },
      });

      updated++;

      if ((i + 1) % 20 === 0) {
        console.log(`  진행: ${i + 1}/${restaurants.length} (성공: ${updated}, 실패: ${failed})`);
      }

      // Rate limit
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (e) {
      failed++;
    }
  }

  console.log(`\n✅ 완료: ${updated}건 업데이트, ${failed}건 실패`);

  // 좌표 통계
  const withCoords = await prisma.restaurant.count({ where: { lat: { not: null } } });
  console.log(`📍 좌표 보유: ${withCoords}/228`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
