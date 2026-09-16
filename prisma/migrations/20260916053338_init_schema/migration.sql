-- CreateEnum
CREATE TYPE "UserTenantStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CPF', 'CNPJ');

-- CreateEnum
CREATE TYPE "AnimalSex" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AnimalSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "AnimalStatus" AS ENUM ('ACTIVE', 'DECEASED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TenantAnimalStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "cnpj" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTenant" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "status" "UserTenantStatus" NOT NULL DEFAULT 'PENDING',
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTenantRole" (
    "id" UUID NOT NULL,
    "userTenantId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTenantRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastAccessAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "Veterinarian" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "crmv" TEXT NOT NULL,
    "bio" TEXT,
    "userId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Veterinarian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specialty" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VeterinarianSpecialty" (
    "veterinarianId" UUID NOT NULL,
    "specialtyId" UUID NOT NULL,

    CONSTRAINT "VeterinarianSpecialty_pkey" PRIMARY KEY ("veterinarianId","specialtyId")
);

-- CreateTable
CREATE TABLE "TenantVeterinarian" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "veterinarianId" UUID NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "schedule" JSONB,
    "room" TEXT,
    "function" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantVeterinarian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorIdentity" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tutor" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "tutorIdentityId" UUID NOT NULL,
    "email" TEXT,
    "additionalInfo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tutor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorPhone" (
    "id" UUID NOT NULL,
    "tutorId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "label" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorPhone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorAddress" (
    "id" UUID NOT NULL,
    "tutorId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "label" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorEmergencyContact" (
    "id" UUID NOT NULL,
    "tutorId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorEmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Animal" (
    "id" UUID NOT NULL,
    "internalCode" TEXT NOT NULL,
    "name" TEXT,
    "speciesId" UUID NOT NULL,
    "breedId" UUID NOT NULL,
    "sex" "AnimalSex" NOT NULL,
    "isCastrated" BOOLEAN NOT NULL DEFAULT false,
    "castrationDate" TIMESTAMP(3),
    "dateOfBirth" TIMESTAMP(3),
    "approximateAge" TEXT,
    "microchip" TEXT,
    "photoUrl" TEXT,
    "color" TEXT,
    "size" "AnimalSize",
    "dateOfDeath" TIMESTAMP(3),
    "status" "AnimalStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Species" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "scientificName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Breed" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "speciesId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Breed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantAnimal" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "animalId" UUID NOT NULL,
    "status" "TenantAnimalStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantAnimal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalTutor" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "animalId" UUID NOT NULL,
    "tutorId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnimalTutor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalWeightRecord" (
    "id" UUID NOT NULL,
    "animalId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "weight" DECIMAL(7,2) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnimalWeightRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allergy" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Allergy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalAllergy" (
    "id" UUID NOT NULL,
    "animalId" UUID NOT NULL,
    "allergyId" UUID NOT NULL,
    "severity" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredByTenantId" UUID NOT NULL,
    "registeredByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnimalAllergy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalMedication" (
    "id" UUID NOT NULL,
    "animalId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "route" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredByTenantId" UUID NOT NULL,
    "registeredByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimalMedication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaccine" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vaccine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalVaccination" (
    "id" UUID NOT NULL,
    "animalId" UUID NOT NULL,
    "vaccineId" UUID NOT NULL,
    "applicationDate" TIMESTAMP(3) NOT NULL,
    "lotNumber" TEXT,
    "nextDoseDate" TIMESTAMP(3),
    "notes" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredByTenantId" UUID NOT NULL,
    "registeredByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnimalVaccination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_cpf_key" ON "Tenant"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_cnpj_key" ON "Tenant"("cnpj");

-- CreateIndex
CREATE INDEX "UserTenant_tenantId_idx" ON "UserTenant"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTenant_userId_tenantId_key" ON "UserTenant"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "UserTenantRole_roleId_idx" ON "UserTenantRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTenantRole_userTenantId_roleId_key" ON "UserTenantRole"("userTenantId", "roleId");

-- CreateIndex
CREATE INDEX "Session_tenantId_idx" ON "Session"("tenantId");

-- CreateIndex
CREATE INDEX "Session_refreshTokenHash_idx" ON "Session"("refreshTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_resource_action_key" ON "Permission"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "Veterinarian_crmv_key" ON "Veterinarian"("crmv");

-- CreateIndex
CREATE UNIQUE INDEX "Veterinarian_userId_key" ON "Veterinarian"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_name_key" ON "Specialty"("name");

-- CreateIndex
CREATE INDEX "TenantVeterinarian_veterinarianId_idx" ON "TenantVeterinarian"("veterinarianId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantVeterinarian_tenantId_veterinarianId_key" ON "TenantVeterinarian"("tenantId", "veterinarianId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorIdentity_documentType_documentNumber_key" ON "TutorIdentity"("documentType", "documentNumber");

-- CreateIndex
CREATE INDEX "Tutor_tutorIdentityId_idx" ON "Tutor"("tutorIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "Tutor_tenantId_tutorIdentityId_key" ON "Tutor"("tenantId", "tutorIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "Tutor_tenantId_email_key" ON "Tutor"("tenantId", "email");

-- CreateIndex
CREATE INDEX "TutorPhone_tutorId_idx" ON "TutorPhone"("tutorId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorPhone_tenantId_tutorId_number_key" ON "TutorPhone"("tenantId", "tutorId", "number");

-- CreateIndex
CREATE INDEX "TutorAddress_tutorId_idx" ON "TutorAddress"("tutorId");

-- CreateIndex
CREATE INDEX "TutorEmergencyContact_tutorId_idx" ON "TutorEmergencyContact"("tutorId");

-- CreateIndex
CREATE UNIQUE INDEX "Animal_internalCode_key" ON "Animal"("internalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Animal_microchip_key" ON "Animal"("microchip");

-- CreateIndex
CREATE INDEX "Animal_speciesId_idx" ON "Animal"("speciesId");

-- CreateIndex
CREATE INDEX "Animal_breedId_idx" ON "Animal"("breedId");

-- CreateIndex
CREATE UNIQUE INDEX "Species_name_key" ON "Species"("name");

-- CreateIndex
CREATE INDEX "Breed_speciesId_idx" ON "Breed"("speciesId");

-- CreateIndex
CREATE UNIQUE INDEX "Breed_speciesId_name_key" ON "Breed"("speciesId", "name");

-- CreateIndex
CREATE INDEX "TenantAnimal_animalId_idx" ON "TenantAnimal"("animalId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantAnimal_tenantId_animalId_key" ON "TenantAnimal"("tenantId", "animalId");

-- CreateIndex
CREATE INDEX "AnimalTutor_tenantId_animalId_tutorId_idx" ON "AnimalTutor"("tenantId", "animalId", "tutorId");

-- CreateIndex
CREATE INDEX "AnimalTutor_animalId_idx" ON "AnimalTutor"("animalId");

-- CreateIndex
CREATE INDEX "AnimalTutor_tutorId_idx" ON "AnimalTutor"("tutorId");

-- CreateIndex
CREATE INDEX "AnimalWeightRecord_tenantId_idx" ON "AnimalWeightRecord"("tenantId");

-- CreateIndex
CREATE INDEX "AnimalWeightRecord_recordedBy_idx" ON "AnimalWeightRecord"("recordedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Allergy_name_key" ON "Allergy"("name");

-- CreateIndex
CREATE INDEX "AnimalAllergy_allergyId_idx" ON "AnimalAllergy"("allergyId");

-- CreateIndex
CREATE INDEX "AnimalAllergy_registeredByTenantId_idx" ON "AnimalAllergy"("registeredByTenantId");

-- CreateIndex
CREATE INDEX "AnimalAllergy_registeredByUserId_idx" ON "AnimalAllergy"("registeredByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AnimalAllergy_animalId_allergyId_key" ON "AnimalAllergy"("animalId", "allergyId");

-- CreateIndex
CREATE UNIQUE INDEX "Medication_name_key" ON "Medication"("name");

-- CreateIndex
CREATE INDEX "AnimalMedication_medicationId_idx" ON "AnimalMedication"("medicationId");

-- CreateIndex
CREATE INDEX "AnimalMedication_registeredByTenantId_idx" ON "AnimalMedication"("registeredByTenantId");

-- CreateIndex
CREATE INDEX "AnimalMedication_registeredByUserId_idx" ON "AnimalMedication"("registeredByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Vaccine_name_key" ON "Vaccine"("name");

-- CreateIndex
CREATE INDEX "AnimalVaccination_vaccineId_idx" ON "AnimalVaccination"("vaccineId");

-- CreateIndex
CREATE INDEX "AnimalVaccination_registeredByTenantId_idx" ON "AnimalVaccination"("registeredByTenantId");

-- CreateIndex
CREATE INDEX "AnimalVaccination_registeredByUserId_idx" ON "AnimalVaccination"("registeredByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AnimalVaccination_animalId_vaccineId_applicationDate_key" ON "AnimalVaccination"("animalId", "vaccineId", "applicationDate");

-- AddForeignKey
ALTER TABLE "UserTenant" ADD CONSTRAINT "UserTenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTenant" ADD CONSTRAINT "UserTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTenantRole" ADD CONSTRAINT "UserTenantRole_userTenantId_fkey" FOREIGN KEY ("userTenantId") REFERENCES "UserTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTenantRole" ADD CONSTRAINT "UserTenantRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Veterinarian" ADD CONSTRAINT "Veterinarian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeterinarianSpecialty" ADD CONSTRAINT "VeterinarianSpecialty_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "Veterinarian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeterinarianSpecialty" ADD CONSTRAINT "VeterinarianSpecialty_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantVeterinarian" ADD CONSTRAINT "TenantVeterinarian_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantVeterinarian" ADD CONSTRAINT "TenantVeterinarian_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "Veterinarian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tutor" ADD CONSTRAINT "Tutor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tutor" ADD CONSTRAINT "Tutor_tutorIdentityId_fkey" FOREIGN KEY ("tutorIdentityId") REFERENCES "TutorIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorPhone" ADD CONSTRAINT "TutorPhone_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorPhone" ADD CONSTRAINT "TutorPhone_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorAddress" ADD CONSTRAINT "TutorAddress_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorAddress" ADD CONSTRAINT "TutorAddress_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorEmergencyContact" ADD CONSTRAINT "TutorEmergencyContact_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorEmergencyContact" ADD CONSTRAINT "TutorEmergencyContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_breedId_fkey" FOREIGN KEY ("breedId") REFERENCES "Breed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Breed" ADD CONSTRAINT "Breed_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantAnimal" ADD CONSTRAINT "TenantAnimal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantAnimal" ADD CONSTRAINT "TenantAnimal_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalTutor" ADD CONSTRAINT "AnimalTutor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalTutor" ADD CONSTRAINT "AnimalTutor_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalTutor" ADD CONSTRAINT "AnimalTutor_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalWeightRecord" ADD CONSTRAINT "AnimalWeightRecord_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalWeightRecord" ADD CONSTRAINT "AnimalWeightRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalWeightRecord" ADD CONSTRAINT "AnimalWeightRecord_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalAllergy" ADD CONSTRAINT "AnimalAllergy_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalAllergy" ADD CONSTRAINT "AnimalAllergy_allergyId_fkey" FOREIGN KEY ("allergyId") REFERENCES "Allergy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalAllergy" ADD CONSTRAINT "AnimalAllergy_registeredByTenantId_fkey" FOREIGN KEY ("registeredByTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalAllergy" ADD CONSTRAINT "AnimalAllergy_registeredByUserId_fkey" FOREIGN KEY ("registeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalMedication" ADD CONSTRAINT "AnimalMedication_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalMedication" ADD CONSTRAINT "AnimalMedication_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalMedication" ADD CONSTRAINT "AnimalMedication_registeredByTenantId_fkey" FOREIGN KEY ("registeredByTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalMedication" ADD CONSTRAINT "AnimalMedication_registeredByUserId_fkey" FOREIGN KEY ("registeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalVaccination" ADD CONSTRAINT "AnimalVaccination_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalVaccination" ADD CONSTRAINT "AnimalVaccination_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "Vaccine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalVaccination" ADD CONSTRAINT "AnimalVaccination_registeredByTenantId_fkey" FOREIGN KEY ("registeredByTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalVaccination" ADD CONSTRAINT "AnimalVaccination_registeredByUserId_fkey" FOREIGN KEY ("registeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ManualSQL: Índice parcial único para AnimalTutor
-- Garante no máximo um vínculo ativo por combinação (tenantId, animalId, tutorId)
-- Prisma não suporta índices parciais únicos nativamente
CREATE UNIQUE INDEX "AnimalTutor_active_unique"
ON "AnimalTutor" ("tenantId", "animalId", "tutorId")
WHERE "isActive" = true;

-- ManualSQL: CHECK constraint para Tenant
-- Pelo menos um dos documentos (CPF ou CNPJ) deve ser informado
ALTER TABLE "Tenant"
ADD CONSTRAINT "Tenant_cpf_or_cnpj_check"
CHECK ("cpf" IS NOT NULL OR "cnpj" IS NOT NULL);
