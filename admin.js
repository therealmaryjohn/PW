/* =====================================================================
   PINK WORLD — STORE MANAGER (admin.html logic)
   -----------------------------------------------------------------
   TWO MODES for the Products tab, chosen automatically:

   1. File-based mode (default): everything happens in your browser.
      Add/edit/delete only affects a local working copy — click
      "Download Updated products.js" and upload it to publish.

   2. Live sync mode (when PRODUCTS_SYNC_ENABLED is on — Website Guide
      Section 6): the Products tab reads/writes directly to Firestore.
      You must log in as the admin phone number to make changes; once
      logged in, edits appear on your live site within seconds — no
      file uploads needed. A one-time "Migrate" button copies your
      starter catalog into the live database the first time.

   The Store Settings and Orders tabs work the same as before either way.
   ===================================================================== */

// Captured BEFORE any live Firestore data could overwrite the in-memory
// PRODUCTS array, so migration always has the original starter catalog.
const SEED_PRODUCTS = JSON.parse(JSON.stringify(PRODUCTS));

let workingProducts = JSON.parse(JSON.stringify(PRODUCTS)); // used only in file-based mode
let workingConfig = JSON.parse(JSON.stringify(STORE_CONFIG));
const pendingImages = {};

const SYNC_ACTIVE = typeof productsSyncActive === "function" && productsSyncActive();
let _currentAuthUser = null;
let activeAdminTab = "products";

function getWorkingList() {
  return SYNC_ACTIVE ? PRODUCTS : workingProducts;
}
function isAdminUser() {
  if (!_currentAuthUser) return false;
  const adminPhone = (workingConfig.adminPhone || "").replace(/\s/g, "");
  const userPhone = (_currentAuthUser.phoneNumber || "").replace(/\s/g, "");
  return !!adminPhone && userPhone === adminPhone;
}

