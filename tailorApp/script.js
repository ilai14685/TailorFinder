/* ---------- Storage keys & helpers ---------- */
const ORDER_KEY = 'tailorOrders_v1';
const USER_KEY = 'tailorUsers_v1';
const DESIGNS_KEY = 'tailorDesigns_v1';
const CURRENT_USER = 'tailor_current_user';
const $ = id => document.getElementById(id);

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}
function loadJSON(key){ try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; } catch(e){ return []; } }
function saveJSON(key, val){ localStorage.setItem(key, JSON.stringify(val || [])); }
function loadOrders(){ return loadJSON(ORDER_KEY); }
function saveOrders(list){ saveJSON(ORDER_KEY, list); }
function loadUsers(){ return loadJSON(USER_KEY); }
function saveUsers(list){ saveJSON(USER_KEY, list); }
function loadDesigns(){ return loadJSON(DESIGNS_KEY); }
function saveDesigns(list){ saveJSON(DESIGNS_KEY, list); }
function hashPassword(p){ return btoa(String(p)); }

/* ---------- File -> DataURL ---------- */
function fileToDataUrl(file, maxSizeMB = 8) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (file.size > maxSizeMB * 1024 * 1024) return reject(new Error('File too large'));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}


/* ---------- Toast helper ---------- */
function ensureToastContainer() {
  let container = document.getElementById('toastContainer');
  if (container) return container;
  const wrapper = document.createElement('div');
  wrapper.setAttribute('aria-live','polite');
  wrapper.setAttribute('aria-atomic','true');
  wrapper.className = 'position-relative';
  const inner = document.createElement('div');
  inner.id = 'toastContainer';
  inner.className = 'toast-container position-fixed top-0 end-0 p-3';
  inner.style.zIndex = 1080;
  wrapper.appendChild(inner);
  document.body.appendChild(wrapper);
  return inner;
}
function showToast(message, type='success', delayMs=3000) {
  const container = ensureToastContainer();
  if (!container) { alert(message); return; }
  const bgMap = {
    success: 'bg-success text-white',
    info: 'bg-info text-dark',
    warning: 'bg-warning text-dark',
    danger: 'bg-danger text-white'
  };
  const bgClass = bgMap[type] || bgMap.success;
  const id = 'toast-' + Date.now().toString(36);
  const html = `<div id="${id}" class="toast align-items-center ${bgClass} border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true"><div class="d-flex"><div class="toast-body">${escapeHtml(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div></div>`;
  container.insertAdjacentHTML('beforeend', html);
  const el = document.getElementById(id);
  if (!el) return;
  try {
    if (typeof bootstrap !== 'undefined' && bootstrap && bootstrap.Toast) {
      const t = new bootstrap.Toast(el, { delay: delayMs });
      t.show();
      el.addEventListener('hidden.bs.toast', () => el.remove());
      return;
    }
  } catch (e) {}
  setTimeout(() => el.remove(), delayMs);
}


