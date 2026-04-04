#include "touch_panel.h"
#include "config.h"
#include <HardwareSerial.h>

static HardwareSerial TouchSerial(2);
static unsigned long lastTouchTime = 0;
const unsigned long TOUCH_DEBOUNCE_MS = 500;
bool touchEvent = false;

// Only button code 0x15 (and maybe 0x16-0x1F) is real button press
const uint8_t BUTTON_CODES[] = {0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F};
const uint8_t NUM_BUTTON_CODES = sizeof(BUTTON_CODES);

bool isButtonCode(uint8_t b) {
  for (uint8_t i = 0; i < NUM_BUTTON_CODES; i++) {
    if (b == BUTTON_CODES[i]) return true;
  }
  return false;
}

static bool touchEnabled = false;

void touchPanelInit() {
  TouchSerial.begin(TOUCH_BAUD, SERIAL_8N1, PIN_TOUCH_RX, PIN_TOUCH_TX);
  touchEnabled = false;
}

void enableTouchButton() {
  // Flush stale bytes from UART buffer to prevent phantom presses
  while (TouchSerial.available()) {
    TouchSerial.read();
  }
  touchEvent = false;
  lastTouchTime = millis();  // Reset debounce timer
  touchEnabled = true;
}

void disableTouchButton() {
  touchEnabled = false;
  touchEvent = false;
}

void pollTouchPanel() {
  if (!touchEnabled) return;
  
  while (TouchSerial.available()) {
    uint8_t b = TouchSerial.read();
    
    // Only detect actual button presses (0x15 and similar)
    if (isButtonCode(b)) {
      if (millis() - lastTouchTime > TOUCH_DEBOUNCE_MS) {
        lastTouchTime = millis();
        touchEvent = true;
      }
    }
  }
}

bool touchButtonPressed() {
  if (!touchEnabled) return false;
  
  if (touchEvent) {
    touchEvent = false;
    return true;
  }
  return false;
}