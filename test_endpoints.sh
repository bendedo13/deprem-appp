#!/bin/bash
echo "=== HEALTH ==="
curl -s http://localhost:8001/api/v1/health
echo ""

echo "=== REGISTER ==="
curl -s -X POST http://localhost:8001/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test123456!","full_name":"Test User"}'
echo ""

echo "=== LOGIN ==="
curl -s -X POST http://localhost:8001/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test123456!"}'
echo ""

echo "=== ADMIN LOGIN ==="
curl -s -X POST http://localhost:8001/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bendedo13@gmail.com","password":"Benalan.1"}'
echo ""

echo "=== FRONTEND ==="
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:8002/
echo ""

echo "=== DOCKER STATUS ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -10
