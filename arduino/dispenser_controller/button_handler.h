#ifndef BUTTON_HANDLER_H
#define BUTTON_HANDLER_H

void buttonInit();
void enableButton();
void disableButton();
bool isButtonEnabled();
bool pollButton(); // Returns true if button was just pressed (debounced)

#endif
