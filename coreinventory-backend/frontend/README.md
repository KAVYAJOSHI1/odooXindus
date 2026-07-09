# ShelfControl — UI Kit
## Hackathon Project · Modular IMS Frontend

---

## 🗂 Folder Structure

```
inventory-ui/
├── index.html              ← Entry point (auto-redirects login ↔ dashboard)
│
├── login/
│   ├── login.html          ← auth_app: Login page
│   ├── signup.html         ← auth_app: Sign up
│   ├── forgot.html         ← auth_app: OTP password reset
│   ├── auth.css            ← Auth-only styles
│   └── auth.js             ← Auth logic (login, signup, OTP)
│
├── dashboard/
│   ├── dashboard.html      ← dashboard_app: KPIs, Kanban, Activity table
│   ├── dashboard.css
│   └── dashboard.js
│
├── products/
│   ├── products.html       ← product_app: Product catalogue + CRUD
│   ├── products.css
│   └── products.js
│
├── operations/
│   ├── receipts.html       ← operations_app: Incoming goods (3-step wizard)
│   ├── deliveries.html     ← operations_app: Outgoing goods (3-step wizard)
│   ├── transfers.html      ← operations_app: Internal transfers
│   ├── adjustments.html    ← inventory_app: Stock adjustments with diff calc
│   ├── history.html        ← inventory_app: Full stock ledger / move history
│   ├── operations.css      ← Shared ops styles
│   └── operations.js       ← Shared ops logic (data, forms, renders)
│
├── settings/
│   ├── warehouse.html      ← warehouse_app: Warehouses / Locations / Racks
│   ├── settings.css
│   └── settings.js
│
├── profile/
│   └── profile.html        ← Edit profile + change password + logout
│
├── shared/
│   ├── layout.css          ← ⭐ DESIGN SYSTEM — import first on every page
│   └── utils.js            ← ⭐ SHARED JS — sidebar injection, toast, modal, icons
│
└── assets/
    ├── icons/
    └── images/
```

---

## ⚡ App Module Mapping

| App module       | Pages it owns                           |
|------------------|-----------------------------------------|
| `auth_app`       | login/, signup/, forgot/                |
| `operations_app` | receipts.html, deliveries.html, transfers.html |
| `product_app`    | products/                               |
| `inventory_app`  | adjustments.html, history.html          |
| `warehouse_app`  | settings/warehouse.html                 |
| `dashboard_app`  | dashboard/                              |
| `analytics_ai`   | Plug into dashboard.html (see below)    |

---

## 🔌 How to Plug In Your Module

### 1. Add your page to the sidebar
In `shared/utils.js`, find the `navItems` array and add your page:
```js
{ key: 'analytics', label: 'Analytics', href: 'analytics/index.html', icon: yourIcon() }
```

### 2. Use the shared layout
Every new page must start with:
```html
<link rel="stylesheet" href="../shared/layout.css"/>
<script src="../shared/utils.js"></script>
```
Then call in your `DOMContentLoaded`:
```js
injectSidebar('your-nav-key');
injectTopbar('Page Title');
```

### 3. Shared utilities available
```js
showToast(message, type)       // 'success' | 'error' | 'warn' | ''
openModal(modalId)             // open a .modal-overlay
closeModal(modalId)            // close a .modal-overlay
getUser()                      // returns { name, email, role, initials }
animateCounter(el, target)     // KPI number animation
fmtDate(d)                     // format date string
```

### 4. CSS variables (add to your styles)
All design tokens are in `shared/layout.css` under `:root {}`.
Key variables: `--teal`, `--navy`, `--surface`, `--border`, `--text`, etc.

### 5. Pre-built components (use freely)
- `.btn .btn-primary / .btn-secondary / .btn-danger / .btn-sm`
- `.panel .panel-hdr .panel-body`
- `.data-table` (full table styling)
- `.badge .badge-done / .badge-ready / .badge-waiting / .badge-draft`
- `.form-group .form-label .form-control .form-select`
- `.kpi-card .kpi-ico .kpi-val .kpi-lbl`
- `.modal-overlay .modal .modal-hdr .modal-body .modal-footer`
- `.empty-state`

---

## 🔄 Data Layer (Static Prototype)

All data is currently in-memory JavaScript arrays in each module's `.js` file.
To connect a backend, replace the array operations with `fetch()` calls.

Key data locations:
- Products: `products/products.js` → `let products = [...]`
- Operations: `operations/operations.js` → `RECEIPTS_DATA`, `DELIVERIES_DATA`, etc.
- Warehouse: `settings/settings.js` → `WAREHOUSES`, `LOCATIONS`, `RACKS`
- History: `operations/operations.js` → `HISTORY_DATA`

---

## 🎨 Design System

- **Display font:** Syne 800 (headings, KPI values)
- **Body font:** DM Sans (all UI text)
- **Data font:** DM Mono (SKUs, refs, numbers)
- **Primary accent:** `#0d9488` (teal)
- **Background:** `#f4f5f7`
- **Dark sidebar:** `#0f1623`

---

## ✅ Static Prototype Checklist

- [x] Login / Signup / OTP Forgot Password
- [x] Dashboard with KPIs, Kanban board, activity table, quick actions
- [x] Products CRUD (add, edit, delete, filter, paginate)
- [x] Receipts with 3-step wizard (Supplier → Products → Validate)
- [x] Deliveries with 3-step wizard (Pick → Pack → Dispatch)
- [x] Internal Transfers form + table
- [x] Stock Adjustments with live diff calculator
- [x] Move History / Stock Ledger (full-text search, type/location filter, paginate)
- [x] Warehouse Settings (warehouses CRUD, locations, racks)
- [x] Profile (edit profile, change password, logout)
- [x] Shared sidebar + topbar injected via utils.js
- [x] Toast notifications
- [x] Modal dialogs
- [x] Responsive (mobile hamburger sidebar)
- [x] Dark navy sidebar, teal accent system
