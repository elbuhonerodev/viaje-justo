#!/bin/bash

# ==============================================================================
# SCRIPT DE MIGRACIÓN MAESTRA VIAJEJUSTO (VUE + NODE + PM2) - VERSIÓN COMPLETA
# Este script empaquetará el proyecto al 100% incluyendo directorios pesados
# como node_modules, e instalará todas las herramientas satélite requeridas.
# ==============================================================================

echo "================================================================"
echo "🚀 INICIANDO ASISTENTE DE MIGRACIÓN TOTAL A NUEVO VPS"
echo "================================================================"
echo "A continuación, te pediré los datos de tu nuevo servidor."
echo ""

# 1. Recolección de Datos
read -p "🌐 Ingresa la IP pública del nuevo servidor: " NEW_VPS_IP
read -p "👤 Ingresa el usuario SSH (Presiona Enter si es 'root'): " NEW_VPS_USER
NEW_VPS_USER=${NEW_VPS_USER:-root}
read -p "📁 Ingresa la ruta de destino (Presiona Enter si es '/root/N8N'): " NEW_VPS_PATH
NEW_VPS_PATH=${NEW_VPS_PATH:-/root/N8N}

echo ""
echo "🔌 El sistema se conectará a $NEW_VPS_USER@$NEW_VPS_IP."
echo "⚠️ Mantente atento porque Linux te pedirá la CONTRASEÑA de tu nuevo servidor un par de veces."
echo "Pulsa ENTER para comenzar la clonación masiva..."
read -p ""

# 2. Creación del directorio destino
echo ""
echo "[1/4] Preparando la bóveda remota..."
ssh -t ${NEW_VPS_USER}@${NEW_VPS_IP} "mkdir -p ${NEW_VPS_PATH}"

# 3. Empaquetado y Transferencia Segura Absoluta
echo ""
echo "[2/4] Transfiriendo EL PROYECTO COMPLETO..."
echo "⏳ ADVERTENCIA: Has solicitado llevar 'node_modules'. Esto incluye decenas de miles de archivos pequeños."
echo "Dependiendo de tu internet y el procesador, este paso tomará bastante tiempo. ¡No canceles el proceso!"
# Hemos quitado el exclude de node_modules para llevar el bloque intacto
rsync -avz --exclude 'dist' --exclude '.git' /root/N8N/ ${NEW_VPS_USER}@${NEW_VPS_IP}:${NEW_VPS_PATH}

if [ $? -eq 0 ]; then
    echo "✅ Transferencia masiva completada exitosamente."
else
    echo "❌ Error de transferencia masiva. Verifica tu conexión o clave."
    exit 1
fi

# 4. Instalación de Motor Absoluto en el destino
echo ""
echo "[3/4] Forjando el ecosistema en la Nube (Instalando arsenales y librerías base)..."
ssh -t ${NEW_VPS_USER}@${NEW_VPS_IP} << EOF
    echo "📦 Preparando catálogos de paquetes..."
    apt-get update -y -q > /dev/null 2>&1
    
    echo "🛠️ Instalando utilidades de red, herramientas lógicas y compiladores..."
    apt-get install -y curl wget git ufw build-essential apt-transport-https ca-certificates > /dev/null 2>&1
    
    echo "🟢 Descargando el núcleo de Ejecución: Node.js (LTS)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1

    echo "🛡️ Reforzando Perímetro Firewall (Habilitando puertos de la plataforma)..."
    ufw allow 5173/tcp > /dev/null 2>&1
    ufw allow 3001/tcp > /dev/null 2>&1
    ufw allow 80/tcp > /dev/null 2>&1
    ufw allow 443/tcp > /dev/null 2>&1
    
    echo "⚙️ Reuniendo controladores de procesos (Gestor PM2 Global)..."
    npm install -g pm2 > /dev/null 2>&1
EOF

# 5. Encendido Secuencial y Despliegue
echo ""
echo "[4/4] Restaurando memoria y arrancando la matriz..."
ssh -t ${NEW_VPS_USER}@${NEW_VPS_IP} << EOF
    cd ${NEW_VPS_PATH}
    
    echo "🔄 Actualizando los vínculos del pesado node_modules transferido..."
    # Ejecutamos npm install igual para recompilar binarios de vite que difieren entre CPU y SO aunque se pasen archivos crudos.
    npm install
    
    echo "🚀 Alzando la Web (Vite Spa)..."
    pm2 delete viajejusto-web 2>/dev/null || true
    pm2 start "npm run dev -- --host 0.0.0.0 --port 5173" --name "viajejusto-web"
    
    echo "🚀 Alzando el Cerebro WhatsApp OTP..."
    pm2 delete whatsapp-webhook 2>/dev/null || true
    pm2 start otp-server.js --name "whatsapp-webhook"
    
    echo "💾 Memoria PM2 Asegurada contra catástrofes de apagón..."
    pm2 save
    
    echo ""
    echo "✅ ¡INJERTO CIBERNÉTICO COMPLETADO AL 100%!"
    echo "=========================================================="
    pm2 status
    echo "=========================================================="
    echo "🌍 Aplicación Web Expuesta en puerto 5173"
    echo "📲 Webhook OTP y Node Backend listo en puerto 3001"
EOF

echo ""
echo "🎉 Las manijas te han sido devueltas. Clonación absoluta y exitosa."
