#!/bin/bash
set -e

REMOTE_HOST="134.122.114.114"
REMOTE_USER="root"
REMOTE_PASS="3186948089Xl"

echo "🚀 Iniciando despliegue de AI Agent en $REMOTE_HOST..."

# Usar sshpass para comandos seguros sin prompt interactivo
alias do_ssh="sshpass -p '$REMOTE_PASS' ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST"
alias do_scp="sshpass -p '$REMOTE_PASS' scp -o StrictHostKeyChecking=no"

echo "📁 Creando directorio remoto..."
do_ssh "mkdir -p /opt/viajejusto-agent-python"

echo "📤 Transfiriendo archivos..."
do_scp -r /root/N8N/agent-python/* "$REMOTE_USER@$REMOTE_HOST:/opt/viajejusto-agent-python/"

echo "🐳 Construyendo e iniciando contenedores en remoto..."
do_ssh "cd /opt/viajejusto-agent-python && docker compose build && docker compose up -d"

echo "✅ Despliegue completado."
