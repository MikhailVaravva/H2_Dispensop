const db = require("better-sqlite3")("/home/h2/Alex_dispenser_project/packages/backend/data/dispenser.db");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Tables:", tables.map(t => t.name));
const stations = db.prepare("SELECT * FROM stations").all();
console.log("Stations:", stations);
const cards = db.prepare("SELECT * FROM cards").all();
console.log("Cards:", cards);
