#!/bin/bash
# ==============================================================================
# SCRIPT DE APROVISIONAMIENTO INICIAL - ViajeJusto
# Instala nodejs, docker, easypanel y utilidades
# ==============================================================================
set -e

echo ">> Actualizando repositorios del servidor..."
sudo apt-get update && sudo apt-get upgrade -y

echo ">> Instalando utilidades básicas..."
sudo apt-get install curl wget git ufw certbot nginx -y

echo ">> Instalando Node.js v20 (LTS)..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo ">> Instalando PM2..."
sudo npm install -g pm2
pm2 startup ubuntu
pm2 save

echo ">> Instalando Docker Engine..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

echo ">> Configurando Cortafuegos (UFW)..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp # API Evolution
sudo ufw allow 5173/tcp # Vite Web frontend
sudo ufw allow 3000/tcp # Easypanel UI
sudo ufw allow 3001/tcp # OTP PM2 si es usado
sudo ufw --force enable

echo ">> Instalando Easypanel (Esto correrá contenedores Docker en el fondo)..."
curl -sSL -o install_easypanel.sh https://get.easypanel.io
sudo bash install_easypanel.sh

echo "============================================="
echo "✅ PREPARACIÓN DE ENTORNO COMPLETADA"
echo "============================================="
echo "Node Version: $(node -v)"
echo "NPM Version: $(npm -v)"
echo "Docker Version: $(docker -v)"
echo "Easypanel UI disponble en: http://<tu-ip>:3000"
echo ""
echo "Para revivir el frontend de la web:"
echo "cd /root/N8N && npm install && pm2 start 'npm run dev -- --host 0.0.0.0 --port 5173' --name 'viajejusto-web'"
