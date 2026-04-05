#include <Arduino.h>
#include "config.h"
#include "pump_relay.h"

static bool pumpState = false;

void pumpRelayInit() {
  pinMode(PIN_PUMP_RELAY, OUTPUT);
  digitalWrite(PIN_PUMP_RELAY, LOW);
  pumpState = false;
}

void pumpRelayOn() {
  digitalWrite(PIN_PUMP_RELAY, HIGH);
  pumpState = true;
}

void pumpRelayOff() {
  digitalWrite(PIN_PUMP_RELAY, LOW);
  pumpState = false;
}

bool isPumpRelayOn() {
  return pumpState;
}
