# Восстановление H2 Dispenser с нуля

## Что в этой папке

| Файл | Описание |
|------|----------|
| `dispenser.db` | SQLite база данных (карты, баланс, config) |
| `.env` | Переменные окружения (порты, токены, пути) |
| `dispenser-backend.service` | Systemd-юнит бэкенда |
| `dispenser-rpi.service` | Systemd-юнит rpi-service |
| `kiosk.desktop` | Автозапуск Firefox в kiosk-режиме |

## Системные требования

- Raspberry Pi (тестировалось на RPi 4)
- OS: Raspberry Pi OS (Bookworm)
- Node.js v20, npm v10
- Python 3
- Firefox (Chrome удалён — глюки)
- USB NFC-ридер на `/dev/input/event10`
- Arduino/ESP32 на `/dev/ttyUSB0` (9600 baud)
- Пользователь: `h2`, домашняя папка `/home/h2`

## Шаг 1 — Клонировать репозиторий

```bash
sudo git clone https://github.com/MikhailVaravva/H2_Dispensop.git /opt/dispenser
sudo chown -R h2:h2 /opt/dispenser
cd /opt/dispenser
npm install
```

## Шаг 2 — Собрать проект

```bash
cd /opt/dispenser
npm run build -w packages/shared
npm run build -w packages/backend
npm run build -w packages/frontend
```

## Шаг 3 — Скопировать файлы бэкапа

```bash
# База данных
sudo mkdir -p /opt/dispenser/data
sudo cp dispenser.db /opt/dispenser/data/dispenser.db
sudo chown h2:h2 /opt/dispenser/data/dispenser.db

# Переменные окружения
sudo cp .env /opt/dispenser/.env

# Видео (из папки проекта на Windows: D:/H2 Water/Okeaka_3D.mp4)
# Скопировать в /opt/dispenser/packages/frontend/dist/Okeaka_3D.mp4
# и в /opt/dispenser/packages/frontend/public/Okeaka_3D.mp4
```

## Шаг 4 — Установить systemd-сервисы

```bash
sudo cp dispenser-backend.service /etc/systemd/system/
sudo cp dispenser-rpi.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dispenser-backend.service
sudo systemctl enable dispenser-rpi.service
sudo systemctl start dispenser-backend.service
sudo systemctl start dispenser-rpi.service
```

Проверка:
```bash
systemctl status dispenser-backend.service
systemctl status dispenser-rpi.service
```

## Шаг 5 — Автозапуск Firefox (kiosk)

```bash
mkdir -p /home/h2/.config/autostart
cp kiosk.desktop /home/h2/.config/autostart/dispenser-kiosk.desktop
```

Содержимое файла:
```ini
[Desktop Entry]
Type=Application
Name=Dispenser Kiosk
Exec=bash -c 'sleep 5 && xset s off && xset -dpms && xset s noblank && firefox --kiosk http://192.168.1.6:3000/station/station-001'
X-GNOME-Autostart-enabled=true
```

## Шаг 6 — Проверка NFC-ридера

```bash
# Убедиться что устройство есть
ls /dev/input/event10

# Проверить что это NFC (имя устройства)
cat /proc/bus/input/devices | grep -A3 "event10"
# Должно быть: Name="WCH.CN 8 Serial To HID"

# Если номер устройства изменился — обновить в .env:
# NFC_READER_DEVICE=/dev/input/eventXX
```

## Шаг 7 — Перезагрузить RPi

```bash
sudo reboot
```

После перезагрузки:
- Оба сервиса стартуют автоматически
- Firefox открывается в kiosk-режиме
- Видео на фоне загружается с сервера

## Карты в базе

| Карта | Тип | Назначение |
|-------|-----|------------|
| `1327667363` | service | Сервисная карта (вход в диагностику) |
| `4126080786` | staff | Карта персонала |
| `999999999` | service | Резервная сервисная карта |
| остальные | user | Пользователи с балансом |

## Настройки из сервис-режима

Войти: 5 быстрых тапов на каплю воды (или приложить сервисную карту).

- **Видео на фоне**: `/Okeaka_3D.mp4` (уже в базе)
- **Время налива**: настраивается слайдером
- **Лог ESP32**: галка "Лог на главном экране"

Выход: кнопка "Выход" или приложить любую карту.

## SSH доступ

```
Host: 192.168.1.6
User: h2
Password: 1234
Key: ~/.ssh/rpi_h2
```

## GitHub

https://github.com/MikhailVaravva/H2_Dispensop
