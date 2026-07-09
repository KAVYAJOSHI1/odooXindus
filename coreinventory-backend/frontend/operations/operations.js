/* ═══════════════════════════════════════════════════
   ShelfControl — operations/operations.js
   Shared logic for: receipts, deliveries, transfers,
   adjustments, history pages.
═══════════════════════════════════════════════════ */
'use strict';

/* ═══════════════════════════════════════════════════
   SHARED MOCK DATA
═══════════════════════════════════════════════════ */
let RECEIPTS_DATA = [];
let DELIVERIES_DATA = [];
let TRANSFERS_DATA = [];
let ADJ_DATA = [];
let HISTORY_DATA = [];

// Initialize data from API
let API_PRODUCTS = [];
let API_WAREHOUSES = [];
let API_LOCATIONS = [];

function populateDropdowns() {
  const whOptions = API_WAREHOUSES.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
  const locOptions = API_LOCATIONS.map(l => `<option value="${l.id}">${l.name} (${l.warehouse_name})</option>`).join('');
  const prodOptionsForAdj = API_PRODUCTS.map(p => `<option value="${p.id}|${p.sku}|${p.stock}">${p.name} (${p.sku}) — Current: ${p.stock}</option>`).join('');

  if (document.getElementById('rcpWarehouse')) document.getElementById('rcpWarehouse').innerHTML = whOptions;
  if (document.getElementById('delWarehouse')) document.getElementById('delWarehouse').innerHTML = whOptions;
  if (document.getElementById('trfFrom')) document.getElementById('trfFrom').innerHTML = locOptions;
  if (document.getElementById('trfTo')) document.getElementById('trfTo').innerHTML = locOptions;
  if (document.getElementById('adjLocation')) document.getElementById('adjLocation').innerHTML = locOptions;

  if (document.getElementById('adjProduct')) {
      document.getElementById('adjProduct').innerHTML = '<option value="">Select product</option>' + prodOptionsForAdj;
  }

  // Reload lines with actual products
  if (document.getElementById('rcpLines') && API_PRODUCTS.length) {
    document.getElementById('rcpLines').innerHTML = `<div class="product-line product-line-hdr"><span>Product</span><span>Quantity</span><span></span></div>`;
    addReceiptLine();
  }
  if (document.getElementById('delLines') && API_PRODUCTS.length) {
    document.getElementById('delLines').innerHTML = `<div class="product-line product-line-hdr"><span>Product</span><span>Quantity</span><span></span></div>`;
    addDeliveryLine();
  }
  if (document.getElementById('trfLines') && API_PRODUCTS.length) {
    document.getElementById('trfLines').innerHTML = `<div class="product-line product-line-hdr"><span>Product</span><span>Quantity</span><span></span></div>`;
    addTransferLine();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  Promise.all([
    fetch('/api/products/').then(r=>r.json()).catch(()=>[]),
    fetch('/api/warehouses/').then(r=>r.json()).catch(()=>[]),
    fetch('/api/locations/').then(r=>r.json()).catch(()=>[])
  ]).then(([p, w, l]) => {
    API_PRODUCTS = p;
    API_WAREHOUSES = w;
    API_LOCATIONS = l;
    populateDropdowns();
  });

  const page = window.location.pathname.split('/').pop().replace('.html','');
  
  if (page === 'receipts') {
    fetch('/api/receipts/').then(r=>r.json()).then(d => {
      RECEIPTS_DATA = d.map(x => ({ ref:x.ref, supplier:x.supplier_name, products:'Mixed', qty:'-', warehouse:x.warehouse_name, date:x.scheduled_date||'-', status:x.status }));
      renderOpsTable(page);
    });
  } else if (page === 'deliveries') {
    fetch('/api/deliveries/').then(r=>r.json()).then(d => {
      DELIVERIES_DATA = d.map(x => ({ ref:x.ref, customer:x.customer_name, products:'Mixed', qty:'-', warehouse:x.warehouse_name, date:x.scheduled_date||'-', status:x.status }));
      renderOpsTable(page);
    });
  } else if (page === 'transfers') {
    fetch('/api/transfers/').then(r=>r.json()).then(d => {
      TRANSFERS_DATA = d.map(x => ({ ref:x.ref, from:x.from_loc, to:x.to_loc, product:'Mixed', qty:'-', date:x.created_at.substring(0,10), status:x.status }));
      renderOpsTable(page);
    });
  } else if (page === 'adjustments') {
    fetch('/api/adjustments/').then(r=>r.json()).then(d => {
      ADJ_DATA = d.map(x => ({ ref:x.ref, product:'Mixed', sku:'-', loc:x.loc_name, recorded:0, counted:0, diff:0, user:x.user_name||'System', date:x.created_at.substring(0,10), status:x.status }));
      renderOpsTable(page);
    });
  } else if (page === 'history') {
    fetch('/api/history/').then(r=>r.json()).then(d => {
      const typeMap = {
        'RECEIPT': 'IN',
        'DELIVERY': 'OUT',
        'TRANSFER_IN': 'INT',
        'TRANSFER_OUT': 'INT',
        'ADJUSTMENT': 'ADJ'
      };
      HISTORY_DATA = d.map(x => ({ 
        date: x.date, 
        ref: x.ref, 
        type: typeMap[x.type] || 'ADJ', 
        product: x.product, 
        from: '-', 
        to: '-', 
        qty: x.qty, 
        loc: x.location, 
        user: 'System'
      }));
      renderHistoryTable();
    });
  }
});