/* ---------- Index owners list (no designs shown) ---------- */
function renderOwnersList(containerId='ownersList') {
  const container = document.getElementById(containerId); if (!container) return;
  const owners = loadUsers();
  if (!owners.length) { container.innerHTML = `<div class="alert alert-info">No owners registered yet.</div>`; return; }
  container.innerHTML = owners.map(o => {
    const name = escapeHtml(o.name || 'Owner');
    const phone = o.phone ? escapeHtml(o.phone) : ''; 
    const emailEnc = encodeURIComponent(o.email || '');
    return `
      <div class="col-sm-6 col-md-4">
        <div class="card mb-3 h-100 animated-pop" data-owner-email="${escapeHtml(o.email)}" data-owner-name="${escapeHtml(o.name)}" style="cursor:pointer">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title mb-1">${name}</h5>
            <p class="text-muted mb-2 small">${escapeHtml(o.email)} ${phone ? ' • ' + phone : ''}</p>
            <div class="mt-auto d-flex gap-2">
              <a class="btn btn-outline-secondary btn-sm-10 " href="rating.html?owner=${emailEnc}">Rating ⭐</a>
              <a class="btn btn-outline-primary btn-sm-10 flex-fill " href="order.html?owner=${emailEnc}">Place Order</a>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}
function renderOwnersCards(owners = []) {
  // same output as renderOwnersList but from provided array (used by search)
  const container = document.getElementById('ownersList'); if (!container) return;
  if (!owners || !owners.length) { container.innerHTML = `<div class="alert alert-info">No tailors found.</div>`; return; }
  container.innerHTML = owners.map(o => {
    const name = escapeHtml(o.name || 'Owner');
    const phone = o.phone ? escapeHtml(o.phone) : ''; 
    const emailEnc = encodeURIComponent(o.email || '');
    return `
      <div class="col-sm-6 col-md-4">
        <div class="card mb-3 h-100 animated-pop" data-owner-email="${escapeHtml(o.email)}" data-owner-name="${escapeHtml(o.name)}" style="cursor:pointer">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title mb-1">${name}</h5>
            <p class="text-muted mb-2 small">${escapeHtml(o.email)} ${phone ? ' • ' + phone : ''}</p>
            <div class="mt-auto d-flex gap-2">
              <a class="btn btn-outline-secondary btn-sm-10 " href="rating.html?owner=${emailEnc}">Rating ⭐</a>
              <a class="btn btn-outline-primary btn-sm-10 flex-fill " href="order.html?owner=${emailEnc}">Place Order</a>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}
function initOwnerCardClicks() {
  const ownersList = document.getElementById('ownersList');
  if (!ownersList) return;
  ownersList.addEventListener('click', (e) => {
    const target = e.target.closest('[data-owner-email]');
    if (!target) return;
    const ownerEmail = target.getAttribute('data-owner-email');
    window.location.href = `order.html?owner=${encodeURIComponent(ownerEmail)}`;
  });
}


/* ---------- Order page ---------- */
function getQueryParam(name) { try { const params = new URLSearchParams(window.location.search); return params.get(name); } catch(e) { return null; } }
function initOrderPage() {
  const orderForm = document.getElementById('orderForm'); if (!orderForm) return;
  const ownerSelect = document.getElementById('ownerSelect');
  const owners = loadUsers();
  if (ownerSelect) ownerSelect.innerHTML = '<option value="">Choose owner</option>' + owners.map(o => `<option value="${escapeHtml(o.email)}">${escapeHtml(o.name)} — ${escapeHtml(o.email)}</option>`).join('');
  const ownerParam = getQueryParam('owner');
  if (ownerParam && ownerSelect) {
    const dec = decodeURIComponent(ownerParam);
    if (owners.some(o => o.email === dec)) ownerSelect.value = dec;
  }
  const dd = document.getElementById('deliveryDate'); if (dd) dd.min = new Date().toISOString().split('T')[0];

  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (document.getElementById('custName')||{}).value?.trim()||'';
    const phone = (document.getElementById('custPhone')||{}).value?.trim()||'';
    const address = (document.getElementById('custAddress')||{}).value?.trim()||'';
    const dress = (document.getElementById('dressType')||{}).value||'';
    const size = (document.getElementById('size')||{}).value||'';
    const qty = Number((document.getElementById('qty')||{}).value) || 0;
    const delivery = (document.getElementById('deliveryDate')||{}).value||'';
    const owner = (document.getElementById('ownerSelect')||{}).value||'';

    let ok = true;
    if (name.length < 2) { ok=false; document.getElementById('custName').classList.add('is-invalid'); } else document.getElementById('custName').classList.remove('is-invalid');
    if (!/^\d{10}$/.test(phone)) { ok=false; document.getElementById('custPhone').classList.add('is-invalid'); } else document.getElementById('custPhone').classList.remove('is-invalid');
    if (!address) { ok=false; document.getElementById('custAddress').classList.add('is-invalid'); } else document.getElementById('custAddress').classList.remove('is-invalid');
    if (!dress) { ok=false; document.getElementById('dressType').classList.add('is-invalid'); } else document.getElementById('dressType').classList.remove('is-invalid');
    if (!size) { ok=false; document.getElementById('size').classList.add('is-invalid'); } else document.getElementById('size').classList.remove('is-invalid');
    if (qty < 1) { ok=false; document.getElementById('qty').classList.add('is-invalid'); } else document.getElementById('qty').classList.remove('is-invalid');
    if (!delivery) { ok=false; document.getElementById('deliveryDate').classList.add('is-invalid'); } else document.getElementById('deliveryDate').classList.remove('is-invalid');
    if (!owner) { ok=false; if (document.getElementById('ownerSelect')) document.getElementById('ownerSelect').classList.add('is-invalid'); }
    if (!ok) { showToast('Please fix the fields', 'warning'); return; }
    if (!loadUsers().some(u=>u.email===owner)) { showToast('Selected owner not found', 'danger'); return; }

    const orders = loadOrders();
    const newOrder = { id: Date.now().toString(36), name, phone, address, dress, size, qty, delivery, status:'pending', placedAt: new Date().toISOString(), owner };
    orders.unshift(newOrder); saveOrders(orders);
    orderForm.reset(); showToast('Order placed successfully 😊', 'success');
  });
}


/* ---------- Designs: upload & render (owner-private) ---------- */
async function handleDesignUpload() {
  const fileInput = document.getElementById('designFiles');
  const files = fileInput && fileInput.files ? Array.from(fileInput.files) : [];
  if (!files.length) { showToast('Select at least one file', 'warning'); return; }
  const owner = sessionStorage.getItem(CURRENT_USER);
  if (!owner) { showToast('Login required to upload', 'danger'); return; }

  const allowed = ['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/ogg'];
  const maxMB = 8;
  const existing = loadDesigns();
  let added = 0;
  for (const f of files) {
    if (!allowed.includes(f.type)) { showToast(`Skipped unsupported: ${f.name}`, 'warning'); continue; }
    if (f.size > maxMB * 1024 * 1024) { showToast(`Skipped (too large): ${f.name}`, 'warning'); continue; }
    try {
      const dataUrl = await fileToDataUrl(f, maxMB);
      const type = f.type.startsWith('video') ? 'video' : 'image';
      const item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2,6), owner, type, data: dataUrl, title: f.name, uploadedAt: new Date().toISOString() };
      existing.unshift(item); added++;
    } catch (err) {
      console.error('file error', err);
      showToast(`Error reading ${f.name}`, 'danger');
    }
  }
  saveDesigns(existing);
  if (added) showToast(`${added} file(s) uploaded`, 'success');
  fileInput.value = '';
  renderDesigns(sessionStorage.getItem(CURRENT_USER));
}


