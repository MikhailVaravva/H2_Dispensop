# H2 DISPENSER PROJECT

## АРХИТЕКТУРА

```
[ESP32] --USB Serial--> [Raspberry Pi] --WebSocket--> [Backend :3000]
                              |
                              +-- NFC Reader (WCH.CN HID)
                              |
                              +-- Frontend :3000/station/station-001
```

## ЗАПУСК

### 1. Backend
```bash
cd ~/Alex_dispenser_project/packages/backend
nohup node dist/index.js > /tmp/backend.log 2>&1 &
```

### 2. RPi Service
```bash
cd ~/Alex_dispenser_project/packages/rpi-service
npx ts-node src/index.ts
```

## NFC РИДЕР

Устройство: WCH.CN USB Serial To HID
Путь: /dev/input/event0

Python читает HID events и конвертирует в UID карты.

## КАРТЫ

UID карт:
- 1327667363
- 4126077570

Добавить монеты:
```bash
cd ~/Alex_dispenser_project/packages/backend
node -e "const db = require('better-sqlite3')('./data/dispenser.db'); db.prepare('UPDATE cards SET balance = 5 WHERE id = ?').run('1327667363');"
```

## ФРОНТЕНД

http://localhost:3000/station/station-001

## КОМАНДЫ GIT

Push на RPi:
```bash
git push rpi master
```

## ПОРТЫ

- Backend: 3000
- Serial: /dev/ttyUSB0
- NFC: /dev/input/event0
