-- CreateTable
CREATE TABLE "migration_import_staging" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "batchIndex" INTEGER NOT NULL,
    "shiftsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "migration_import_staging_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "migration_import_staging_importId_idx" ON "migration_import_staging"("importId");

-- CreateIndex
CREATE INDEX "migration_import_staging_createdAt_idx" ON "migration_import_staging"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "migration_import_staging_importId_batchIndex_key" ON "migration_import_staging"("importId", "batchIndex");