/* Build the small animated boxy design cards */
function renderDesigns(ownerEmail) {
  const gallery = document.getElementById('designsGallery');
  if (!gallery) return;
  const all = loadDesigns();
  const items = all.filter(d => d.owner === ownerEmail);
  if (!items.length) { gallery.innerHTML = `<div class="col-12"><div class="alert alert-info mb-0">You have no designs yet.</div></div>`; return; }

  gallery.innerHTML = items.map(d => {
    const title = escapeHtml(d.title || '');
    if (d.type === 'video') {
      return `
        <div class="col-sm-6 col-md-4">
          <div class="design-card" tabindex="0" role="button"
               data-preview-type="video" data-preview-title="${escapeHtml(title)}" data-preview-src="${d.data}">
            <video class="design-thumb" muted preload="metadata" src="${d.data}"></video>
            <div class="design-meta">
              <p class="design-title mb-0">${title}</p>
              <div>
                <button class="btn btn-sm btn-danger design-delete" data-id="${escapeHtml(d.id)}">Delete</button>
              </div>
            </div>
          </div>
        </div>`;
    } else {
      return `
        <div class="col-sm-6 col-md-4">
          <div class="design-card" tabindex="0" role="button"
               data-preview-type="image" data-preview-title="${escapeHtml(title)}" data-preview-src="${d.data}">
            <img class="design-thumb" src="${d.data}" alt="${title}">
            <div class="design-meta">
              <p class="design-title mb-0">${title}</p>
              <div>
                <button class="btn btn-sm btn-danger design-delete" data-id="${escapeHtml(d.id)}">Delete</button>
              </div>
            </div>
          </div>
        </div>`;
    }
  }).join('');

  // Attach handlers: preview on click/tap/enter, delete
  gallery.querySelectorAll('.design-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.design-delete')) return;
      openDesignPreview(card.dataset.previewType, card.dataset.previewSrc, card.dataset.previewTitle);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDesignPreview(card.dataset.previewType, card.dataset.previewSrc, card.dataset.previewTitle);
      }
    });
  });

  gallery.querySelectorAll('.design-delete').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    if (!confirm('Delete this design?')) return;
    let designs = loadDesigns(); designs = designs.filter(x => x.id !== id); saveDesigns(designs);
    showToast('Design deleted 😒', 'warning');
    renderDesigns(sessionStorage.getItem(CURRENT_USER));
  }));
}


/* ---------- Design preview (modal) ---------- */
function openDesignPreview(type, src, title) {
  const modalEl = document.getElementById('designPreviewModal');
  const modalTitle = document.getElementById('designPreviewTitle');
  const modalBody = document.getElementById('designPreviewBody');
  if (!modalEl || !modalBody) {
    window.open(src, '_blank');
    return;
  }
  modalTitle.textContent = title || '';
  modalBody.innerHTML = '';

  if (type === 'video') {
    const v = document.createElement('video');
    v.controls = true; v.autoplay = true; v.src = src; v.style.maxWidth = '100%'; v.style.maxHeight = '70vh';
    modalBody.appendChild(v);
  } else {
    const img = document.createElement('img');
    img.src = src; img.alt = title || ''; img.style.maxWidth = '100%'; img.style.maxHeight = '70vh';
    modalBody.appendChild(img);
  }

  try {
    const modal = new bootstrap.Modal(modalEl, { keyboard: true });
    modal.show();
  } catch (e) {
    // fallback: open directly
    window.open(src, '_blank');
  }
}


