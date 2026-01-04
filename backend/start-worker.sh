#!/bin/bash
cd "$(dirname "$0")"
echo "Starting extraction worker..."
npm run worker
