const express = require('express');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Phase 4: Low stock alert logic
function checkLowStock(item) {
  if (item.Stock < 5) {
    return `⚠️ LOW STOCK ALERT: ${item.Name} is running low (Stock: ${item.Stock})!`;
  }
  return null;
}

// Login Admin
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
});

// Get activity logs
app.get('/api/inventory/logs', (req, res) => {
    db.all('SELECT * FROM ActivityLog ORDER BY ID DESC LIMIT 20', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get all inventory items
app.get('/api/inventory', (req, res) => {
    db.all('SELECT * FROM Inventory', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Add an item
app.post('/api/inventory', (req, res) => {
    const { Name, Price, Stock } = req.body;
    if (!Name || isNaN(Price) || isNaN(Stock)) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    
    db.run('INSERT INTO Inventory (Name, Price, Stock) VALUES (?, ?, ?)', [Name, Price, Stock], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        const newId = this.lastID;
        db.run('INSERT INTO ActivityLog (ActionDescription) VALUES (?)', [`Added new item: ${Name} (Stock: ${Stock})`]);
        res.status(201).json({ id: newId, Name, Price, Stock });
    });
});

// Delete an item
app.delete('/api/inventory/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT Name FROM Inventory WHERE ID = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Item not found' });

        db.run('DELETE FROM Inventory WHERE ID = ?', [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            db.run('INSERT INTO ActivityLog (ActionDescription) VALUES (?)', [`Deleted item: ${row.Name}`]);
            res.json({ message: 'Item deleted' });
        });
    });
});

// Purchase stock (Increase)
app.post('/api/inventory/purchase', (req, res) => {
    const { id, quantity } = req.body;
    if (!id || !quantity || quantity <= 0) return res.status(400).json({ error: 'Invalid input' });

    db.get('SELECT * FROM Inventory WHERE ID = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Item not found' });

        const newStock = row.Stock + quantity;
        db.run('UPDATE Inventory SET Stock = ? WHERE ID = ?', [newStock, id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            db.run('INSERT INTO ActivityLog (ActionDescription) VALUES (?)', [`Purchased ${quantity} units of ${row.Name}`]);
            res.json({ message: `Successfully purchased ${quantity} units of ${row.Name}.`, newStock });
        });
    });
});

// Sell stock (Decrease)
app.post('/api/inventory/sell', (req, res) => {
    const { id, quantity } = req.body;
    if (!id || !quantity || quantity <= 0) return res.status(400).json({ error: 'Invalid input' });

    db.get('SELECT * FROM Inventory WHERE ID = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Item not found' });

        if (row.Stock < quantity) {
            return res.status(400).json({ error: `Not enough stock! Current Stock: ${row.Stock}` });
        }

        const newStock = row.Stock - quantity;
        const newSold = (row.Sold || 0) + quantity;
        db.run('UPDATE Inventory SET Stock = ?, Sold = ? WHERE ID = ?', [newStock, newSold, id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            
            db.run('INSERT INTO ActivityLog (ActionDescription) VALUES (?)', [`Sold ${quantity} units of ${row.Name}`]);
            let alertMsg = checkLowStock({ ...row, Stock: newStock });
            res.json({ 
                message: `Successfully sold ${quantity} units of ${row.Name}.`, 
                newStock,
                alert: alertMsg 
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
