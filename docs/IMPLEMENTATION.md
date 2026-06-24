# 시스템 구현 가이드 (v2.0)

> 본 문서는 `docs/요구사항 정의서.md` v2.0(지도+시간+예약 중심)을 기반으로 작성된 기술 구현 명세이다.

---

## 1. 기술 스택

| 영역 | 기술 | 선택 이유 |
|------|------|------|
| **프론트엔드** | Next.js 14 (App Router) + TypeScript | 모바일 우선 SSR, 빠른 초기 로딩 |
| **UI 프레임워크** | Tailwind CSS + shadcn/ui | 다크 테마 커스터마이징, 반응형 |
| **지도** | 카카오맵 JavaScript SDK | 무료 30만/일, 한국 데이터 정확도 |
| **도달시간** | 카카오 모빌리티 길찾기 API | 실시간 교통 반영 ETA |
| **예약 조회** | catchtable-cli (Python) → Next.js API Route에서 호출 | 228건 중 91% 매칭, 실시간 예약 가능 여부 |
| **백엔드/API** | Next.js API Routes (Route Handlers) | 프론트와 동일 프로젝트 |
| **데이터베이스** | SQLite (Prisma ORM) | 해커톤 데모, 228건 소규모, 배포 단순 |
| **인증** | 세션 기반 (iron-session) | 쿠키 암호화, 7일 세션 |
| **배포** | 로컬 + ngrok 터널링 | 해커톤 데모 |

---

## 2. 프로젝트 구조

```
/
├── CLAUDE.md
├── docs/                          ← 기획 문서
├── data/
│   ├── Restaurant Korea_May 2026.xlsx   ← 원본 (read-only)
│   ├── catchtable_matches.json    ← 캐치테이블 매칭 결과
│   └── match_results.json         ← 네이버 플레이스 매칭
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             ← 루트 레이아웃 (다크 테마)
│   │   ├── page.tsx               ← S1: 비밀번호 입력
│   │   ├── map/
│   │   │   └── page.tsx           ← S2: 메인 (지도 + 바텀시트)
│   │   ├── restaurant/
│   │   │   └── [id]/
│   │   │       ├── page.tsx       ← S3: 식당 상세
│   │   │       └── edit/
│   │   │           └── page.tsx   ← S4: 식당 편집 (Owner)
│   │   ├── settings/
│   │   │   └── page.tsx           ← S5: 관리 (Owner)
│   │   └── api/
│   │       ├── auth/              ← 인증 API
│   │       ├── restaurants/       ← 식당 데이터 API
│   │       ├── availability/      ← 캐치테이블 예약 조회 프록시
│   │       └── directions/        ← 카카오 모빌리티 도달시간 프록시
│   │
│   ├── components/
│   │   ├── ui/                    ← shadcn/ui
│   │   ├── map-view.tsx           ← 카카오맵 + 핀
│   │   ├── bottom-sheet.tsx       ← 바텀시트 (식당 리스트)
│   │   ├── restaurant-card.tsx    ← 식당 카드 (시간 표시)
│   │   ├── date-picker.tsx        ← 날짜/시간 선택 바
│   │   ├── filter-chips.tsx       ← 업종·지역·인원 칩
│   │   ├── eta-display.tsx        ← 도달시간 표시
│   │   └── mode-badge.tsx         ← 모드 배지
│   │
│   ├── lib/
│   │   ├── db.ts                  ← Prisma 클라이언트
│   │   ├── auth.ts                ← 세션/인증
│   │   ├── catchtable.ts          ← catchtable-cli 래퍼
│   │   ├── kakao-mobility.ts      ← 카카오 모빌리티 래퍼
│   │   ├── kakao-map.ts           ← 카카오맵 SDK 유틸
│   │   └── constants.ts           ← 업종 매핑, 정규화 규칙
│   │
│   └── types/
│       └── index.ts
│
├── scripts/
│   └── catchtable-proxy.py        ← catchtable-cli를 HTTP로 감싸는 경량 서버
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                    ← 228건 + 캐치테이블 매칭 시딩
│
├── package.json
├── tailwind.config.ts
├── next.config.ts
└── .env.local                     ← API 키, DB URL (git 미추적)
```

---

## 3. 데이터베이스 스키마

