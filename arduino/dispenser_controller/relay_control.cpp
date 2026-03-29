#include <Arduino.h>
#include "config.h"
#include "relay_control.h"

static bool relayState = false;

void relayInit() {
  pinMode(PIN_RELAY, OUTPUT);
  closeRelay();
}

void openRelay() {
  digitalWrite(PIN_RELAY, HIGH);
  relayState = true;
}

void closeRelay() {
  digitalWrite(PIN_RELAY, LOW);
  relayState = false;
}

bool isRelayOpen() {
  return relayState;
}

void toggleRelay() {
  if (relayState) {
    closeRelay();
  } else {
    openRelay();
  }
}