/* ---------- Owner dashboard: signup/login/logout/search/orders ---------- */
function initOwnerPage() {
  const loginForm = document.getElementById('loginForm'), signupForm = document.getElementById('signupForm');
  const authMsg = document.getElementById('authMsg'), authTitle = document.getElementById('authTitle');
  const ownerDashboard = document.getElementById('ownerDashboard'), notLogged = document.getElementById('notLogged');
  const ownerSearch = document.getElementById('ownerSearch'), ownerLogout = document.getElementById('ownerLogout'), clearAllBtn = document.getElementById('clearAllBtn');
  const ordersContainer = document.getElementById('ordersContainer');
  const uploadBtn = document.getElementById('uploadDesignsBtn');
  const nameBadge = document.getElementById('ownerNameBadge'), emailSmall = document.getElementById('ownerEmailSmall');

  if (!loginForm && !signupForm && !ownerDashboard) return;

  function showLoginForm(){ if (signupForm) signupForm.classList.add('d-none'); if (loginForm) loginForm.classList.remove('d-none'); if (authTitle) authTitle.textContent='Owner Login'; if (authMsg) authMsg.textContent=''; }
  function showSignupForm(){ if (signupForm) signupForm.classList.remove('d-none'); if (loginForm) loginForm.classList.add('d-none'); if (authTitle) authTitle.textContent='Create Owner Account'; if (authMsg) authMsg.textContent=''; }
  function currentUser(){ return sessionStorage.getItem(CURRENT_USER); }
  function setCurrentUser(email){ sessionStorage.setItem(CURRENT_USER, email); }
  function clearCurrentUser(){ sessionStorage.removeItem(CURRENT_USER); }

  const showSignupLink = document.getElementById('showSignup'), backToLogin = document.getElementById('backToLogin'), goLogin = document.getElementById('goLogin');
  if (showSignupLink) showSignupLink.addEventListener('click',(e)=>{ e.preventDefault(); showSignupForm(); });
  if (backToLogin) backToLogin.addEventListener('click',(e)=>{ e.preventDefault(); showLoginForm(); });
  if (goLogin) goLogin.addEventListener('click',(e)=>{ e.preventDefault(); showLoginForm(); });

  if (signupForm) signupForm.addEventListener('submit',(e)=> {
    e.preventDefault();
    const name = (document.getElementById('signupName')||{}).value?.trim()||'';
    const email = (document.getElementById('signupEmail')||{}).value?.trim().toLowerCase()||'';
    const phone = (document.getElementById('signupPhone')||{}).value?.trim()||'';
    const place = (document.getElementById('signupPlace')||{}).value?.trim()||'';
    const pass = (document.getElementById('signupPass')||{}).value||'';

    if (!name || !email || !pass || !phone || !place) {
      if (authMsg) authMsg.innerHTML = 'Fill required fields. 🤦';
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      if (authMsg) authMsg.innerHTML = 'Enter a valid 10-digit phone number.';
      return;
    }

    const users = loadUsers();
    if (users.find(u => u.email === email)) {
      if (authMsg) authMsg.innerHTML = 'User already exists. 🤦';
      return;
    }

    users.push({
      name,
      email,
      phone,
      place,
      pass: hashPassword(pass)
    });
    saveUsers(users);
    renderOwnersList('ownersList');
    showLoginForm();

   showToast('Account created. Please login.', 'success');
  });

 if (loginForm) loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = (document.getElementById('loginEmail')||{}).value?.trim().toLowerCase()||'';
  const pass = (document.getElementById('loginPass')||{}).value||'';
  const users = loadUsers();
  const u = users.find(x => x.email === email);

  if (!u || u.pass !== hashPassword(pass)) {
    if (authMsg) authMsg.innerHTML = '<span class="text-danger">Invalid credentials</span>';
    return;
  }


  

  // Login success
  setCurrentUser(email);
  

  // Clear the login inputs
  loginForm.reset();

  // Redirect to owner page
  window.location.href = 'owner.html';
  showToast('Logged in successfully 😊', 'success');
});

  if (ownerLogout) ownerLogout.addEventListener('click', ()=> { clearCurrentUser(); showDashboard(); showToast('Logged out 😣','info'); });

  if (uploadBtn) uploadBtn.addEventListener('click', (e)=> { e.preventDefault(); handleDesignUpload(); });

  function showDashboard() {
    const cur = currentUser();

    if (cur) {
      if (ownerDashboard) ownerDashboard.classList.remove('d-none');
      if (notLogged) notLogged.classList.add('d-none');

      const users = loadUsers();
      const ownerObj = users.find(u => u.email === cur);
      if (nameBadge) {
        nameBadge.textContent = ownerObj ? ownerObj.name : cur;
        nameBadge.style.display = 'inline-block';
      }
      if (emailSmall) {
        emailSmall.textContent = ownerObj ? ownerObj.email : cur;
        emailSmall.style.display = 'inline-block';
      }

      renderOrdersForOwner(cur);
      renderDesigns(cur);
      initAccountControls();
    } else {
      if (ownerDashboard) ownerDashboard.classList.add('d-none');
      if (notLogged) notLogged.classList.remove('d-none');

      if (nameBadge) { nameBadge.textContent = ''; nameBadge.style.display = 'none'; }
      if (emailSmall) { emailSmall.textContent = ''; emailSmall.style.display = 'none'; }
    }
  }

  function renderOrdersForOwner(ownerEmail) {
    if (!ordersContainer) return;
    const orders = loadOrders().filter(o => o.owner === ownerEmail);
    if (!orders.length) { ordersContainer.innerHTML = '<div class="alert alert-info">No orders for you yet 🙄.</div>'; return; }
    let html = `<table class="table table-striped align-middle"><thead><tr><th>Customer</th><th>Contact</th><th>Address</th><th>Item</th><th>Qty</th><th>Delivery</th><th>Status</th><th>Action</th></tr></thead><tbody>`;
    for (const ord of orders) {
      html += `<tr data-id="${escapeHtml(ord.id)}"><td>${escapeHtml(ord.name)}<br><small class="text-muted">${new Date(ord.placedAt).toLocaleString()}</small></td><td>${escapeHtml(ord.phone)}</td><td style="max-width:220px;white-space:normal">${escapeHtml(ord.address)}</td><td>${escapeHtml(ord.dress)}<br><small>${escapeHtml(ord.size)}</small></td><td>${escapeHtml(String(ord.qty))}</td><td>${escapeHtml(ord.delivery)}</td><td>${escapeHtml(ord.status)}</td><td><button class="btn btn-sm btn-success mark-deliver">Mark Delivered</button><button class="btn btn-sm btn-danger ms-1 remove-order">Delete</button></td></tr>`;
    }
    html += '</tbody></table>';
    ordersContainer.innerHTML = html;
    ordersContainer.querySelectorAll('.mark-deliver').forEach(btn => btn.addEventListener('click', (e) => { const tr = e.target.closest('tr'); if (!tr) return; toggleDeliveredForOwner(tr.dataset.id, true, currentUser()); }));
    ordersContainer.querySelectorAll('.remove-order').forEach(btn => btn.addEventListener('click', (e) => { const tr = e.target.closest('tr'); if (!tr) return; if (confirm('Delete this order?')) removeOrderForOwner(tr.dataset.id, currentUser()); }));
  }

  function toggleDeliveredForOwner(id, delivered = true, ownerEmail) {
    const orders = loadOrders(); const idx = orders.findIndex(o => o.id === id && o.owner === ownerEmail); if (idx === -1) return;
    orders[idx].status = delivered ? 'delivered' : 'pending'; saveOrders(orders); renderOrdersForOwner(ownerEmail); showToast(delivered ? 'Order marked delivered 👍' : 'Order marked pending','info');
  }
  function removeOrderForOwner(id, ownerEmail) { let orders = loadOrders(); orders = orders.filter(o => !(o.id === id && o.owner === ownerEmail)); saveOrders(orders); renderOrdersForOwner(ownerEmail); showToast('Order deleted','warning'); }

  if (clearAllBtn) clearAllBtn.addEventListener('click', () => {
    if (!confirm('Clear all your orders?')) return;
    const cur = currentUser();
    let orders = loadOrders(); orders = orders.filter(o => o.owner !== cur); saveOrders(orders); renderOrdersForOwner(cur); showToast('Your orders cleared','danger');
  });

  if (ownerSearch) ownerSearch.addEventListener('input', (e) => {
    const q = (e.target.value || '').trim().toLowerCase(); const cur = currentUser(); if (!cur) return;
    const all = loadOrders().filter(o => o.owner === cur);
    if (!q) { renderOrdersForOwner(cur); return; }
    const filtered = all.filter(o => (o.name||'').toLowerCase().includes(q) || (o.phone||'').toLowerCase().includes(q) || (o.address||'').toLowerCase().includes(q) || (o.dress||'').toLowerCase().includes(q));
    const container = ordersContainer; if (!container) return;
    if (!filtered.length) { container.innerHTML = '<div class="alert alert-info">No matching orders 🤷.</div>'; return; }
    let html = `<table class="table table-striped align-middle"><thead><tr><th>Customer</th><th>Contact</th><th>Address</th><th>Item</th><th>Qty</th><th>Delivery</th><th>Status</th><th>Action</th></tr></thead><tbody>`;
    for (const ord of filtered) {
      html += `<tr data-id="${escapeHtml(ord.id)}"><td>${escapeHtml(ord.name)}<br><small class="text-muted">${new Date(ord.placedAt).toLocaleDateString()}</small></td><td>${escapeHtml(ord.phone)}</td><td style="max-width:220px;white-space:normal">${escapeHtml(ord.address)}</td><td>${escapeHtml(ord.dress)}<br><small>${escapeHtml(ord.size)}</small></td><td>${escapeHtml(String(ord.qty))}</td><td>${escapeHtml(ord.delivery)}</td><td>${escapeHtml(ord.status)}</td><td><button class="btn btn-sm btn-success mark-deliver">Mark Delivered</button><button class="btn btn-sm btn-danger ms-1 remove-order">Delete</button></td></tr>`;
    }
    html += '</tbody></table>'; container.innerHTML = html;
    container.querySelectorAll('.mark-deliver').forEach(btn => btn.addEventListener('click', (e) => { const tr = e.target.closest('tr'); if (!tr) return; toggleDeliveredForOwner(tr.dataset.id, true, currentUser()); }));
    container.querySelectorAll('.remove-order').forEach(btn => btn.addEventListener('click', (e) => { const tr = e.target.closest('tr'); if (!tr) return; if (confirm('Delete?')) removeOrderForOwner(tr.dataset.id, currentUser()); }));
  });

  showLoginForm(); showDashboard();
}


