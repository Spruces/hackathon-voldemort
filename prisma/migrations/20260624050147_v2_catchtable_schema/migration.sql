-- CreateTable
CREATE TABLE "Restaurant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nameKor" TEXT NOT NULL,
    "nameEng" TEXT,
    "locationNorm" TEXT NOT NULL,
    "locationRaw" TEXT,
    "categoryNorm" TEXT NOT NULL,
    "categoryRaw" TEXT,
    "tel" TEXT,
    "address" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "publicDesc" TEXT,
    "hours" TEXT,
    "internalMemo" TEXT,
    "parking" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Korea',
    "catchtableAlias" TEXT,
    "catchtableMatched" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CatchtableCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "restaurantId" INTEGER NOT NULL,
    "alias" TEXT NOT NULL,
    "shopRef" TEXT,
    "shopName" TEXT,
    "bizHours" TEXT,
    "parkingGuide" TEXT,
    "priceLunch" TEXT,
    "priceDinner" TEXT,
    "rating" TEXT,
    "imageUrl" TEXT,
    "onlineYn" TEXT,
    "serviceDesc" TEXT,
    "fetchedAt" DATETIME NOT NULL,
    "ttl" INTEGER NOT NULL DEFAULT 604800,
    CONSTRAINT "CatchtableCache_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DaySlotCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "restaurantId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "availableStatus" TEXT NOT NULL,
    "availablePersons" TEXT,
    "benefit" TEXT,
    "fetchedAt" DATETIME NOT NULL,
    "ttl" INTEGER NOT NULL DEFAULT 1800,
    CONSTRAINT "DaySlotCache_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccessConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "urlToken" TEXT NOT NULL,
    "viewerPasswordHash" TEXT NOT NULL,
    "ownerPasswordHash" TEXT NOT NULL,
    "sessionDays" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "token" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CatchtableCache_restaurantId_key" ON "CatchtableCache"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "DaySlotCache_restaurantId_date_key" ON "DaySlotCache"("restaurantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AccessConfig_urlToken_key" ON "AccessConfig"("urlToken");
