# ==========================================
# Stage 1: Build Vue/Vite Application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Salin manifest dependensi dan pasang semua paket (termasuk devDependencies untuk build)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Salin source code dan jalankan proses build
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Serve via Nginx Alpine
# ==========================================
FROM nginx:alpine

# Salin konfigurasi Nginx kustom
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Salin folder hasil build (dist) ke direktori root Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
