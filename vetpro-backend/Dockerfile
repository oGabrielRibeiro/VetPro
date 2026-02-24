FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY . .

# Criar diretório de uploads se não existir
RUN mkdir -p uploads

# Expor porta correta
EXPOSE 5000

# Migrações + start
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
