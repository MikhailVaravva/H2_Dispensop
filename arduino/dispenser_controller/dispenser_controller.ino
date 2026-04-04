#include "config.h"
#include "led_control.h"
#include "relay_control.h"
#include "button_handler.h"
#include "fill_controller.h"
#include "serial_protocol.h"
#include "touch_panel.h"

unsigned long lastSerialActivity = 0;
bool testModeActive = false;
unsigned long testModeTimeout = 0;
// Test button flow state (for TEST_BUTTON)
bool testButtonModeActive = false;
unsigned long testButtonStartTime = 0;
const unsigned long TEST_BUTTON_TIMEOUT_MS = 10000; // 10 seconds

void setup() {
  Serial.begin(SERIAL_BAUD);

  ledInit();
  relayInit();
  buttonInit();
  fillInit();
  serialProtocolInit();
  touchPanelInit();

  lastSerialActivity = millis();

  Serial.println("STATUS:READY");
}

void loop() {
  processSerialInput();
  checkFillProgress();
  pollTouchPanel();
  
  // Touch panel button - works same as GPIO button, only when enabled
  if (touchButtonPressed()) {
    if (isButtonEnabled()) {
      Serial.println("TOUCH_BUTTON_PRESSED");
      startFill();
      lastSerialActivity = millis();
    } else {
      Serial.println("TOUCH_IGNORED_BUTTON_DISABLED");
    }
  }
  
  // Normal button polling
  if (pollButton()) {
    // If we are in test button mode, report test result instead of generic press
    if (testButtonModeActive) {
      Serial.println("BUTTON_TEST_PRESSED");
      testButtonModeActive = false;
    } else {
      Serial.println("BUTTON_PRESSED");
    }
  }

  // Handle TEST_BUTTON mode timeout
  if (testButtonModeActive) {
    if (millis() - testButtonStartTime >= TEST_BUTTON_TIMEOUT_MS) {
      Serial.println("BUTTON_TEST_TIMEOUT");
      testButtonModeActive = false;
    }
  }
  
  if (testModeActive && millis() > testModeTimeout) {
    testModeActive = false;
  }
  
  checkSafety();
}

void checkSafety() {
  if (testModeActive) {
    return;
  }
  
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

void enterTestMode() {
  testModeActive = true;
  testModeTimeout = millis() + 60000;
}
