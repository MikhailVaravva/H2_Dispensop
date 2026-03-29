#!/bin/bash
set -euo pipefail

# ============================================================
# Alex Dispenser — Full Setup Script for Raspberry Pi
# Устанавливает Node.js, зависимости, собирает проект,
# настраивает systemd сервисы для backend и rpi-service.
# ============================================================

INSTALL_DIR="/opt/dispenser"
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$DEPLOY_DIR")"
SERVICE_USER="pi"
NODE_MAJOR=20

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# --- Проверка root ---
if [ "$EUID" -ne 0 ]; then
  error "Запустите скрипт с правами root: sudo bash setup.sh"
fi

info "=== Alex Dispenser Setup ==="
info "Install dir: $INSTALL_DIR"
info "Project dir: $PROJECT_DIR"

# --- 1. Обновление системы ---
info "Обновление списка пакетов..."
apt-get update -qq

# --- 2. Установка системных зависимостей ---
info "Установка системных зависимостей..."
apt-get install -y -qq \
  curl \
  git \
  build-essential \
  python3 \
  ca-certificates \
  gnupg

# --- 3. Установка Node.js ---
if command -v node &>/dev/null; then
  CURRENT_NODE=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$CURRENT_NODE" -ge "$NODE_MAJOR" ]; then
    info "Node.js $(node -v) уже установлен"
  else
    warn "Node.js $(node -v) устарел, обновляю до v${NODE_MAJOR}..."
    INSTALL_NODE=true
  fi
else
  INSTALL_NODE=true
fi

if [ "${INSTALL_NODE:-false}" = true ]; then
  info "Установка Node.js ${NODE_MAJOR}..."
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt-get update -qq
  apt-get install -y -qq nodejs
  info "Node.js $(node -v) установлен"
fi

# --- 4. Копирование проекта ---
info "Копирование проекта в $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"

# Копируем файлы проекта (исключая node_modules, .git, deploy)
rsync -a --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='deploy' \
  --exclude='data' \
  "$PROJECT_DIR/" "$INSTALL_DIR/"

# Создаём директорию для данных
mkdir -p "$INSTALL_DIR/data"

# --- 5. Настройка .env ---
if [ ! -f "$INSTALL_DIR/.env" ]; then
  info "Создание .env из шаблона..."
  cp "$DEPLOY_DIR/.env.rpi" "$INSTALL_DIR/.env"

  # Генерация случайного токена
  AUTH_TOKEN=$(openssl rand -hex 16)
  sed -i "s/RPI_AUTH_TOKEN=changeme/RPI_AUTH_TOKEN=$AUTH_TOKEN/" "$INSTALL_DIR/.env"
  info "Сгенерирован RPI_AUTH_TOKEN: $AUTH_TOKEN"

  # Определение serial порта
  echo ""
  info "Доступные serial устройства:"
  ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || warn "Serial устройства не найдены"
  echo ""

  read -p "Введите serial порт ESP32 [/dev/ttyUSB0]: " SERIAL_PORT
  SERIAL_PORT=${SERIAL_PORT:-/dev/ttyUSB0}
  sed -i "s|SERIAL_PORT=/dev/ttyUSB0|SERIAL_PORT=$SERIAL_PORT|" "$INSTALL_DIR/.env"
  info "Serial порт: $SERIAL_PORT"
else
  info ".env уже существует, пропускаю"
fi

# --- 6. Установка зависимостей ---
info "Установка npm зависимостей..."
cd "$INSTALL_DIR"
npm install --omit=dev 2>&1 | tail -1

# --- 7. Сборка проекта ---
info "Сборка проекта..."
npm run build 2>&1 | tail -5

# --- 8. Права доступа ---
info "Настройка прав доступа..."
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"

# Добавить пользователя в группу dialout для serial
if ! groups "$SERVICE_USER" | grep -q dialout; then
  usermod -aG dialout "$SERVICE_USER"
  info "Пользователь $SERVICE_USER добавлен в группу dialout"
  warn "Для применения прав serial нужен перезапуск или re-login"
fi

# --- 9. Установка systemd сервисов ---
info "Установка systemd сервисов..."
cp "$DEPLOY_DIR/dispenser-backend.service" /etc/systemd/system/
cp "$DEPLOY_DIR/dispenser-rpi.service" /etc/systemd/system/

# Обновить пользователя в юнитах
sed -i "s/User=pi/User=$SERVICE_USER/" /etc/systemd/system/dispenser-backend.service
sed -i "s/User=pi/User=$SERVICE_USER/" /etc/systemd/system/dispenser-rpi.service

systemctl daemon-reload
systemctl enable dispenser-backend.service
systemctl enable dispenser-rpi.service

# --- 10. Запуск сервисов ---
info "Запуск сервисов..."
systemctl start dispenser-backend.service
sleep 2
systemctl start dispenser-rpi.service

# --- 11. Проверка статуса ---
echo ""
info "=== Статус сервисов ==="
systemctl status dispenser-backend.service --no-pager -l || true
echo ""
systemctl status dispenser-rpi.service --no-pager -l || true

echo ""
info "=== Установка завершена! ==="
info "Backend:     http://localhost:3000"
info "Frontend:    http://localhost:3000/station/station-001"
info ""
info "Полезные команды:"
info "  sudo systemctl status dispenser-backend"
info "  sudo systemctl status dispenser-rpi"
info "  sudo journalctl -u dispenser-backend -f"
info "  sudo journalctl -u dispenser-rpi -f"
info "  sudo systemctl restart dispenser-backend dispenser-rpi"