```prisma
model Restaurant {
  id              Int      @id @default(autoincrement())
  nameKor         String   @map("name_kor")
  nameEng         String?  @map("name_eng")
  locationNorm    String   @map("location_norm")
  locationRaw     String?  @map("location_raw")
  categoryNorm    String   @map("category_norm")
  categoryRaw     String?  @map("category_raw")
  tel             String?
  address         String
  lat             Float?
  lng             Float?
  publicDesc      String?  @map("public_desc")
  hours           String?
  internalMemo    String?  @map("internal_memo")
  parking         String?
  country         String   @default("Korea")

  // 캐치테이블 연동
  catchtableAlias   String?  @map("catchtable_alias")
  catchtableMatched Boolean  @default(false) @map("catchtable_matched")

  updatedBy       String?  @map("updated_by")
  updatedAt       DateTime @updatedAt @map("updated_at")
  createdAt       DateTime @default(now()) @map("created_at")

  catchtableCache CatchtableCache?
  daySlots        DaySlotCache[]

  @@map("restaurants")
}

model CatchtableCache {
  id            Int      @id @default(autoincrement())
  restaurantId  Int      @unique @map("restaurant_id")
  alias         String
  shopRef       String?  @map("shop_ref")
  shopName      String?  @map("shop_name")
  bizHours      String?  @map("biz_hours")
  parkingGuide  String?  @map("parking_guide")
  priceLunch    String?  @map("price_lunch")
  priceDinner   String?  @map("price_dinner")
  rating        String?
  imageUrl      String?  @map("image_url")
  onlineYn      String?  @map("online_yn")
  fetchedAt     DateTime @map("fetched_at")
  ttl           Int      @default(604800)

  restaurant    Restaurant @relation(fields: [restaurantId], references: [id])

  @@map("catchtable_cache")
}

model DaySlotCache {
  id              Int      @id @default(autoincrement())
  restaurantId    Int      @map("restaurant_id")
  date            String
  availableStatus String   @map("available_status")
  availablePersons String? @map("available_persons")
  benefit         String?
  fetchedAt       DateTime @map("fetched_at")
  ttl             Int      @default(1800)

  restaurant      Restaurant @relation(fields: [restaurantId], references: [id])

  @@index([restaurantId, date])
  @@map("day_slot_cache")
}

model AccessConfig {
  id                  Int      @id @default(autoincrement())
  urlToken            String   @unique @map("url_token")
  viewerPasswordHash  String   @map("viewer_password_hash")
  ownerPasswordHash   String   @map("owner_password_hash")
  sessionDays         Int      @default(7) @map("session_days")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@map("access_config")
}

model Session {
  token     String   @id
  role      String
  expiresAt DateTime @map("expires_at")

  @@map("sessions")
}
```

---

## 4. 핵심 API 라우트

### POST /api/auth
비밀번호 검증 → 세션 생성 → 모드 분기

### GET /api/restaurants
228건 전체 반환 (catchtable_alias, lat/lng 포함). 클라이언트 필터링.

### GET /api/availability?date=2026-06-25&persons=2
지정 날짜의 예약 가능 식당 목록.
→ DaySlotCache 확인 → 만료 시 catchtable-cli 배치 호출 → 갱신

### GET /api/availability/[id]
특정 식당의 14일간 예약 가능 정보.

### POST /api/directions
`{ origin: {lat, lng}, destinations: [{id, lat, lng}, ...] }`
→ 카카오 모빌리티 배치 호출 → ETA(분) 배열 반환

### GET /api/restaurant/[id]
식당 상세 (DB + CatchtableCache 조인)

---

## 5. catchtable-cli 연동 방식

### 옵션 A: Next.js에서 직접 subprocess 호출 (간단, 데모용)

```typescript
// src/lib/catchtable.ts
import { execSync } from 'child_process';

export function getAvailability(alias: string) {
  const result = execSync(
    `/tmp/ct-test/bin/ct shop info ${alias} -f json`,
    { encoding: 'utf-8', timeout: 10000 }
  );
  const data = JSON.parse(result);
  return data.day_slots?.data || [];
}

export function searchShop(keyword: string) {
  const result = execSync(
    `/tmp/ct-test/bin/ct search search "${keyword}" -f json`,
    { encoding: 'utf-8', timeout: 10000 }
  );
  const data = JSON.parse(result);
  return data.data?.shops || [];
}
```

