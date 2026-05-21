#!/bin/bash
# Start all services and keep running

cd /home/z/my-project

# Start mini-services in background
(mini-services/file-server/node_modules/.bin/bun --hot mini-services/file-server/index.ts > file-server.log 2>&1 &)
(mini-services/xhs-scraper/node_modules/.bin/bun --hot mini-services/xhs-scraper/index.ts > xhs-scraper.log 2>&1 &)

# Start Next.js
npx next dev -p 3000 -H 0.0.0.0 --webpack 2>&1 | tee dev.log
