/* ═══════════════════════════════════════════════════
   ShelfControl — dashboard/dashboard.js
═══════════════════════════════════════════════════ */
'use strict';

/* ── DATA (loaded from API) ────────────────────────── */
let STOCK_ALERTS = [];

let KANBAN_DATA = [];
let ACTIVITY = [];

/* ── INIT ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  injectSidebar('dashboard');
  injectTopbar('Dashboard');
  startLiveClock();

  fetch('/api/dashboard/')
    .then(res => res.json())
    .then(data => {
      animateCounter(document.getElementById('kpiProducts'),  data.total_products || 0);
      animateCounter(document.getElementById('kpiLow'),       data.low_stock || 0);
      animateCounter(document.getElementById('kpiReceipts'),  data.pending_receipts || 0);
      animateCounter(document.getElementById('kpiDeliveries'),data.pending_deliveries || 0);
      animateCounter(document.getElementById('kpiTransfers'), data.internal_transfers || 0);
    });

  fetch('/api/stock-alerts/')
    .then(res => res.json())
    .then(data => {
      STOCK_ALERTS = data;
      renderAlerts();
    });

  fetch('/api/history/')
    .then(res => res.json())
    .then(data => {
      // Map history data to Kanban/Activity layout
      ACTIVITY = data.map(i => ({
        date: i.date, type: i.type.toLowerCase().split('_')[0], ref: i.ref, product: i.product, qty: i.qty, warehouse: i.location, status: 'Done'
      }));
      KANBAN_DATA = data.map(i => ({
        id: i.ref, type: i.type.toLowerCase().split('_')[0], title: i.product + ' move', supplier: i.location, product: i.product, qty: i.qty, status: 'done'
      }));
      
      renderKanban('all');
      renderAlerts();
      renderActivity();
    })
    .catch(err => {
      console.error(err);
      renderKanban('all');
      renderAlerts();
      renderActivity();
    });

  document.getElementById('kanbanFilter')?.addEventListener('change', e => renderKanban(e.target.value));
  document.getElementById('actTypeFil')?.addEventListener('change', renderActivity);
  document.getElementById('actStatusFil')?.addEventListener('change', renderActivity);
});

/* ── LIVE CLOCK ───────────────────────────────────── */
function startLiveClock() {
  const el = document.getElementById('liveTime');
  const tick = () => { if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' }); };
  tick(); setInterval(tick, 1000);
}

/* ── KANBAN ───────────────────────────────────────── */
function renderKanban(typeFilter) {
  const board = document.getElementById('kanbanBoard');
  if (!board) return;

  const cols = ['draft','waiting','ready','done'];
  const colLabels = { draft:'Draft', waiting:'Waiting', ready:'Ready', done:'Done' };

  const data = typeFilter === 'all' ? KANBAN_DATA : KANBAN_DATA.filter(c => c.type === typeFilter);

  const typeBadge = { receipt:'badge-receipt', delivery:'badge-delivery', transfer:'badge-transfer', adjustment:'badge-adjustment' };

  board.innerHTML = cols.map(col => {
    const cards = data.filter(c => c.status === col);
    const cardsHtml = cards.length
      ? cards.map(c => `
        <div class="kanban-card" onclick="showToast('Viewing ${c.id}')">
          <div class="kanban-card-id">${c.id}</div>
          <div class="kanban-card-title">${c.title}</div>
          <div class="kanban-card-meta">
            <span><span class="badge ${typeBadge[c.type] || 'badge-draft'}">${c.type}</span></span>
            <span style="margin-top:4px;">📦 ${c.product}</span>
            <span>Qty: ${c.qty}</span>
            <span style="color:var(--text-3);">${c.supplier}</span>
          </div>
        </div>`).join('')
      : `<div style="font-size:.72rem;color:var(--text-3);padding:12px 0;text-align:center;">No items</div>`;

    return `
      <div class="kanban-col">
        <div class="kanban-col-hdr ${col}">
          <span class="kanban-col-name">${colLabels[col]}</span>
          <span class="kanban-count">${cards.length}</span>
        </div>
        ${cardsHtml}
      </div>`;
  }).join('');
}

/* ── STOCK ALERTS ─────────────────────────────────── */
function renderAlerts() {
  const tbody = document.getElementById('alertsBody');
  if (!tbody) return;

  const statusMap = { healthy:'badge-healthy', low:'badge-low', out:'badge-out' };
  const statusLabel = { healthy:'Healthy', low:'Low Stock', out:'Out of Stock' };

  tbody.innerHTML = STOCK_ALERTS.map(a => `
    <tr>
      <td>
        <span class="stock-indicator ${a.status}"></span>
        <span style="font-weight:500;color:var(--text);">${a.product}</span>
        <span class="sku" style="display:block;font-family:'DM Mono',monospace;font-size:.65rem;color:var(--text-3);margin-left:13px;">${a.sku}</span>
      </td>
      <td style="font-family:'DM Mono',monospace;font-weight:600;color:${a.status==='out'?'var(--rose)':a.status==='low'?'var(--amber)':'var(--green)'};">${a.stock}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--text-3);">${a.min}</td>
      <td><span class="badge ${statusMap[a.status]}">${statusLabel[a.status]}</span></td>
    </tr>`).join('');
}

/* ── ACTIVITY TABLE ───────────────────────────────── */
let actPage = 1;
const ACT_PER_PAGE = 8;

function renderActivity() {
  const typeF   = document.getElementById('actTypeFil')?.value || 'all';
  const statusF = document.getElementById('actStatusFil')?.value || 'all';

  const filtered = ACTIVITY.filter(r =>
    (typeF   === 'all' || r.type   === typeF) &&
    (statusF === 'all' || r.status === statusF)
  );

  const tbody = document.getElementById('activityBody');
  if (!tbody) return;

  const start = (actPage - 1) * ACT_PER_PAGE;
  const slice = filtered.slice(start, start + ACT_PER_PAGE);

  const typeBadge = { receipt:'badge-receipt', delivery:'badge-delivery', transfer:'badge-transfer', adjustment:'badge-adjustment' };
  const qtyColor  = q => q.startsWith('+') ? 'var(--green)' : q.startsWith('-') ? 'var(--rose)' : 'var(--text)';

  tbody.innerHTML = slice.map(r => `
    <tr>
      <td style="font-family:'DM Mono',monospace;font-size:.7rem;">${r.date}</td>
      <td>
        <span class="badge ${typeBadge[r.type]||'badge-draft'}" style="text-transform:capitalize;">${r.type}</span>
        <span style="display:block;font-family:'DM Mono',monospace;font-size:.65rem;color:var(--teal);margin-top:2px;">${r.ref}</span>
      </td>
      <td style="font-weight:500;color:var(--text);">${r.product}</td>
      <td style="font-family:'DM Mono',monospace;font-weight:600;color:${qtyColor(r.qty)};">${r.qty}</td>
      <td style="color:var(--text-2);">${r.warehouse}</td>
      <td><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
      <td><button class="btn btn-sm btn-secondary" onclick="showToast('Viewing ${r.ref}')">View</button></td>
    </tr>`).join('');

  const countEl = document.getElementById('actCount');
  if (countEl) countEl.textContent = `Showing ${start+1}–${Math.min(start+ACT_PER_PAGE, filtered.length)} of ${filtered.length}`;

  // Pagination
  const pager = document.getElementById('actPager');
  if (pager) {
    const total = Math.ceil(filtered.length / ACT_PER_PAGE);
    let ph = `<button class="btn btn-sm btn-secondary" onclick="goActPage(${actPage-1})" ${actPage===1?'disabled':''}>‹</button>`;
    for (let i = 1; i <= total; i++) {
      ph += `<button class="btn btn-sm ${i===actPage?'btn-primary':'btn-secondary'}" onclick="goActPage(${i})">${i}</button>`;
    }
    ph += `<button class="btn btn-sm btn-secondary" onclick="goActPage(${actPage+1})" ${actPage===total?'disabled':''}>›</button>`;
    pager.innerHTML = ph;
  }
}

function goActPage(n) {
  const typeF   = document.getElementById('actTypeFil')?.value || 'all';
  const statusF = document.getElementById('actStatusFil')?.value || 'all';
  const filtered = ACTIVITY.filter(r =>
    (typeF === 'all' || r.type === typeF) &&
    (statusF === 'all' || r.status === statusF)
  );
  const total = Math.ceil(filtered.length / ACT_PER_PAGE);
  if (n < 1 || n > total) return;
  actPage = n;
  renderActivity();
}
