const db = require("better-sqlite3")("/home/h2/Alex_dispenser_project/packages/backend/data/dispenser.db");
console.log(db.prepare("SELECT * FROM cards").all());
