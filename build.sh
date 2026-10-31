#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "📦 Installing Python backend dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "🎨 Building React Vite frontend..."
cd frontend
npm install
npm run build
cd ..

echo "✅ Build complete! Frontend static assets generated in frontend/dist"
