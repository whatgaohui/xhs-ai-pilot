#!/bin/bash
cd /home/z/my-project

# Start microservices
cd /home/z/my-project/mini-services/file-server
bun --hot index.ts > /home/z/my-project/file-server.log 2>&1 &
FILE_PID=$!

cd /home/z/my-project/mini-services/xhs-scraper
bun --hot index.ts > /home/z/my-project/xhs-scraper.log 2>&1 &
SCRAPER_PID=$!

# Start Next.js
cd /home/z/my-project
npx next dev -p 3000 -H 0.0.0.0 --webpack 2>&1 | tee /home/z/my-project/dev.log &
NEXT_PID=$!

echo "PIDs: file-server=$FILE_PID, xhs-scraper=$SCRAPER_PID, next=$NEXT_PID"

# Wait for any child to die
wait
