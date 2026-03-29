import { execSync } from 'child_process';

const device = '/dev/input/event0';
console.log('Starting NFC reader...');

try {
  const script = `
import struct, os, sys, time
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
                    print('UID:' + uid)
                uid = ''
            elif c in KEY_MAP:
                n = time.time()
                if n - lt > 0.5: uid = ''
                uid += KEY_MAP[c]
                lt = n
`;

  const fs = require('fs');
  fs.writeFileSync('/tmp/nfc.py', script);
  
  console.log('Python script written, starting...');
  
  const result = execSync('python3 /tmp/nfc.py', { stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 });
  
  console.log('Result:', result.toString());
} catch (e: any) {
  if (e.stdout) console.log('STDOUT:', e.stdout.toString());
  if (e.stderr) console.log('STDERR:', e.stderr.toString());
  if (e.status === 124) console.log('Timeout - waiting for card...');
  else console.error('Error:', e.message);
}
