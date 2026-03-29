#include <Arduino.h>
#include "config.h"
#include "serial_protocol.h"
#include "led_control.h"
#include "relay_control.h"
#include "button_handler.h"
#include "fill_controller.h"

extern unsigned long lastSerialActivity;

static String inputBuffer = "";

void serialProtocolInit() {
  inputBuffer.reserve(64);
}

static void sendStatus() {
  Serial.print("STATUS:");
  Serial.print(isFilling() ? "FILLING" : (isInError() ? "ERROR" : "IDLE"));
  Serial.print(":");
  Serial.print(digitalRead(PIN_LED_RED) == HIGH ? "RED" : (digitalRead(PIN_LED_GREEN) == HIGH ? "GREEN" : "OFF"));
  Serial.print(":");
  Serial.println(isButtonEnabled() ? "BUTTON_ON" : "BUTTON_OFF");
}

static void processCommand(const String& cmd) {
  lastSerialActivity = millis();
  
  if (cmd == "SET_RED") {
    setLedRed();
    Serial.println("OK:SET_RED");
  }
  else if (cmd == "SET_GREEN") {
    setLedGreen();
    Serial.println("OK:SET_GREEN");
  }
  else if (cmd == "ENABLE_BUTTON") {
    enableButton();
    Serial.println("OK:ENABLE_BUTTON");
    Serial.println("BUTTON_ENABLED");
  }
  else if (cmd == "DISABLE_BUTTON") {
    disableButton();
    Serial.println("OK:DISABLE_BUTTON");
    Serial.println("BUTTON_DISABLED");
  }
  else if (cmd == "START_FILL_500ML") {
    Serial.println("OK:START_FILL_500ML");
    startFill();
    lastSerialActivity = millis();
  }
  else if (cmd == "STOP_FILL") {
    stopFill();
    Serial.println("OK:STOP_FILL");
  }
  else if (cmd == "RESET_ERROR") {
    resetError();
    Serial.println("OK:RESET_ERROR");
  }
  else if (cmd == "GET_STATUS") {
    sendStatus();
  }
  else {
    Serial.println("ERROR:UNKNOWN_CMD");
  }
}

void processSerialInput() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (inputBuffer.length() > 0) {
        processCommand(inputBuffer);
        inputBuffer = "";
      }
    } else {
      inputBuffer += c;
    }
  }
}
