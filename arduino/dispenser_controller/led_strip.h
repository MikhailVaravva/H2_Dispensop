#ifndef LED_STRIP_H
#define LED_STRIP_H

#include <stdint.h>

enum StripMode {
  STRIP_OFF,
  STRIP_IDLE,           // Rainbow (green-blue-yellow) — waiting
  STRIP_READY,          // Green pulsing — permission granted
  STRIP_FILLING,        // Blue running wave — filling water
  STRIP_DONE,           // Green flash — fill complete
  STRIP_ERROR           // Red steady — error
};

void ledStripInit();
void ledStripSetMode(StripMode mode);
void ledStripUpdate();

void ledStripSetBrightness(uint8_t val);
uint8_t ledStripGetBrightness();
void ledStripSetCount(uint8_t count);
uint8_t ledStripGetCount();

#endif
