#ifndef CONFIG_H
#define CONFIG_H

// Pin assignments for ESP32 DevKit
#define PIN_BUTTON       4    // Digital input, internal pull-up
#define PIN_LED_RED      2     // Red LED (or bicolor LED anode 1)
#define PIN_LED_GREEN    15    // Green LED (or bicolor LED anode 2)
#define PIN_RELAY        18    // Relay controlling valve
#define PIN_PUMP_RELAY   22    // Relay controlling pump (on when ready, off after fill)

// Touch panel UART (HardwareSerial 2, remapped)
#define PIN_TOUCH_RX     16    // GPIO 16 <- panel TX
#define PIN_TOUCH_TX     17    // GPIO 17 -> panel RX (optional response)
#define TOUCH_BAUD       9600 // adjust based on panel protocol

// Addressable LED strip (WS2812B)
#define PIN_LED_STRIP    23    // GPIO 23 — data pin
#define LED_STRIP_COUNT  20    // Number of LEDs
#define LED_BRIGHTNESS   80    // 0-255

// Serial configuration
#define SERIAL_BAUD      9600

// Button debounce
#define DEBOUNCE_MS      100

// Fill timing
#define DEFAULT_FILL_MS   15000   // Calibrated for 500ml (adjust after testing ~15-20 sec)
#define MAX_FILL_MS      30000   // Safety cutoff — never run longer than this (30 sec)

// Serial heartbeat (if no command received in this time, safe shutdown)
#define SERIAL_TIMEOUT_MS 30000

// EEPROM addresses
#define EEPROM_FILL_DURATION_ADDR 0
#define EEPROM_LED_BRIGHTNESS_ADDR 4
#define EEPROM_LED_COUNT_ADDR 5

#endif
