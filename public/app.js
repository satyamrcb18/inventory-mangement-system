const API_URL = '/api/inventory';
let inventory = [];
let inventoryChartInstance = null;

// Elements
const inventoryList = document.getElementById('inventory-list');
const statsContainer = document.getElementById('stats-container');
const searchInput = document.getElementById('search-input');
const addItemBtn = document.getElementById('add-item-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const activityLogList = document.getElementById('activity-log-list');

const actionModal = document.getElementById('action-modal');
const closeModalBtn = document.querySelector('.close-modal');
const modalTitle = document.getElementById('modal-title');
const actionForm = document.getElementById('action-form');
const toastContainer = document.getElementById('toast-container');

// Keyboard shortcut for search
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
});

async function fetchInventory() {
    try {
        const response = await fetch(API_URL);
        inventory = await response.json();
        
        const term = searchInput.value.toLowerCase().trim();
        const filtered = term ? inventory.filter(item => item.Name && String(item.Name).toLowerCase().includes(term)) : inventory;
        
        renderInventory(filtered);
        renderStats();
        fetchLogs();
    } catch (err) {
        showToast('Failed to load inventory', 'danger');
    }
}

function renderStats() {
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.Price * item.Stock), 0);
    const totalSales = inventory.reduce((sum, item) => sum + (item.Price * (item.Sold || 0)), 0);
    const lowStockCount = inventory.filter(item => item.Stock < 5).length;

    statsContainer.innerHTML = `
        <div class="stat-card premium-glass premium-border">
            <div class="stat-header">
                <div class="stat-title">Total Items</div>
                <div class="stat-icon-wrapper" style="background: rgba(59, 130, 246, 0.1); color: #60a5fa;"><i data-lucide="package"></i></div>
            </div>
            <div class="stat-value">${totalItems}</div>
        </div>
        <div class="stat-card premium-glass premium-border">
            <div class="stat-header">
                <div class="stat-title">Est. Value</div>
                <div class="stat-icon-wrapper" style="background: rgba(16, 185, 129, 0.1); color: #34d399;"><i data-lucide="dollar-sign"></i></div>
            </div>
            <div class="stat-value">$${parseFloat(totalValue.toFixed(2)).toLocaleString()}</div>
        </div>
        <div class="stat-card premium-glass premium-border">
            <div class="stat-header">
                <div class="stat-title">Total Rev.</div>
                <div class="stat-icon-wrapper" style="background: rgba(139, 92, 246, 0.1); color: #a78bfa;"><i data-lucide="activity"></i></div>
            </div>
            <div class="stat-value">$${parseFloat(totalSales.toFixed(2)).toLocaleString()}</div>
        </div>
        <div class="stat-card premium-glass premium-border">
            <div class="stat-header">
                <div class="stat-title">Low Stock</div>
                <div class="stat-icon-wrapper" style="background: rgba(239, 68, 68, 0.1); color: #f87171;"><i data-lucide="alert-triangle"></i></div>
            </div>
            <div class="stat-value" style="color: ${lowStockCount > 0 ? '#f87171' : 'inherit'}">${lowStockCount}</div>
        </div>
    `;
    
    if (window.lucide) lucide.createIcons();
    updateChart();
}

function updateChart() {
    const canvas = document.getElementById('inventoryChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const labels = inventory.map(i => i.Name.substring(0, 10) + (i.Name.length > 10 ? '...' : ''));
    const dataValues = inventory.map(i => i.Stock * i.Price);

    // Advanced Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    if (inventoryChartInstance) {
        inventoryChartInstance.data.labels = labels;
        inventoryChartInstance.data.datasets[0].data = dataValues;
        inventoryChartInstance.update();
    } else {
        Chart.defaults.color = '#A0A0A0';
        Chart.defaults.font.family = 'Inter, sans-serif';
        
        inventoryChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Value ($)',
                    data: dataValues,
                    backgroundColor: gradient,
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    pointBackgroundColor: '#0f0f11',
                    pointBorderColor: '#3b82f6',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4 // Smooth curves
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15,15,17,0.9)',
                        titleFont: { size: 13, family: 'Plus Jakarta Sans' },
                        bodyFont: { size: 13, family: 'Inter' },
                        padding: 12, cornerRadius: 8,
                        borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) { label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y); }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } },
                    x: { grid: { display: false }, border: { display: false } }
                }
            }
        });
    }
}

