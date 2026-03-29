#include <Arduino.h>
#include "config.h"
#include "button_handler.h"

static bool buttonEnabled = false;
static bool lastButtonState = HIGH; // Pull-up: HIGH = not pressed
static unsigned long lastDebounceTime = 0;

void buttonInit() {
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  buttonEnabled = false;
}

void enableButton() {
  buttonEnabled = true;
}

void disableButton() {
  buttonEnabled = false;
}

bool isButtonEnabled() {
  return buttonEnabled;
}

bool pollButton() {
  if (!buttonEnabled) return false;

  bool reading = digitalRead(PIN_BUTTON);

  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > DEBOUNCE_MS) {
    // LOW = pressed (pull-up)
    if (reading == LOW && lastButtonState == HIGH) {
      lastButtonState = reading;
      return true; // Button just pressed
    }
  }

  lastButtonState = reading;
  return false;
}
