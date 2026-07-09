/* ═══════════════════════════════════════════════════
   ShelfControl — products/products.js
═══════════════════════════════════════════════════ */
'use strict';

/* ── INITIAL DATA ─────────────────────────────────── */
let products = [];
let nextId = 16;
let editingId = null;
let prodPage = 1;
const PROD_PER_PAGE = 10;

/* ── INIT ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  injectSidebar('products');
  injectTopbar('Products');
  
  fetchProducts();

  document.getElementById('prodSearch')?.addEventListener('input', () => { prodPage=1; renderTable(); });
  document.getElementById('catFilter')?.addEventListener('change', () => { prodPage=1; renderTable(); });
  document.getElementById('stockFilter')?.addEventListener('change', () => { prodPage=1; renderTable(); });
  document.getElementById('locFilter')?.addEventListener('change', () => { prodPage=1; renderTable(); });
});

function updateKPIs() {
  const t = document.getElementById('psTotal');
  if (t) t.textContent = products.length;
  const a = document.getElementById('psActive');
  if (a) a.textContent = products.filter(p => stockStatus(p) !== 'out').length;
  const l = document.getElementById('psLow');
  if (l) l.textContent = products.filter(p => stockStatus(p) === 'low' || stockStatus(p) === 'out').length;
  const c = document.getElementById('psCats');
  if (c) c.textContent = new Set(products.map(p => p.category)).size;
}

function fetchProducts() {
  fetch('/api/products/')
    .then(res => res.json())
    .then(data => {
      products = data.map(p => ({
        id: p.id, name: p.name, sku: p.sku, category: p.category, 
        unit: p.unit, stock: parseFloat(p.stock) || 0,
        min: 10, loc: 'All Locations', reorder: 0
      }));
      updateKPIs();
      renderTable();
    })
    .catch(err => console.error(err));
}

/* ── FILTER & RENDER ──────────────────────────────── */
function getFiltered() {
  const q      = document.getElementById('prodSearch')?.value.toLowerCase() || '';
  const cat    = document.getElementById('catFilter')?.value || 'all';
  const stock  = document.getElementById('stockFilter')?.value || 'all';
  const loc    = document.getElementById('locFilter')?.value || 'all';

  return products.filter(p => {
    const matchQ   = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    const matchCat = cat === 'all' || p.category === cat;
    const matchLoc = loc === 'all' || p.loc === loc;
    const st = stockStatus(p);
    const matchSt  = stock === 'all' || st === stock;
    return matchQ && matchCat && matchLoc && matchSt;
  });
}

function stockStatus(p) {
  if (p.stock <= 0) return 'out';
  if (p.stock < p.min) return 'low';
  return 'healthy';
}

