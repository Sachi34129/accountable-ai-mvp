-- Add EntityGstin table for multi-GSTIN support per entity

CREATE TABLE "EntityGstin" (
  "id" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "gstin" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EntityGstin_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EntityGstin_entityId_idx" ON "EntityGstin"("entityId");

CREATE UNIQUE INDEX "EntityGstin_entityId_gstin_key" ON "EntityGstin"("entityId", "gstin");

ALTER TABLE "EntityGstin"
ADD CONSTRAINT "EntityGstin_entityId_fkey"
FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;


