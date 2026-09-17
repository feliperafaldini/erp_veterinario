import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================
// Roles
// ============================================================

const ROLES = ["ADMIN", "VETERINARIAN", "RECEPTIONIST"] as const;

// ============================================================
// Permissions — apenas as definidas na documentação
// ============================================================

// business-rules.md:
//   ANIMAL_CREATE: ADMIN, VETERINARIAN, RECEPTIONIST
//   ANIMAL_UPDATE: ADMIN, VETERINARIAN, RECEPTIONIST
//   ANIMAL_DEACTIVATE: ADMIN, VETERINARIAN, RECEPTIONIST
//   TUTOR_CREATE: ADMIN, VETERINARIAN, RECEPTIONIST
//   TUTOR_UPDATE: ADMIN, VETERINARIAN, RECEPTIONIST
//   TUTOR_DEACTIVATE: ADMIN
//
// architecture.md actions padrão: CREATE, READ, UPDATE, DELETE, MANAGE
// READ é implícito para todos os recursos que possuem CREATE/UPDATE.
//
// USER_MANAGE é mencionada em architecture.md (convites) mas sem
// mapeamento Role↔Permission definido. Não incluída no seed.

const PERMISSIONS = [
  { key: "ANIMAL_CREATE", resource: "ANIMAL", action: "CREATE" },
  { key: "ANIMAL_READ", resource: "ANIMAL", action: "READ" },
  { key: "ANIMAL_UPDATE", resource: "ANIMAL", action: "UPDATE" },
  { key: "ANIMAL_DEACTIVATE", resource: "ANIMAL", action: "DEACTIVATE" },
  { key: "TUTOR_CREATE", resource: "TUTOR", action: "CREATE" },
  { key: "TUTOR_READ", resource: "TUTOR", action: "READ" },
  { key: "TUTOR_UPDATE", resource: "TUTOR", action: "UPDATE" },
  { key: "TUTOR_DEACTIVATE", resource: "TUTOR", action: "DEACTIVATE" },
  { key: "VETERINARIAN_CREATE", resource: "VETERINARIAN", action: "CREATE" },
  { key: "VETERINARIAN_READ", resource: "VETERINARIAN", action: "READ" },
  { key: "VETERINARIAN_UPDATE", resource: "VETERINARIAN", action: "UPDATE" },
  { key: "VETERINARIAN_DEACTIVATE", resource: "VETERINARIAN", action: "DEACTIVATE" },
] as const;

// ============================================================
// Mapeamento Role → Permissions
// ============================================================

// business-rules.md:
//   Tutor CREATE/UPDATE: ADMIN, VETERINARIAN, RECEPTIONIST
//   Tutor DEACTIVATE: ADMIN
//   Animal CREATE/UPDATE/DEACTIVATE: ADMIN, VETERINARIAN, RECEPTIONIST
//
// READ é implícito para quem possui CREATE ou UPDATE no mesmo recurso.

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    "ANIMAL_CREATE",
    "ANIMAL_READ",
    "ANIMAL_UPDATE",
    "ANIMAL_DEACTIVATE",
    "TUTOR_CREATE",
    "TUTOR_READ",
    "TUTOR_UPDATE",
    "TUTOR_DEACTIVATE",
    "VETERINARIAN_CREATE",
    "VETERINARIAN_READ",
    "VETERINARIAN_UPDATE",
    "VETERINARIAN_DEACTIVATE",
  ],
  VETERINARIAN: [
    "ANIMAL_CREATE",
    "ANIMAL_READ",
    "ANIMAL_UPDATE",
    "ANIMAL_DEACTIVATE",
    "TUTOR_CREATE",
    "TUTOR_READ",
    "TUTOR_UPDATE",
  ],
  RECEPTIONIST: [
    "ANIMAL_CREATE",
    "ANIMAL_READ",
    "ANIMAL_UPDATE",
    "ANIMAL_DEACTIVATE",
    "TUTOR_CREATE",
    "TUTOR_READ",
    "TUTOR_UPDATE",
  ],
};

// ============================================================
// Seed
// ============================================================

