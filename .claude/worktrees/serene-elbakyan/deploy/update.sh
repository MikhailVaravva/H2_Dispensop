#!/bin/bash
set -euo pipefail

# ============================================================
# Alex Dispenser — Update Script
# Обновляет код, пересобирает проект, перезапускает сервисы.
# ============================================================

INSTALL_DIR="/opt/dispenser"
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$DEPLOY_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

if [ "$EUID" -ne 0 ]; then
  error "Запустите с правами root: sudo bash update.sh"
fi

if [ ! -d "$INSTALL_DIR" ]; then
  error "$INSTALL_DIR не найден. Сначала запустите setup.sh"
fi

info "=== Обновление Alex Dispenser ==="

# Остановка сервисов
info "Остановка сервисов..."
systemctl stop dispenser-rpi.service || true
systemctl stop dispenser-backend.service || true

# Копирование обновлённых файлов
info "Копирование файлов..."
rsync -a --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='deploy' \
  --exclude='data' \
  --exclude='.env' \
  "$PROJECT_DIR/" "$INSTALL_DIR/"

# Установка зависимостей
info "Установка зависимостей..."
cd "$INSTALL_DIR"
npm install --omit=dev 2>&1 | tail -1

# Сборка
info "Сборка проекта..."
npm run build 2>&1 | tail -5

# Обновление systemd юнитов
info "Обновление systemd юнитов..."
cp "$DEPLOY_DIR/dispenser-backend.service" /etc/systemd/system/
cp "$DEPLOY_DIR/dispenser-rpi.service" /etc/systemd/system/
systemctl daemon-reload

# Запуск
info "Запуск сервисов..."
systemctl start dispenser-backend.service
sleep 2
systemctl start dispenser-rpi.service

# Статус
echo ""
systemctl status dispenser-backend.service --no-pager -l || true
echo ""
systemctl status dispenser-rpi.service --no-pager -l || true

echo ""
info "=== Обновление завершено! ==="
