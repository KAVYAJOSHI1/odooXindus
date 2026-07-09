/* ShelfControl — settings/settings.js */
'use strict';

let WAREHOUSES = [];

let LOCATIONS = [];

let RACKS = [
  { id:1, name:'Rack A', loc:'Stock Zone A',    warehouse:'Main WH',    cap:500 },
  { id:2, name:'Rack B', loc:'Stock Zone A',    warehouse:'Main WH',    cap:500 },
  { id:3, name:'Rack C', loc:'Stock Zone B',    warehouse:'Main WH',    cap:300 },
  { id:4, name:'Shelf 1',loc:'Zone 1',          warehouse:'Warehouse B',cap:200 },
  { id:5, name:'Shelf 2',loc:'Zone 2',          warehouse:'Warehouse B',cap:200 },
];

let currentTab = 'warehouses';
let editWHId   = null;

document.addEventListener('DOMContentLoaded', () => {
  injectSidebar('warehouse');
  injectTopbar('Warehouse Settings');
  
  fetch('/api/warehouses/')
    .then(res => res.json())
    .then(data => {
       WAREHOUSES = data.map(w => ({
         id: w.id, name: w.name, code: w.name.substring(0,3).toUpperCase(), 
         type: 'Storage', address: w.address || '', manager: 'System',
         skus: 0, locs: 0, active: true
       }));
       renderWarehouses();
    })
    .catch(err => console.error(err));

  fetch('/api/locations/')
    .then(res => res.json())
    .then(data => {
       LOCATIONS = data.map(l => ({
         id: l.id, name: l.name, code: l.name.substring(0,3).toUpperCase(),
         warehouse: l.warehouse_name, type: 'Internal'
       }));
       renderLocations();
    })
    .catch(err => console.error(err));

  renderRacks();
});

/* ── TAB SWITCH ─────────────────────────────────── */
function switchTab(btn, tab) {
  document.querySelectorAll('.settings-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['warehouses','locations','racks'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.style.display = t === tab ? '' : 'none';
  });
  currentTab = tab;
  const addBtn = document.getElementById('addBtn');
  if (addBtn) {
    const labels = { warehouses:'Add Warehouse', locations:'Add Location', racks:'Add Rack' };
    addBtn.textContent = labels[tab] || 'Add';
    addBtn.onclick = tab === 'warehouses' ? openAddPanel
      : tab === 'locations' ? () => openModal('addLocModal')
      : () => openModal('addRackModal');
  }
}

