-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLEADO');

-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('VISIT', 'WEEK', 'MONTH_STUDENT', 'MONTH_GENERAL', 'QUARTER_STUDENT', 'QUARTER_GENERAL', 'ANNUAL_STUDENT', 'ANNUAL_GENERAL', 'PROMOTION', 'REBIRTH', 'NUTRITION_CONSULTATION');

-- CreateEnum
CREATE TYPE "InventoryType" AS ENUM ('SALE', 'ADJUSTMENT', 'WAREHOUSE_ENTRY', 'GYM_ENTRY', 'TRANSFER_TO_GYM', 'TRANSFER_TO_WAREHOUSE');

-- CreateEnum
CREATE TYPE "Location" AS ENUM ('WAREHOUSE', 'GYM');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'TRANSFER');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'EMPLEADO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" SERIAL NOT NULL,
    "memberNumber" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "birthDate" TIMESTAMP(3),
    "membershipType" "MembershipType",
    "membershipDescription" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "lastVisit" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "salePrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "warehouseStock" INTEGER NOT NULL DEFAULT 0,
    "gymStock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movement" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "type" "InventoryType" NOT NULL,
    "location" "Location" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "ticket" TEXT,
    "memberId" INTEGER,
    "userId" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2),
    "subtotal" DECIMAL(10,2),
    "discount" DECIMAL(10,2) DEFAULT 0,
    "surcharge" DECIMAL(10,2) DEFAULT 0,
    "total" DECIMAL(10,2),
    "paymentMethod" "PaymentMethod",
    "shiftId" INTEGER,
    "notes" TEXT,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancellationReason" TEXT,
    "cancellationDate" TIMESTAMP(3),
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift" (
    "id" SERIAL NOT NULL,
    "folio" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "openingDate" TIMESTAMP(3) NOT NULL,
    "closingDate" TIMESTAMP(3),
    "initialCash" DECIMAL(10,2) NOT NULL,
    "ticketCount" INTEGER NOT NULL DEFAULT 0,
    "membershipSales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "productSales0Tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "productSales16Tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalSales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cashAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "debitCardAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "creditCardAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalVoucher" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalWithdrawals" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "withdrawalsConcept" TEXT,
    "cancelledSales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalCash" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "difference" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_withdrawal" (
    "id" SERIAL NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "concept" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_role_isActive_idx" ON "user"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "session_expiresAt_idx" ON "session"("expiresAt");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "verification_expiresAt_idx" ON "verification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "member_memberNumber_key" ON "member"("memberNumber");

-- CreateIndex
CREATE INDEX "member_membershipType_isActive_idx" ON "member"("membershipType", "isActive");

-- CreateIndex
CREATE INDEX "member_endDate_isActive_idx" ON "member"("endDate", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "product_name_key" ON "product"("name");

-- CreateIndex
CREATE INDEX "product_gymStock_minStock_idx" ON "product"("gymStock", "minStock");

-- CreateIndex
CREATE INDEX "product_warehouseStock_minStock_idx" ON "product"("warehouseStock", "minStock");

-- CreateIndex
CREATE INDEX "inventory_movement_type_date_idx" ON "inventory_movement"("type", "date" DESC);

-- CreateIndex
CREATE INDEX "inventory_movement_type_ticket_idx" ON "inventory_movement"("type", "ticket");

-- CreateIndex
CREATE INDEX "inventory_movement_type_userId_date_idx" ON "inventory_movement"("type", "userId", "date");

-- CreateIndex
CREATE INDEX "inventory_movement_type_productId_date_idx" ON "inventory_movement"("type", "productId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "shift_folio_key" ON "shift"("folio");

-- CreateIndex
CREATE INDEX "shift_cashierId_idx" ON "shift"("cashierId");

-- CreateIndex
CREATE INDEX "shift_openingDate_idx" ON "shift"("openingDate");

-- CreateIndex
CREATE INDEX "shift_closingDate_idx" ON "shift"("closingDate");

-- CreateIndex
CREATE INDEX "cash_withdrawal_shiftId_idx" ON "cash_withdrawal"("shiftId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift" ADD CONSTRAINT "shift_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_withdrawal" ADD CONSTRAINT "cash_withdrawal_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_withdrawal" ADD CONSTRAINT "cash_withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
