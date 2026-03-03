#!/bin/bash
set -e

echo "🔄 Running database migrations..."
alembic upgrade head 2>&1 || echo "⚠️ Migration warning (may already be applied)"

echo "🚀 Starting backend server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
