#include <Arduino.h>
#include <EEPROM.h>
#include "config.h"
#include "fill_controller.h"
#include "touch_panel.h"
#include "relay_control.h"
#include "led_control.h"
#include "button_handler.h"
#include "led_strip.h"
#include "pump_relay.h"

static bool filling = false;
static unsigned long fillStartTime = 0;
static bool errorState = false;
static unsigned long currentFillDuration = DEFAULT_FILL_MS;

void loadSettings() {
  EEPROM.begin(512);
  uint32_t val = 0;
  EEPROM.get(EEPROM_FILL_DURATION_ADDR, val);
  if (val >= 1000 && val <= 30000) {
    currentFillDuration = val;
  } else {
    currentFillDuration = DEFAULT_FILL_MS;
  }
}

void saveSettings() {
  EEPROM.put(EEPROM_FILL_DURATION_ADDR, (uint32_t)currentFillDuration);
  EEPROM.commit();
}

void fillInit() {
  filling = false;
  errorState = false;
  loadSettings();
}

void setFillDuration(unsigned long ms) {
  if (ms < 1000) ms = 1000;
  if (ms > 30000) ms = 30000;
  currentFillDuration = ms;
  saveSettings();
  Serial.print("OK:SET_FILL_TIME:");
  Serial.println(ms);
  Serial.print("FILL_TIME_SAVED:");
  Serial.println(ms);
}

unsigned long getFillDuration() {
  return currentFillDuration;
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
  disableButton();  // Disable touch button during fill
  disableTouchButton();  // Also disable touch panel
  openRelay();
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
  if (elapsed >= currentFillDuration) {
    closeRelay();
    pumpRelayOff();
    filling = false;
    enableButton();
    setLedGreen();
    ledStripSetMode(STRIP_DONE);
    Serial.println("FILL_DONE");
    Serial.print("FILL_VOLUME:");
    Serial.println(currentFillDuration / 10); // approximate ml
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
  pumpRelayOff();
  disableButton();
  setLedRed();
}

void emergencyStop(const char* reason) {
  closeRelay();
  pumpRelayOff();
  filling = false;
  disableButton();
  errorState = true;
  setLedRed();
  ledStripSetMode(STRIP_ERROR);
  Serial.print("EMERGENCY_STOP:");
  Serial.println(reason);
}