/* ---------- Account delete (owner + their orders + their designs) ---------- */
function initAccountControls() {
  const delBtn = document.getElementById('deleteAccountBtn');
  if (!delBtn) return;
  delBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const cur = sessionStorage.getItem(CURRENT_USER);
    if (!cur) { showToast('No owner logged in', 'warning'); return; }
    if (!confirm('Delete your account? This will remove your profile, your designs and your orders. This action cannot be undone.')) return;
    let users = loadUsers(); users = users.filter(u => u.email !== cur); saveUsers(users);
    let orders = loadOrders(); orders = orders.filter(o => o.owner !== cur); saveOrders(orders);
    let designs = loadDesigns(); designs = designs.filter(d => d.owner !== cur); saveDesigns(designs);
    sessionStorage.removeItem(CURRENT_USER);
    showToast('Account deleted', 'danger');
    setTimeout(()=> location.reload(), 900);
  });
}


/* ---------- Backup, Clear, Service Worker & Cache helpers ---------- */

/* Download current TailorApp data as JSON file */
function downloadBackup(filenamePrefix='tailorapp-backup') {
  const data = {
    users: loadUsers(),
    orders: loadOrders(),
    designs: loadDesigns(),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


/* Remove the TailorApp keys from local/session storage */
function clearAppDataKeys() {
  localStorage.removeItem(ORDER_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(DESIGNS_KEY);
  sessionStorage.removeItem(CURRENT_USER);
}


/* Unregister service workers and clear CacheStorage */
async function unregisterSwAndClearCaches() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) { await r.unregister(); }
      console.log('Service workers unregistered.');
    }
  } catch (e) { console.warn('SW unregister error', e); }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const k of keys) { await caches.delete(k); }
      console.log('Caches cleared:', keys);
    }
  } catch (e) { console.warn('Cache clear error', e); }
}


/* Full backup + clear flow (downloads backup, clears keys and caches, reloads) */
async function backupThenClearAppData() {
  try {
    downloadBackup();
    await unregisterSwAndClearCaches();
    clearAppDataKeys();
    showToast('Backup saved and app data cleared', 'danger', 2000);
    setTimeout(() => location.reload(), 900);
  } catch (e) {
    console.error('backupThenClear error', e);
    showToast('Error during backup/clear. See console.', 'danger', 3000);
  }
}


/* Permanently clear app data (without backup) */
async function clearAppDataNoBackup() {
  if (!confirm('This will permanently delete all TailorApp data (no backup). Continue?')) return;
  try {
    await unregisterSwAndClearCaches();
    clearAppDataKeys();
    showToast('App data cleared', 'danger', 1500);
    setTimeout(()=> location.reload(), 700);
  } catch (e) {
    console.error('clearAppDataNoBackup error', e);
    showToast('Error clearing data. See console.', 'danger', 3000);
  }
}


/* Restore from a backup JSON content (object parsed) */
function restoreFromBackupObject(obj) {
  if (!obj) { showToast('Invalid backup object', 'danger'); return; }
  if (!confirm('Restore TailorApp from backup? This will replace current data. Continue?')) return;
  try {
    if (Array.isArray(obj.users)) saveUsers(obj.users);
    if (Array.isArray(obj.orders)) saveOrders(obj.orders);
    if (Array.isArray(obj.designs)) saveDesigns(obj.designs);
    showToast('Backup restored. Reloading...', 'success', 1200);
    setTimeout(()=> location.reload(), 900);
  } catch (e) {
    console.error('restore error', e);
    showToast('Failed to restore backup (see console)', 'danger');
  }
}


