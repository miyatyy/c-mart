FROM node:20-alpine

WORKDIR /app

# Salin package.json dan pasang dependensi
COPY package*.json ./
RUN npm ci --omit=dev

# Salin seluruh kode backend
COPY . .

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "index.js"]