/* ═══════════════════════════════════════════════════
   SHARED TABLE FILTER
═══════════════════════════════════════════════════ */
let opTabFilter = 'all';

function filterTab(btn, status) {
  document.querySelectorAll('.status-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  opTabFilter = status;
  const page = window.location.pathname.split('/').pop().replace('.html','');
  renderOpsTable(page);
}

/* ═══════════════════════════════════════════════════
   RENDER TABLES
═══════════════════════════════════════════════════ */
function renderOpsTable(type) {
  switch(type) {
    case 'receipts':   renderReceiptsTable(); break;
    case 'deliveries': renderDeliveriesTable(); break;
    case 'transfers':  renderTransfersTable(); break;
  }
}

function renderReceiptsTable() {
  const tbody = document.getElementById('receiptsBody');
  if (!tbody) return;
  const q = document.getElementById('receiptSearch')?.value.toLowerCase() || '';
  const data = RECEIPTS_DATA.filter(r =>
    (opTabFilter === 'all' || r.status === opTabFilter) &&
    (!q || r.ref.toLowerCase().includes(q) || r.supplier.toLowerCase().includes(q))
  );
  const countEl = document.getElementById('receiptsCount');
  if (countEl) countEl.textContent = `${data.length} receipt${data.length !== 1 ? 's' : ''}`;

  tbody.innerHTML = data.length ? data.map(r => `
    <tr>
      <td><span class="ref">${r.ref}</span></td>
      <td style="font-weight:500;color:var(--text);">${r.supplier}</td>
      <td>${r.products}</td>
      <td style="font-family:'DM Mono',monospace;font-weight:500;">${r.qty}</td>
      <td>${r.warehouse}</td>
      <td style="font-family:'DM Mono',monospace;font-size:.72rem;">${r.date}</td>
      <td><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
      <td>
        <div style="display:flex;gap:4px;">
          ${r.status === 'Draft' || r.status === 'Waiting'
            ? `<button class="btn btn-sm btn-primary" onclick="validateOp('receipt','${r.ref}')">Validate</button>`
            : ''}
          <button class="btn btn-sm btn-secondary" onclick="showToast('Viewing ${r.ref}')">View</button>
        </div>
      </td>
    </tr>`).join('')
  : `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📥</div><div class="empty-title">No receipts found</div></div></td></tr>`;

  document.getElementById('receiptSearch')?.addEventListener('input', renderReceiptsTable);
}

function renderDeliveriesTable() {
  const tbody = document.getElementById('deliveriesBody');
  if (!tbody) return;
  const q = document.getElementById('deliverySearch')?.value.toLowerCase() || '';
  const data = DELIVERIES_DATA.filter(r =>
    (opTabFilter === 'all' || r.status === opTabFilter) &&
    (!q || r.ref.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q))
  );

  tbody.innerHTML = data.length ? data.map(r => `
    <tr>
      <td><span class="ref">${r.ref}</span></td>
      <td style="font-weight:500;color:var(--text);">${r.customer}</td>
      <td>${r.products}</td>
      <td style="font-family:'DM Mono',monospace;font-weight:500;">${r.qty}</td>
      <td>${r.warehouse}</td>
      <td style="font-family:'DM Mono',monospace;font-size:.72rem;">${r.date}</td>
      <td><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
      <td>
        <div style="display:flex;gap:4px;">
          ${r.status !== 'Done' && r.status !== 'Canceled'
            ? `<button class="btn btn-sm btn-primary" onclick="validateOp('delivery','${r.ref}')">Validate</button>`
            : ''}
          <button class="btn btn-sm btn-secondary" onclick="showToast('Viewing ${r.ref}')">View</button>
        </div>
      </td>
    </tr>`).join('')
  : `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🚚</div><div class="empty-title">No deliveries found</div></div></td></tr>`;

  document.getElementById('deliverySearch')?.addEventListener('input', renderDeliveriesTable);
}

