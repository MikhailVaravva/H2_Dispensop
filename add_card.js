const Database = require("better-sqlite3");
const db = new Database("/home/h2/Alex_dispenser_project/packages/backend/data/dispenser.db");
const stmt = db.prepare("INSERT INTO cards (id, balance, card_type) VALUES (?, ?, ?)");
stmt.run("9999999999", 0, "service");
console.log("Card added");
db.close();
