import * as fs from 'fs';

const EVENT_DEVICE = '/dev/input/event0';

console.log('Reading from:', EVENT_DEVICE);
console.log('Press Ctrl+C to stop\n');

const KEY_MAP: { [code: number]: string } = {
  2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '8', 10: '9', 11: '0',
};

let cardBuffer = '';
let lastKeyTime = 0;

const readLoop = () => {
  try {
    const buffer = Buffer.alloc(24);
    const fd = fs.openSync(EVENT_DEVICE, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 24, null);
    fs.closeSync(fd);
    
    if (bytesRead === 24) {
      const type = buffer.readUInt16LE(8);
      const code = buffer.readUInt16LE(10);
      const value = buffer.readInt32LE(12);
      
      if (type === 1 && value === 1) {
        const char = KEY_MAP[code];
        
        if (code === 28) {
          console.log('\n>>> CARD ID:', cardBuffer);
          cardBuffer = '';
        } else if (char) {
          const now = Date.now();
          if (now - lastKeyTime > 300) {
            cardBuffer = '';
          }
          cardBuffer += char;
          lastKeyTime = now;
        }
      }
    }
  } catch (err) {
    console.error('Error:', (err as Error).message);
  }
  
  setTimeout(readLoop, 10);
};

readLoop();
