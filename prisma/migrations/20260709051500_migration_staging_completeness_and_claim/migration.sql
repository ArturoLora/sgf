-- Tabla siempre vacía en este punto (buffer de tránsito temporal, sin datos
-- de negocio) — seguro alterar sin backfill.

-- DropIndex (unique antiguo, sin `kind` — permitía mezclar sync-shifts/reconstruccion-ejecutar)
DROP INDEX "migration_import_staging_importId_batchIndex_key";

-- DropIndex (reemplazado por índice compuesto importId+kind)
DROP INDEX "migration_import_staging_importId_idx";

-- AlterTable
ALTER TABLE "migration_import_staging"
  ADD COLUMN "totalBatches" INTEGER NOT NULL,
  ADD COLUMN "claimedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "migration_import_staging_importId_kind_idx" ON "migration_import_staging"("importId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "migration_import_staging_importId_kind_batchIndex_key" ON "migration_import_staging"("importId", "kind", "batchIndex");