function renderInventory(data) {
    inventoryList.innerHTML = '';
    
    if(data.length === 0) {
        inventoryList.innerHTML = `<tr><td colspan="4" class="text-center text-secondary py-6" style="text-align:center; padding: 2rem;">No items found.</td></tr>`;
        return;
    }

    data.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.style.animation = `fadeIn 0.3s ease ${index * 0.05}s forwards`;
        tr.style.opacity = '0';
        
        const isLowStock = item.Stock < 5;
        const statusBadge = isLowStock 
            ? `<span class="badge badge-danger" style="animation: pulse 2s infinite;"><i data-lucide="alert-circle" style="width:12px;height:12px"></i> Low Stock (${item.Stock})</span>`
            : `<span class="badge badge-success"><i data-lucide="check-circle" style="width:12px;height:12px"></i> In Stock (${item.Stock})</span>`;

        tr.innerHTML = `
            <td>
                <div class="item-info">
                    <span class="item-name">${item.Name}</span>
                    <span class="item-id">ID: ${item.ID}</span>
                </div>
            </td>
            <td><span class="price-tag">$${item.Price.toFixed(2)}</span></td>
            <td>${statusBadge}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon buy" onclick="openPurchaseModal(${item.ID}, '${item.Name}')" title="Buy Stock"><i data-lucide="plus"></i></button>
                    <button class="btn-icon sell" onclick="openSellModal(${item.ID}, '${item.Name}', ${item.Stock})" title="Sell Stock"><i data-lucide="minus"></i></button>
                    <button class="btn-icon delete" onclick="deleteItem(${item.ID})" title="Delete"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        inventoryList.appendChild(tr);
    });
    
    const keyframes = `
        @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(0.98); }
            100% { opacity: 1; transform: scale(1); }
        }
    `;
    if(!document.getElementById('dynamic-styles')) {
        const style = document.createElement('style');
        style.id = 'dynamic-styles';
        style.innerHTML = keyframes;
        document.head.appendChild(style);
    }
    
    if (window.lucide) lucide.createIcons();
}

async function fetchLogs() {
    try {
        const response = await fetch('/api/inventory/logs');
        const logs = await response.json();
        
        if (logs.length === 0) {
            activityLogList.innerHTML = '<div class="activity-empty text-secondary py-4" style="text-align:center;">No recent activity</div>';
            return;
        }

        activityLogList.innerHTML = '';
        logs.forEach(log => {
            let iconClass = 'default';
            let iconStr = 'activity';
            
            if (log.ActionDescription.includes('Added')) { iconStr = 'layers'; iconClass = 'added'; }
            if (log.ActionDescription.includes('Deleted')) { iconStr = 'trash-2'; iconClass = 'deleted'; }
            if (log.ActionDescription.includes('Purchased')) { iconStr = 'arrow-down-left'; iconClass = 'added'; }
            if (log.ActionDescription.includes('Sold')) { iconStr = 'arrow-up-right'; iconClass = 'sold'; }

            const timeObj = new Date(log.Timestamp + 'Z');
            const timeStr = isNaN(timeObj) ? log.Timestamp : timeObj.toLocaleString('en-US', {
                hour: 'numeric', minute:'2-digit', month: 'short', day: 'numeric'
            });

            const el = document.createElement('div');
            el.className = 'activity-item';
            el.innerHTML = `
                <div class="activity-icon-container">
                    <div class="activity-icon ${iconClass}">
                        <i data-lucide="${iconStr}"></i>
                    </div>
                </div>
                <div class="activity-content">
                    <p>${log.ActionDescription}</p>
                    <span class="activity-time">${timeStr}</span>
                </div>
            `;
            activityLogList.appendChild(el);
        });
        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error("Error fetching logs", err);
    }
}

// Search
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = term ? inventory.filter(item => String(item.Name).toLowerCase().includes(term)) : inventory;
    renderInventory(filtered);
});

// Toast
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : (type === 'danger' ? 'x-circle' : 'alert-circle');
    
    toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    
    if(window.lucide) lucide.createIcons();
    
    setTimeout(() => { if(toast.parentElement) toastContainer.removeChild(toast); }, 3500);
}

// Export
exportCsvBtn.addEventListener('click', () => {
    if (inventory.length === 0) return showToast('Inventory is empty!', 'warning');
    const headers = ['ID', 'Name', 'Price', 'Stock', 'Sold'];
    const csvRows = [headers.join(',')];
    inventory.forEach(item => {
        csvRows.push([item.ID, `"${item.Name}"`, item.Price, item.Stock, item.Sold || 0].join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('Export successful!', 'success');
});

// Modals
function showModal() { actionModal.classList.remove('d-none'); }
function hideModal() { actionModal.classList.add('d-none'); }
closeModalBtn.addEventListener('click', hideModal);
document.querySelector('.modal-overlay').addEventListener('click', hideModal);

addItemBtn.addEventListener('click', () => {
    modalTitle.textContent = 'Add New Item';
    actionForm.innerHTML = `
        <div class="form-group">
            <label class="form-label">Item Name</label>
            <input type="text" id="add-name" class="form-input" required autocomplete="off">
        </div>
        <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
                <label class="form-label">Price ($)</label>
                <input type="number" step="0.01" id="add-price" class="form-input" required>
            </div>
            <div>
                <label class="form-label">Initial Stock</label>
                <input type="number" id="add-stock" class="form-input" required>
            </div>
        </div>
        <div class="form-actions">
            <button type="button" class="btn btn-secondary close-modal-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Item</button>
        </div>
    `;
    
    document.querySelector('.close-modal-btn').addEventListener('click', hideModal);
    
    actionForm.onsubmit = async (e) => {
        e.preventDefault();
        const Name = document.getElementById('add-name').value;
        const Price = parseFloat(document.getElementById('add-price').value);
        const Stock = parseInt(document.getElementById('add-stock').value, 10);
        
        try {
            const res = await fetch(API_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Name, Price, Stock })
            });
            if (res.ok) { showToast('Item added successfully!', 'success'); fetchInventory(); hideModal(); }
            else showToast('Failed to add item', 'danger');
        } catch (err) { showToast('Network Error', 'danger'); }
    };
    showModal();
});

window.openPurchaseModal = (id, name) => {
    modalTitle.textContent = `Buy Stock: ${name}`;
    actionForm.innerHTML = `
        <div class="form-group">
            <label class="form-label">Quantity Add to Stock</label>
            <input type="number" id="purchase-qty" class="form-input" min="1" required>
        </div>
        <div class="form-actions">
            <button type="button" class="btn btn-secondary close-modal-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Process Buy</button>
        </div>
    `;
    document.querySelector('.close-modal-btn').addEventListener('click', hideModal);
    
    actionForm.onsubmit = async (e) => {
        e.preventDefault();
        const quantity = parseInt(document.getElementById('purchase-qty').value, 10);
        const res = await fetch(`${API_URL}/purchase`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, quantity })
        });
        if (res.ok) { showToast(`Purchased ${quantity} units`, 'success'); fetchInventory(); hideModal(); }
        else showToast('Failed transaction', 'danger');
    };
    showModal();
};

window.openSellModal = (id, name, stock) => {
    modalTitle.textContent = `Sell Stock: ${name}`;
    actionForm.innerHTML = `
        <div class="form-group">
            <div class="flex-between mb-2">
                <label class="form-label" style="margin:0">Quantity to Sell</label>
                <span class="badge badge-primary">Avail: ${stock}</span>
            </div>
            <input type="number" id="sell-qty" class="form-input" min="1" max="${stock}" required>
        </div>
        <div class="form-actions">
            <button type="button" class="btn btn-secondary close-modal-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Process Sell</button>
        </div>
    `;
    document.querySelector('.close-modal-btn').addEventListener('click', hideModal);
    
    actionForm.onsubmit = async (e) => {
        e.preventDefault();
        const quantity = parseInt(document.getElementById('sell-qty').value, 10);
        const res = await fetch(`${API_URL}/sell`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, quantity })
        });
        const data = await res.json();
        if (res.ok) { 
            showToast(data.message, 'success');
            if(data.alert) setTimeout(() => showToast('Low stock alert!', 'warning'), 600);
            fetchInventory(); hideModal(); 
        }
        else showToast(data.error || 'Failed sell', 'danger');
    };
    showModal();
};

window.deleteItem = async (id) => {
    if(!confirm('Delete this item permanently?')) return;
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if(res.ok) { showToast('Item deleted', 'success'); fetchInventory(); }
    else showToast('Delete failed', 'danger');
};

// Start
fetchInventory();
