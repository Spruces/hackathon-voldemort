# 시스템 구현 가이드

> 본 문서는 `docs/요구사항 정의서.md`(단일원천)를 기반으로 작성된 기술 구현 명세이다.

---

## 1. 기술 스택

| 영역 | 기술 | 선택 이유 |
|------|------|------|
| **프론트엔드** | Next.js 14 (App Router) + TypeScript | 모바일 우선 SSR, 빠른 초기 로딩, 파일 기반 라우팅 |
| **UI 프레임워크** | Tailwind CSS + shadcn/ui | 다크 테마 커스터마이징 용이, 반응형 빠른 구현 |
| **상태 관리** | React Server Components + 클라이언트 필터링 | 228건 소규모 → 서버 부하 최소화, 클라이언트 즉시 필터 |
| **백엔드/API** | Next.js API Routes (Route Handlers) | 프론트와 동일 프로젝트, 배포 단순화 |
| **데이터베이스** | PostgreSQL + Prisma ORM | 요구사항 정의서 지정, 타입 안전성 |
| **인증** | 세션 기반 (iron-session) | 쿠키 암호화, 7일 세션, 서버사이드 모드 판정 |
| **지도 API** | 카카오맵 JavaScript SDK | 무료 할당량 충분(30만/일), 한국 데이터 정확도 |
| **배포** | 로컬 개발 서버 + ngrok 터널링 | 해커톤 데모용 빠른 외부 접근 |

---

## 2. 프로젝트 구조 (예정)

```
/
├── CLAUDE.md
├── docs/                        ← 기획 문서
├── data/                        ← 원본 데이터 (xlsx, csv, json)
├── mockup/                      ← UI 목업
│
├── src/
│   ├── app/
│   │   ├── layout.tsx           ← 루트 레이아웃 (다크 테마, 폰트)
│   │   ├── page.tsx             ← S1: 비밀번호 입력
│   │   ├── restaurants/
│   │   │   ├── page.tsx         ← S2: 식당 리스트
│   │   │   └── [id]/
│   │   │       ├── page.tsx     ← S3: 식당 상세
│   │   │       └── edit/
│   │   │           └── page.tsx ← S4: 식당 편집 (Owner)
│   │   ├── search/
│   │   │   └── page.tsx         ← S5: 신규 맛집 검색 (Owner)
│   │   ├── settings/
│   │   │   └── page.tsx         ← S6: 관리 (Owner)
│   │   └── api/
│   │       ├── auth/            ← 인증 API
│   │       ├── restaurants/     ← 식당 CRUD API
│   │       └── map/             ← 지도 API 프록시
│   │
│   ├── components/
│   │   ├── ui/                  ← shadcn/ui 컴포넌트
│   │   ├── restaurant-card.tsx  ← 식당 카드
│   │   ├── category-tabs.tsx    ← 업종 탭 (7종 + 전체)
│   │   ├── search-bar.tsx       ← 검색창
│   │   ├── mode-badge.tsx       ← 모드 배지 (임원/관리자)
│   │   └── map-view.tsx         ← 카카오맵 컴포넌트
│   │
│   ├── lib/
│   │   ├── db.ts               ← Prisma 클라이언트
│   │   ├── auth.ts             ← 세션/인증 유틸
│   │   ├── constants.ts        ← 업종 매핑, 이모지, 정규화 규칙
│   │   └── kakao-map.ts        ← 카카오맵 API 래퍼
│   │
│   └── types/
│       └── index.ts            ← 공통 타입 정의
│
├── prisma/
│   ├── schema.prisma           ← DB 스키마
│   └── seed.ts                 ← 초기 데이터 시딩 (228건)
│
├── package.json
├── tailwind.config.ts
├── next.config.ts
└── .env.local                  ← 환경변수 (git 미추적)
```

---

## 3. 데이터베이스 스키마

> 요구사항 정의서 07-4 데이터 모델 기반

