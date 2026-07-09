/* ═══════════════════════════════════════════════════
   ShelfControl — shared/utils.js
   Utilities shared across ALL modules.
   Each page includes this script.
═══════════════════════════════════════════════════ */

'use strict';

/* ── PATH HELPER ──────────────────────────────────── */
// Detect the relative depth of the current page so links
// from any subfolder resolve correctly.
const _depth = (() => {
  const p = window.location.pathname;
  const segments = p.split('/').filter(Boolean);
  // Find 'inventory-ui' in path and count depth after it
  const idx = segments.indexOf('inventory-ui');
  if (idx === -1) return '../';
  const after = segments.length - idx - 1;
  return after <= 1 ? './' : '../'.repeat(after - 1);
})();

function rootPath(rel) {
  return _depth + rel;
}

/* ── SIDEBAR INJECTION ────────────────────────────── */
function injectSidebar(activeKey) {
  const target = document.getElementById('sidebar');
  if (!target) return;

  const navItems = [
    { key: 'dashboard',    label: 'Dashboard',           href: 'dashboard/dashboard.html',           icon: dashIcon() },
    { key: 'products',     label: 'Products',            href: 'products/products.html',             icon: boxIcon(),   badgeId: 'badge-products', badgeClass: 'default' },
    { key: 'receipts',     label: 'Receipts',            href: 'operations/receipts.html',           icon: inboxIcon(), badgeId: 'badge-receipts', badgeClass: 'warn' },
    { key: 'deliveries',   label: 'Delivery Orders',     href: 'operations/deliveries.html',         icon: truckIcon(), badgeId: 'badge-deliveries', badgeClass: 'warn' },
    { key: 'transfers',    label: 'Internal Transfers',  href: 'operations/transfers.html',          icon: transferIcon() },
    { key: 'adjustments',  label: 'Stock Adjustments',   href: 'operations/adjustments.html',        icon: adjustIcon() },
    { key: 'history',      label: 'Move History',        href: 'operations/history.html',            icon: historyIcon() },
    { key: 'warehouse',    label: 'Warehouse Settings',  href: 'settings/warehouse.html',            icon: warehouseIcon() },
    { key: 'profile',      label: 'My Profile',          href: 'profile/profile.html',               icon: profileIcon() },
  ];

  const grouped = [
    { label: 'Overview',    keys: ['dashboard'] },
    { label: 'Operations',  keys: ['receipts','deliveries','transfers','adjustments','history'] },
    { label: 'Catalogue',   keys: ['products'] },
    { label: 'Settings',    keys: ['warehouse','profile'] },
  ];

  let html = `
    <div class="sidebar-brand">
      <div class="brand-icon">${gridIcon()}</div>
      <span class="brand-name">ShelfControl</span>
    </div>
    <nav class="sidebar-nav">`;

  grouped.forEach(group => {
    html += `<div class="nav-section"><span class="nav-section-label">${group.label}</span>`;
    group.keys.forEach(key => {
      const item = navItems.find(n => n.key === key);
      if (!item) return;
      const isActive = key === activeKey;
      const bAttr = item.badgeId ? `id="${item.badgeId}"` : '';
      const badge = item.badgeId ? `<span class="nav-badge ${item.badgeClass || 'default'}" ${bAttr} style="display:none;"></span>` : '';
      html += `
        <a href="${rootPath(item.href)}" class="nav-link ${isActive ? 'active' : ''}">
          ${item.icon}
          ${item.label}
          ${badge}
        </a>`;
    });
    html += `</div>`;
  });

  // Logout
  html += `
    <div class="nav-section">
      <span class="nav-section-label">Account</span>
      <a href="${rootPath('login/login.html')}" class="nav-link" onclick="handleLogout(event)">
        ${logoutIcon()} Logout
      </a>
    </div>`;

  html += `</nav>`;

  // User footer
  const user = getUser();
  html += `
    <div class="sidebar-footer">
      <a href="${rootPath('profile/profile.html')}" class="user-card">
        <div class="user-avatar">${user.initials}</div>
        <div class="user-info">
          <span class="user-name">${user.name}</span>
          <span class="user-role">${user.role}</span>
        </div>
      </a>
    </div>`;

  target.innerHTML = html;

  // Fetch dynamic badge counts
  fetch('/api/dashboard/').then(r=>r.json()).then(d => {
    const pBadge = document.getElementById('badge-products');
    const rBadge = document.getElementById('badge-receipts');
    const dBadge = document.getElementById('badge-deliveries');
    if (pBadge && d.total_products > 0) { pBadge.textContent = d.total_products; pBadge.style.display = ''; }
    if (rBadge && d.pending_receipts > 0) { rBadge.textContent = d.pending_receipts; rBadge.style.display = ''; }
    if (dBadge && d.pending_deliveries > 0) { dBadge.textContent = d.pending_deliveries; dBadge.style.display = ''; }
  }).catch(() => {});
}

