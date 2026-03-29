#!/bin/bash
# Deploy script - push changes to RPi

echo "Pushing to RPi..."
git push rpi master

echo "Restarting services on RPi..."
ssh -t rpi "cd ~/Alex_dispenser_project && git pull && npm install && pm2 restart all"

echo "Done!"
