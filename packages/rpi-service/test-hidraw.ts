import * as fs from "fs";

const DEVICE = "/dev/hidraw3";
console.log("Reading:", DEVICE);

const buf = Buffer.alloc(64);
let fd: number;

try {
  fd = fs.openSync(DEVICE, "r");
  console.log("Device opened");
} catch (e) {
  console.error("Cannot open:", e);
  process.exit(1);
}

let count = 0;

const loop = () => {
  try {
    const bytes = fs.readSync(fd, buf, 0, 64, null);
    if (bytes > 0) {
      count++;
      const hex = buf.slice(0, bytes).toString("hex");
      console.log(`${count}: ${bytes} bytes: ${hex}`);
      
      // WCH.CN keyboard report format: byte 0 = modifier, byte 1 = reserved, bytes 2-7 = key codes
      if (bytes >= 8) {
        const keys: number[] = [];
        for (let i = 2; i < Math.min(bytes, 8); i++) {
          const k = buf[i];
          if (k !== 0) keys.push(k);
        }
        if (keys.length > 0) {
          console.log("Keys:", keys.map(k => k.toString(16)).join(" "));
        }
      }
    }
  } catch (e) {
    console.error("Error:", e);
  }
  setTimeout(loop, 50);
};

loop();
