# Imagem de execução do backend NestJS.
#
# Decisões registradas (F6 — infraestrutura):
# - Node 26, a mesma versão usada no desenvolvimento local.
# - `npm ci` completo, sem `--omit=dev`: o CLI do Prisma é devDependency e
#   é necessário em runtime para `prisma migrate deploy`.
# - `prisma generate` antes do build: o Prisma Client gerado é exigido pela
#   compilação TypeScript e usado em runtime.
# - Etapa única em vez de multi-stage: o Client gerado vive em node_modules
#   e copiá-lo entre stages adicionaria fragilidade sem ganho prático aqui.
# - NODE_ENV não é fixado: em `production` o cookie de refresh sai com
#   `Secure` e deixa de funcionar em http://localhost. Defina-o apenas onde
#   houver TLS.
FROM node:26-slim

WORKDIR /app

# Camada separada para manter o cache de dependências entre builds.
COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json nest-cli.json ./
RUN npx prisma generate

COPY src ./src
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main.js"]
