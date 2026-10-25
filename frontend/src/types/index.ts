// ===== Enums (espelham o schema Prisma real) =====
export type DocumentType = 'CPF' | 'CNPJ';

export type AnimalSex = 'MALE' | 'FEMALE' | 'UNKNOWN';

export type AnimalSize = 'SMALL' | 'MEDIUM' | 'LARGE';

export type AnimalStatus = 'ACTIVE' | 'DECEASED' | 'INACTIVE';

export type TenantAnimalStatus = 'ACTIVE' | 'INACTIVE';

export type AppointmentStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type ConsultationStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';

// ===== API Error =====
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// ===== Auth =====
export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthTenant {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface LoginResponse {
  user: AuthUser;
  tenants: AuthTenant[];
  selectionToken: string;
}

export interface RegisterBody {
  name: string;
  email: string;
  password: string;
  tenantName: string;
  tenantAddressLine1: string;
  tenantCity: string;
  tenantState: string;
  tenantZipCode: string;
  tenantDocumentType: DocumentType;
  tenantDocument: string;
}

export interface SelectTenantResponse {
  accessToken: string;
}

// ===== Referências aninhadas =====
/** Animal resumido como aparece nos sub-recursos e em agendamentos/consultas. */
export interface AnimalRef {
  id: string;
  internalCode: string;
  name: string | null;
}

// ===== Tutors =====
export interface TutorIdentity {
  id: string;
  name: string;
  documentType: DocumentType;
  documentNumber: string;
}

/** GET /tutors — o nome/documento vivem em tutorIdentity. */
export interface Tutor {
  id: string;
  tenantId?: string;
  email: string | null;
  additionalInfo: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt?: string;
  tutorIdentity: TutorIdentity;
}

export interface CreateTutorBody {
  name: string;
  documentType: DocumentType;
  documentNumber: string;
  email?: string;
  additionalInfo?: string;
  notes?: string;
}

export interface UpdateTutorBody {
  email?: string;
  additionalInfo?: string;
  notes?: string;
}

// ===== Catálogos =====
export interface Species {
  id: string;
  name: string;
  scientificName?: string | null;
}

export interface Breed {
  id: string;
  name: string;
  speciesId?: string | null;
}

export interface CatalogItem {
  id: string;
  name: string;
  description?: string | null;
}

// ===== Animals =====
/** O Animal "cru" (o que vem em tenantAnimal.animal). */
export interface Animal {
  id: string;
  internalCode: string;
  name: string | null;
  sex: AnimalSex;
  isCastrated: boolean;
  castrationDate: string | null;
  dateOfBirth: string | null;
  approximateAge: string | null;
  microchip: string | null;
  photoUrl: string | null;
  color: string | null;
  size: AnimalSize | null;
  dateOfDeath: string | null;
  status: AnimalStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  species: Species | null;
  breed: Breed | null;
}

/**
 * GET /animals, GET /animals/:animalId e POST /animals retornam o VÍNCULO
 * com a clínica, com o Animal aninhado. O id usado nas rotas é animal.id.
 */
export interface TenantAnimalItem {
  id: string;
  status: TenantAnimalStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  animal: Animal;
}

export interface CreateAnimalBody {
  name?: string;
  speciesId: string;
  breedId?: string;
  sex: AnimalSex;
  isCastrated?: boolean;
  castrationDate?: string;
  dateOfBirth?: string;
  approximateAge?: string;
  microchip?: string;
  photoUrl?: string;
  color?: string;
  size?: AnimalSize;
  notes?: string;
}

export type UpdateAnimalBody = Partial<CreateAnimalBody>;

// ===== Animal-Tutor =====
export interface AnimalTutorTutor {
  id: string;
  email: string | null;
  additionalInfo: string | null;
  isActive: boolean;
  tutorIdentity: TutorIdentity;
}

/** GET /animals/:animalId/tutors */
export interface AnimalTutor {
  id: string;
  startedAt: string | null;
  endedAt: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  tutor: AnimalTutorTutor;
  animal: AnimalRef;
}

/** o animalId vai no path — nunca no body. */
export interface CreateAnimalTutorBody {
  tutorId: string;
  startedAt?: string;
  notes?: string;
}

// ===== Registros clínicos =====
/** GET /animals/:animalId/weight — weight é Decimal serializado como STRING. */
export interface WeightRecord {
  id: string;
  weight: string;
  recordedAt: string;
  notes: string | null;
  createdAt: string;
  tenantId?: string;
  recordedBy?: string;
  animal: AnimalRef;
}

export interface CreateWeightRecordBody {
  weight: number;
  recordedAt?: string;
  notes?: string;
}

export interface VaccinationRecord {
  id: string;
  applicationDate: string;
  lotNumber: string | null;
  nextDoseDate: string | null;
  notes: string | null;
  registeredAt: string;
  createdAt: string;
  vaccine: CatalogItem;
  animal: AnimalRef;
}

export interface CreateVaccinationBody {
  vaccineId: string;
  applicationDate: string;
  lotNumber?: string;
  nextDoseDate?: string;
  notes?: string;
}

export interface AllergyRecord {
  id: string;
  severity: string | null;
  description: string | null;
  notes: string | null;
  registeredAt: string;
  createdAt: string;
  allergy: CatalogItem;
  animal: AnimalRef;
}

export interface CreateAllergyBody {
  allergyId: string;
  severity?: string;
  description?: string;
  notes?: string;
}

export interface MedicationRecord {
  id: string;
  dosage: string;
  frequency: string;
  route: string | null;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
  medication: CatalogItem;
  animal: AnimalRef;
}

export interface CreateMedicationBody {
  medicationId: string;
  dosage: string;
  frequency: string;
  route?: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

// ===== Veterinários =====
export interface VeterinarianSpecialtyLink {
  specialty: { id: string; name: string; description?: string | null };
}

export interface Veterinarian {
  id: string;
  name: string;
  crmv: string;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
  veterinarianSpecialties: VeterinarianSpecialtyLink[];
}

/**
 * GET /veterinarians devolve o VÍNCULO (TenantVeterinarian).
 * Em POST /appointments e /consultations, `veterinarianId` é o `id` DESTE
 * vínculo — não o veterinarian.id.
 */
export interface VeterinarianLink {
  id: string;
  joinedAt: string;
  isActive: boolean;
  room: string | null;
  function: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  veterinarian: Veterinarian;
}

// ===== Consultations =====
export interface Consultation {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: ConsultationStatus;
  chiefComplaint: string | null;
  anamnesis: string | null;
  physicalExam: string | null;
  clinicalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  appointment: { id: string; scheduledAt: string; status: AppointmentStatus } | null;
  animal: AnimalRef;
  veterinarian: { id: string; veterinarian: { id: string; name: string; crmv: string } } | null;
  tutor: { id: string; email: string | null; tutorIdentity: { name: string } } | null;
}

export interface CreateConsultationBody {
  appointmentId?: string;
  animalId: string;
  /** id do vínculo (TenantVeterinarian.id) */
  veterinarianId: string;
  tutorId?: string;
  startedAt: string;
  chiefComplaint?: string;
  anamnesis?: string;
  physicalExam?: string;
  clinicalNotes?: string;
}

export interface UpdateConsultationBody {
  finishedAt?: string;
  status?: ConsultationStatus;
  chiefComplaint?: string;
  anamnesis?: string;
  physicalExam?: string;
  clinicalNotes?: string;
}

// ===== Diagnoses =====
export interface Diagnosis {
  id: string;
  consultationId: string;
  description: string;
  notes: string | null;
}

export interface CreateDiagnosisBody {
  description: string;
  notes?: string;
}

export interface UpdateDiagnosisBody {
  description?: string;
  notes?: string;
}

// ===== Appointments =====
export interface Appointment {
  id: string;
  scheduledAt: string;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  animal: AnimalRef;
  veterinarian: { id: string; veterinarian: { id: string; name: string; crmv: string } } | null;
  tutor: { id: string; email: string | null; tutorIdentity: { name: string } } | null;
}

export interface CreateAppointmentBody {
  animalId: string;
  /** id do vínculo (TenantVeterinarian.id), NÃO veterinarian.id */
  veterinarianId: string;
  tutorId?: string;
  scheduledAt: string;
  reason?: string;
  notes?: string;
}

export interface UpdateAppointmentBody {
  scheduledAt?: string;
  status?: AppointmentStatus;
  reason?: string;
  notes?: string;
}

// ===== Users =====
export interface UserInfo {
  id: string;
  name: string;
  email: string;
}
