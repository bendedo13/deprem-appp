@echo off
ssh -o StrictHostKeyChecking=no root@46.4.123.77 "cd /opt/deprem-app && git pull origin main && cd deploy && docker-compose -f docker-compose.prod.yml up -d --build"
