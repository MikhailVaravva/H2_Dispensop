#include <Arduino.h>
#include "config.h"
#include "fill_controller.h"
#include "relay_control.h"
#include "led_control.h"
#include "button_handler.h"

static bool filling = false;
static unsigned long fillStartTime = 0;
static bool errorState = false;

void fillInit() {
  filling = false;
  errorState = false;
}

void startFill() {
  if (errorState) {
    Serial.println("ERROR:IN_ERROR_STATE");
    return;
  }
  if (filling) {
    Serial.println("ERROR:ALREADY_FILLING");
    return;
  }

  filling = true;
  fillStartTime = millis();
  openRelay();
  disableButton();
  setLedRed();
  Serial.println("FILL_STARTED");
}

void stopFill() {
  closeRelay();
  filling = false;
}

bool isFilling() {
  return filling;
}

bool isInError() {
  return errorState;
}

void checkFillProgress() {
  if (!filling) return;

  unsigned long elapsed = millis() - fillStartTime;

  // Normal completion
  if (elapsed >= FILL_DURATION_MS) {
    closeRelay();
    filling = false;
    Serial.println("FILL_DONE");
    Serial.println("FILL_VOLUME:500");
    return;
  }

  // Safety cutoff
  if (elapsed >= MAX_FILL_MS) {
    emergencyStop("FILL_TIMEOUT");
    return;
  }
}

void resetError() {
  errorState = false;
  filling = false;
  closeRelay();
  disableButton();
  setLedRed();
}

void emergencyStop(const char* reason) {
  closeRelay();
  filling = false;
  disableButton();
  errorState = true;
  setLedRed();
  Serial.print("EMERGENCY_STOP:");
  Serial.println(reason);
}
