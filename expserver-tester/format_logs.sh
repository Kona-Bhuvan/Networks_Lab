#!/bin/bash

LOG_DIR="./backend/public/logs"

for file in "$LOG_DIR"/*.log; do
    echo "Cleaning $file"
    sed -i -r 's/\x1B\[[0-9;]*m//g' "$file"
done

echo "All logs cleaned."