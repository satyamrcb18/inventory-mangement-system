const readline = require('readline');
const db = require('./database');

class Transaction {
  // Phase 4: Alert System
  static checkLowStock(item) {
    if (item.Stock < 5) {
      console.log(`\n⚠️ LOW STOCK ALERT: ${item.Name} is running low (Stock: ${item.Stock})!\n`);
    }
  }

  // Phase 3: purchaseItem (Restocking)
  static purchaseItem(id, quantity, callback) {
    db.get('SELECT * FROM Inventory WHERE ID = ?', [id], (err, row) => {
      if (err) {
        console.error("Database error:", err.message);
        return callback(false);
      }
      if (!row) {
        console.log("Item not found.");
        return callback(false);
      }

      const newStock = row.Stock + quantity;
      db.run('UPDATE Inventory SET Stock = ? WHERE ID = ?', [newStock, id], function (err) {
        if (err) {
          console.error("Failed to update stock:", err.message);
          return callback(false);
        }
        console.log(`\nSuccessfully purchased ${quantity} units of ${row.Name}. New Stock: ${newStock}`);
        callback(true);
      });
    });
  }

  // Phase 3: sellItem
  static sellItem(id, quantity, callback) {
    db.get('SELECT * FROM Inventory WHERE ID = ?', [id], (err, row) => {
      if (err) {
        console.error("Database error:", err.message);
        return callback(false);
      }
      if (!row) {
        console.log("Item not found.");
        return callback(false);
      }

      if (row.Stock < quantity) {
        console.log(`\nError: Not enough stock! Current Stock: ${row.Stock}`);
        return callback(false);
      }

      const newStock = row.Stock - quantity;
      db.run('UPDATE Inventory SET Stock = ? WHERE ID = ?', [newStock, id], function (err) {
        if (err) {
          console.error("Failed to update stock:", err.message);
          return callback(false);
        }
        console.log(`\nSuccessfully sold ${quantity} units of ${row.Name}. Remaining Stock: ${newStock}`);
        
        // Phase 4: Alert check
        Transaction.checkLowStock({ ...row, Stock: newStock });
        
        callback(true);
      });
    });
  }
}

// Readline setup for console interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function displayMenu() {
  console.log('\n--- Inventory Management System ---');
  console.log('1. Add Item');
  console.log('2. View Items');
  console.log('3. Delete Item');
  console.log('4. Purchase Stock (Increase Stock)');
  console.log('5. Sell Stock (Decrease Stock)');
  console.log('6. Exit');
  rl.question('Choose an option: ', handleMenuChoice);
}

function handleMenuChoice(choice) {
  switch (choice.trim()) {
    case '1':
      rl.question('Enter Item Name: ', (name) => {
        rl.question('Enter Price: ', (price) => {
          rl.question('Enter Initial Stock: ', (stock) => {
            const p = parseFloat(price);
            const s = parseInt(stock, 10);
            if (isNaN(p) || isNaN(s)) {
              console.log("Invalid price or stock!");
              displayMenu();
              return;
            }
            db.run('INSERT INTO Inventory (Name, Price, Stock) VALUES (?, ?, ?)', [name, p, s], function (err) {
              if (err) {
                console.log("Error adding item:", err.message);
              } else {
                console.log(`\nItem added successfully with ID: ${this.lastID}`);
              }
              displayMenu();
            });
          });
        });
      });
      break;

    case '2':
      console.log("\n--- Item List ---");
      // Phase 2: View items
      db.all('SELECT * FROM Inventory', [], (err, rows) => {
        if (err) {
          console.log("Error retrieving items:", err.message);
        } else {
          console.table(rows);
        }
        displayMenu();
      });
      break;

    case '3':
      // Phase 2: Delete Item
      db.all('SELECT * FROM Inventory', [], (err, rows) => {
        if (err) {
            console.log("Error reading inventory");
            displayMenu();
            return;
        }
        console.table(rows);
        rl.question('Enter Item ID to delete: ', (id) => {
          db.run('DELETE FROM Inventory WHERE ID = ?', [parseInt(id, 10)], function (err) {
            if (err) {
              console.log("Error deleting item:", err.message);
            } else if (this.changes === 0) {
              console.log("\nNo item found with that ID.");
            } else {
              console.log(`\nItem ${id} deleted successfully.`);
            }
            displayMenu();
          });
        });
      });
      break;

    case '4':
      // Phase 3: Purchase Item
      rl.question('Enter Item ID to purchase stock for: ', (id) => {
        rl.question('Enter quantity to purchase: ', (quantity) => {
          const q = parseInt(quantity, 10);
          if (isNaN(q) || q <= 0) {
            console.log("Invalid quantity!");
            displayMenu();
          } else {
            Transaction.purchaseItem(parseInt(id, 10), q, () => {
              displayMenu();
            });
          }
        });
      });
      break;

    case '5':
      // Phase 3: Sell Item
      rl.question('Enter Item ID to sell: ', (id) => {
        rl.question('Enter quantity to sell: ', (quantity) => {
          const q = parseInt(quantity, 10);
          if (isNaN(q) || q <= 0) {
            console.log("Invalid quantity!");
            displayMenu();
          } else {
            Transaction.sellItem(parseInt(id, 10), q, () => {
              displayMenu();
            });
          }
        });
      });
      break;

    case '6':
      console.log('Exiting...');
      db.close();
      rl.close();
      break;

    default:
      console.log('Invalid option, please try again.');
      displayMenu();
      break;
  }
}

console.log("Initializing application...");
setTimeout(displayMenu, 500); // Small wait to make sure table creation finishes
