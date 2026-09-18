-- CreateTable
CREATE TABLE "Diagnosis" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "consultationId" UUID NOT NULL,
    "animalId" UUID NOT NULL,
    "veterinarianId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Diagnosis_tenantId_idx" ON "Diagnosis"("tenantId");

-- CreateIndex
CREATE INDEX "Diagnosis_consultationId_idx" ON "Diagnosis"("consultationId");

-- CreateIndex
CREATE INDEX "Diagnosis_animalId_idx" ON "Diagnosis"("animalId");

-- CreateIndex
CREATE INDEX "Diagnosis_veterinarianId_idx" ON "Diagnosis"("veterinarianId");

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "TenantVeterinarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
