#!/usr/bin/env bash
set -e

echo "🚀 Memulai Deployment Campus Mart..."

# 1. Pull kode terbaru dari repository git
echo "📦 Menarik source code terbaru dari origin/main..."
git pull origin main

# 2. Build ulang dan jalankan container
echo "🔨 Membangun ulang dan menyalakan semua container..."
docker compose down --remove-orphans
docker compose up -d --build

# 3. Cek kesehatan dan status container
echo "🔍 Memeriksa status container..."
docker compose ps

echo "✅ Deployment selesai dan semua service aktif!"