### 옵션 B: Python HTTP 프록시 (프로덕션용)

```python
# scripts/catchtable-proxy.py
# FastAPI 서버로 catchtable-cli를 HTTP API화
# Next.js에서 fetch로 호출
```

**데모에서는 옵션 A**로 시작. 성능 이슈 발생 시 옵션 B로 전환.

---

## 6. 디자인 시스템

### 색상 팔레트

| 역할 | 값 | 용도 |
|------|------|------|
| Background | `#0A0A0F` | 메인 배경 |
| Surface | `#1A1A2E` | 바텀시트, 카드 |
| Gold (Primary) | `#D4AF37` | 액센트, 예약가능 핀, CTA |
| Gold-light | `#F5E6A3` | 도달시간 숫자 |
| Text-primary | `#FAFAFA` | 본문 |
| Text-secondary | `#A0A0B0` | 보조 |
| Available | `#D4AF37` | 예약 가능 |
| Unavailable | `#4A4A5A` | 예약 불가/미확인 |
| Warning | `#F59E0B` | "늦을 수 있음" |
| Danger | `#E74C3C` | "도착 어려움" |

### 지도 핀 디자인

| 상태 | 색상 | 형태 |
|------|------|------|
| 예약 가능 | 골드 (#D4AF37) | 채워진 원 |
| 예약 불가/CLOSED | 회색 (#4A4A5A) | 빈 원 |
| 캐치테이블 미매칭 | 회색 + 점선 | 점선 테두리 원 |
| 선택됨 | 골드 + 확대 | 큰 원 + 팝업 |

### 바텀시트 카드

```
┌─────────────────────────────────────┐
│  12분   스시코우지                    │
│  🍣 일식 · 청담동   예약가능 ✅ 1~2명  │
│  ⭐ 4.8 · 저녁 28만원                │
└─────────────────────────────────────┘
```

---

## 7. 도달시간 계산 전략

### 호출 최적화 (228건 전체 호출 방지)

1. **1차 필터**: 날짜 + 예약 가능 → ~50~100건으로 축소
2. **2차 필터**: 업종 + 지역 → ~10~30건
3. **모빌리티 호출**: 2차 필터 결과만 도달시간 계산
4. **캐시**: 동일 출발점-도착점 조합 5분 캐시

### 현위치 업데이트

- 페이지 로드 시 `navigator.geolocation.getCurrentPosition()`
- 5분마다 갱신 (watchPosition은 배터리 소모)
- 위치 권한 거부 시: 기본 위치(강남역) 사용 + 안내 표시

---

## 8. 배포 (ngrok)

```bash
# 1. 캐치테이블 CLI 환경 (이미 설치됨)
source /tmp/ct-test/bin/activate  # 또는 venv 경로

# 2. Next.js 개발 서버
npm run dev  # → http://localhost:3000

# 3. ngrok 터널링
ngrok http 3000
```

---

## 9. ETL (초기 데이터 시딩)

1. `data/Restaurant Korea_May 2026.xlsx` 파싱
2. 업종 정규화: 34종 → 7종
3. 위치 정규화: 오타 수정 + 복합 분리
4. 메모 분해: notes → public_desc / hours / internal_memo
5. `data/catchtable_matches.json` 로드 → catchtable_alias, lat/lng 매핑
6. Prisma seed로 DB 적재 (228건 + 매칭 정보)
7. 캐치테이블 상세 정보 배치 조회 → CatchtableCache 적재
8. AccessConfig 초기 행 생성

---

## 10. 개발 우선순위

| Phase | 범위 | 예상 |
|------|------|------|
| **P0** | DB 스키마 + 시딩 + S1(인증) | 기반 |
| **P0.5** | S2 지도 + 바텀시트 + 캐치테이블 예약 필터 | 핵심 차별점 |
| **P1** | 도달시간 계산 + "지금 바로" 모드 | 시간 기반 정렬 |
| **P1.5** | S3 식당 상세 + 예약 연결 | 상세 정보 |
| **P2** | S4(편집) + S5(관리) | Owner 기능 |
