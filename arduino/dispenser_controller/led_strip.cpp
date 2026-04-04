#include "led_strip.h"
#include "config.h"
#include <Adafruit_NeoPixel.h>
#include <EEPROM.h>

static Adafruit_NeoPixel strip(LED_STRIP_COUNT, PIN_LED_STRIP, NEO_RGB + NEO_KHZ800);
static StripMode currentMode = STRIP_OFF;
static unsigned long lastUpdate = 0;
static uint16_t animStep = 0;
static bool needsRefresh = true;
static uint8_t activeLedCount = LED_STRIP_COUNT;
static uint8_t currentBrightness = LED_BRIGHTNESS;

void ledStripInit() {
  // Load saved brightness
  uint8_t savedBr = EEPROM.read(EEPROM_LED_BRIGHTNESS_ADDR);
  if (savedBr >= 5 && savedBr <= 255) {
    currentBrightness = savedBr;
  }
  // Load saved LED count
  uint8_t savedCnt = EEPROM.read(EEPROM_LED_COUNT_ADDR);
  if (savedCnt >= 1 && savedCnt <= LED_STRIP_COUNT) {
    activeLedCount = savedCnt;
  }

  strip.begin();
  strip.setBrightness(currentBrightness);
  strip.clear();
  strip.show();
  currentMode = STRIP_IDLE;
  needsRefresh = true;
}

void ledStripSetMode(StripMode mode) {
  if (mode == currentMode) return;
  currentMode = mode;
  animStep = 0;
  lastUpdate = millis();
  needsRefresh = true;
}

void ledStripSetBrightness(uint8_t val) {
  if (val < 5) val = 5;
  currentBrightness = val;
  strip.setBrightness(val);
  EEPROM.write(EEPROM_LED_BRIGHTNESS_ADDR, val);
  EEPROM.commit();
  needsRefresh = true;
}

uint8_t ledStripGetBrightness() {
  return currentBrightness;
}

void ledStripSetCount(uint8_t count) {
  if (count < 1) count = 1;
  if (count > LED_STRIP_COUNT) count = LED_STRIP_COUNT;
  activeLedCount = count;
  // Turn off LEDs beyond the new count
  for (int i = count; i < LED_STRIP_COUNT; i++) {
    strip.setPixelColor(i, 0);
  }
  strip.show();
  EEPROM.write(EEPROM_LED_COUNT_ADDR, count);
  EEPROM.commit();
  needsRefresh = true;
}

uint8_t ledStripGetCount() {
  return activeLedCount;
}

// ---- Animation helpers ----

static void fillColor(uint32_t color) {
  for (int i = 0; i < activeLedCount; i++) {
    strip.setPixelColor(i, color);
  }
  // Ensure rest is off
  for (int i = activeLedCount; i < LED_STRIP_COUNT; i++) {
    strip.setPixelColor(i, 0);
  }
}

// Idle: green -> blue -> yellow cycle (no red)
static void animIdle() {
  unsigned long now = millis();
  if (now - lastUpdate < 30) return;
  lastUpdate = now;

  animStep = (animStep + 1) % 360;
  for (int i = 0; i < activeLedCount; i++) {
    uint16_t pos = (animStep + i * 360 / activeLedCount) % 360;
    uint8_t r, g, b;
    if (pos < 120) {
      uint8_t t = pos * 255 / 120;
      r = 0; g = 255 - t; b = t;
    } else if (pos < 240) {
      uint8_t t = (pos - 120) * 255 / 120;
      r = t; g = t; b = 255 - t;
    } else {
      uint8_t t = (pos - 240) * 255 / 120;
      r = 255 - t; g = 255; b = 0;
    }
    strip.setPixelColor(i, strip.Color(r / 3, g / 3, b / 3));
  }
  for (int i = activeLedCount; i < LED_STRIP_COUNT; i++) {
    strip.setPixelColor(i, 0);
  }
  strip.show();
}

// Ready: green breathing/pulsing
static void animReady() {
  unsigned long now = millis();
  if (now - lastUpdate < 30) return;
  lastUpdate = now;

  animStep = (animStep + 1) % 256;
  float phase = animStep / 255.0 * 3.14159 * 2.0;
  uint8_t brightness = (uint8_t)(30 + 112 * (1.0 + sin(phase)));

  fillColor(strip.Color(0, brightness, 0));
  strip.show();
}

// Filling: blue running wave
static void animFilling() {
  unsigned long now = millis();
  if (now - lastUpdate < 50) return;
  lastUpdate = now;

  animStep = (animStep + 1) % activeLedCount;

  for (int i = 0; i < activeLedCount; i++) {
    int dist = abs(i - (int)animStep);
    if (dist > activeLedCount / 2) dist = activeLedCount - dist;
    uint8_t b = (dist < 4) ? (255 - dist * 60) : 15;
    strip.setPixelColor(i, strip.Color(0, b / 4, b));
  }
  for (int i = activeLedCount; i < LED_STRIP_COUNT; i++) {
    strip.setPixelColor(i, 0);
  }
  strip.show();
}

// Done: bright green flash then fade
static void animDone() {
  unsigned long now = millis();
  if (now - lastUpdate < 40) return;
  lastUpdate = now;

  if (animStep < 80) {
    animStep++;
    uint8_t brightness = (animStep < 40) ? 255 : (uint8_t)(255 - (animStep - 40) * 6);
    fillColor(strip.Color(0, brightness, 0));
    strip.show();
  }
}

// Error: steady red
static void animError() {
  if (!needsRefresh) return;
  needsRefresh = false;
  fillColor(strip.Color(255, 0, 0));
  strip.show();
}

// Off
static void animOff() {
  if (!needsRefresh) return;
  needsRefresh = false;
  strip.clear();
  strip.show();
}

void ledStripUpdate() {
  switch (currentMode) {
    case STRIP_OFF:    animOff();     break;
    case STRIP_IDLE:   animIdle();    break;
    case STRIP_READY:  animReady();   break;
    case STRIP_FILLING: animFilling(); break;
    case STRIP_DONE:   animDone();    break;
    case STRIP_ERROR:  animError();   break;
  }
}
