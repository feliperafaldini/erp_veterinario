# Frontend — ERP Veterinário

React + TypeScript + Vite + Tailwind. Consome a API NestJS (`/api`) do backend na raiz do repo.

Este é um **protótipo para demonstração**: cobre autenticação, seleção de clínica, tutores,
animais com prontuário (consultas/diagnósticos, peso, vacinas, alergias, medicações) e
agendamentos. Convites, gestão de papéis, catálogos dinâmicos e módulo de tenant não estão aqui.

## Pré-requisitos

- Node 20+
- Backend rodando em `http://localhost:3000` com CORS liberado para `http://localhost:5173`
- PostgreSQL (docker compose do repo) com o seed aplicado

## Subir o ambiente

```bash
# 1. banco
cd /home/felipe/Projects/erp_veterinario
printf 'docker compose up -d db\n' | newgrp docker

# 2. seed do RBAC + catálogos (idempotente)
npx prisma db seed

# 3. backend com CORS para o Vite
CORS_ORIGINS=http://localhost:5173 npm run start:prod     # ou start:dev

# 4. frontend
cd frontend
npm install
npm run dev        # http://localhost:5173
```

O Vite faz proxy de `/api` para `http://localhost:3000` (ver `vite.config.ts`), então não há
CORS no caminho normal. `VITE_API_BASE_URL` (`.env`) pode apontar para outra URL absoluta.

## Dados de demonstração

```bash
node scripts/demo-data.mjs
```

Cria uma clínica nova ("Clínica Pata Amiga"), um usuário ADMIN, um veterinário e popula
4 tutores, 5 animais, pesos, vacinas, alergia, medicação, 3 agendamentos e 2 consultas com
diagnóstico. O script imprime as credenciais no final. Para reaproveitar um usuário existente:

```bash
DEMO_EMAIL=seu@email.com DEMO_PASSWORD=suasenha node scripts/demo-data.mjs
```

Requisitos para o script: `GET /health` respondendo, catálogos de espécie/raça/vacina/alergia/
medicamento já no banco (vêm do seed do backend).

## Observações de contrato da API (aprendidas na verificação)

Coisas que não são óbvias e custam tempo se descobertas em runtime:

- `POST /auth/select-tenant` exige `Authorization: Bearer <selectionToken>` (o token do login),
  e o corpo é somente `{ tenantId }`.
- `POST /animals` já cria o vínculo com a clínica e retorna o **TenantAnimal**:
  `{ id, status, animal: {...} }`. As rotas `/animals/:id` esperam o `id` do **Animal**
  (`animal.id`), não o do vínculo.
- Sub-recursos clínicos são aninhados e recebem o id do Animal no path:
  `/animals/:animalId/{tutors,weight,vaccinations,allergies,medications}`. O `animalId`
  **não** vai no corpo (`whitelist/forbidNonWhitelisted` devolve 400 para campo extra).
- `veterinarianId` em agendamento e consulta é o id do **vínculo** (`TenantVeterinarian`),
  ou seja, o `id` do item retornado por `GET /veterinarians` — não `veterinarian.id`.
- `GET /veterinarians` devolve vínculos: `{ id, veterinarian: { id, name, crmv } }`.
- `GET /animals/:animalId/weight` devolve `weight` como **string** (decimal serializado).
- Nome do tutor vive em `tutorIdentity.name`.
- Enums: `AnimalSize` = SMALL | MEDIUM | LARGE (sem GIANT); `AnimalStatus` = ACTIVE | DECEASED | INACTIVE.
- `GET /consultations` não filtra por animal — filtro é no cliente.

## Build

```bash
npm run build      # tsc -b && vite build
```
