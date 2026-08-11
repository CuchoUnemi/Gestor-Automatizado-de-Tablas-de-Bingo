#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Building Frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Building Backend..."
cd backend
pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
