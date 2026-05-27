#!/bin/bash
# Custom dev script for the Z.ai sandbox environment
# This is called by /start.sh on container boot

set -e

cd /home/z/my-project

echo "[DEV] Installing dependencies..."
bun install

echo "[DEV] Setting up database..."
bun run db:push

echo "[DEV] Starting mini-services..."

# Start file-server
cd /home/z/my-project/mini-services/file-server
bun install
bun run dev &
echo "[DEV] File server started"

# Start xhs-scraper
cd /home/z/my-project/mini-services/xhs-scraper
bun install
bun run dev &
echo "[DEV] XHS scraper started"

# Start Next.js dev server (foreground to keep the script running)
cd /home/z/my-project
echo "[DEV] Starting Next.js dev server..."
bun run dev
