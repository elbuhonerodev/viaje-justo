#!/bin/bash
# ==============================================================================
# SCRIPT DE MIGRACIÓN DE EMERGENCIA - ViajeJusto
# Empaqueta y traslada el código base y módulos a un nuevo VPS
# ==============================================================================
set -e

# Asegurar dependencias de sistema
if ! command -v sshpass &> /dev/null; then
  echo "Instalando sshpass para facilitar la conexión Segura..."
  sudo apt-get update && sudo apt-get install sshpass rsync -y || true
fi

echo "============================================="
echo "🧳 INICIANDO MIGRACIÓN DEL PROYECTO"
echo "============================================="

# 1. Empaquetamiento
ARCHIVO_BACKUP="/tmp/viajejusto_backup.tar.gz"
echo ">> Empaquetando /root/N8N (Preservando node_modules)..."
cd /root/N8N
tar -czf "$ARCHIVO_BACKUP" .
echo ">> [Completado] Archivo generado en $ARCHIVO_BACKUP ($(du -h $ARCHIVO_BACKUP | cut -f1))"

# 2. Credenciales del nuevo VPS
echo "============================================="
echo "🌐 DATOS DEL SERVIDOR DESTINO"
echo "============================================="
read -p "Ingresa la IP del nuevo VPS: " VPS_IP
read -p "Ingresa el nombre de usuario (ej. root): " VPS_USER
read -s -p "Ingresa la contraseña: " VPS_PASS
echo ""

# 3. Traslado
echo ">> Iniciando transferencia cifrada (esto puede demorar unos minutos)..."
sshpass -p "$VPS_PASS" rsync -avhz -e "ssh -o StrictHostKeyChecking=no" "$ARCHIVO_BACKUP" "$VPS_USER@$VPS_IP:/root/"

echo "============================================="
echo "✅ MIGRACIÓN EXITOSA"
echo "============================================="
echo "El código base está en el nuevo servidor en: /root/viajejusto_backup.tar.gz"
echo "Entra a tu nuevo servidor y descomprime con:"
echo "  mkdir -p /root/N8N && tar -xzf /root/viajejusto_backup.tar.gz -C /root/N8N"
echo "Luego ejecuta ./install_requirements.sh"

# Limpieza
rm -f "$ARCHIVO_BACKUP"