/* ── TOPBAR INJECTION ─────────────────────────────── */
function injectTopbar(pageLabel) {
  const target = document.getElementById('topbar');
  if (!target) return;

  target.innerHTML = `
    <div class="topbar-left">
      <button class="hamburger" onclick="toggleSidebar()" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
      <div class="breadcrumb">
        <span class="bc-root">ShelfControl</span>
        <span class="bc-sep">›</span>
        <span class="bc-cur">${pageLabel}</span>
      </div>
    </div>
    <div class="topbar-center">
      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" class="search-input" placeholder="Search products, SKUs, refs…" id="globalSearch" autocomplete="off"/>
        <span class="search-kbd">⌘K</span>
      </div>
    </div>
    <div class="topbar-right">
      <button class="icon-btn" onclick="toggleAlerts()" title="Alerts">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span class="badge" id="topbarAlertBadge" style="display:none;"></span>
      </button>
      <div class="topbar-date" id="topbarDate"></div>
    </div>`;

  // Date
  const dateEl = document.getElementById('topbarDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
  }

  // Fetch initial alerts badge count
  fetch('/api/stock-alerts/').then(r=>r.json()).then(d => {
    const b = document.getElementById('topbarAlertBadge');
    if (b && d.length > 0) { b.textContent = d.length; b.style.display = ''; }
  }).catch(()=>{});

  // ⌘K
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const inp = document.getElementById('globalSearch');
      if (inp) { inp.focus(); inp.select(); }
    }
  });
}

/* ── SIDEBAR TOGGLE ───────────────────────────────── */
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.toggle('open');
}

document.addEventListener('click', e => {
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  if (window.innerWidth > 860) return;
  if (sb.classList.contains('open') && !sb.contains(e.target) && !e.target.closest('.hamburger')) {
    sb.classList.remove('open');
  }
});

/* ── ALERTS PANEL ─────────────────────────────────── */
function toggleAlerts() {
  let panel = document.getElementById('alertsPanel');
  if (!panel) {
    panel = buildAlertsPanel();
    document.body.appendChild(panel);
  }
  
  // Refresh data before opening
  fetch('/api/stock-alerts/')
    .then(r => r.json())
    .then(data => {
      const body = panel.querySelector('.alerts-body');
      
      // Update badge
      const badge = document.querySelector('.topbar-right .badge');
      if (badge) {
        badge.textContent = data.length;
        badge.style.display = data.length > 0 ? '' : 'none';
      }

      if (!data.length) {
        body.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text-3);font-size:.8rem;">No active stock alerts</div>`;
      } else {
        body.innerHTML = data.map(a => `
          <div class="alert-row ${a.level}">
            <div class="alert-dot"></div>
            <div>
              <div class="alert-name">${a.product_name} — ${a.message}</div>
              <div class="alert-loc">${a.warehouse} · ${a.sku}</div>
            </div>
          </div>`).join('');
      }
      panel.classList.toggle('open');
    }).catch(() => panel.classList.toggle('open'));
}