/* ── WAREHOUSES ─────────────────────────────────── */
function openAddPanel() {
  editWHId = null;
  document.getElementById('whModalTitle').textContent = 'Add Warehouse';
  ['whName','whCode','whAddress','whManager'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  openModal('whModal');
}

function renderWarehouses() {
  const grid = document.getElementById('whGrid');
  if (!grid) return;
  grid.innerHTML = WAREHOUSES.map(w => `
    <div class="wh-card anim-${WAREHOUSES.indexOf(w)+1}">
      <div class="wh-card-header">
        <div class="wh-card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div class="wh-card-actions">
          <button class="btn btn-sm btn-secondary" onclick="editWarehouse(${w.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteWarehouse(${w.id})">Delete</button>
        </div>
      </div>
      <div class="wh-name">${w.name}</div>
      <div class="wh-code">${w.code} · ${w.type}</div>
      <div class="wh-address">${w.address}</div>
      <div class="wh-manager">Manager: ${w.manager}</div>
      <div class="wh-stats">
        <div class="wh-stat"><span class="wh-stat-val">${w.skus}</span><span class="wh-stat-lbl">SKUs</span></div>
        <div class="wh-stat"><span class="wh-stat-val">${w.locs}</span><span class="wh-stat-lbl">Locations</span></div>
        <div class="wh-stat"><span class="wh-stat-val" style="color:var(--green)">Active</span><span class="wh-stat-lbl">Status</span></div>
      </div>
    </div>`).join('');
}

function editWarehouse(id) {
  const w = WAREHOUSES.find(x => x.id === id);
  if (!w) return;
  editWHId = id;
  document.getElementById('whModalTitle').textContent = 'Edit Warehouse';
  document.getElementById('whName').value    = w.name;
  document.getElementById('whCode').value    = w.code;
  document.getElementById('whAddress').value = w.address;
  document.getElementById('whManager').value = w.manager;
  openModal('whModal');
}

function saveWarehouse() {
  const name    = document.getElementById('whName')?.value.trim();
  const code    = document.getElementById('whCode')?.value.trim().toUpperCase();
  const address = document.getElementById('whAddress')?.value.trim();
  const manager = document.getElementById('whManager')?.value.trim();
  if (!name || !code) { showToast('Name and code are required', 'error'); return; }
  if (editWHId) {
    // Update existing
    fetch(`/api/warehouses/${editWHId}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address })
    })
    .then(res => { if(!res.ok) throw new Error('Update failed'); return res.json(); })
    .then(() => {
      const w = WAREHOUSES.find(x => x.id === editWHId);
      if (w) { w.name = name; w.code = code; w.address = address; w.manager = manager; }
      closeModal('whModal');
      renderWarehouses();
      showToast('Warehouse updated', 'success');
    })
    .catch(err => showToast(err.message, 'error'));
  } else {
    // Create new
    fetch('/api/warehouses/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address })
    })
    .then(res => { if(!res.ok) throw new Error('Create failed'); return res.json(); })
    .then(data => {
      WAREHOUSES.push({ id: data.id, name, code, address, manager, type: document.getElementById('whType')?.value || 'Storage', skus: 0, locs: 0, active: true });
      closeModal('whModal');
      renderWarehouses();
      showToast(`Warehouse "${name}" created`, 'success');
    })
    .catch(err => showToast(err.message, 'error'));
  }
}

function deleteWarehouse(id) {
  if (!confirm('Delete this warehouse? This cannot be undone.')) return;
  fetch(`/api/warehouses/${id}/`, { method: 'DELETE' })
    .then(res => { if(!res.ok) throw new Error('Delete failed'); return res.json(); })
    .then(() => {
      WAREHOUSES = WAREHOUSES.filter(x => x.id !== id);
      renderWarehouses();
      showToast('Warehouse deleted', 'warn');
    })
    .catch(err => showToast(err.message, 'error'));
}

/* ── LOCATIONS ──────────────────────────────────── */
function renderLocations() {
  const tbody = document.getElementById('locBody');
  if (!tbody) return;
  tbody.innerHTML = LOCATIONS.map(l => `
    <tr>
      <td style="font-weight:500;color:var(--text);">${l.name}</td>
      <td><span class="mono" style="color:var(--teal);">${l.code}</span></td>
      <td>${l.warehouse}</td>
      <td><span class="badge ${l.type==='External'?'badge-waiting':l.type==='Virtual'?'badge-draft':'badge-ready'}">${l.type}</span></td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="showToast('Edit location ${l.name}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteLocation(${l.id})">Delete</button>
      </td>
    </tr>`).join('');
}

function saveLocation() {
  const name = document.getElementById('locName')?.value.trim();
  const code = document.getElementById('locCode')?.value.trim();
  const warehouseName = document.getElementById('locWarehouse')?.value;
  if (!name) { showToast('Location name is required', 'error'); return; }

  // Find warehouse ID from name
  const wh = WAREHOUSES.find(w => w.name === warehouseName);
  const whId = wh ? wh.id : 1;

  fetch('/api/locations/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, warehouse_id: whId })
  })
  .then(res => { if(!res.ok) throw new Error('Create failed'); return res.json(); })
  .then(data => {
    LOCATIONS.push({ id: data.id, name, code, warehouse: warehouseName, type: document.getElementById('locType')?.value || 'Internal' });
    closeModal('addLocModal');
    renderLocations();
    showToast(`Location "${name}" added`, 'success');
  })
  .catch(err => showToast(err.message, 'error'));
}

function deleteLocation(id) {
  if (!confirm('Delete this location?')) return;
  fetch(`/api/locations/${id}/`, { method: 'DELETE' })
    .then(res => { if(!res.ok) throw new Error('Delete failed'); return res.json(); })
    .then(() => {
      LOCATIONS = LOCATIONS.filter(x => x.id !== id);
      renderLocations();
      showToast('Location deleted', 'warn');
    })
    .catch(err => showToast(err.message, 'error'));
}

/* ── RACKS ──────────────────────────────────────── */
function renderRacks() {
  const tbody = document.getElementById('rackBody');
  if (!tbody) return;
  tbody.innerHTML = RACKS.map(r => `
    <tr>
      <td style="font-weight:500;color:var(--text);">${r.name}</td>
      <td>${r.loc}</td>
      <td>${r.warehouse}</td>
      <td style="font-family:'DM Mono',monospace;">${r.cap} units</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="showToast('Edit rack ${r.name}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteRack(${r.id})">Delete</button>
      </td>
    </tr>`).join('');
}

function saveRack() {
  const name = document.getElementById('rackName')?.value.trim();
  if (!name) { showToast('Rack name is required', 'error'); return; }
  RACKS.push({ id: Date.now(), name, loc: document.getElementById('rackLoc')?.value, warehouse: document.getElementById('rackWH')?.value, cap: parseInt(document.getElementById('rackCap')?.value) || 0 });
  closeModal('addRackModal');
  renderRacks();
  showToast(`Rack "${name}" added`, 'success');
}

function deleteRack(id) {
  RACKS = RACKS.filter(x => x.id !== id);
  renderRacks();
  showToast('Rack deleted', 'warn');
}
