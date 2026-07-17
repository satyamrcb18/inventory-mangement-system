const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'inventory.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database: ' + err.message);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS Inventory (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT NOT NULL,
            Price REAL NOT NULL,
            Stock INTEGER NOT NULL,
            Sold INTEGER DEFAULT 0
        )`, (err) => {
            if (err) {
                console.error("Error creating table: " + err.message);
            } else {
                db.run("ALTER TABLE Inventory ADD COLUMN Sold INTEGER DEFAULT 0", () => {
                    // Ignore errors if column already exists
                });
                
                db.run(`CREATE TABLE IF NOT EXISTS ActivityLog (
                    ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    ActionDescription TEXT NOT NULL,
                    Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )`, (err) => {
                    if (err) console.error("Error creating ActivityLog table: " + err.message);
                });
            }
        });
    }
});

module.exports = db;