```prisma
model Restaurant {
  id            Int      @id @default(autoincrement())
  nameKor       String   @map("name_kor")
  nameEng       String?  @map("name_eng")
  locationNorm  String   @map("location_norm")    // 정규화된 동 (청담동, 한남동...)
  locationRaw   String?  @map("location_raw")     // 원본 위치값
  categoryNorm  String   @map("category_norm")    // 7종 대표 업종
  categoryRaw   String?  @map("category_raw")     // 원본 종류값 (34종)
  tel           String?
  address       String
  lat           Float?
  lng           Float?
  publicDesc    String?  @map("public_desc")      // 식당 소개 (임원 노출)
  hours         String?                           // 영업시간 (임원 노출)
  internalMemo  String?  @map("internal_memo")    // 자유 메모 (Owner 전용)
  parking       String?                           // 주차 여부 (Owner 수동 입력)
  country       String   @default("Korea")
  updatedBy     String?  @map("updated_by")
  updatedAt     DateTime @updatedAt @map("updated_at")
  createdAt     DateTime @default(now()) @map("created_at")

  mapCache      MapCache?

  @@map("restaurants")
}

model AccessConfig {
  id                  Int      @id @default(autoincrement())
  urlToken            String   @unique @map("url_token")        // nanoid 22자
  viewerPasswordHash  String   @map("viewer_password_hash")     // 임원용 6자리 해시
  ownerPasswordHash   String   @map("owner_password_hash")      // 사장님용 6자리 해시
  sessionDays         Int      @default(7) @map("session_days")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@map("access_config")
}

model MapCache {
  id            Int      @id @default(autoincrement())
  restaurantId  Int      @unique @map("restaurant_id")
  mapPlaceId    String?  @map("map_place_id")
  addressNorm   String?  @map("address_norm")
  tel           String?
  hours         String?
  category      String?
  lat           Float?
  lng           Float?
  fetchedAt     DateTime @map("fetched_at")
  ttl           Int      @default(604800)  // 7일 (초)

  restaurant    Restaurant @relation(fields: [restaurantId], references: [id])

  @@map("map_cache")
}

model Session {
  token     String   @id
  role      String   // "viewer" | "owner"
  expiresAt DateTime @map("expires_at")

  @@map("sessions")
}
```

---

## 4. 화면별 구현 명세

### S1. 비밀번호 입력 (/)

- 단일 입력 필드 (6자리 숫자, `inputmode="numeric"`)
- 입력값을 서버로 전송 → viewer/owner 비번 비교 → 세션 생성 + 모드 분기
- 잠금 없음 (무제한 시도, 데모 정책)
- 세션 있으면 자동으로 /restaurants 리다이렉트

### S2. 식당 리스트 (/restaurants)

- 228건 전체 로딩 후 **클라이언트 사이드 필터링**
- 업종 탭 (8개: 전체 + 7종) — 가로 스크롤
- 검색창 — 식당명·지역·업종 실시간 필터
- 지역 필터 — 동 단위, 건수 내림차순
- 카드: 업종 이모지 + 식당명 + 업종 + 위치(동)
- Owner 모드: 🔒 비공개 항목 표시

### S3. 식당 상세 (/restaurants/[id])

- 기본정보: 식당명(한/영), 업종, 주소, 전화, 영업시간, 주차, 소개
- 카카오맵 핀 표시 + 길찾기 링크
- 액션 버튼: 길찾기 / 전화 / 예약(외부 링크) / 공유
- Owner 모드: [편집] 버튼 + 🔒 자유 메모 표시

### S4. 식당 편집 (/restaurants/[id]/edit) — Owner 전용

- 메모(🔒 나만 보기), 소개·영업시간·주차(📢 임원 노출)
- 카테고리 드롭다운 (7종)
- 🔒/📢 배지로 노출 범위 시각화
- 서버 사이드 role=owner 검증 필수

### S5. 신규 맛집 검색 (/search) — Owner 전용

- 카카오맵 검색 API로 DB 외 식당 검색
- 결과 확인만 가능 (저장 없음)

### S6. 관리 (/settings) — Owner 전용

