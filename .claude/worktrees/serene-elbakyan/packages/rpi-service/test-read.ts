import * as fs from "fs";

const DEVICE = "/dev/input/event0";
console.log("Reading:", DEVICE);

const KEY_MAP: { [code: number]: string } = {
  2: "1", 3: "2", 4: "3", 5: "4", 6: "5",
  7: "6", 8: "7", 9: "8", 10: "9", 11: "0"
};

let uid = "";
let lastTime = 0;

let fd: number;
try {
  fd = fs.openSync(DEVICE, "r");
  console.log("Device opened, waiting for input...");
} catch (e) {
  console.error("Cannot open:", e);
  process.exit(1);
}

const buf = Buffer.alloc(24);

const loop = () => {
  try {
    const bytes = fs.readSync(fd, buf, 0, 24, null);
    if (bytes >= 16) {
      const type = buf.readUInt16LE(8);
      const code = buf.readUInt16LE(10);
      const value = buf.readInt32LE(12);
      
      if (type === 1 && value === 1) {
        if (code === 28) {
          if (uid.length > 0) {
            console.log("UID_READ:", uid);
            uid = "";
          }
        } else {
          const ch = KEY_MAP[code];
          if (ch) {
            const now = Date.now();
            if (now - lastTime > 500) uid = "";
            uid += ch;
            lastTime = now;
            process.stdout.write(ch);
          }
        }
      }
    }
  } catch (e) {
    console.error("Read error:", e);
  }
  setTimeout(loop, 20);
};

loop();
