import { log } from '../utils/logger';
import * as fs from 'fs';
import { spawn, execSync } from 'child_process';

let nfcEnabled = false;
let pollInterval: NodeJS.Timeout | null = null;
let lastUid = '';

const UID_FILE = '/tmp/nfc_uid.txt';

export function isNfcEnabled(): boolean {
  return nfcEnabled;
}

function findNfcDevice(): string {
  try {
    const output = execSync('lsusb').toString();
    const match = output.match(/Bus \d+ Device \d+: ID 1a86:e026/);
    if (match) {
      const deviceMatch = output.match(/Bus (\d+) Device (\d+): ID 1a86:e026/);
      if (deviceMatch) {
        const bus = deviceMatch[1].padStart(3, '0');
        const dev = deviceMatch[2].padStart(3, '0');
        const devPath = `/dev/bus/usb/${bus}/${dev}`;
        log('info', 'Found NFC reader via lsusb', { devPath });
        
        const evdev = execSync(
          `udevadm info --query=all --name=${devPath} 2>/dev/null | grep -o 'E: DEVNAME=/dev/input/event[0-9]*' | cut -d= -f2`
        ).toString().trim();
        
        if (evdev) {
          log('info', 'NFC reader device found', { evdev });
          return evdev;
        }
      }
    }
    
    for (let i = 0; i < 16; i++) {
      const ev = `/dev/input/event${i}`;
      try {
        const info = execSync(`udevadm info --query=all --name=${ev} 2>/dev/null`).toString();
        if (info.includes('1a86') && info.includes('e026')) {
          log('info', 'Found NFC reader via udevadm', { device: ev });
          return ev;
        }
      } catch {}
    }
  } catch (err) {
    log('warn', 'Auto-detect failed', { error: (err as Error).message });
  }
  return null;
}

export async function initNfcReader(onCardRead: (cardId: string) => void): Promise<void> {
  // Auto-detect NFC device if not specified in env
  let device = process.env.NFC_READER_DEVICE;
  if (!device) {
    device = findNfcDevice();
    if (!device) {
      log('warn', 'NFC reader device not found, trying event10');
      device = '/dev/input/event10';
    }
  }
  
  try {
    log('info', 'Initializing NFC reader', { device });
    nfcEnabled = true;

    const script = `
import struct, os, time
KEY_MAP = {2:'1',3:'2',4:'3',5:'4',6:'5',7:'6',8:'7',9:'8',10:'9',11:'0'}
fd = os.open('${device}', os.O_RDONLY)
uid = ''
lt = 0
while True:
    d = os.read(fd, 24)
    if len(d) >= 16:
        _, _, t, c, v = struct.unpack('llHHI', d)
        if t == 1 and v == 1:
            if c == 28:
                if uid:
                    open('/tmp/nfc_uid.txt', 'w').write(uid)
                uid = ''
            elif c in KEY_MAP:
                n = time.time()
                if n - lt > 0.5: uid = ''
                uid += KEY_MAP[c]
                lt = n
`;

    fs.writeFileSync('/tmp/nfc_reader.py', script);

    const python = spawn('python3', ['/tmp/nfc_reader.py'], {
      detached: true,
      stdio: 'ignore'
    });
    python.unref();

    pollInterval = setInterval(() => {
      try {
        if (fs.existsSync(UID_FILE)) {
          const uid = fs.readFileSync(UID_FILE, 'utf8').trim();
          if (uid && uid !== lastUid && uid.length >= 8) {
            lastUid = uid;
            log('info', 'NFC card read', { cardId: uid });
            onCardRead(uid);
            console.log('\n>>> CARD:', uid);
            fs.unlinkSync(UID_FILE);
            setTimeout(() => { lastUid = ''; }, 2000);
          }
        }
      } catch {}
    }, 100);

    log('info', 'NFC reader initialized');

  } catch (err) {
    log('error', 'NFC reader init failed', { error: (err as Error).message });
    nfcEnabled = false;
  }
}

export function closeNfcReader(): void {
  nfcEnabled = false;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