async function main() {
  console.log("Seeding roles...");
  for (const name of ROLES) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("Seeding permissions...");
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {},
      create: perm,
    });
  }

  console.log("Seeding role ↔ permission associations...");
  for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: roleName },
    });

    for (const permKey of permissionKeys) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { key: permKey },
      });

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Specialty: nenhuma definida como seed inicial na documentação

  // ============================================================
  // Medication — medicamentos veterinários comuns
  // ============================================================

  console.log("Seeding medications...");
  const MEDICATIONS = [
    { name: "Amoxicilina", description: "Antibiótico beta-lactâmico de amplo espectro" },
    { name: "Amoxicilina + Clavulanato", description: "Antibiótico beta-lactâmico com inibidor de beta-lactamase" },
    { name: "Enrofloxacino", description: "Antibiótico fluoroquinolona de amplo espectro" },
    { name: "Metronidazol", description: "Antibiótico e antiparasitário de amplo espectro" },
    { name: "Doxiciclina", description: "Antibiótico tetraciclina de amplo espectro" },
    { name: "Prednisolona", description: "Corticosteroide anti-inflamatório e imunossupressor" },
    { name: "Meloxicam", description: "Anti-inflamatório não esteroide (AINE) com ação analgésica" },
    { name: "Dipirona", description: "Analgésico e antipirético" },
    { name: "Ivermectina", description: "Antiparasitário antihelmíntico e acaricida" },
    { name: "Furosemida", description: "Diurético de alça para tratamento de insuficiência cardíaca" },
  ] as const;

  for (const medication of MEDICATIONS) {
    await prisma.medication.upsert({
      where: { name: medication.name },
      update: {},
      create: {
        name: medication.name,
        description: medication.description,
      },
    });
  }

  // ============================================================
  // Vaccine — vacinas veterinárias comuns
  // ============================================================

  console.log("Seeding vaccines...");
  const VACCINES = [
    { name: "Vacina antirrábica", description: "Proteção contra raiva" },
    { name: "Vacina múltipla canina", description: "Proteção contra múltiplas doenças caninas (DHLP)" },
    { name: "Vacina múltipla felina", description: "Proteção contra múltiplas doenças felinas" },
    { name: "Vacina contra giárdia", description: "Proteção contra giárdia" },
    { name: "Vacina contra leptospirose", description: "Proteção contra leptospirose" },
    { name: "Vacina contra tosse dos canis", description: "Proteção contra traqueobronqueite infecciosa" },
    { name: "Vacina tríplice felina", description: "Proteção contra panleucopenia, calicivírus e herpesvírus felino" },
    { name: "Vacina quádrupla felina", description: "Tríplice felina + clamídia" },
    { name: "Vacina quíntupla felina", description: "Quádrupla felina + FeLV" },
    { name: "Vacina contra rinotraqueíte felina", description: "Proteção contra herpesvírus felino (rinotraqueíte)" },
  ] as const;

  for (const vaccine of VACCINES) {
    await prisma.vaccine.upsert({
      where: { name: vaccine.name },
      update: {},
      create: {
        name: vaccine.name,
        description: vaccine.description,
      },
    });
  }

  // ============================================================
  // Allergy — alergias comuns em clínica veterinária
  // ============================================================

  console.log("Seeding allergies...");
  const ALLERGIES = [
    { name: "Proteína bovina", description: "Alergia a proteínas de carne bovina" },
    { name: "Frango", description: "Alergia a proteínas de frango" },
    { name: "Milho", description: "Alergia a milho ou derivados" },
    { name: "Soja", description: "Alergia a soja ou derivados" },
    { name: "Lactose", description: "Intolerância ou alergia a lactose" },
    { name: "Pulgas", description: "Dermatite alérgica causada por picadas de pulgas" },
    { name: "Poeira", description: "Alergia a poeira doméstica" },
    { name: "Pólen", description: "Alergia a grãos de pólen" },
    { name: "Ácaros", description: "Alergia a ácaros" },
    { name: "Medicamentos", description: "Reação alérgica a medicamentos" },
  ] as const;

  for (const allergy of ALLERGIES) {
    await prisma.allergy.upsert({
      where: { name: allergy.name },
      update: {},
      create: {
        name: allergy.name,
        description: allergy.description,
      },
    });
  }

  // ============================================================
  // Specialty — especialidades veterinárias comuns
  // ============================================================

  console.log("Seeding specialties...");
  const SPECIALTIES = [
    "Anestesiologia",
    "Cardiologia",
    "Cirurgia",
    "Clínica Médica",
    "Dermatologia",
    "Neurologia",
    "Oftalmologia",
    "Oncologia",
    "Ortopedia",
    "Patologia Veterinária",
  ] as const;

  for (const name of SPECIALTIES) {
    await prisma.specialty.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ============================================================
  // Species — espécies comuns em clínica veterinária
  // ============================================================

  console.log("Seeding species...");
  const SPECIES = [
    { name: "Cão", scientificName: "Canis lupus familiaris" },
    { name: "Gato", scientificName: "Felis catus" },
    { name: "Ave", scientificName: null },
    { name: "Coelho", scientificName: "Oryctolagus cuniculus" },
    { name: "Hamster", scientificName: "Mesocricetus auratus" },
    { name: "Tartaruga", scientificName: null },
    { name: "Peixe", scientificName: null },
    { name: "Furão", scientificName: "Mustela putorius furo" },
    { name: "Porquinho-da-Índia", scientificName: "Cavia porcellus" },
    { name: "Cavalo", scientificName: "Equus caballus" },
  ] as const;

  for (const species of SPECIES) {
    await prisma.species.upsert({
      where: { name: species.name },
      update: {},
      create: {
        name: species.name,
        scientificName: species.scientificName,
      },
    });
  }

  // ============================================================
  // Breed — raças comuns associadas às espécies do seed
  // ============================================================

  console.log("Seeding breeds...");

  const breedData: Record<string, string[]> = {
    Cão: ["Labrador Retriever", "Poodle", "Bulldog Francês", "Pastor Alemão", "Golden Retriever"],
    Gato: ["Siamês", "Persa", "Maine Coon", "Ragdoll", "Bengal"],
    Coelho: ["Angorá", "Holandês"],
    Cavalo: ["Árabe", "Mangalarga Marchador"],
  };

  for (const [speciesName, breedNames] of Object.entries(breedData)) {
    const species = await prisma.species.findUnique({
      where: { name: speciesName },
    });

    if (!species) continue;

    for (const breedName of breedNames) {
      await prisma.breed.upsert({
        where: {
          speciesId_name: {
            speciesId: species.id,
            name: breedName,
          },
        },
        update: {},
        create: {
          speciesId: species.id,
          name: breedName,
        },
      });
    }
  }

  // ============================================================
  // Breed — "Sem raça definida" para cada Species
  // ============================================================

  console.log("Seeding default breeds (Sem raça definida)...");

  const allSpecies = await prisma.species.findMany();

  for (const species of allSpecies) {
    await prisma.breed.upsert({
      where: {
        speciesId_name: {
          speciesId: species.id,
          name: "Sem raça definida",
        },
      },
      update: {},
      create: {
        speciesId: species.id,
        name: "Sem raça definida",
      },
    });
  }

  console.log("Seed completed.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
