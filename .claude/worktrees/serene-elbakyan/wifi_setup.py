from fastapi import FastAPI, Form
from fastapi.responses import HTMLResponse
import os

app = FastAPI()

@app.get("/", response_class=HTMLResponse)
def index():
    return '''
    <h2>H2 Setup</h2>
    <form method="post">
    SSID:<input name="ssid"><br>
    PASS:<input name="password"><br>
    <button>Connect</button>
    </form>
    '''

@app.post("/")
def connect(ssid: str = Form(...), password: str = Form(...)):
    os.system(f"sudo wpa_cli -i wlan0 set_network 0 ssid '\"{ssid}\"'")
    os.system(f"sudo wpa_cli -i wlan0 set_network 0 psk '\"{password}\"'")
    return {"status":"ok"}