function buildAlertsPanel() {
  const div = document.createElement('div');
  div.id = 'alertsPanel';
  div.className = 'alerts-panel';
  div.innerHTML = `
    <div class="alerts-hdr">
      <span>Stock Alerts</span>
      <button onclick="document.getElementById('alertsPanel').classList.remove('open')">✕</button>
    </div>
    <div class="alerts-body"><div style="padding:16px;text-align:center;color:var(--text-3);font-size:.8rem;">Loading...</div></div>`;

  // Inject panel styles once
  if (!document.getElementById('alertsPanelStyle')) {
    const s = document.createElement('style');
    s.id = 'alertsPanelStyle';
    s.textContent = `
      .alerts-panel { position:fixed; top:60px; right:20px; width:300px; background:#fff; border:1px solid var(--border); border-radius:var(--r); box-shadow:var(--shadow-lg); z-index:300; opacity:0; transform:translateY(-8px); pointer-events:none; transition:all .2s ease; }
      .alerts-panel.open { opacity:1; transform:translateY(0); pointer-events:all; }
      .alerts-hdr { display:flex; justify-content:space-between; align-items:center; padding:12px 14px; font-weight:600; font-size:.82rem; border-bottom:1px solid var(--border); }
      .alerts-hdr button { background:none; border:none; color:var(--text-3); cursor:pointer; padding:2px 6px; border-radius:4px; }
      .alerts-hdr button:hover { background:var(--surface-2); }
      .alerts-body { padding:8px; max-height: 400px; overflow-y: auto; }
      .alert-row { display:flex; gap:9px; padding:9px; border-radius:var(--r-sm); margin-bottom:4px; align-items:flex-start; }
      .alert-row.critical { background:var(--rose-light); }
      .alert-row.warning { background:var(--amber-light); }
      .alert-dot { width:7px; height:7px; border-radius:50%; margin-top:4px; flex-shrink:0; }
      .alert-row.critical .alert-dot { background:var(--rose); }
      .alert-row.warning .alert-dot { background:var(--amber); }
      .alert-name { font-size:.78rem; font-weight:500; color:var(--text); }
      .alert-loc { font-size:.68rem; color:var(--text-2); font-family:'DM Mono',monospace; margin-top:2px; }
    `;
    document.head.appendChild(s);
  }
  return div;
}

/* ── TOAST ────────────────────────────────────────── */
function showToast(msg, type = '') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => { toast.classList.add('show'); });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, 3000);
}

/* ── MODAL HELPERS ────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}
// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});
// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

/* ── USER HELPERS ─────────────────────────────────── */
function getUser() {
  const stored = localStorage.getItem('ci_user');
  if (stored) return JSON.parse(stored);
  return { name: 'Raj Kumar', role: 'Inv. Manager', email: 'raj@example.com', initials: 'RK' };
}

function handleLogout(e) {
  e.preventDefault();
  localStorage.removeItem('ci_user');
  showToast('Logged out successfully');
  setTimeout(() => { window.location.href = rootPath('login/login.html'); }, 800);
}

/* ── COUNTER ANIMATION ────────────────────────────── */
function animateCounter(el, target, duration = 800) {
  if (!el) return;
  let start, val = 0;
  const step = ts => {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    val = Math.round((1 - Math.pow(1 - p, 3)) * target);
    el.textContent = val;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ── DATE FORMATTER ───────────────────────────────── */
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function fmtDateTime(d) {
  return new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

/* ── SVG ICONS ────────────────────────────────────── */
function svgWrap(path, vb='0 0 24 24') {
  return `<svg class="nav-icon" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.8">${path}</svg>`;
}
function dashIcon()     { return svgWrap('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'); }
function boxIcon()      { return svgWrap('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'); }
function inboxIcon()    { return svgWrap('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'); }
function truckIcon()    { return svgWrap('<rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>'); }
function transferIcon() { return svgWrap('<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'); }
function adjustIcon()   { return svgWrap('<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>'); }
function historyIcon()  { return svgWrap('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'); }
function warehouseIcon(){ return svgWrap('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'); }
function profileIcon()  { return svgWrap('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'); }
function logoutIcon()   { return svgWrap('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'); }
function gridIcon()     { return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="9" height="9" rx="1.5" fill="currentColor"/><rect x="13" y="2" width="9" height="9" rx="1.5" fill="currentColor" opacity=".5"/><rect x="2" y="13" width="9" height="9" rx="1.5" fill="currentColor" opacity=".5"/><rect x="13" y="13" width="9" height="9" rx="1.5" fill="currentColor"/></svg>`; }
function plusIcon()     { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`; }