function renderTransfersTable() {
  const tbody = document.getElementById('transfersBody');
  if (!tbody) return;
  const q = document.getElementById('transferSearch')?.value.toLowerCase() || '';
  const data = TRANSFERS_DATA.filter(r =>
    (opTabFilter === 'all' || r.status === opTabFilter) &&
    (!q || r.ref.toLowerCase().includes(q) || r.product.toLowerCase().includes(q))
  );

  tbody.innerHTML = data.length ? data.map(r => `
    <tr>
      <td><span class="ref">${r.ref}</span></td>
      <td>${r.from}</td>
      <td>${r.to}</td>
      <td style="font-weight:500;color:var(--text);">${r.product}</td>
      <td style="font-family:'DM Mono',monospace;font-weight:500;">${r.qty}</td>
      <td style="font-family:'DM Mono',monospace;font-size:.72rem;">${r.date}</td>
      <td><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
      <td>
        <div style="display:flex;gap:4px;">
          ${r.status === 'Ready'
            ? `<button class="btn btn-sm btn-primary" onclick="validateOp('transfer','${r.ref}')">Validate</button>`
            : r.status === 'Draft'
            ? `<button class="btn btn-sm btn-secondary" onclick="showToast('${r.ref} moved to Ready')">Mark Ready</button>`
            : ''}
          <button class="btn btn-sm btn-secondary" onclick="showToast('Viewing ${r.ref}')">View</button>
        </div>
      </td>
    </tr>`).join('')
  : `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🔄</div><div class="empty-title">No transfers found</div></div></td></tr>`;

  document.getElementById('transferSearch')?.addEventListener('input', renderTransfersTable);
}

