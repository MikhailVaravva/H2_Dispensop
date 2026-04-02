#include "touch_panel.h"
#include "config.h"
#include <HardwareSerial.h>

static HardwareSerial TouchSerial(2); // UART2
static unsigned long lastTouchTime = 0;
const unsigned long TOUCH_DEBOUNCE_MS = 500;

void touchPanelInit() {
  TouchSerial.begin(TOUCH_BAUD, SERIAL_8N1, PIN_TOUCH_RX, PIN_TOUCH_TX);
}

void pollTouchPanel() {
  while (TouchSerial.available()) {
    uint8_t b = TouchSerial.read();

    // Log byte for protocol analysis
    char hex[16];
    snprintf(hex, sizeof(hex), "TOUCH_RX:%02X", b);
    Serial.println(hex);

    // Debounce — don't send TOUCH_PRESSED more often than once per 500ms
    if (millis() - lastTouchTime > TOUCH_DEBOUNCE_MS) {
      lastTouchTime = millis();
      Serial.println("TOUCH_PRESSED");
    }
  }
}
