#! /bin/bash

cd backend
npm run setup
npm run reset
npm run compile


cd ../frontend
npm run build