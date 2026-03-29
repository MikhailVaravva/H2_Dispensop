console.log("RPi Service started");

process.stdin.on('data', (data) => {
    console.log("Card:", data.toString());
});
