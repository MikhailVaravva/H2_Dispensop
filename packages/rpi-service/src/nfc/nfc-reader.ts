import { log } from '../utils/logger';
import * as fs from 'fs';
import { spawn } from 'child_process';

let nfcEnabled = false;
let pollInterval: NodeJS.Timeout | null = null;
let lastUid = '';

const UID_FILE = '/tmp/nfc_uid.txt';

export function isNfcEnabled(): boolean {
  return nfcEnabled;
}

export async function initNfcReader(onCardRead: (cardId: string) => void): Promise<void> {
  const device = process.env.NFC_READER_DEVICE || '/dev/input/event0';
  
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
