// Popula a agenda da clínica demo com as mesmas 5 consultas em cada dia útil
// dos próximos 30 dias. Idempotente por dia/horário/animal.
const BASE = 'http://localhost:3000/api';

const CONSULTAS = [
  { animal: 'Nina', hora: [8, 30], motivo: 'Consulta de rotina' },
  { animal: 'Rex', hora: [9, 30], motivo: 'Vacinação anual' },
  { animal: 'Mia', hora: [11, 0], motivo: 'Retorno dermatológico' },
  { animal: 'Luna', hora: [14, 30], motivo: 'Avaliação ortopédica' },
  { animal: 'Thor', hora: [16, 0], motivo: 'Check-up geriátrico' },
];

async function j(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const login = await j('POST', '/auth/login', {
  email: 'demo.96106104124@vet.dev',
  password: 'senha12345',
});
const { accessToken } = await j(
  'POST',
  '/auth/select-tenant',
  { tenantId: login.tenants[0].id },
  login.selectionToken
);

const animals = await j('GET', '/animals', null, accessToken);
const vets = await j('GET', '/veterinarians', null, accessToken);
const animalId = (name) => animals.find((a) => a.animal.name === name)?.animal.id;
const vetId = vets[0].id;

const existing = await j('GET', '/appointments', null, accessToken);
const taken = new Set(
  existing.map((a) => {
    const d = new Date(a.scheduledAt);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}|${d.getHours()}:${d.getMinutes()}|${a.animal.id}`;
  })
);

const start = new Date();
start.setHours(0, 0, 0, 0);
start.setDate(start.getDate() + 1); // amanhã

let created = 0;
let skipped = 0;
let dias = 0;
for (let offset = 0; offset < 30; offset += 1) {
  const day = new Date(start);
  day.setDate(day.getDate() + offset);
  if (day.getDay() === 0) continue; // domingo fechado
  dias += 1;
  for (const c of CONSULTAS) {
    const id = animalId(c.animal);
    if (!id) continue;
    const when = new Date(day);
    when.setHours(c.hora[0], c.hora[1], 0, 0);
    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}|${c.hora[0]}:${c.hora[1]}|${id}`;
    if (taken.has(key)) {
      skipped += 1;
      continue;
    }
    await j(
      'POST',
      '/appointments',
      {
        animalId: id,
        veterinarianId: vetId,
        scheduledAt: when.toISOString(),
        reason: c.motivo,
      },
      accessToken
    );
    taken.add(key);
    created += 1;
    await new Promise((r) => setTimeout(r, 30));
  }
}

console.log(`Dias úteis: ${dias} | criados: ${created} | já existiam: ${skipped}`);
