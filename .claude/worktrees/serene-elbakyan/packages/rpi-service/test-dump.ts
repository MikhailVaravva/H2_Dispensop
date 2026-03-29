import * as fs from "fs";

const DEVICE = "/dev/input/event0";
console.log("Reading:", DEVICE);

const buf = Buffer.alloc(24);
let count = 0;

const loop = () => {
  try {
    const fd = fs.openSync(DEVICE, "r");
    const bytes = fs.readSync(fd, buf, 0, 24, null);
    fs.closeSync(fd);

    if (bytes >= 16) {
      const type = buf.readUInt16LE(8);
      const code = buf.readUInt16LE(10);
      const value = buf.readInt32LE(12);
      count++;
      console.log(`${count}: type=${type} code=${code} value=${value} char=${code >= 2 && code <= 11 ? '1'[code-2] || code : ''}`);
    }
  } catch (e) {
    console.error("Error:", e);
  }
  setTimeout(loop, 10);
};

loop();
