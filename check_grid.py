import socket, json

s = socket.socket()
s.settimeout(10)
s.connect(("127.0.0.1", 2828))
data = s.recv(4096)

def msend(s, mid, cmd, params=None):
    msg = json.dumps([0, mid, cmd, params or {}])
    s.sendall(("{0}:{1}".format(len(msg), msg)).encode())
    resp = b""
    while True:
        chunk = s.recv(4096)
        resp += chunk
        try:
            colon = resp.index(b":")
            length = int(resp[:colon])
            body = resp[colon+1:]
            if len(body) >= length:
                return json.loads(body[:length])
        except:
            continue

msend(s, 1, "WebDriver:NewSession", {"capabilities": {}})

script1 = 'var sp = document.querySelector(".sp-grid"); if (!sp) return "NOT FOUND"; var cs = window.getComputedStyle(sp); return "display=" + cs.display + " cols=" + cs.gridTemplateColumns + " w=" + cs.width;'
r = msend(s, 2, "WebDriver:ExecuteScript", {"script": script1, "args": []})
print("Grid:", r)

script2 = 'var mc = document.querySelector(".main-content"); if (!mc) return "NOT FOUND"; var cs = window.getComputedStyle(mc); return "display=" + cs.display + " w=" + cs.width + " align=" + cs.alignItems;'
r = msend(s, 3, "WebDriver:ExecuteScript", {"script": script2, "args": []})
print("MainContent:", r)

script3 = 'var pc = document.querySelector(".page-container"); if (!pc) return "NOT FOUND"; var cs = window.getComputedStyle(pc); return "display=" + cs.display + " w=" + cs.width + " maxW=" + cs.maxWidth + " align=" + cs.alignItems + " class=" + pc.className;'
r = msend(s, 4, "WebDriver:ExecuteScript", {"script": script3, "args": []})
print("PageContainer:", r)

s.close()