/* ---------------------------- TABS ---------------------------- */
function switchTab(tab) {
  activeAdminTab = tab;
  document.querySelectorAll(".admin-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.getElementById("tab-products").classList.toggle("active", tab === "products");
  document.getElementById("tab-settings").classList.toggle("active", tab === "settings");
  document.getElementById("tab-orders").classList.toggle("active", tab === "orders");
  if (tab === "orders") refreshOrdersUI();
}

/* ---------------------------- HELPERS ---------------------------- */
function slugify(text) {
  return text.toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}
function nextProductId() {
  const list = getWorkingList();
  const nums = list.map(p => parseInt((p.id || "P000").replace(/\D/g, ""), 10) || 0);
  const max = nums.length ? Math.max(...nums) : 0;
  return "P" + String(max + 1).padStart(3, "0");
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------------------------- PRODUCTS TAB GATING (sync mode only) ---------------------------- */
function updateProductsTabUI() {
  const gateCard = document.getElementById("productsGateCard");
  const managerUI = document.getElementById("productsManagerUI");
  const badge = document.getElementById("syncStatusBadge");
  const hint = document.getElementById("syncStatusHint");
  const migrateBanner = document.getElementById("migrateBanner");
  const publishHeading = document.getElementById("publishHeading");
  const publishHint = document.getElementById("publishHint");

  if (!SYNC_ACTIVE) {
    gateCard.style.display = "none";
    managerUI.style.display = "block";
    badge.className = "sync-badge offline";
    badge.innerHTML = '<span class="sync-dot"></span> File-based mode';
    hint.textContent = "Changes are saved by downloading & re-uploading products.js.";
    migrateBanner.style.display = "none";
    publishHeading.textContent = "Step 2: Publish Your Changes";
    publishHint.textContent = "Once you're happy with your product list above, download the updated file and any new photos, then upload them to your website.";
    renderProductTable();
    return;
  }

  if (!_currentAuthUser) {
    gateCard.style.display = "block";
    gateCard.innerHTML = `<h3 style="color:var(--pink-dark); margin-bottom:10px;">Log In to Manage Products</h3>
      <p style="font-size:13.5px; color:var(--text-muted); margin-bottom:16px;">Instant product sync is turned on. Log in with the store's admin mobile number to add, edit, or remove products.</p>
      <a href="account.html" class="btn btn-primary">Go to Login Page</a>`;
    managerUI.style.display = "none";
    return;
  }
  if (!isAdminUser()) {
    gateCard.style.display = "block";
    gateCard.innerHTML = `<h3 style="color:var(--pink-dark); margin-bottom:10px;">This Number Isn't Set as Admin</h3>
      <p style="font-size:13.5px; color:var(--text-muted);">You're logged in, but this mobile number doesn't match the Admin Mobile Number in Store Settings. Update it there, re-download config.js, and upload it — or log in with the matching number.</p>`;
    managerUI.style.display = "none";
    return;
  }

  // Logged in as the admin phone — full live editing unlocked
  gateCard.style.display = "none";
  managerUI.style.display = "block";
  badge.className = "sync-badge live";
  badge.innerHTML = '<span class="sync-dot"></span> Live sync — changes save instantly';
  hint.textContent = "Add, edit, or delete products below — your website updates within seconds.";
  publishHeading.textContent = "Optional: Export a Backup Copy";
  publishHint.textContent = "Your catalog is already live — this download is just a local backup, not required for publishing.";
  migrateBanner.style.display = firestoreCatalogHasData() ? "none" : "block";
  renderProductTable();
}

/* ---------------------------- PRODUCTS TABLE ---------------------------- */
function renderProductTable() {
  const list = getWorkingList();
  document.getElementById("productCount").textContent = list.length;
  const rows = list.map(p => `
    <tr>
      <td><img src="${pendingImages[p.id] ? pendingImages[p.id].url : p.image}" alt=""></td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.category)}</td>
      <td>₹${p.price}${p.mrp ? ` <span style="color:var(--text-muted); text-decoration:line-through; font-size:12px;">₹${p.mrp}</span>` : ""}</td>
      <td>${p.badge ? `<span class="badge ${p.badge.toLowerCase()}" style="position:static; display:inline-block;">${p.badge}</span>` : "—"}</td>
      <td>
        <div class="admin-actions-cell">
          <button class="edit-btn" onclick="openProductForm('${p.id}')">Edit</button>
          <button class="del-btn" onclick="deleteProduct('${p.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
  document.getElementById("productTableBody").innerHTML = rows || `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">No products yet — click "Add New Product" above.</td></tr>`;
  renderPendingImageDownloads();
}

async function deleteProduct(id) {
  if (!confirm("Remove this product? " + (SYNC_ACTIVE ? "This takes effect on your live site immediately." : "(This only affects the downloaded file, not your live site until you re-upload.)"))) return;

  if (SYNC_ACTIVE) {
    if (!isAdminUser()) { alert("Please log in as the admin number first."); return; }
    try {
      await fbDb.collection("products").doc(id).delete();
      delete pendingImages[id];
      // table re-renders automatically via the live subscription
    } catch (e) {
      alert("Couldn't delete this product online right now: " + e.message);
    }
    return;
  }

  workingProducts = workingProducts.filter(p => p.id !== id);
  delete pendingImages[id];
  renderProductTable();
}

/* ---------------------------- PRODUCT FORM ---------------------------- */
let editingProductId = null;
function openProductForm(id) {
  editingProductId = id;
  const card = document.getElementById("productFormCard");
  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth" });
  if (id) {
    const p = getWorkingList().find(x => x.id === id);
    document.getElementById("productFormTitle").textContent = "Edit Product";
    document.getElementById("pf-id").value = p.id;
    document.getElementById("pf-name").value = p.name;
    document.getElementById("pf-category").value = p.category;
    document.getElementById("pf-price").value = p.price;
    document.getElementById("pf-mrp").value = p.mrp || "";
    document.getElementById("pf-badge").value = p.badge || "";
    document.getElementById("pf-sizes").value = (p.sizes || []).join(", ");
    document.getElementById("pf-description").value = p.description || "";
    const previewSrc = pendingImages[id] ? pendingImages[id].url : p.image;
    document.getElementById("pf-image-preview-wrap").innerHTML = `<img class="image-preview" src="${previewSrc}">`;
    document.getElementById("pf-image-path-note").textContent = "Current image: " + p.image;
  } else {
    document.getElementById("productFormTitle").textContent = "Add New Product";
    document.getElementById("pf-id").value = "";
    document.getElementById("pf-name").value = "";
    document.getElementById("pf-category").value = "sarees";
    document.getElementById("pf-price").value = "";
    document.getElementById("pf-mrp").value = "";
    document.getElementById("pf-badge").value = "";
    document.getElementById("pf-sizes").value = "Free Size";
    document.getElementById("pf-description").value = "";
    document.getElementById("pf-image-preview-wrap").innerHTML = "";
    document.getElementById("pf-image-path-note").textContent = "";
  }
}
function closeProductForm() {
  document.getElementById("productFormCard").style.display = "none";
  editingProductId = null;
}
function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const maxDim = 1000;
      let w = img.width, h = img.height;
      if (w > h && w > maxDim) { h = Math.round(h * (maxDim / w)); w = maxDim; }
      else if (h > maxDim) { w = Math.round(w * (maxDim / h)); h = maxDim; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(function (blob) {
        const url = URL.createObjectURL(blob);
        const nameField = document.getElementById("pf-name").value || "product";
        const idField = document.getElementById("pf-id").value || nextProductId();
        const filename = `${idField}-${slugify(nameField)}.jpg`;
        const key = editingProductId || "__new__";
        pendingImages[key] = { blob, filename, url };
        document.getElementById("pf-image-preview-wrap").innerHTML = `<img class="image-preview" src="${url}">`;
        document.getElementById("pf-image-path-note").textContent = `New photo ready: ${filename} (resized to ${w}×${h}px)`;
      }, "image/jpeg", 0.82);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function saveProduct() {
  const name = document.getElementById("pf-name").value.trim();
  const category = document.getElementById("pf-category").value;
  const price = parseInt(document.getElementById("pf-price").value, 10);
  const mrpRaw = document.getElementById("pf-mrp").value.trim();
  const mrp = mrpRaw ? parseInt(mrpRaw, 10) : null;
  const badge = document.getElementById("pf-badge").value;
  const sizes = document.getElementById("pf-sizes").value.split(",").map(s => s.trim()).filter(Boolean);
  const description = document.getElementById("pf-description").value.trim();
  if (!name || !price || !category) { alert("Please fill in at least the product name, category, and price."); return; }

  let id = document.getElementById("pf-id").value;
  const isNew = !id;
  if (isNew) id = nextProductId();
  if (isNew && pendingImages["__new__"]) { pendingImages[id] = pendingImages["__new__"]; delete pendingImages["__new__"]; }
  const pending = pendingImages[id];

  if (SYNC_ACTIVE) {
    if (!isAdminUser()) { alert("Please log in as the admin number first."); return; }
    const saveBtn = document.getElementById("saveProductBtn");
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    try {
      let imagePath;
      if (pending && pending.blob) {
        saveBtn.textContent = "Uploading photo...";
        const storageRef = firebase.storage().ref(`products/${id}/${pending.filename}`);
        await storageRef.put(pending.blob);
        imagePath = await storageRef.getDownloadURL();
      } else {
        const existing = PRODUCTS.find(p => p.id === id);
        imagePath = existing ? existing.image : "images/placeholder.jpg";
      }
      saveBtn.textContent = "Saving...";
      const productData = {
        id, name, category, price, mrp: mrp || null, image: imagePath, badge,
        sizes: sizes.length ? sizes : ["Free Size"], description,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await fbDb.collection("products").doc(id).set(productData, { merge: true });
      delete pendingImages[id];
      closeProductForm();
      // The live table refreshes automatically via subscribeProductsUpdates.
    } catch (e) {
      alert("Couldn't save this product online right now. Please check your connection and try again.\n\n" + e.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
    return;
  }

  // ---- File-based mode (unchanged local-only behavior) ----
  const existingProduct = workingProducts.find(p => p.id === id);
  const imagePath = pending ? `images/${pending.filename}` : (existingProduct ? existingProduct.image : "images/placeholder.jpg");
  const productData = { id, name, category, price, mrp: mrp || null, image: imagePath, badge, sizes: sizes.length ? sizes : ["Free Size"], description };
  if (isNew) { workingProducts.push(productData); }
  else { const idx = workingProducts.findIndex(p => p.id === id); workingProducts[idx] = productData; }
  closeProductForm();
  renderProductTable();
}

function renderPendingImageDownloads() {
  const wrap = document.getElementById("pendingImageDownloads");
  if (SYNC_ACTIVE) { wrap.innerHTML = ""; return; } // photos upload automatically in sync mode
  const keys = Object.keys(pendingImages).filter(k => k !== "__new__");
  if (keys.length === 0) { wrap.innerHTML = ""; return; }
  wrap.innerHTML = `<p style="font-size:13px; margin-bottom:8px;"><b>New/updated photos to upload into your images/ folder:</b></p>` +
    keys.map(id => {
      const item = pendingImages[id];
      return `<span class="file-download-chip">${item.filename} <a href="${item.url}" download="${item.filename}">Download</a></span>`;
    }).join("");
}

/* ---------------------------- MIGRATION (one-time) ---------------------------- */
async function migrateCatalogToFirestore() {
  if (!SYNC_ACTIVE || !isAdminUser()) return;
  if (!confirm(`Copy your current ${SEED_PRODUCTS.length} starter products into the live database? This is normally only done once.`)) return;
  const btn = document.getElementById("migrateBtn");
  const originalText = btn.textContent;
  btn.textContent = "Migrating..."; btn.disabled = true;
  try {
    const batch = fbDb.batch();
    SEED_PRODUCTS.forEach(p => {
      const ref = fbDb.collection("products").doc(p.id);
      batch.set(ref, Object.assign({}, p, { updatedAt: firebase.firestore.FieldValue.serverTimestamp() }));
    });
    await batch.commit();
    alert("Catalog migrated! Your product list is now live — edits will appear on your site within seconds.");
  } catch (e) {
    alert("Migration failed: " + e.message + "\n\nDouble-check your Firestore security rules include the products collection (Website Guide, Appendix D).");
  } finally {
    btn.textContent = originalText; btn.disabled = false;
  }
}

/* ---------------------------- products.js FILE GENERATION (export / offline mode) ---------------------------- */
function serializeProduct(p) {
  const mrpStr = (p.mrp === null || p.mrp === undefined || p.mrp === "") ? "null" : p.mrp;
  return `  { id: ${JSON.stringify(p.id)}, name: ${JSON.stringify(p.name)}, category: ${JSON.stringify(p.category)}, price: ${p.price}, mrp: ${mrpStr}, image: ${JSON.stringify(p.image)}, badge: ${JSON.stringify(p.badge || "")}, sizes: ${JSON.stringify(p.sizes)}, description: ${JSON.stringify(p.description || "")} }`;
}
function downloadProductsJs() {
  const list = getWorkingList();
  const header = `/* PINK WORLD — PRODUCT CATALOG ${SYNC_ACTIVE ? "(backup export from live Firestore catalog)" : "(generated/updated using admin.html)"} */\n\nconst PRODUCTS = [\n`;
  const body = list.map(serializeProduct).join(",\n");
  const footer = `\n];\n\nconst CATEGORIES = [\n  { id: "sarees", name: "Sarees", image: "images/cat-sarees.jpg", description: "Silk, Banarasi & festive sarees" },\n  { id: "kurtis", name: "Kurtis & Suits", image: "images/cat-kurtis.jpg", description: "Cotton & embroidered kurti sets" },\n  { id: "western", name: "Western Wear", image: "images/cat-western.jpg", description: "Tops, dresses, jeans & more" },\n  { id: "mens", name: "Men's Collections", image: "images/cat-mens.jpg", description: "Shirts, polos & trousers" },\n  { id: "intimate", name: "Intimate & Innerwear", image: "images/cat-intimate.jpg", description: "Bras, briefs & nightwear" }\n];\n`;
  downloadTextFile("products.js", header + body + footer);

  if (SYNC_ACTIVE) {
    alert("Backup exported! Your live catalog is already published on your site — this file is just a backup copy.");
    return;
  }
  const remaining = Object.keys(pendingImages).filter(k => k !== "__new__");
  if (remaining.length > 0) {
    alert(`products.js downloaded!\n\nDon't forget to also download your ${remaining.length} new product photo(s) below and upload them into your images/ folder.`);
  }
}

/* ---------------------------- SETTINGS TAB ---------------------------- */
function renderBranchForms() {
  const wrap = document.getElementById("branchFormsWrap");
  wrap.innerHTML = workingConfig.branches.map((b, i) => `
    <div style="border:1px solid var(--border); border-radius:10px; padding:16px; margin-bottom:14px;">
      <h4 style="font-size:14px; color:var(--pink-dark); margin-bottom:10px;">Branch ${i + 1}</h4>
      <div class="form-row">
        <div class="form-group"><label>Branch Name</label><input type="text" id="branch-name-${i}" value="${escapeHtml(b.name)}"></div>
        <div class="form-group"><label>Phone</label><input type="text" id="branch-phone-${i}" value="${escapeHtml(b.phone)}"></div>
      </div>
      <div class="form-group"><label>Full Address</label><input type="text" id="branch-address-${i}" value="${escapeHtml(b.address)}"></div>
      <div class="form-group"><label>Opening Hours</label><input type="text" id="branch-hours-${i}" value="${escapeHtml(b.hours)}"></div>
      <div class="form-group"><label>Google Maps Link (share link)</label><input type="text" id="branch-maplink-${i}" value="${escapeHtml(b.mapLink)}"></div>
      <div class="form-group"><label>Google Maps Embed URL</label><input type="text" id="branch-mapembed-${i}" value="${escapeHtml(b.mapEmbed)}"></div>
    </div>
  `).join("");
}
function loadSettingsForm() {
  document.getElementById("cf-name").value = workingConfig.name;
  document.getElementById("cf-whatsapp").value = workingConfig.whatsapp;
  document.getElementById("cf-email").value = workingConfig.email;
  document.getElementById("cf-shipping").value = workingConfig.freeShippingThreshold;
  document.getElementById("cf-description").value = workingConfig.description;
  document.getElementById("cf-razorpay-enabled").checked = !!workingConfig.razorpayEnabled;
  document.getElementById("cf-razorpay-key").value = workingConfig.razorpayKeyId;
  document.getElementById("cf-admin-phone").value = workingConfig.adminPhone || "";
  document.getElementById("cf-instagram").value = workingConfig.social.instagram;
  document.getElementById("cf-facebook").value = workingConfig.social.facebook;
  renderBranchForms();
}
function collectConfigFromForm() {
  workingConfig.name = document.getElementById("cf-name").value.trim();
  workingConfig.whatsapp = document.getElementById("cf-whatsapp").value.trim();
  workingConfig.email = document.getElementById("cf-email").value.trim();
  workingConfig.freeShippingThreshold = parseInt(document.getElementById("cf-shipping").value, 10) || 0;
  workingConfig.description = document.getElementById("cf-description").value.trim();
  workingConfig.razorpayEnabled = document.getElementById("cf-razorpay-enabled").checked;
  workingConfig.razorpayKeyId = document.getElementById("cf-razorpay-key").value.trim();
  workingConfig.adminPhone = document.getElementById("cf-admin-phone").value.trim();
  workingConfig.social.instagram = document.getElementById("cf-instagram").value.trim() || "#";
  workingConfig.social.facebook = document.getElementById("cf-facebook").value.trim() || "#";
  workingConfig.branches = workingConfig.branches.map((b, i) => ({
    name: document.getElementById(`branch-name-${i}`).value.trim(),
    address: document.getElementById(`branch-address-${i}`).value.trim(),
    phone: document.getElementById(`branch-phone-${i}`).value.trim(),
    hours: document.getElementById(`branch-hours-${i}`).value.trim(),
    mapLink: document.getElementById(`branch-maplink-${i}`).value.trim(),
    mapEmbed: document.getElementById(`branch-mapembed-${i}`).value.trim()
  }));
}
function downloadConfigJs() {
  collectConfigFromForm();
  const c = workingConfig;
  const branchesStr = c.branches.map(b => `    {
      name: ${JSON.stringify(b.name)},
      address: ${JSON.stringify(b.address)},
      phone: ${JSON.stringify(b.phone)},
      hours: ${JSON.stringify(b.hours)},
      mapEmbed: ${JSON.stringify(b.mapEmbed)},
      mapLink: ${JSON.stringify(b.mapLink)}
    }`).join(",\n");

  const content = `/* PINK WORLD — STORE CONFIGURATION (generated/updated using admin.html) */

const STORE_CONFIG = {
  name: ${JSON.stringify(c.name)},
  tagline: ${JSON.stringify(c.tagline || "Fashion & Everyday Essentials for the Whole Family")},
  description: ${JSON.stringify(c.description)},

  whatsapp: ${JSON.stringify(c.whatsapp)},
  email: ${JSON.stringify(c.email)},

  freeShippingThreshold: ${c.freeShippingThreshold},
  currency: ${JSON.stringify(c.currency || "₹")},

  razorpayEnabled: ${c.razorpayEnabled ? "true" : "false"},
  razorpayKeyId: ${JSON.stringify(c.razorpayKeyId)},

  adminPhone: ${JSON.stringify(c.adminPhone || "")},

  branches: [
${branchesStr}
  ],

  social: {
    instagram: ${JSON.stringify(c.social.instagram)},
    facebook: ${JSON.stringify(c.social.facebook)},
    youtube: ${JSON.stringify(c.social.youtube || "#")}
  }
};
`;
  downloadTextFile("config.js", content);
}

/* ---------------------------- ORDERS TAB ---------------------------- */
const ORDER_STATUSES = ["Placed", "Confirmed", "Shipped", "Delivered", "Cancelled"];

function refreshOrdersUI() {
  const loginPrompt = document.getElementById("ordersLoginPrompt");
  const notAdminNotice = document.getElementById("ordersNotAdminNotice");
  const tableWrap = document.getElementById("ordersTableWrap");

  if (!firebaseReady()) {
    loginPrompt.style.display = "block";
    document.getElementById("ordersLoginText").textContent = "Customer accounts aren't set up yet. See the Website Guide, Section 5, to enable Firebase — then orders will appear here.";
    notAdminNotice.style.display = "none";
    tableWrap.style.display = "none";
    return;
  }
  if (!_currentAuthUser) {
    loginPrompt.style.display = "block";
    document.getElementById("ordersLoginText").textContent = "Customer orders are stored securely online. To view them here, log in using the store's admin mobile number set in Store Settings.";
    notAdminNotice.style.display = "none";
    tableWrap.style.display = "none";
    return;
  }
  if (!isAdminUser()) {
    loginPrompt.style.display = "none";
    notAdminNotice.style.display = "block";
    tableWrap.style.display = "none";
    return;
  }
  loginPrompt.style.display = "none";
  notAdminNotice.style.display = "none";
  tableWrap.style.display = "block";
  if (activeAdminTab === "orders") loadAllOrders();
}

async function loadAllOrders() {
  let orders = [];
  try {
    const snap = await fbDb.collection("orders").orderBy("createdAt", "desc").limit(200).get();
    orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Could not load orders:", e);
    document.getElementById("adminOrdersList").innerHTML = `<p style="text-align:center; color:#c0392b; padding:30px;">Couldn't load orders right now. If you just set this up, double-check your Firestore security rules and try again (see the Website Guide, Section 5.6).</p>`;
    document.getElementById("orderCount").textContent = "0";
    return;
  }
  document.getElementById("orderCount").textContent = orders.length;
  document.getElementById("adminOrdersList").innerHTML = orders.map(o => {
    const dateStr = o.createdAt && o.createdAt.toDate ? o.createdAt.toDate().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
    const itemsHtml = (o.items || []).map(it => `<div class="order-item-row"><span>${escapeHtml(it.name)} (${escapeHtml(it.size)}) x${it.qty}</span><span>₹${it.price * it.qty}</span></div>`).join("");
    const statusOptions = ORDER_STATUSES.map(s => `<option value="${s}" ${o.status === s ? "selected" : ""}>${s}</option>`).join("");
    return `
      <div class="order-card">
        <div class="order-card-head">
          <div>
            <strong>${escapeHtml(o.customerName || "Customer")}</strong> — ${escapeHtml(o.phone || "")}<br>
            <span style="font-size:12.5px; color:var(--text-muted);">${dateStr} · ${escapeHtml(o.paymentMethod || "")} · ${escapeHtml(o.branch || "")}</span>
          </div>
          <select onchange="updateOrderStatus('${o.id}', this.value)" style="padding:6px 10px; border-radius:8px; border:1px solid var(--border); font-size:13px;">
            ${statusOptions}
          </select>
        </div>
        ${o.address ? `<p style="font-size:12.5px; color:var(--text-muted); margin-bottom:8px;">Address: ${escapeHtml(o.address)}</p>` : ""}
        ${itemsHtml}
        <div class="row" style="margin-top:10px; font-weight:700; color:var(--pink-dark);"><span>Total</span><span>₹${o.total || 0}</span></div>
      </div>`;
  }).join("") || `<p style="text-align:center; color:var(--text-muted); padding:30px;">No orders yet.</p>`;
}
async function updateOrderStatus(orderId, newStatus) {
  await fbDb.collection("orders").doc(orderId).set({ status: newStatus }, { merge: true });
}

/* ---------------------------- INIT ---------------------------- */
loadSettingsForm();
updateProductsTabUI(); // paints initial state (file-based table, or sync-mode login gate)

if (typeof onAuthChange === "function") {
  onAuthChange(user => {
    _currentAuthUser = user;
    updateProductsTabUI();
    refreshOrdersUI();
  });
}

if (SYNC_ACTIVE) {
  subscribeProductsUpdates(function () {
    updateProductsTabUI();
  });
}
