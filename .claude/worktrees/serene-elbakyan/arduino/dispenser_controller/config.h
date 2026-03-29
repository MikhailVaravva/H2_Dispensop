#ifndef CONFIG_H
#define CONFIG_H

// Pin assignments for ESP32 DevKit
#define PIN_BUTTON       4    // Digital input, internal pull-up
#define PIN_LED_RED      16   // Red LED (or bicolor LED anode 1)
#define PIN_LED_GREEN    17   // Green LED (or bicolor LED anode 2)
#define PIN_RELAY        18   // Relay controlling valve/pump

// Serial configuration
#define SERIAL_BAUD      9600

// Button debounce
#define DEBOUNCE_MS      50

// Fill timing
#define DEFAULT_FILL_MS  4200   // Calibrated for 500ml (adjust after testing)
#define MAX_FILL_MS      30000  // Safety cutoff — never run longer than this

// EEPROM addresses
#define EEPROM_FILL_DURATION_ADDR 0

// Serial heartbeat (if no command received in this time, safe shutdown)
#define SERIAL_TIMEOUT_MS 30000

#endif