function renderAdjTable() {
  const tbody = document.getElementById('adjBody');
  if (!tbody) return;
  const q   = document.getElementById('adjSearch')?.value.toLowerCase() || '';
  const loc = document.getElementById('adjLocFil')?.value || 'all';
  const data = ADJ_DATA.filter(r =>
    (loc === 'all' || r.loc === loc) &&
    (!q || r.product.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q))
  );

  tbody.innerHTML = data.length ? data.map(r => {
    const diffColor = r.diff > 0 ? 'var(--green)' : r.diff < 0 ? 'var(--rose)' : 'var(--text-3)';
    return `
    <tr>
      <td><span class="ref">${r.ref}</span></td>
      <td>
        <span style="font-weight:500;color:var(--text);">${r.product}</span>
        <span style="display:block;font-family:'DM Mono',monospace;font-size:.65rem;color:var(--teal);">${r.sku}</span>
      </td>
      <td>${r.loc}</td>
      <td style="font-family:'DM Mono',monospace;">${r.recorded}</td>
      <td style="font-family:'DM Mono',monospace;">${r.counted}</td>
      <td style="font-family:'DM Mono',monospace;font-weight:600;color:${diffColor};">${r.diff > 0 ? '+' : ''}${r.diff}</td>
      <td style="font-size:.75rem;">${r.user}</td>
      <td style="font-family:'DM Mono',monospace;font-size:.7rem;">${r.date}</td>
      <td><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
    </tr>`;
  }).join('')
  : `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">⚖️</div><div class="empty-title">No adjustments yet</div></div></td></tr>`;

  document.getElementById('adjSearch')?.addEventListener('input', renderAdjTable);
  document.getElementById('adjLocFil')?.addEventListener('change', renderAdjTable);
}

/* ═══════════════════════════════════════════════════
   HISTORY TABLE
═══════════════════════════════════════════════════ */
let histPage = 1;
const HIST_PER_PAGE = 10;

function renderHistoryTable() {
  const tbody = document.getElementById('histBody');
  if (!tbody) return;

  const q     = document.getElementById('histSearch')?.value.toLowerCase() || '';
  const type  = document.getElementById('histTypeFil')?.value || 'all';
  const loc   = document.getElementById('histLocFil')?.value || 'all';

  const data = HISTORY_DATA.filter(r =>
    (type === 'all' || r.type === type) &&
    (loc === 'all' || r.loc === loc) &&
    (!q || r.product.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q) || r.user.toLowerCase().includes(q))
  );

  const start = (histPage - 1) * HIST_PER_PAGE;
  const slice = data.slice(start, start + HIST_PER_PAGE);

  const typeBadge = { IN:'badge-receipt', OUT:'badge-delivery', INT:'badge-transfer', ADJ:'badge-adjustment' };
  const typeLabel = { IN:'Receipt', OUT:'Delivery', INT:'Transfer', ADJ:'Adjustment' };

  const qtyColor = q => q.startsWith('+') ? 'var(--green)' : q.startsWith('-') ? 'var(--rose)' : 'var(--text-2)';

  tbody.innerHTML = slice.length ? slice.map(r => `
    <tr>
      <td style="font-family:'DM Mono',monospace;font-size:.7rem;">${r.date}</td>
      <td><span class="ref">${r.ref}</span></td>
      <td><span class="badge ${typeBadge[r.type]}">${typeLabel[r.type]}</span></td>
      <td style="font-weight:500;color:var(--text);">${r.product}</td>
      <td style="color:var(--text-2);">${r.from}</td>
      <td style="color:var(--text-2);">${r.to}</td>
      <td style="font-family:'DM Mono',monospace;font-weight:600;color:${qtyColor(r.qty)};">${r.qty}</td>
      <td>${r.loc}</td>
      <td style="font-size:.75rem;color:var(--text-2);">${r.user}</td>
    </tr>`).join('')
  : `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No moves found</div></div></td></tr>`;

  const countEl = document.getElementById('histCount');
  if (countEl) countEl.textContent = `${data.length} record${data.length !== 1 ? 's' : ''}`;

  const pageInfo = document.getElementById('histPageInfo');
  if (pageInfo) pageInfo.textContent = `Showing ${start+1}–${Math.min(start+HIST_PER_PAGE, data.length)} of ${data.length}`;

  const pager = document.getElementById('histPager');
  if (pager) {
    const total = Math.ceil(data.length / HIST_PER_PAGE);
    let ph = `<button class="btn btn-sm btn-secondary" onclick="goHistPage(${histPage-1})" ${histPage===1?'disabled':''}>‹</button>`;
    for (let i=1; i<=total; i++) ph += `<button class="btn btn-sm ${i===histPage?'btn-primary':'btn-secondary'}" onclick="goHistPage(${i})">${i}</button>`;
    ph += `<button class="btn btn-sm btn-secondary" onclick="goHistPage(${histPage+1})" ${histPage===total?'disabled':''}>›</button>`;
    pager.innerHTML = ph;
  }
}