/* Present a file input to restore JSON backup */
function promptRestoreFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      const obj = JSON.parse(text);
      restoreFromBackupObject(obj);
    } catch (err) {
      console.error('restore file error', err);
      showToast('Invalid backup file', 'danger');
    }
  });
  input.click();
}


/* Inject small UI buttons: Backup & Clear, Restore (if navbar exists) */
(function attachMenuBackupRestore() {
  function ready(fn) {
    if (document.readyState !== 'loading') return fn();
    document.addEventListener('DOMContentLoaded', fn);
  }

  ready(() => {
    try {
      const menuButton = document.getElementById('menuButton');
      let dropdownMenu = null;

      if (menuButton) {
        dropdownMenu = menuButton.closest('.dropdown')?.querySelector('.dropdown-menu') || null;
      }
      if (!dropdownMenu) dropdownMenu = document.querySelector('nav .dropdown-menu') || document.querySelector('.dropdown-menu');

      if (!dropdownMenu) {
        console.warn('TailorApp: dropdown menu not found — cannot inject backup/restore items.');
        return;
      }

      function ensureMenuItem(id, text, onClick) {
        if (!dropdownMenu) return;
        if (dropdownMenu.querySelector('#' + id)) return;
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'dropdown-item';
        a.href = '#';
        a.id = id;
        a.textContent = text;
        a.addEventListener('click', (ev) => {
          ev.preventDefault();
          try {
            const bs = (typeof bootstrap !== 'undefined' && menuButton) ? bootstrap.Dropdown.getInstance(menuButton) : null;
            if (bs && typeof bs.hide === 'function') bs.hide();
          } catch (e) { /* ignore */ }
          try { onClick(ev); } catch (err) { console.error('Menu item handler error', err); }
        });
        li.appendChild(a);
        dropdownMenu.appendChild(li);
      }

      const callBackupThenClear = () => {
        if (typeof window.backupThenClearAppData === 'function') return window.backupThenClearAppData();
        if (!confirm('Download backup and then clear all TailorApp data?')) return;
        try {
          const payload = {
            users: (typeof loadUsers === 'function') ? loadUsers() : (localStorage.getItem('users') ? JSON.parse(localStorage.getItem('users')) : []),
            orders: (typeof loadOrders === 'function') ? loadOrders() : (localStorage.getItem('orders') ? JSON.parse(localStorage.getItem('orders')) : []),
            designs: (typeof loadDesigns === 'function') ? loadDesigns() : (localStorage.getItem('designs') ? JSON.parse(localStorage.getItem('designs')) : []),
            exportedAt: new Date().toISOString()
          };
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tailorapp-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          localStorage.removeItem('tailorOrders_v1');
          localStorage.removeItem('tailorUsers_v1');
          localStorage.removeItem('tailorDesigns_v1');
          sessionStorage.removeItem('tailor_current_user');
          showToast && typeof showToast === 'function' ? showToast('Backup saved and app data cleared', 'danger') : alert('Backup saved and app data cleared');
          setTimeout(()=> location.reload(), 800);
        } catch (err) {
          console.error('Fallback backupThenClear failed', err);
          alert('Backup/clear failed (see console).');
        }
      };

      const callPromptRestore = () => {
        if (typeof window.promptRestoreFromFile === 'function') return window.promptRestoreFromFile();
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.addEventListener('change', async (e) => {
          const f = e.target.files && e.target.files[0];
          if (!f) return;
          try {
            const text = await f.text();
            const obj = JSON.parse(text);
            if (obj.users) localStorage.setItem('tailorUsers_v1', JSON.stringify(obj.users));
            if (obj.orders) localStorage.setItem('tailorOrders_v1', JSON.stringify(obj.orders));
            if (obj.designs) localStorage.setItem('tailorDesigns_v1', JSON.stringify(obj.designs));
            showToast && typeof showToast === 'function' ? showToast('Backup restored. Reloading...', 'success') : alert('Backup restored. Reloading...');
            setTimeout(()=> location.reload(), 700);
          } catch (err) {
            console.error('Fallback restore failed', err);
            alert('Invalid backup file.');
          }
        });
        input.click();
      };

      ensureMenuItem('menuBackupClear', 'Backup & Clear', callBackupThenClear);
      ensureMenuItem('menuRestore', 'Restore', callPromptRestore);

      const loginItem = dropdownMenu.querySelector('a[href*="login"], a[href*="Login"], a[href*="signup"]');
      if (loginItem) {
        const firstLi = dropdownMenu.querySelector('li');
        const loginLi = loginItem.closest('li') || loginItem;
        if (firstLi && loginLi && firstLi !== loginLi) dropdownMenu.insertBefore(loginLi, firstLi);
      }

      console.info('TailorApp: backup/restore menu items injected.');
    } catch (err) {
      console.error('attachMenuBackupRestore error', err);
    }
  });
})();


/* Ensure function (compat shim) */
function ensureBackupControls() {
  // compatibility shim for older code that calls this.
  // If you need custom wiring, modify here. For now it's a safe no-op.
  return;
}


/* ---------- DOMContentLoaded init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  try {
    renderOwnersList('ownersList');
    initOwnerCardClicks();
    initOrderPage();
    initOwnerPage();
    initAccountControls();
    ensureBackupControls();
  } catch (err) {
    console.error('init error', err);
  }
});


/* ---------- Optional: auto-register service worker (if file exists) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker?.register?.('/service-worker.js').then(() => {
      console.log('Service worker registered (if present).');
    }).catch(()=>{ /* ignore */ });
  });
}


/* ---------- Restore helper exposed (for console or dev use) ---------- */
window.TailorApp = {
  backupThenClearAppData,
  clearAppDataNoBackup,
  downloadBackup,
  promptRestoreFromFile,
  restoreFromBackupObject
};


