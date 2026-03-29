#include "config.h"
#include "led_control.h"
#include "relay_control.h"
#include "button_handler.h"
#include "fill_controller.h"
#include "serial_protocol.h"

unsigned long lastSerialActivity = 0;

void setup() {
  Serial.begin(SERIAL_BAUD);

  ledInit();
  relayInit();
  buttonInit();
  fillInit();
  serialProtocolInit();

  lastSerialActivity = millis();

  Serial.println("STATUS:READY");
}

void loop() {
  processSerialInput();
  checkFillProgress();
  
  if (pollButton()) {
    Serial.println("BUTTON_PRESSED");
  }
  
  checkSafety();
}

void checkSafety() {
  if (isRelayOpen() && !isFilling()) {
    emergencyStop("RELAY_UNEXPECTED");
    return;
  }

  if (millis() - lastSerialActivity > SERIAL_TIMEOUT_MS) {
    if (isFilling() || isButtonEnabled()) {
      emergencyStop("SERIAL_TIMEOUT");
    }
    lastSerialActivity = millis();
  }
}
