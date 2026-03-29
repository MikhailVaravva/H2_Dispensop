#!/bin/bash
python3 -c "
import struct, os, sys, time
KEY_MAP = {2:'1',3:'2',4:'3',5:'4',6:'5',7:'6',8:'7',9:'8',10:'9',11:'0'}
fd = os.open('$1', os.O_RDONLY)
uid = ''
lt = 0
while True:
    d = os.read(fd, 24)
    if len(d) >= 16:
        _, _, t, c, v = struct.unpack('llHHI', d)
        if t == 1 and v == 1:
            if c == 28:
                if uid:
                    sys.stdout.write('UID:' + uid + '\n')
                    sys.stdout.flush()
                uid = ''
            elif c in KEY_MAP:
                n = time.time()
                if n - lt > 0.5: uid = ''
                uid += KEY_MAP[c]
                lt = n
"