// ------------------------------
// AUTO SWITCH MENU (Login ↔ Logout)
// ------------------------------

function updateMenu() {
  const menu = document.getElementById("menuList");
  if (!menu) return;

  const user = sessionStorage.getItem(CURRENT_USER);

  if (!user) {
    // ---------- NOT LOGGED IN ----------
    menu.innerHTML = `
      <li><a class="dropdown-item" href="login.html">Login</a></li>
      <li><a class="dropdown-item" href="main.html">About Creator</li>
    `;
  } else {
    // ---------- LOGGED IN ----------
    menu.innerHTML = `
      
      <li><button class="dropdown-item text-danger" id="logoutBtn">Logout</button></li>
      <li><a class="dropdown-item" href="owner.html">Owner Dashboard</a></li>
      <li><a class="dropdown-item" href="main.html">About Creator</li>
    `;

    // Attach logout click
    setTimeout(() => {
      const btn = document.getElementById("logoutBtn");
      if (btn) {
        btn.onclick = () => {
          if (confirm("Do you want to logout?")) {
            sessionStorage.removeItem(CURRENT_USER);
            window.location.href = "main.html";
          }
        };
      }
    }, 50);
  }
}

/* === Index search: find owners by name, email, place or phone === */
(function() {
  const searchInput = document.getElementById('indexSearch');
  const ownersListEl = document.getElementById('ownersList');
  const ownersHelp = document.getElementById('ownersHelp');

  if (!searchInput || !ownersListEl) return;

  let debounceTimer = null;
  function debounce(fn, ms = 200) {
    return (...args) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fn(...args), ms);
    };
  }

  function performSearch(rawQ) {
    const q = (rawQ || '').trim().toLowerCase();
    const owners = loadUsers() || [];
    if (!q) {
      renderOwnersList('ownersList');
      if (ownersHelp) ownersHelp.textContent = 'Use the search box above to quickly find a tailor by name, email or place.';
      return;
    }

    const matched = owners.filter(o => {
      const name = (o.name || '').toLowerCase();
      const email = (o.email || '').toLowerCase();
      const place = (o.place || '').toLowerCase();
      const phone = (o.phone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || place.includes(q) || phone.includes(q);
    });

    renderOwnersCards(matched);
    if (ownersHelp) {
      if (!matched.length) ownersHelp.textContent = `No tailors found for "${rawQ}".`;
      else ownersHelp.textContent = `Showing ${matched.length} result${matched.length > 1 ? 's' : ''} for "${rawQ}".`;
    }
  }

  const debouncedSearch = debounce((e) => performSearch(e.target.value), 200);
  searchInput.addEventListener('input', debouncedSearch);

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(debounceTimer);
      performSearch(e.target.value);
    }
  });

  if (searchInput.value && searchInput.value.trim()) {
    performSearch(searchInput.value);
  } else {
    renderOwnersList('ownersList');
  }

  ownersListEl.addEventListener('click', (ev) => {
    const target = ev.target.closest('[data-owner-email]');
    if (!target) return;
    const ownerEmail = target.getAttribute('data-owner-email');
    if (!ownerEmail) return;
    window.location.href = `order.html?owner=${encodeURIComponent(ownerEmail)}`;
  });
})();


/* Handle menu actions (guarded) */
const backupBtnEl = document.getElementById('backupBtn');
if (backupBtnEl) {
  backupBtnEl.addEventListener('click', () => {
    alert("Backup or Clear action clicked!");
  });
}
const restoreBtnEl = document.getElementById('restoreBtn');
if (restoreBtnEl) {
  restoreBtnEl.addEventListener('click', () => {
    alert("Restore action clicked!");
  });
}
/* ---------- Owner list renderer with avg-rating display ---------- */

// normalize email (decode + trim + lower)
function normEmail(e) {
  if (!e) return '';
  try { e = decodeURIComponent(String(e)); } catch (err) { e = String(e); }
  return String(e).trim().toLowerCase();
}

// read rating meta from storage (handles legacy numeric arrays and object entries)
function getRatingMetaFromStorage(ownerEmail) {
  const key = 'tailorOwnerRatings_v1';
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { avg: 0, count: 0, sum: 0 };
    const map = JSON.parse(raw);
    const email = normEmail(ownerEmail);
    const arr = Array.isArray(map[email]) ? map[email] : [];
    let count = 0, sum = 0;
    for (const it of arr) {
      if (it == null) continue;
      if (typeof it === 'number') { sum += Number(it); count++; }
      else if (typeof it === 'object' && isFinite(it.rating)) { sum += Number(it.rating); count++; }
      else if (isFinite(it)) { sum += Number(it); count++; }
    }
    const avg = count ? Math.round((sum / count) * 10) / 10 : 0;
    return { avg, count, sum };
  } catch (e) {
    console.warn('getRatingMetaFromStorage error', e);
    return { avg: 0, count: 0, sum: 0 };
  }
}

// small helper to render stars string for average (rounded)
function starsForAvg(avg) {
  const r = Math.round(avg || 0);
  // return up to 5 star chars (you can replace with icons)
  let s = '';
  for (let i=1;i<=5;i++) s += (i <= r ? '★' : '☆');
  return s;
}