function renderTable() {
  const filtered = getFiltered();
  const tbody    = document.getElementById('productsBody');
  const countEl  = document.getElementById('prodCount');
  if (!tbody) return;

  const start = (prodPage - 1) * PROD_PER_PAGE;
  const slice = filtered.slice(start, start + PROD_PER_PAGE);

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">No products found</div><div class="empty-sub">Try adjusting your filters</div></div></td></tr>`;
  } else {
    const stBadge = { healthy:'badge-healthy', low:'badge-low', out:'badge-out' };
    const stLabel = { healthy:'Healthy', low:'Low Stock', out:'Out of Stock' };
    tbody.innerHTML = slice.map(p => {
      const st = stockStatus(p);
      return `
      <tr>
        <td>
          <span style="font-weight:500;color:var(--text);">${p.name}</span>
          <span style="display:block;font-family:'DM Mono',monospace;font-size:.65rem;color:var(--teal);">${p.sku}</span>
        </td>
        <td>${p.category}</td>
        <td style="font-family:'DM Mono',monospace;">${p.unit}</td>
        <td style="font-family:'DM Mono',monospace;font-weight:600;color:${st==='out'?'var(--rose)':st==='low'?'var(--amber)':'var(--green)'};">${p.stock}</td>
        <td style="font-family:'DM Mono',monospace;color:var(--text-3);">${p.min}</td>
        <td>${p.loc}</td>
        <td><span class="badge ${stBadge[st]}">${stLabel[st]}</span></td>
        <td>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-sm btn-secondary" onclick="openEdit(${p.id})">Edit</button>
            <button class="btn btn-sm btn-secondary" onclick="showToast('Viewing ${p.name}')">View</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  if (countEl) countEl.textContent = `${filtered.length} product${filtered.length !== 1 ? 's' : ''} found`;

  // Count el below table
  const pageCount = document.getElementById('prodPageCount');
  if (pageCount) pageCount.textContent = `Showing ${start+1}–${Math.min(start+PROD_PER_PAGE, filtered.length)} of ${filtered.length}`;

  // Pager
  const pager = document.getElementById('prodPager');
  if (pager) {
    const total = Math.ceil(filtered.length / PROD_PER_PAGE);
    let ph = `<button class="btn btn-sm btn-secondary" onclick="goProdPage(${prodPage-1})" ${prodPage===1?'disabled':''}>‹</button>`;
    for (let i=1; i<=total; i++) ph += `<button class="btn btn-sm ${i===prodPage?'btn-primary':'btn-secondary'}" onclick="goProdPage(${i})">${i}</button>`;
    ph += `<button class="btn btn-sm btn-secondary" onclick="goProdPage(${prodPage+1})" ${prodPage===total?'disabled':''}>›</button>`;
    pager.innerHTML = ph;
  }
}

function goProdPage(n) {
  const total = Math.ceil(getFiltered().length / PROD_PER_PAGE);
  if (n < 1 || n > total) return;
  prodPage = n;
  renderTable();
}

/* ── ADD PRODUCT ──────────────────────────────────── */
function addProduct() {
  const name   = document.getElementById('newProdName')?.value.trim();
  const sku    = document.getElementById('newProdSku')?.value.trim();
  const cat    = document.getElementById('newProdCat')?.value;
  const unit   = document.getElementById('newProdUnit')?.value;
  const stock  = parseInt(document.getElementById('newProdStock')?.value) || 0;
  const min    = parseInt(document.getElementById('newProdMin')?.value) || 0;
  const loc    = document.getElementById('newProdLoc')?.value;
  const reorder= parseInt(document.getElementById('newProdReorder')?.value) || 0;

  if (!name || !sku) { showToast('Name and SKU are required', 'error'); return; }
  if (products.find(p => p.sku === sku)) { showToast('SKU already exists', 'error'); return; }

  fetch('/api/products/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, sku, category: cat || 'Uncategorized', unit, stock, min, loc, reorder })
  })
  .then(res => {
    if(!res.ok) throw new Error("Could not create product");
    return res.json();
  })
  .then(data => {
    // Add to local array
    products.push({ id: data.id, name, sku, category: cat || 'Uncategorized', unit, stock, min, loc, reorder });
    updateKPIs();
    closeModal('addProductModal');
    ['newProdName','newProdSku','newProdStock','newProdMin','newProdReorder','newProdDesc'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    prodPage = 1;
    renderTable();
    showToast(`Product "${name}" added`, 'success');
  })
  .catch(err => showToast(err.message, 'error'));
}

/* ── EDIT PRODUCT ─────────────────────────────────── */
function openEdit(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  const body = document.getElementById('editModalBody');
  if (!body) return;
  body.innerHTML = `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Name</label><input class="form-control" id="editName" value="${p.name}"/></div>
      <div class="form-group"><label class="form-label">SKU</label><input class="form-control" id="editSku" value="${p.sku}"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Category</label>
        <select class="form-control form-select" id="editCat">
          ${['Raw Materials','Fasteners','Packaging','Electronics','Tools','Safety Gear'].map(c=>`<option ${c===p.category?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Unit</label>
        <select class="form-control form-select" id="editUnit">
          ${['pcs','kg','box','roll','litre','meter','pair','set'].map(u=>`<option ${u===p.unit?'selected':''}>${u}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Stock</label><input type="number" class="form-control" id="editStock" value="${p.stock}"/></div>
      <div class="form-group"><label class="form-label">Min Stock</label><input type="number" class="form-control" id="editMin" value="${p.min}"/></div>
    </div>
    <div class="form-group"><label class="form-label">Location</label>
      <select class="form-control form-select" id="editLoc">
        ${['Main WH','Warehouse B','Warehouse C','Prod. Floor'].map(l=>`<option ${l===p.loc?'selected':''}>${l}</option>`).join('')}
      </select>
    </div>`;
  openModal('editProductModal');
}

function saveEdit() {
  const p = products.find(x => x.id === editingId);
  if (!p) return;
  const newName     = document.getElementById('editName')?.value.trim() || p.name;
  const newSku      = document.getElementById('editSku')?.value.trim() || p.sku;
  const newCat      = document.getElementById('editCat')?.value || p.category;
  const newUnit     = document.getElementById('editUnit')?.value || p.unit;
  const newStock    = parseInt(document.getElementById('editStock')?.value) || 0;
  const newMin      = parseInt(document.getElementById('editMin')?.value) || 0;
  const newLoc      = document.getElementById('editLoc')?.value || p.loc;

  fetch(`/api/products/${editingId}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName, sku: newSku, category: newCat, unit: newUnit })
  })
  .then(res => {
    if(!res.ok) throw new Error("Could not update product");
    return res.json();
  })
  .then(() => {
    p.name = newName;
    p.sku = newSku;
    p.category = newCat;
    p.unit = newUnit;
    p.stock = newStock;
    p.min = newMin;
    p.loc = newLoc;
    updateKPIs();

    closeModal('editProductModal');
    renderTable();
    showToast('Product updated', 'success');
  })
  .catch(err => showToast(err.message, 'error'));
}

function deleteProduct() {
  if (!confirm('Delete this product?')) return;
  
  fetch(`/api/products/${editingId}/`, { method: 'DELETE' })
    .then(res => {
      if(!res.ok) throw new Error("Could not delete product");
      return res.json();
    })
    .then(() => {
      products = products.filter(x => x.id !== editingId);
      closeModal('editProductModal');
      updateKPIs();
      renderTable();
      showToast('Product deleted', 'warn');
    })
    .catch(err => showToast(err.message, 'error'));
}

function exportProducts() {
  if (!products.length) return showToast('No data to export', 'warn');
  const headers = ['ID', 'SKU', 'Name', 'Category', 'Unit', 'Stock', 'Min Stock'];
  const rows = products.map(p => [p.id, p.sku, `"${p.name}"`, `"${p.category}"`, p.unit, p.stock, p.min]);
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'products_export.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Products exported successfully', 'success');
}