function goHistPage(n) {
  const total = Math.ceil(HISTORY_DATA.length / HIST_PER_PAGE);
  if (n < 1 || n > total) return;
  histPage = n;
  renderHistoryTable();
}

/* ═══════════════════════════════════════════════════
   RECEIPT MULTI-STEP FORM
═══════════════════════════════════════════════════ */
let rcpStep = 1;
let rcpLines = [];

function rcpNext() {
  if (rcpStep === 1) {
    const supplier = document.getElementById('rcpSupplier')?.value;
    if (!supplier) { showToast('Please select a supplier', 'error'); return; }
    rcpStep = 2;
    document.getElementById('rcpStep1').style.display = 'none';
    document.getElementById('rcpStep2').style.display = 'block';
    document.getElementById('ws1').className = 'wf-step done';
    document.getElementById('wc1').className = 'wf-connector done';
    document.getElementById('ws2').className = 'wf-step active';
    document.getElementById('rcpFooter').innerHTML = `
      <button class="btn btn-secondary" onclick="rcpBack()">← Back</button>
      <button class="btn btn-secondary" onclick="closeModal('createReceiptModal')">Cancel</button>
      <button class="btn btn-primary" onclick="rcpNext()">Next →</button>`;
    if (!rcpLines.length) addReceiptLine();
  } else if (rcpStep === 2) {
    const lines = document.querySelectorAll('#rcpLines .product-line:not(.product-line-hdr)');
    if (!lines.length) { showToast('Add at least one product line', 'error'); return; }
    rcpStep = 3;
    document.getElementById('rcpStep2').style.display = 'none';
    document.getElementById('rcpStep3').style.display = 'block';
    document.getElementById('ws2').className = 'wf-step done';
    document.getElementById('wc2').className = 'wf-connector done';
    document.getElementById('ws3').className = 'wf-step active';
    const supplier   = document.getElementById('rcpSupplier')?.value;
    const warehouse  = document.getElementById('rcpWarehouse')?.value;
    const date       = document.getElementById('rcpDate')?.value;
    const summaryEl  = document.getElementById('rcpSummary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div><strong>Supplier:</strong> ${supplier}</div>
          <div><strong>Destination:</strong> ${warehouse}</div>
          <div><strong>Scheduled:</strong> ${date || 'Not set'}</div>
          <div><strong>Products:</strong> ${lines.length} line(s)</div>
        </div>`;
    }
    document.getElementById('rcpFooter').innerHTML = `
      <button class="btn btn-secondary" onclick="rcpBack()">← Back</button>
      <button class="btn btn-secondary" onclick="closeModal('createReceiptModal')">Cancel</button>
      <button class="btn btn-primary" onclick="validateReceipt()">✓ Validate & Create</button>`;
  }
}

function rcpBack() {
  if (rcpStep === 2) {
    rcpStep = 1;
    document.getElementById('rcpStep2').style.display = 'none';
    document.getElementById('rcpStep1').style.display = 'block';
    document.getElementById('ws1').className = 'wf-step active';
    document.getElementById('wc1').className = 'wf-connector';
    document.getElementById('ws2').className = 'wf-step';
    document.getElementById('rcpFooter').innerHTML = `<button class="btn btn-secondary" onclick="closeModal('createReceiptModal')">Cancel</button><button class="btn btn-primary" onclick="rcpNext()">Next →</button>`;
  } else if (rcpStep === 3) {
    rcpStep = 2;
    document.getElementById('rcpStep3').style.display = 'none';
    document.getElementById('rcpStep2').style.display = 'block';
    document.getElementById('ws2').className = 'wf-step active';
    document.getElementById('wc2').className = 'wf-connector';
    document.getElementById('ws3').className = 'wf-step';
    document.getElementById('rcpFooter').innerHTML = `<button class="btn btn-secondary" onclick="rcpBack()">← Back</button><button class="btn btn-secondary" onclick="closeModal('createReceiptModal')">Cancel</button><button class="btn btn-primary" onclick="rcpNext()">Next →</button>`;
  }
}

function validateReceipt() {
  const ref = 'WH/IN/' + String(RECEIPTS_DATA.length + 1).padStart(4, '0');
  
  const items = [];
  document.querySelectorAll('#rcpLines .product-line:not(.product-line-hdr)').forEach(div => {
    const pId = parseInt(div.querySelector('.line-prod')?.value);
    const qty = parseInt(div.querySelector('.line-qty')?.value);
    if (pId && qty > 0) items.push({ product_id: pId, quantity: qty });
  });

  const payload = {
    ref,
    supplier: document.getElementById('rcpSupplier')?.value,
    warehouse_id: parseInt(document.getElementById('rcpWarehouse')?.value) || 1,
    po: document.getElementById('rcpPO')?.value || '',
    items
  };

  fetch('/api/receipts/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(res => res.json()).then(data => {
    RECEIPTS_DATA.unshift({
      ref,
      supplier: payload.supplier,
      products: 'Multiple products',
      qty: '50',
      warehouse: 'Main WH',
      date: new Date().toISOString().slice(0,10),
      status: 'Done',
      po: payload.po,
    });
    closeModal('createReceiptModal');
    rcpStep = 1;
    document.getElementById('rcpStep1').style.display = 'block';
    document.getElementById('rcpStep2').style.display = 'none';
    document.getElementById('rcpStep3').style.display = 'none';
    showToast(`Receipt ${ref} created`, 'success');
    renderOpsTable('receipts');
  }).catch(err => showToast(err.message, 'error'));
}

function addReceiptLine() {
  const container = document.getElementById('rcpLines');
  if (!container) return;
  const id = Date.now();
  const pOpts = API_PRODUCTS.map(p => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('');
  const div = document.createElement('div');
  div.className = 'product-line';
  div.id = 'rcpLine_' + id;
  div.innerHTML = `
    <select class="form-control form-select line-prod" style="height:32px;font-size:.78rem;">
      <option value="">Select product</option>${pOpts}
    </select>
    <input type="number" class="form-control line-qty" style="height:32px;font-size:.78rem;" placeholder="Qty" min="1"/>
    <button class="line-remove" onclick="document.getElementById('rcpLine_${id}').remove()">✕</button>`;
  container.appendChild(div);
}

/* ═══════════════════════════════════════════════════
   DELIVERY MULTI-STEP FORM
═══════════════════════════════════════════════════ */
let delStep = 1;

function delNext() {
  if (delStep === 1) {
    const customer = document.getElementById('delCustomer')?.value.trim();
    const lines = document.querySelectorAll('#delLines .product-line:not(.product-line-hdr)');
    if (!customer) { showToast('Please enter a customer name', 'error'); return; }
    if (!lines.length) { showToast('Add at least one product line', 'error'); return; }
    delStep = 2;
    document.getElementById('delStep1').style.display = 'none';
    document.getElementById('delStep2').style.display = 'block';
    document.getElementById('dws1').className = 'wf-step done';
    document.getElementById('dwc1').className = 'wf-connector done';
    document.getElementById('dws2').className = 'wf-step active';
    // Build pack checklist
    const packList = document.getElementById('delPackList');
    if (packList) {
      packList.innerHTML = [...lines].map((_, i) => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">
          <input type="checkbox" style="accent-color:var(--teal);width:14px;height:14px;"/>
          <span style="font-size:.82rem;">Line ${i+1} — packed and ready</span>
        </div>`).join('');
    }
    document.getElementById('delFooter').innerHTML = `<button class="btn btn-secondary" onclick="delBack()">← Back</button><button class="btn btn-secondary" onclick="closeModal('createDeliveryModal')">Cancel</button><button class="btn btn-primary" onclick="delNext()">Next →</button>`;
  } else if (delStep === 2) {
    delStep = 3;
    document.getElementById('delStep2').style.display = 'none';
    document.getElementById('delStep3').style.display = 'block';
    document.getElementById('dws2').className = 'wf-step done';
    document.getElementById('dwc2').className = 'wf-connector done';
    document.getElementById('dws3').className = 'wf-step active';
    const summaryEl = document.getElementById('delSummary');
    if (summaryEl) {
      summaryEl.innerHTML = `<strong>Customer:</strong> ${document.getElementById('delCustomer')?.value}<br>
        <strong>From:</strong> ${document.getElementById('delWarehouse')?.value}<br>
        <strong>Date:</strong> ${document.getElementById('delDate')?.value || 'Not set'}`;
    }
    document.getElementById('delFooter').innerHTML = `<button class="btn btn-secondary" onclick="delBack()">← Back</button><button class="btn btn-secondary" onclick="closeModal('createDeliveryModal')">Cancel</button><button class="btn btn-primary" onclick="validateDelivery()">🚚 Dispatch</button>`;
  }
}

