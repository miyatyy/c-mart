# Stage 1: Build Frontend (Vite + React + Vue 3)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve Production Artifacts via Nginx Alpine
FROM nginx:alpine

# Salin konfigurasi custom Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Salin hasil build dist dari stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
