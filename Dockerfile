# Backend CredCar (upload-server) para Easypanel / Docker
FROM node:20-alpine

WORKDIR /app

# Copiar apenas arquivos de dependências para aproveitar cache de camadas
COPY package.json package-lock.json* ./

# Instalar dependências de produção (sem devDependencies)
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# Copiar o restante da aplicação (upload-server e arquivos necessários)
COPY upload-server.js ./
COPY src ./src

# Pasta para documentos (upload); será montada como volume em produção se necessário
RUN mkdir -p documentos

EXPOSE 3001

ENV NODE_ENV=production
CMD ["node", "upload-server.js"]
