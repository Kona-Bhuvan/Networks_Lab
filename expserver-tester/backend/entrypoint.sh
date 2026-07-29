#!/bin/sh

DEBUG=""
FORCE_REBUILD=""

for arg in "$@"; do
  case "$arg" in
    --debug=*)
      DEBUG=$(echo "$arg" | sed 's/^--debug=//')
      ;;
    --force-rebuild)
      FORCE_REBUILD="true"
      ;;
    *)
      echo "Unknown argument: $arg"
      exit 1
      ;;
  esac
done

if [ -z "$DEBUG" ]; then
  echo "Error: --debug flag is required (true or false)"
  exit 1
fi

if [ "$DEBUG" != "true" ] && [ "$DEBUG" != "false" ]; then
  echo "Error: --debug must be either 'true' or 'false'"
  exit 1
fi

set -e

if [ "$DEBUG" = "true" ]; then
  DB_HOST="postgresdb-dev"
else
  DB_HOST="postgresdb"
fi

echo "Waiting for $DB_HOST to be available on port 5432"
while ! nc -z "$DB_HOST" 5432; do
    sleep 1
done
echo "$DB_HOST is up - running setup steps"

# --- Step 1: Generate large file (skip if already exists) ---
LARGE_FILE="public/large-files/4gb.txt"
if [ -f "$LARGE_FILE" ] && [ "$FORCE_REBUILD" != "true" ]; then
  echo "⏭️  Skipping generate-large-file — $LARGE_FILE already exists ($(du -h "$LARGE_FILE" | cut -f1))"
else
  echo "⏳ Generating large file..."
  START=$(date +%s)
  npm run generate-large-file
  END=$(date +%s)
  echo "✅ generate-large-file completed in $((END - START))s"
fi

# --- Step 2: Generate descriptions (fast, always run) ---
echo "⏳ Generating descriptions..."
START=$(date +%s)
npm run generate-desc
END=$(date +%s)
echo "✅ generate-desc completed in $((END - START))s"

# --- Step 3: DB migrations (idempotent, always run) ---
echo "⏳ Running setup (migrations)..."
START=$(date +%s)
npm run setup
END=$(date +%s)
echo "✅ setup completed in $((END - START))s"

# --- Step 4: Build tester Docker image (skip if already exists) ---
if docker image inspect expserver-tester-image > /dev/null 2>&1 && [ "$FORCE_REBUILD" != "true" ]; then
  echo "⏭️  Skipping docker:build — expserver-tester-image already exists"
else
  echo "⏳ Building tester Docker image..."
  START=$(date +%s)
  npm run docker:build
  END=$(date +%s)
  echo "✅ docker:build completed in $((END - START))s"
fi

echo "🚀 All setup steps complete!"

if [ "$DEBUG" = "true" ]; then
    npm run dev
else
    npm run build
    npm run start
fi
