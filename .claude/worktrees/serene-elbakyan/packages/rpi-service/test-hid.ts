import * as fs from 'fs';

const device = '/dev/hidraw3';

console.log('Reading from:', device);
console.log('Press Ctrl+C to stop\n');

const HID_KEYCODE_MAP: { [key: number]: string } = {
  0x04: 'a', 0x05: 'b', 0x06: 'c', 0x07: 'd', 0x08: 'e', 0x09: 'f',
  0x0A: 'g', 0x0B: 'h', 0x0C: 'i', 0x0D: 'j', 0x0E: 'k', 0x0F: 'l',
  0x10: 'm', 0x11: 'n', 0x12: 'o', 0x13: 'p', 0x14: 'q', 0x15: 'r',
  0x16: 's', 0x17: 't', 0x18: 'u', 0x19: 'v', 0x1A: 'w', 0x1B: 'x',
  0x1C: 'y', 0x1D: 'z',
  0x1E: '1', 0x1F: '2', 0x20: '3', 0x21: '4', 0x22: '5', 0x23: '6',
  0x24: '7', 0x25: '8', 0x26: '9', 0x27: '0',
};

function decodeHidKeyboardReport(buffer: Buffer, bytesRead: number): string {
  if (bytesRead < 3) return '';
  
  const keyCodes: number[] = [];
  for (let i = 2; i < Math.min(bytesRead, 8); i++) {
    const code = buffer[i];
    if (code !== 0 && code !== 0x01) {
      keyCodes.push(code);
    }
  }
  
  return keyCodes.map(code => HID_KEYCODE_MAP[code] || '').join('');
}

let count = 0;
let cardBuffer = '';
let lastReadTime = 0;

const readLoop = () => {
  try {
    const buffer = Buffer.alloc(64);
    const fd = fs.openSync(device, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 64, null);
    fs.closeSync(fd);
    
    if (bytesRead > 0) {
      count++;
      const raw = buffer.slice(0, bytesRead);
      const chars = decodeHidKeyboardReport(buffer, bytesRead);
      
      console.log(`--- Read #${count} (${bytesRead} bytes) ---`);
      console.log('Hex:', raw.toString('hex'));
      console.log('Chars:', chars || '(no mapped chars)');
      
      if (chars.length > 0) {
        const now = Date.now();
        if (now - lastReadTime < 500) {
          cardBuffer += chars;
        } else {
          cardBuffer = chars;
        }
        lastReadTime = now;
        
        console.log('Card buffer:', cardBuffer);
        
        if (cardBuffer.length >= 8) {
          console.log('>>> CARD ID:', cardBuffer.substring(0, 10));
          cardBuffer = '';
        }
      }
      console.log('');
    }
  } catch (err) {
    console.error('Error:', (err as Error).message);
  }
  
  setTimeout(readLoop, 50);
};

readLoop();
