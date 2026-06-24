import { PrismaClient } from "../src/generated/prisma";
import * as XLSX from "xlsx";
import * as bcryptjs from "bcryptjs";
import { nanoid } from "nanoid";
import * as path from "path";
import * as fs from "fs";

const prisma = new PrismaClient();

const CATEGORY_NORM_MAP: Record<string, string> = {
  Korean: "한식",
  한식: "한식",
  고기집: "한식",
  돼지고기: "한식",
  샤브샤브: "한식",
  "한우 오마카세": "한식",
  "양 고기집": "한식",
  닭고기: "한식",
  정육식당: "한식",
  횟집: "한식",
  전골: "한식",
  Sushi: "일식",
  일식: "일식",
  이자카야: "일식",
  "일식 소바": "일식",
  "일식 스끼야끼": "일식",
  "장어덮밥(히쯔마부시)": "일식",
  "일식 오마카세": "일식",
  Italian: "이탈리안",
  Pizza: "이탈리안",
  Chinese: "중식",
  French: "프렌치",
  American: "아메리칸·양식",
  Steak: "아메리칸·양식",
  Seafood: "아메리칸·양식",
  "American·Wine": "아메리칸·양식",
  "American/Asian": "아메리칸·양식",
  Spanish: "아메리칸·양식",
  "Fine Dining": "아메리칸·양식",
  "Italian/Steak": "아메리칸·양식",
  Mexican: "아시안·기타",
  Asian: "아시안·기타",
  Indian: "아시안·기타",
  Thai: "아시안·기타",
};

const LOCATION_NORM_MAP: Record<string, string> = {
  청당동: "청담동",
  도곡: "도곡동",
  종로: "종로구",
  "한남동/이태원": "한남동",
  "서울역/마포": "서울역",
};

function normalizeCategory(raw: string): string {
  return CATEGORY_NORM_MAP[raw.trim()] || "아시안·기타";
}

function normalizeLocation(raw: string): string {
  const trimmed = raw.trim();
  return LOCATION_NORM_MAP[trimmed] || trimmed;
}

function parseMemo(memo: string | null): {
  publicDesc: string | null;
  hours: string | null;
  internalMemo: string | null;
} {
  if (!memo || !memo.trim()) {
    return { publicDesc: null, hours: null, internalMemo: null };
  }

  const lines = memo
    .split(/[,;]|\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let hours: string | null = null;
  const publicParts: string[] = [];
  const internalParts: string[] = [];

  for (const line of lines) {
    if (
      /\d{1,2}:\d{2}/.test(line) ||
      /휴무|정기휴일|브레이크|Break/i.test(line)
    ) {
      hours = hours ? `${hours}, ${line}` : line;
    } else if (
      /추천|소개|단골|접대|VIP|내부|사장|대표/i.test(line) ||
      /\(.*\)\s*추천/.test(line)
    ) {
      internalParts.push(line);
    } else {
      publicParts.push(line);
    }
  }

  return {
    publicDesc: publicParts.length > 0 ? publicParts.join(". ") : null,
    hours,
    internalMemo: internalParts.length > 0 ? internalParts.join(". ") : null,
  };
}

interface CatchtableMatch {
  idx: number;
  name_kor: string;
  location: string;
  ct_code: string;
  ct_name: string;
  ct_addr: string;
  exact: boolean;
}

async function main() {
  console.log("🍽 ETL v2.0 시작: 엑셀 + 캐치테이블 매칭 → DB");

  // 1. 엑셀 읽기
  const xlsxPath = path.join(__dirname, "../data/Restaurant Korea_May 2026.xlsx");
  const workbook = XLSX.readFile(xlsxPath);
  const sheet = workbook.Sheets["Korea"];
  const allRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
  const dataRows = allRows.slice(3).filter((row) => row && row[1] && String(row[1]).trim());
  console.log(`📊 엑셀에서 ${dataRows.length}건 읽음`);

  // 2. 캐치테이블 매칭 데이터 로드
  const ctMatchPath = path.join(__dirname, "../data/catchtable_matches.json");
  let ctMatches: CatchtableMatch[] = [];
  if (fs.existsSync(ctMatchPath)) {
    const ctData = JSON.parse(fs.readFileSync(ctMatchPath, "utf-8"));
    ctMatches = ctData.matches || [];
    console.log(`🔗 캐치테이블 매칭: ${ctMatches.length}건 로드`);
  } else {
    console.log("⚠️ catchtable_matches.json 없음 — 매칭 없이 진행");
  }

  // 매칭 데이터를 idx 기준 맵으로
  const ctMap = new Map<number, CatchtableMatch>();
  for (const m of ctMatches) {
    ctMap.set(m.idx, m);
  }

  // 3. DB 초기화
  await prisma.daySlotCache.deleteMany();
  await prisma.catchtableCache.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.accessConfig.deleteMany();
  await prisma.session.deleteMany();

  // 4. 식당 적재
  let loaded = 0;
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const idx = i + 1;
    const nameKor = String(row[1] || "").trim();
    const nameEng = String(row[2] || "").trim() || null;
    const locationRaw = String(row[3] || "").trim();
    const categoryRaw = String(row[4] || "").trim();
    const tel = String(row[5] || "").trim() || null;
    const address = String(row[6] || "").trim();
    const memo = String(row[7] || "").trim() || null;

    if (!nameKor) continue;

    const locationNorm = normalizeLocation(locationRaw);
    const categoryNorm = normalizeCategory(categoryRaw);
    const { publicDesc, hours, internalMemo } = parseMemo(memo);

    const ctMatch = ctMap.get(idx);

    await prisma.restaurant.create({
      data: {
        nameKor,
        nameEng,
        locationNorm,
        locationRaw,
        categoryNorm,
        categoryRaw,
        tel,
        address,
        publicDesc,
        hours,
        internalMemo,
        parking: null,
        country: "Korea",
        catchtableAlias: ctMatch?.ct_code || null,
        catchtableMatched: !!ctMatch,
      },
    });
    loaded++;
  }

  console.log(`✅ 식당 ${loaded}건 적재 (캐치테이블 매칭: ${ctMap.size}건)`);

  // 5. AccessConfig
  const viewerHash = await bcryptjs.hash("000000", 10);
  const ownerHash = await bcryptjs.hash("999999", 10);

  await prisma.accessConfig.create({
    data: {
      urlToken: nanoid(22),
      viewerPasswordHash: viewerHash,
      ownerPasswordHash: ownerHash,
      sessionDays: 7,
    },
  });

  console.log("🔑 AccessConfig 생성 (viewer: 000000, owner: 999999)");
  console.log("🎉 ETL v2.0 완료!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
