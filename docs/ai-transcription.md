# Transcrição de consulta por IA (proposta)

Status: **ideia registrada, nada implementado.** Este documento guarda o levantamento feito em
2026-10-27 para não se perder enquanto o foco volta ao frontend.

## Objetivo

Reduzir o tempo que o veterinário gasta transcrevendo a consulta para o prontuário. O
veterinário inicia a gravação, conversa com o tutor normalmente e, ao encerrar, recebe a
transcrição e os campos do prontuário **pré-preenchidos para revisão**. A IA não substitui o
veterinário: ela só adianta a digitação.

Diferencial de mercado apontado pelo veterinário do grupo: os ERPs atuais não fazem isso.

## Fluxo

1. Botão **Iniciar atendimento** no card da agenda ou no prontuário.
2. Gravação do microfone do navegador (`MediaRecorder`, Opus/WebM).
3. **Pausar** / **Retomar** durante a consulta; cada retomada abre um segmento novo.
4. Ao encerrar, o áudio vai para o servidor, é transcrito e **descartado**. Só o texto é
   persistido.
5. A tela mostra a transcrição e os campos sugeridos; o veterinário **aceita, edita ou
   descarta** campo por campo.
6. Nada é gravado no prontuário sem esse aceite.

## Campos que a IA pode sugerir

Existentes no modelo, preenchidos como sugestão:

- `Consultation.chiefComplaint` — queixa principal
- `Consultation.anamnesis` — anamnese
- `Consultation.physicalExam` — exame físico
- `Consultation.clinicalNotes` — observações
- Registros estruturados com confirmação obrigatória: peso, medicação, vacina, alergia

Não sugerir automaticamente: nome, idade e raça do animal (já vêm do cadastro); diagnóstico
como decisão da IA; dose sem confirmação do veterinário.

## Arquitetura

- **Captura**: navegador. Exige HTTPS ou localhost. Sem áudio persistido.
- **API**: módulo NestJS `recordings`; upload do áudio para processamento em memória.
- **Fila**: `pg-boss` no próprio Postgres — evita subir Redis. BullMQ é alternativa se Redis
  já existir.
- **Transcrição**: worker Python separado com `faster-whisper` (pt-BR). Nunca no processo
  NestJS: uma consulta de 20 min prende a thread.
- **Extração**: LLM local com *structured output* (JSON schema) recebendo a transcrição;
  devolve campo + valor + confiança + trecho de origem.
- **Revisão**: tela de diff com aceitar/editar/descartar e registro de quem aceitou.

## Requisitos não funcionais

- pt-BR com vocabulário veterinário; nomes de fármacos e números são o ponto frágil.
- Latência desejável: consulta de 20 min transcrita em até 6 min; com GPU, até 2 min.
- Nenhum áudio em disco, `tmp` ou log.
- Isolamento por tenant e RBAC novos: `RECORDING_CREATE`, `RECORDING_READ`,
  `TRANSCRIPT_READ`.
- Transcrição é dado sensível (LGPD): consentimento do tutor, retenção definida, criptografia
  em repouso, logs sem conteúdo.
- Auditoria de aceite: quem aceitou qual sugestão e quando.

## Custo de servidor (preços checados em 2026-10-27)

| Cenário | Hardware | Custo mensal | Latência p/ 20 min |
|---|---|---|---|
| Só sistema | Hetzner CX33 (4 vCPU/8 GB) | €8,49 | — |
| Sistema + IA CPU | Hetzner CX43 (8 vCPU/16 GB) | €15,99 | ~4–8 min |
| + LLM 7B CPU | Hetzner CX53 (16 vCPU/32 GB) | €29,49 | ~4–8 min + ~1 min |
| + GPU 24/7 | VPS + RunPod RTX 3090 ($0,50/h) | €16 + ~$365 | ~1,5–2 min |
| + GPU sob demanda | VPS + GPU serverless ($0,69/h de uso) | €16 + ~$0,02/consulta | ~1,5–2 min + cold start |

Referências: `faster-whisper` small int8 transcreve 13 min em 102 s num i7-12700K com 8 threads
(≈7,6× tempo real); em VPS compartilhado, estimativa conservadora de 2–4×. Whisper large-v2 em
RTX 3070 Ti: 13 min em 63 s (≈12×). AWS `g4dn.xlarge` (T4): $0,526/h ≈ $384/mês.

## Decisões pendentes (dono do produto)

1. Sem áudio gravado, não há como reprocessar a consulta com um modelo melhor depois.
2. Consentimento do tutor: aviso na tela, termo assinado ou ambos?
3. Retenção da transcrição: quantos dias? Exclusão a pedido?
4. A IA sugere só texto livre, ou também peso/medicação/vacina com confirmação?
5. Limite de minutos por clínica se virar SaaS.
6. Servidor no exterior implica transferência internacional de dados; provedor no Brasil custa
   mais e precisa de orçamento à parte.

## Fases sugeridas

1. **PoC**: gravar/pausar/retomar e transcrever ao final, sem extração. Aceite: 10 min de áudio
   viram texto legível; pausa não gera áudio.
2. **Extração assistida**: os quatro campos de texto com tela de revisão. Aceite: nada é
   gravado sem aceite; cada sugestão mostra o trecho que a originou.
3. **Registros estruturados**: peso/medicação com confirmação obrigatória e auditoria.
4. **Tempo real** e diarização, só depois que 1–3 estiverem sólidos.
