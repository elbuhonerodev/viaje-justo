#!/bin/bash
# =============================================
# ViajeJusto — Script de subida a GitHub
# =============================================
# Uso:
#   chmod +x deploy_to_github.sh
#   ./deploy_to_github.sh
# =============================================

set -e

# ─── Colores ────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════╗"
echo "║   🌎 ViajeJusto — Deploy to GitHub       ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Verificar que estamos en el directorio correcto ────
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo -e "${RED}❌ Error: Ejecuta este script desde la raíz del proyecto /root/N8N${NC}"
    exit 1
fi

# ─── Verificar que git está instalado ────
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando git...${NC}"
    apt-get update -qq && apt-get install -y -qq git
fi

# ─── Configurar git si no está configurado ────
if [ -z "$(git config --global user.name)" ]; then
    echo ""
    echo -e "${YELLOW}⚙️  Configuración de Git necesaria:${NC}"
    read -p "Tu nombre para commits: " GIT_NAME
    read -p "Tu email para commits: " GIT_EMAIL
    git config --global user.name "$GIT_NAME"
    git config --global user.email "$GIT_EMAIL"
    echo -e "${GREEN}✅ Git configurado como: $GIT_NAME <$GIT_EMAIL>${NC}"
fi

# ─── Solicitar URL del repositorio ────
echo ""
echo -e "${YELLOW}📋 Pasos previos (si aún no lo has hecho):${NC}"
echo "   1. Ve a https://github.com/new"
echo "   2. Crea un repositorio (ej: 'viaje-justo')"
echo "   3. NO inicializar con README ni .gitignore"
echo "   4. Copia la URL del repo"
echo ""

REPO_URL=""
if git remote get-url origin &> /dev/null 2>&1; then
    EXISTING_URL=$(git remote get-url origin)
    echo -e "${CYAN}ℹ️  Remote existente: $EXISTING_URL${NC}"
    read -p "¿Usar este remote? (s/n): " USE_EXISTING
    if [ "$USE_EXISTING" = "s" ] || [ "$USE_EXISTING" = "S" ]; then
        REPO_URL="$EXISTING_URL"
    fi
fi

if [ -z "$REPO_URL" ]; then
    read -p "🔗 URL del repositorio GitHub (HTTPS o SSH): " REPO_URL
    if [ -z "$REPO_URL" ]; then
        echo -e "${RED}❌ Necesitas proporcionar la URL del repositorio.${NC}"
        exit 1
    fi
fi

# ─── Verificar autenticación GitHub ────
echo ""
echo -e "${YELLOW}🔑 Métodos de autenticación GitHub:${NC}"
echo "   • HTTPS: Usa un Personal Access Token (PAT) como contraseña"
echo "   • SSH:   Asegúrate de tener tu clave SSH configurada"
echo "   Generar PAT: https://github.com/settings/tokens/new"
echo ""

# ─── Inicializar git si no existe ────
if [ ! -d ".git" ]; then
    echo -e "${CYAN}🔧 Inicializando repositorio git...${NC}"
    git init
    git branch -M main
fi

# ─── Configurar remote ────
if git remote get-url origin &> /dev/null 2>&1; then
    git remote set-url origin "$REPO_URL"
else
    git remote add origin "$REPO_URL"
fi

# ─── Verificar que .env NO se suba ────
if grep -q "^\.env$" .gitignore; then
    echo -e "${GREEN}🔒 .env está en .gitignore (secretos protegidos)${NC}"
else
    echo -e "${RED}⚠️  Añadiendo .env al .gitignore por seguridad${NC}"
    echo ".env" >> .gitignore
fi

# ─── Stage de archivos ────
echo -e "${CYAN}📁 Agregando archivos al staging...${NC}"
git add -A

# ─── Mostrar qué se va a subir ────
echo ""
echo -e "${YELLOW}📋 Archivos que se van a subir:${NC}"
git status --short | head -30
FILE_COUNT=$(git status --short | wc -l)
echo -e "   ... ${FILE_COUNT} archivos en total"
echo ""

# ─── Confirmar ────
read -p "¿Continuar con el commit y push? (s/n): " CONFIRM
if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
    echo -e "${YELLOW}🚫 Operación cancelada.${NC}"
    exit 0
fi

# ─── Commit ────
COMMIT_MSG="🚀 ViajeJusto — Backup completo del proyecto ($(date '+%Y-%m-%d %H:%M'))"
echo -e "${CYAN}💾 Creando commit...${NC}"
git commit -m "$COMMIT_MSG"

# ─── Push ────
echo -e "${CYAN}🚀 Subiendo a GitHub...${NC}"
git push -u origin main

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ ¡Proyecto subido exitosamente!       ║${NC}"
echo -e "${GREEN}║   📦 Repo: $REPO_URL  ${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📌 Para futuras actualizaciones:${NC}"
echo "   git add -A"
echo "   git commit -m 'descripción del cambio'"
echo "   git push"
