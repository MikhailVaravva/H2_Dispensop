#!/usr/bin/env python3
import struct
import os

DEVICE = os.environ.get('NFC_DEVICE', '/dev/input/event0')
print(f"Reading from: {DEVICE}")

KEY_MAP = {
    2: '1', 3: '2', 4: '3', 5: '4', 6: '5',
    7: '6', 8: '7', 9: '8', 10: '9', 11: '0'
}

uid = ""
last_time = 0

fd = os.open(DEVICE, os.O_RDONLY)
print("Device opened, waiting for card...")

while True:
    try:
        data = os.read(fd, 24)
        if len(data) >= 16:
            tv_sec, tv_usec, type_val, code, value = struct.unpack('llHHI', data)
            if type_val == 1 and value == 1:
                if code == 28:
                    if uid:
                        print(f"\nUID_READ: {uid}")
                        uid = ""
                elif code in KEY_MAP:
                    import time
                    now = time.time()
                    if now - last_time > 0.5:
                        uid = ""
                    uid += KEY_MAP[code]
                    last_time = now
                    print(KEY_MAP[code], end='', flush=True)
    except KeyboardInterrupt:
        break
    except Exception as e:
        print(f"Error: {e}")

os.close(fd)