function delBack() {
  if (delStep === 2) {
    delStep = 1;
    document.getElementById('delStep2').style.display = 'none';
    document.getElementById('delStep1').style.display = 'block';
    document.getElementById('dws1').className = 'wf-step active';
    document.getElementById('dwc1').className = 'wf-connector';
    document.getElementById('dws2').className = 'wf-step';
    document.getElementById('delFooter').innerHTML = `<button class="btn btn-secondary" onclick="closeModal('createDeliveryModal')">Cancel</button><button class="btn btn-primary" onclick="delNext()">Next →</button>`;
  } else if (delStep === 3) {
    delStep = 2;
    document.getElementById('delStep3').style.display = 'none';
    document.getElementById('delStep2').style.display = 'block';
    document.getElementById('dws2').className = 'wf-step active';
    document.getElementById('dwc2').className = 'wf-connector';
    document.getElementById('dws3').className = 'wf-step';
    document.getElementById('delFooter').innerHTML = `<button class="btn btn-secondary" onclick="delBack()">← Back</button><button class="btn btn-secondary" onclick="closeModal('createDeliveryModal')">Cancel</button><button class="btn btn-primary" onclick="delNext()">Next →</button>`;
  }
}

function validateDelivery() {
  const ref = 'WH/OUT/' + String(DELIVERIES_DATA.length + 1).padStart(4, '0');
  
  const items = [];
  document.querySelectorAll('#delLines .product-line:not(.product-line-hdr)').forEach(div => {
    const pId = parseInt(div.querySelector('.line-prod')?.value);
    const qty = parseInt(div.querySelector('.line-qty')?.value);
    if (pId && qty > 0) items.push({ product_id: pId, quantity: qty });
  });

  const payload = {
    ref,
    customer: document.getElementById('delCustomer')?.value,
    warehouse_id: parseInt(document.getElementById('delWarehouse')?.value) || 1,
    so: document.getElementById('delSO')?.value || '',
    items
  };

  fetch('/api/deliveries/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(res => res.json()).then(data => {
    DELIVERIES_DATA.unshift({
      ref, customer: payload.customer,
      products: 'Multiple products', qty: '10',
      warehouse: 'Main WH',
      date: new Date().toISOString().slice(0,10),
      status: 'Done', so: payload.so,
    });
    closeModal('createDeliveryModal');
    delStep = 1;
    showToast(`Delivery ${ref} dispatched`, 'success');
    renderOpsTable('deliveries');
  }).catch(err => showToast(err.message, 'error'));
}

