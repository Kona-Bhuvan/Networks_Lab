#!/bin/bash
trap 'kill -TERM $FRONTEND_PID $BACKEND_PID 2>/dev/null' EXIT

# Start frontend with logging
cd frontend || exit 1
npm run start > frontend-run.log 2>&1 &
FRONTEND_PID=$!
tail -f frontend-run.log &
cd ..

# Start backend with logging 
cd backend || exit 1
./compile/build-linux > backend-run.log 2>&1 &
BACKEND_PID=$!
tail -f backend-run.log &
cd ..

wait