// Replace your existing renderOwnersList with this version
function renderOwnersList(containerId='ownersList') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const owners = loadUsers() || [];
  if (!owners.length) {
    container.innerHTML = `<div class="alert alert-info">No owners registered yet.</div>`;
    return;
  }

  // preload all designs once for efficiency
  const allDesigns = (typeof loadDesigns === 'function') ? loadDesigns() : [];

  container.innerHTML = owners.map(o => {
    const name = escapeHtml(o.name || 'Owner');
    const phone = o.phone ? escapeHtml(o.phone) : '';
    const emailRaw = o.email || '';
    const emailEnc = encodeURIComponent(emailRaw);

    // rating helpers (you already have getRatingMetaFromStorage & starsForAvg)
    const meta = (typeof getRatingMetaFromStorage === 'function') ? getRatingMetaFromStorage(emailRaw) : { avg: 0, count: 0 };
    const stars = meta && meta.count ? starsForAvg(meta.avg) : 'No ratings';
    const avgText = meta && meta.count ? `${meta.avg} (${meta.count})` : '';

    // pick designs for this owner and show up to 3 thumbnails
    const ownerDesigns = allDesigns.filter(d => (d.owner || '') === emailRaw);
    let designsHtml = '';
    if (ownerDesigns.length) {
      const showCount = Math.min(3, ownerDesigns.length);
      designsHtml += `<div class="d-flex gap-2 mb-2 owner-designs-wrap">`;
      for (let i = 0; i < showCount; i++) {
        const d = ownerDesigns[i];
        const isVideo = (d.type === 'video');
        const thumbSrc = isVideo ? '' /* no poster stored */ : (d.data || '');
        // use a placeholder for videos (or you may extract poster)
        const thumbHtml = isVideo
          ? `<div class="owner-design-thumb d-inline-block position-relative" data-preview-type="video" data-preview-src="${escapeHtml(d.data)}" title="${escapeHtml(d.title||'video')}">
               <div class="d-flex align-items-center justify-content-center" style="width:72px;height:72px;border:1px solid #eee;border-radius:6px;background:#000;color:#fff;font-size:0.9rem">▶</div>
             </div>`
          : `<img class="owner-design-thumb img-thumbnail" src="${escapeHtml(thumbSrc)}" style="width:72px;height:72px;object-fit:cover;border-radius:6px;cursor:pointer" alt="${escapeHtml(d.title||'design')}" data-preview-type="image" data-preview-src="${escapeHtml(d.data||'')}" />`;
        designsHtml += `<div>${thumbHtml}</div>`;
      }
      // if there are more designs, show small "+N" badge that links to gallery
      if (ownerDesigns.length > showCount) {
        const more = ownerDesigns.length - showCount;
        designsHtml += `<div class="d-inline-block align-self-center ms-1"><a href="owner.html?owner=${emailEnc}#designs" class="small text-decoration-none">+${more} more</a></div>`;
      }
      designsHtml += `</div>`;
    } else {
      designsHtml = `<div class="small text-muted mb-2">No designs yet.</div>`;
    }

    return `
      <div class="col-sm-6 col-md-4">
        <div class="card mb-3 h-100 animated-pop" data-owner-email="${escapeHtml(emailRaw)}" data-owner-name="${escapeHtml(o.name)}" style="cursor:default">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title mb-1">${name}</h5>
            <p class="text-muted mb-2 small">${escapeHtml(emailRaw)}${phone ? ' • ' + phone : ''}</p>

            <!-- Designs thumbs -->
            
            ${designsHtml}

            <!-- Rating display -->
            <div class="mb-2 small">
              <div class="d-flex align-items-center" style="gap:8px;">
                <div class="rating-stars" aria-hidden="true">${escapeHtml(stars)}</div>
                <div class="text-muted rating-meta">${escapeHtml(avgText)}</div>
              </div>
            </div>

            <div class="mt-auto d-flex gap-2">
              <a class="btn btn-outline-secondary btn-sm-2" href="rating.html?owner=${emailEnc}">Rating ⭐</a>
              <a class="btn btn-outline-secondary btn-sm-2 " href="design.html?owner=${emailEnc}">view design</a>
              <a class="btn btn-outline-secondary btn-sm-2 flex-fill" href="order.html?owner=${emailEnc}">Place Order</a>


            </div>
          </div>
        </div>
      </div>`;
  }).join('');
  
}



// Run when page loads
document.addEventListener("DOMContentLoaded", updateMenu);




function renderOwnersCards(owners = []) {
  const container = document.getElementById('ownersList'); if (!container) return;
  if (!owners || !owners.length) { container.innerHTML = `<div class="alert alert-info">No tailors found.</div>`; return; }
  container.innerHTML = owners.map(o => {
    const name = escapeHtml(o.name || 'Owner');
    const phone = o.phone ? escapeHtml(o.phone) : '';
    const emailRaw = o.email || '';
    const emailEnc = encodeURIComponent(emailRaw);
    const meta = getRatingMetaFromStorage(emailRaw);
    const stars = meta.count ? starsForAvg(meta.avg) : 'No ratings';
    const avgText = meta.count ? `${meta.avg} (${meta.count})` : '';
    return `
      <div class="col-sm-6 col-md-4">
        <div class="card mb-3 h-100 animated-pop" data-owner-email="${escapeHtml(emailRaw)}" data-owner-name="${escapeHtml(o.name)}" style="cursor:pointer">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title mb-1">${name}</h5>
            <p class="text-muted mb-2 small">${escapeHtml(o.email)} ${phone ? ' • ' + phone : ''}</p>

            <!-- Rating display -->
            <div class="mb-2 small">
              <div class="d-flex align-items-center" style="gap:8px;">
                <div class="rating-stars" aria-hidden="true">${escapeHtml(stars)}</div>
                <div class="text-muted rating-meta">${escapeHtml(avgText)}</div>
              </div>
            </div>

            <div class="mt-auto d-flex gap-2">
              <a class="btn btn-outline-secondary btn-sm-10 " href="rating.html?owner=${emailEnc}">Rating ⭐</a>
              <a class="btn btn-outline-primary " href="order.html?owner=${emailEnc}">Place Order</a>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}










