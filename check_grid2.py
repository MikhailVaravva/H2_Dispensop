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

# Check what's inside main-content
script = 'var mc = document.querySelector(".main-content"); if (!mc) return "main-content NOT FOUND"; var children = mc.children; var result = "children=" + children.length; for (var i = 0; i < Math.min(children.length, 5); i++) { result += " | " + children[i].tagName + "." + (children[i].className || "no-class").substring(0, 50); } return result;'
r = msend(s, 2, "WebDriver:ExecuteScript", {"script": script, "args": []})
print("MainContent children:", r)

# Check sp
script2 = 'var sp = document.querySelector(".sp"); if (!sp) return "sp NOT FOUND"; var cs = window.getComputedStyle(sp); return "sp: display=" + cs.display + " w=" + cs.width + " h=" + cs.height + " children=" + sp.children.length;'
r = msend(s, 3, "WebDriver:ExecuteScript", {"script": script2, "args": []})
print("SP:", r)

# Check if maybe the build is outdated
script3 = 'return document.title + " | " + document.querySelector("script[src]")?.src;'
r = msend(s, 4, "WebDriver:ExecuteScript", {"script": script3, "args": []})
print("Page:", r)

s.close()
