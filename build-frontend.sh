#!/bin/sh
set -e
cd artifacts/quotation-app
../../node_modules/.bin/vite build --config vite.config.ts
