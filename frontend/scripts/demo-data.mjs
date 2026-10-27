#!/usr/bin/env node
// Popula uma clínica de demonstração via API (sem tocar no banco direto).
// Uso:
//   node scripts/demo-data.mjs
//   DEMO_EMAIL=... DEMO_PASSWORD=... node scripts/demo-data.mjs   # usa login existente
// Requer o backend rodando em API_URL (default http://localhost:3000/api).
//
// Rotas reais (conferidas contra o backend):
//   POST /animals                 -> cria Animal E o vínculo com a clínica; retorna TenantAnimal
//   POST /animals/:animalId/tutors | /weight | /vaccinations | /allergies | /medications
//   GET  /veterinarians           -> [{ id (vínculo), veterinarian: { id, name } }]

const API = process.env.API_URL || 'http://localhost:3000/api';

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => iso(new Date(today.getTime() - n * 86400000));
const daysAhead = (n) => iso(new Date(today.getTime() + n * 86400000));
const hoursFromNow = (h) => new Date(today.getTime() + h * 3600000).toISOString();

let token = null;

async function req(method, path, body, bearer) {
  const headers = { 'Content-Type': 'application/json' };
  const t = bearer !== undefined ? bearer : token;
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

function uniqueCpf() {
  return String(((Date.now() * 1000 + Math.floor(Math.random() * 1000)) % 90000000000) + 10000000000);
}

async function obtainTenant() {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;

  if (email && password) {
    const login = await req('POST', '/auth/login', { email, password }, null);
    const tenantId = login.tenants[0]?.id;
    if (!tenantId) throw new Error('Usuário sem tenant ativo');
    const sel = await req('POST', '/auth/select-tenant', { tenantId }, login.selectionToken);
    token = sel.accessToken;
    console.log(`Login OK: ${email} / tenant ${login.tenants[0].name}`);
    return;
  }

  const cpf = uniqueCpf();
  const emailNovo = `demo.${cpf}@vet.dev`;
  const senha = 'senha12345';
  const reg = await req(
    'POST',
    '/auth/register',
    {
      name: 'Dra. Helena Prado',
      email: emailNovo,
      password: senha,
      tenantName: 'Clínica Pata Amiga',
      tenantAddressLine1: 'Av. das Araucárias, 1200',
      tenantCity: 'Curitiba',
      tenantState: 'PR',
      tenantZipCode: '81530000',
      tenantDocumentType: 'CPF',
      tenantDocument: cpf,
    },
    null,
  );
  const login = await req('POST', '/auth/login', { email: emailNovo, password: senha }, null);
  const sel = await req('POST', '/auth/select-tenant', { tenantId: reg.tenant.id }, login.selectionToken);
  token = sel.accessToken;
  console.log(`Clínica criada: ${reg.tenant.name}`);
  console.log(`  login: ${emailNovo}`);
  console.log(`  senha: ${senha}`);
}

async function main() {
  const health = await fetch(`${API}/health`).then((r) => r.json()).catch(() => null);
  if (!health || health.status !== 'ok') {
    throw new Error(`Backend não respondeu em ${API}/health. Suba o backend antes.`);
  }

  await obtainTenant();

  const [species, breeds, vaccines, allergies, medications] = await Promise.all([
    req('GET', '/species'),
    req('GET', '/breeds'),
    req('GET', '/vaccines'),
    req('GET', '/allergies'),
    req('GET', '/medications'),
  ]);

  const cao = species.find((s) => s.name === 'Cão');
  const gato = species.find((s) => s.name === 'Gato');
  if (!cao || !gato) throw new Error('Catálogo de espécies sem Cão/Gato — rode o seed do backend');

  const breedOf = (speciesId, nome) =>
    breeds.find((b) => b.speciesId === speciesId && String(b.name ?? '').toLowerCase().includes(nome))?.id;
  const srdCao = breedOf(cao.id, 'sem raça');
  const srdGato = breedOf(gato.id, 'sem raça');

  let vetLink = (await req('GET', '/veterinarians'))[0];
  if (!vetLink) {
    await req('POST', '/veterinarians', {
      name: 'Dr. Carlos Mendes',
      crmv: `CRMV-PR ${Math.floor(Math.random() * 90000) + 10000}`,
      bio: 'Clínica médica de pequenos animais.',
    });
    vetLink = (await req('GET', '/veterinarians'))[0];
  }
  // veterinarianId em appointment/consultation é o id do VÍNCULO (TenantVeterinarian),
  // não o id global do Veterinarian — o backend valida por tenantVeterinarian.id.
  const vetId = vetLink.id;

  const tutoresSpec = [
    { name: 'Ana Souza', email: 'ana.souza@exemplo.com', notes: 'Tutora do Thor e da Luna.' },
    { name: 'Bruno Lima', email: 'bruno.lima@exemplo.com' },
    { name: 'Carla Dias', email: 'carla.dias@exemplo.com', notes: 'Prefere contato por WhatsApp.' },
    { name: 'Diego Alves', email: 'diego.alves@exemplo.com' },
  ];
  const tutores = [];
  for (const t of tutoresSpec) {
    tutores.push(
      await req('POST', '/tutors', {
        name: t.name,
        documentType: 'CPF',
        documentNumber: uniqueCpf(),
        email: t.email,
        notes: t.notes,
      }),
    );
  }

  const animaisSpec = [
    { nome: 'Thor', sp: cao, raca: srdCao, sexo: 'MALE', porte: 'LARGE', nasc: daysAgo(1180), cor: 'Caramelo', tutor: 0, foto: '/demo/thor.jpg' },
    { nome: 'Luna', sp: cao, raca: srdCao, sexo: 'FEMALE', porte: 'MEDIUM', nasc: daysAgo(760), cor: 'Preta', tutor: 0, foto: '/demo/luna.jpg' },
    { nome: 'Mia', sp: gato, raca: srdGato, sexo: 'FEMALE', porte: 'SMALL', nasc: daysAgo(1500), cor: 'Tricolor', tutor: 1, foto: '/demo/mia.jpg' },
    { nome: 'Rex', sp: cao, raca: srdCao, sexo: 'MALE', porte: 'LARGE', nasc: daysAgo(2200), cor: 'Marrom', tutor: 2, foto: '/demo/rex.jpg' },
    { nome: 'Nina', sp: gato, raca: srdGato, sexo: 'FEMALE', porte: 'SMALL', nasc: daysAgo(400), cor: 'Cinza', tutor: 3, foto: '/demo/nina.jpg' },
  ];

  const animais = [];
  for (const a of animaisSpec) {
    const link = await req('POST', '/animals', {
      name: a.nome,
      speciesId: a.sp.id,
      breedId: a.raca,
      sex: a.sexo,
      size: a.porte,
      dateOfBirth: a.nasc,
      color: a.cor,
      photoUrl: a.foto,
      microchip: String(Date.now()).slice(-9) + String(animais.length),
    });
    const animalId = link.animal.id;
    await req('POST', `/animals/${animalId}/tutors`, { tutorId: tutores[a.tutor].id });
    animais.push({ id: animalId, nome: a.nome });
  }

  const pesos = [
    [0, 28.4, daysAgo(180)], [0, 30.1, daysAgo(60)], [0, 31.0, daysAgo(5)],
    [1, 14.2, daysAgo(120)], [1, 15.0, daysAgo(10)],
    [2, 4.1, daysAgo(90)], [2, 4.3, daysAgo(15)],
    [3, 42.5, daysAgo(200)], [4, 3.2, daysAgo(40)],
  ];
  for (const [idx, weight, recordedAt] of pesos) {
    await req('POST', `/animals/${animais[idx].id}/weight`, { weight, recordedAt });
  }

  const vac = vaccines[0];
  for (const animal of animais.slice(0, 4)) {
    await req('POST', `/animals/${animal.id}/vaccinations`, {
      vaccineId: vac.id,
      applicationDate: daysAgo(200),
      lotNumber: `LOTE-${Math.floor(Math.random() * 9000) + 1000}`,
      nextDoseDate: daysAhead(165),
    });
  }

  await req('POST', `/animals/${animais[0].id}/allergies`, {
    allergyId: allergies[0].id,
    severity: 'MODERADA',
    description: 'Reação cutânea após contato.',
  });

  await req('POST', `/animals/${animais[1].id}/medications`, {
    medicationId: medications[0].id,
    dosage: '250 mg',
    frequency: 'A cada 12 horas',
    route: 'Oral',
    startDate: daysAgo(7),
    endDate: daysAhead(3),
    notes: 'Tratamento de dermatite.',
  });

  await req('POST', '/appointments', {
    animalId: animais[0].id,
    veterinarianId: vetId,
    tutorId: tutores[0].id,
    scheduledAt: hoursFromNow(24),
    reason: 'Retorno pós-vacina',
  });
  await req('POST', '/appointments', {
    animalId: animais[2].id,
    veterinarianId: vetId,
    tutorId: tutores[1].id,
    scheduledAt: hoursFromNow(72),
    reason: 'Avaliação dermatológica',
  });
  await req('POST', '/appointments', {
    animalId: animais[3].id,
    veterinarianId: vetId,
    tutorId: tutores[2].id,
    scheduledAt: hoursFromNow(5),
    reason: 'Consulta de rotina',
  });

  const consulta = await req('POST', '/consultations', {
    animalId: animais[0].id,
    veterinarianId: vetId,
    tutorId: tutores[0].id,
    startedAt: new Date(today.getTime() - 3600000).toISOString(),
    chiefComplaint: 'Coceira intensa nas patas.',
    anamnesis: 'Tutora relata prurido há 10 dias, piora à noite.',
    physicalExam: 'Eritema em região interdigital, sem lesões abertas.',
    clinicalNotes: 'Iniciar controle ambiental e anti-histamínico.',
  });
  await req('POST', `/consultations/${consulta.id}/diagnoses`, {
    description: 'Dermatite alérgica por contato',
    notes: 'Confirmar com teste de exclusão.',
  });
  await req('PATCH', `/consultations/${consulta.id}`, { status: 'COMPLETED', finishedAt: new Date().toISOString() });

  const consulta2 = await req('POST', '/consultations', {
    animalId: animais[1].id,
    veterinarianId: vetId,
    tutorId: tutores[0].id,
    startedAt: new Date(today.getTime() - 86400000 * 3).toISOString(),
    chiefComplaint: 'Apatia e inapetência.',
    anamnesis: 'Sinais iniciados há 2 dias.',
    physicalExam: 'Mucosas hipocoradas, temperatura 39,1 °C.',
    clinicalNotes: 'Solicitado hemograma.',
  });
  await req('POST', `/consultations/${consulta2.id}/diagnoses`, {
    description: 'Suspeita de processo infeccioso',
    notes: 'Aguardando exames.',
  });

  console.log('\nDados de demonstração criados:');
  console.log(`  tutores: ${tutores.length} | animais: ${animais.length} | pesos: ${pesos.length}`);
  console.log(`  agendamentos: 3 | consultas: 2 | veterinário: ${vetLink.veterinarian?.name ?? vetLink.name}`);
  console.log('\nAbra o frontend (http://localhost:5173) e faça login com as credenciais acima.');
}

main().catch((err) => {
  console.error('FALHOU:', err.message);
  process.exit(1);
});
