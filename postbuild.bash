#!/bin/bash

echo "Store puppeteer executable in cache"
echo "Current directory: $(pwd)"
echo "Listing /app/.cache content:"
ls -la /app/.cache || echo "No /app/.cache directory found"

mkdir -p ./.cache
echo "Created .cache directory"

if [ -d "/app/.cache/puppeteer" ]; then
    echo "Moving puppeteer cache"
    mv /app/.cache/puppeteer ./.cache/
    echo "Cache moved successfully"
else
    echo "No puppeteer cache found in /app/.cache"
fi

echo "Listing .cache content:"
ls -la ./.cache