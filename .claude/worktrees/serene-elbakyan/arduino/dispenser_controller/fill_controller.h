#ifndef FILL_CONTROLLER_H
#define FILL_CONTROLLER_H

void fillInit();
void startFill();
void stopFill();
bool isFilling();
void checkFillProgress(); // Call in loop()
void emergencyStop(const char* reason);
void resetError();
bool isInError();
void setFillDuration(unsigned long ms);
unsigned long getFillDuration();

#endif