- 임원용/사장님 비밀번호 변경
- 두 비번 동일값 서버 거부
- URL/QR 재발급
- 전체 세션 강제 만료

---

## 5. 인증 플로우

```
[클라이언트]                    [서버]
     │                           │
     │─── POST /api/auth ───────▶│  비번 비교
     │    { password: "123456" } │  ├─ viewerHash 일치 → role=viewer
     │                           │  └─ ownerHash 일치 → role=owner
     │◀── Set-Cookie (session) ──│  세션 토큰 + role + 7일 만료
     │                           │
     │─── 이후 모든 요청 ────────▶│  쿠키에서 role 확인
     │                           │  편집 API는 role=owner만 허용
```

---

## 6. 디자인 시스템

### 색상 팔레트

| 역할 | 값 | 용도 |
|------|------|------|
| Background | `#0A0A0F` | 메인 배경 |
| Surface | `#1A1A2E` | 카드, 모달 |
| Surface-alt | `#16213E` | 호버, 선택 상태 |
| Gold (Primary) | `#D4AF37` | 액센트, CTA, 활성 탭 |
| Gold-light | `#F5E6A3` | 텍스트 하이라이트 |
| Text-primary | `#FAFAFA` | 본문 |
| Text-secondary | `#A0A0B0` | 보조 정보 |
| Danger | `#E74C3C` | 에러, 삭제 |

### 타이포그래피

- 타이틀: Playfair Display (세리프) — 고급감
- 본문: Pretendard (산세리프) — 가독성, 한국어 최적화
- 최소 터치 영역: 44px (50대 남성 사용성)
- 본문 폰트 사이즈: 16px 이상 (모바일)

### 반응형 브레이크포인트

| 디바이스 | 너비 | 비고 |
|------|------|------|
| 모바일 | ~640px | 기본(모바일 우선) |
| 태블릿 | 641~1024px | 2열 그리드 |
| 데스크탑 | 1025px~ | 3열 그리드, 최대 너비 제한 |

---

## 7. 성능·보안 고려사항

- **초기 로딩**: 228건 전체 JSON을 SSR로 전달 → 클라이언트 필터 (API 왕복 없음)
- **지도 API**: 상세 진입 시 비동기 로딩 + MapCache TTL 7일
- **비밀번호**: bcrypt 해시 저장
- **세션**: iron-session (암호화 쿠키, HttpOnly, Secure, SameSite=Lax)
- **모드 판정**: 서버에서만 (클라이언트 임의 변경 차단)
- **환경변수**: `.env.local` (git 미추적) — DB URL, 카카오 API 키, 세션 시크릿

---

## 8. 배포 (ngrok)

```bash
# 1. 로컬 개발 서버 실행
npm run dev  # → http://localhost:3000

# 2. ngrok 터널링
ngrok http 3000  # → https://xxxx.ngrok-free.app

# 3. 생성된 URL을 사장님/임원에게 공유
```

- ngrok 무료 플랜: 세션 제한 있음 (8시간)
- 데모 시에는 ngrok 재시작 후 URL 재공유 필요

---

## 9. ETL (초기 데이터 시딩)

1. `data/Restaurant Korea_May 2026.xlsx` 파싱 (xlsx 라이브러리)
2. 업종 정규화: 34종 → 7종 매핑 (요구사항 정의서 07-2)
3. 위치 정규화: 오타 수정 + 복합 표기 분리 (07-3)
4. 메모 분해: notes → `public_desc` / `hours` / `internal_memo` (04장)
5. Prisma seed로 PostgreSQL에 228건 적재
6. AccessConfig 초기 행 생성 (비밀번호 해시 + URL 토큰)

---

## 10. 개발 우선순위

| Phase | 범위 | 예상 |
|------|------|------|
| **P0** | S1(인증) + S2(리스트) + S3(상세) — 임원이 볼 수 있는 핵심 | 우선 구현 |
| **P1** | S4(편집) + S6(관리) — Owner 기능 | P0 완료 후 |
| **P2** | S5(신규맛집검색) + 카카오맵 연동 강화 | 시간 여유 시 |