function addDeliveryLine() {
  const container = document.getElementById('delLines');
  if (!container) return;
  const id = Date.now();
  const pOpts = API_PRODUCTS.map(p => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('');
  const div = document.createElement('div');
  div.className = 'product-line';
  div.id = 'delLine_' + id;
  div.innerHTML = `
    <select class="form-control form-select line-prod" style="height:32px;font-size:.78rem;">
      <option value="">Select product</option>${pOpts}
    </select>
    <input type="number" class="form-control line-qty" style="height:32px;font-size:.78rem;" placeholder="Qty" min="1"/>
    <button class="line-remove" onclick="document.getElementById('delLine_${id}').remove()">✕</button>`;
  container.appendChild(div);
}

/* ═══════════════════════════════════════════════════
   TRANSFER FORM
═══════════════════════════════════════════════════ */
function addTransferLine() {
  const container = document.getElementById('trfLines');
  if (!container) return;
  const id = Date.now();
  const pOpts = API_PRODUCTS.map(p => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('');
  const div = document.createElement('div');
  div.className = 'product-line';
  div.id = 'trfLine_' + id;
  div.innerHTML = `
    <select class="form-control form-select line-prod" style="height:32px;font-size:.78rem;">
      <option value="">Select product</option>${pOpts}
    </select>
    <input type="number" class="form-control line-qty" style="height:32px;font-size:.78rem;" placeholder="Qty" min="1"/>
    <button class="line-remove" onclick="document.getElementById('trfLine_${id}').remove()">✕</button>`;
  container.appendChild(div);
}

function saveTransfer(status) {
  const from = document.getElementById('trfFrom')?.value;
  const to   = document.getElementById('trfTo')?.value;
  if (!from || !to) { showToast('Please select From and To locations', 'error'); return; }
  if (from === to) { showToast('Source and destination cannot be the same', 'error'); return; }
  const ref = 'WH/TRF/' + String(TRANSFERS_DATA.length + 1).padStart(4, '0');
  
  const items = [];
  document.querySelectorAll('#trfLines .product-line:not(.product-line-hdr)').forEach(div => {
    const pId = parseInt(div.querySelector('.line-prod')?.value);
    const qty = parseInt(div.querySelector('.line-qty')?.value);
    if (pId && qty > 0) items.push({ product_id: pId, quantity: qty });
  });

  const payload = {
    ref,
    from_location_id: parseInt(document.getElementById('trfFrom')?.value) || 1,
    to_location_id: parseInt(document.getElementById('trfTo')?.value) || 2,
    items
  };

  fetch('/api/transfers/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(res => res.json()).then(data => {
    TRANSFERS_DATA.unshift({
      ref, from, to, product: 'Multiple products', qty: '20',
      date: new Date().toISOString().slice(0,10), status,
    });
    closeModal('createTransferModal');
    showToast(`Transfer ${ref} saved as ${status}`, status === 'Ready' ? 'success' : '');
    renderOpsTable('transfers');
  }).catch(err => showToast(err.message, 'error'));
}

/* ═══════════════════════════════════════════════════
   GENERIC VALIDATE
═══════════════════════════════════════════════════ */
function validateOp(type, ref) {
  const dataMap = { receipt: RECEIPTS_DATA, delivery: DELIVERIES_DATA, transfer: TRANSFERS_DATA };
  const data    = dataMap[type];
  const item    = data.find(r => r.ref === ref);
  if (!item) return;
  item.status = 'Done';
  const renderMap = { receipt:'receipts', delivery:'deliveries', transfer:'transfers' };
  renderOpsTable(renderMap[type]);
  showToast(`${ref} validated successfully`, 'success');
}
