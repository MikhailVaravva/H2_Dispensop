#include <Arduino.h>
#include "config.h"
#include "button_handler.h"

static bool buttonEnabled = false;
static bool lastReading = HIGH;
static bool debouncedState = HIGH;
static unsigned long lastDebounceTime = 0;

void buttonInit() {
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  buttonEnabled = false;
}

void enableButton() {
  buttonEnabled = true;
  Serial.println("DBG:enableButton called");
}

void disableButton() {
  buttonEnabled = false;
}

bool isButtonEnabled() {
  return buttonEnabled;
}

bool pollButton() {
  if (!buttonEnabled) {
    return false;
  }

  bool reading = digitalRead(PIN_BUTTON);

  if (reading != lastReading) {
    lastDebounceTime = millis();
    lastReading = reading;
  }

  if ((millis() - lastDebounceTime) > DEBOUNCE_MS) {
    if (reading == LOW && debouncedState == HIGH) {
      debouncedState = LOW;
      return true;
    }
    debouncedState = reading;
  }

  return false;
}
