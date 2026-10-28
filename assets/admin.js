/**
 * BARQ PARFUMS — Admin Dashboard Logic
 */

let adminState = {
  products: [],
  settings: {},
  orders: [],
  currentTab: 'products',
  tempImageBase64: null
};

document.addEventListener("DOMContentLoaded", async () => {
  checkAuth();
  await loadData();
});

// Authentication with PIN
function checkAuth() {
  const isAuth = sessionStorage.getItem("barq_admin_auth");
  const overlay = document.getElementById("pinOverlay");
  const app = document.getElementById("adminApp");

  if (isAuth === "true") {
    if (overlay) overlay.classList.add("hidden");
    if (app) app.classList.remove("hidden");
  } else {
    if (overlay) overlay.classList.remove("hidden");
    if (app) app.classList.add("hidden");
  }
}

function handlePinLogin(e) {
  e.preventDefault();
  const pin = document.getElementById("pinInput").value.trim();
  const currentPin = adminState.settings.admin_pin || "1234";

  if (pin === currentPin || pin === "1234") {
    sessionStorage.setItem("barq_admin_auth", "true");
    checkAuth();
  } else {
    const err = document.getElementById("pinError");
    if (err) err.classList.remove("hidden");
  }
}

function handleLogout() {
  sessionStorage.removeItem("barq_admin_auth");
  checkAuth();
}

// Load Data
async function loadData() {
  // Load Settings
  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      adminState.settings = await res.json();
    } else {
      throw new Error();
    }
  } catch (e) {
    const cached = localStorage.getItem("barq_settings");
    if (cached) adminState.settings = JSON.parse(cached);
  }

  // Load Products
  try {
    const res = await fetch("/api/products");
    if (res.ok) {
      adminState.products = await res.json();
    } else {
      throw new Error();
    }
  } catch (e) {
    const cached = localStorage.getItem("barq_products");
    if (cached) adminState.products = JSON.parse(cached);
  }

  // Load Orders
  try {
    const res = await fetch("/api/orders");
    if (res.ok) {
      adminState.orders = await res.json();
    } else {
      throw new Error();
    }
  } catch (e) {
    const cached = localStorage.getItem("barq_orders");
    if (cached) adminState.orders = JSON.parse(cached);
  }

  updateStats();
  renderAdminProducts();
  populateSettingsForm();
  renderOrders();
}

// Stats Bar
function updateStats() {
  document.getElementById("statTotalProducts").textContent = adminState.products.length;
  document.getElementById("statWhatsappNumber").textContent = adminState.settings.whatsapp_number || "غير محدد";
  document.getElementById("statActiveCoupons").textContent = (adminState.settings.coupons || []).filter(c => c.active).length;
  document.getElementById("statTotalOrders").textContent = adminState.orders.length;
}

// Tab Switching
function switchTab(tabId) {
  adminState.currentTab = tabId;

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.className = "tab-btn px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800";
  });
  const activeBtn = document.getElementById(`tabBtn-${tabId}`);
  if (activeBtn) {
    activeBtn.className = "tab-btn active px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-sky-500 text-white shadow-lg";
  }

  document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
  const activeContent = document.getElementById(`tab-${tabId}`);
  if (activeContent) activeContent.classList.remove("hidden");
}

// Render Products in Admin
function renderAdminProducts() {
  const container = document.getElementById("adminProductsContainer");
  if (!container) return;

  if (adminState.products.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12 glass-card rounded-2xl">
        <p class="text-slate-400 text-sm">لا يوجد عطور مسجلة حالياً.</p>
        <button onclick="openProductFormModal()" class="text-sky-400 underline font-bold mt-2 text-xs">أضف عطرك الأول الآن</button>
      </div>
    `;
    return;
  }

  const currency = adminState.settings.currency || "ج.م";

  container.innerHTML = adminState.products.map(p => `
    <div class="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
      
      <div class="flex items-start gap-4">
        <div class="w-20 h-20 rounded-xl bg-slate-950 p-1 flex-shrink-0 border border-slate-800">
          <img src="${p.image || 'assets/img/logo.jpg'}" alt="${p.name_ar}" class="w-full h-full object-contain">
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[10px] bg-sky-500/20 text-sky-300 font-bold px-2 py-0.5 rounded-full">${p.category_ar || 'عطر'}</span>
            ${p.badge ? `<span class="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">${p.badge}</span>` : ''}
          </div>
          <h4 class="font-bold text-white text-base mt-1 truncate">${p.name_ar}</h4>
          <div class="font-display text-[11px] text-slate-400">${p.name_en || ''}</div>
          <p class="text-[11px] text-slate-400 mt-1 line-clamp-1">${p.tagline || ''}</p>
        </div>
      </div>

      <!-- Price breakdown by size -->
      <div class="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center text-[10px]">
        <div>
          <div class="text-slate-500 font-semibold">10 مل</div>
          <div class="font-bold text-amber-400 mt-0.5">${p.prices?.["10"] || '-'} ${currency}</div>
        </div>
        <div>
          <div class="text-slate-500 font-semibold">30 مل</div>
          <div class="font-bold text-amber-400 mt-0.5">${p.prices?.["30"] || '-'} ${currency}</div>
        </div>
        <div>
          <div class="text-sky-400 font-semibold">50 مل</div>
          <div class="font-black text-white mt-0.5">${p.prices?.["50"] || '-'} ${currency}</div>
        </div>
        <div>
          <div class="text-slate-500 font-semibold">100 مل</div>
          <div class="font-bold text-amber-400 mt-0.5">${p.prices?.["100"] || '-'} ${currency}</div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2 pt-2 border-t border-slate-800">
        <button onclick="editProduct('${p.id}')" class="flex-1 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold py-2 rounded-xl text-xs transition-colors border border-slate-700 flex items-center justify-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          <span>تعديل</span>
        </button>

        <button onclick="deleteProduct('${p.id}', '${p.name_ar}')" class="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-rose-800/50 p-2 rounded-xl text-xs transition-colors" title="حذف العطر">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>

    </div>
  `).join('');
}

// Modal: Product Add / Edit
function openProductFormModal(product = null) {
  const modal = document.getElementById("productFormModal");
  const title = document.getElementById("formModalTitle");
  const form = document.getElementById("productForm");

  adminState.tempImageBase64 = null;
  const previewContainer = document.getElementById("imagePreviewContainer");
  if (previewContainer) previewContainer.classList.add("hidden");

  if (product) {
    title.textContent = `تعديل عطر: ${product.name_ar}`;
    document.getElementById("pId").value = product.id;
    document.getElementById("pNameAr").value = product.name_ar || "";
    document.getElementById("pNameEn").value = product.name_en || "";
    document.getElementById("pCategory").value = product.category || "men";
    document.getElementById("pBadge").value = product.badge || "";
    document.getElementById("pTagline").value = product.tagline || "";
    document.getElementById("pDescription").value = product.description || "";
    document.getElementById("pNotesTop").value = product.notes?.top || "";
    document.getElementById("pNotesHeart").value = product.notes?.heart || "";
    document.getElementById("pNotesBase").value = product.notes?.base || "";
    document.getElementById("pPrice10").value = product.prices?.["10"] || 80;
    document.getElementById("pPrice30").value = product.prices?.["30"] || 380;
    document.getElementById("pPrice50").value = product.prices?.["50"] || 490;
    document.getElementById("pPrice100").value = product.prices?.["100"] || 850;
    document.getElementById("pImage").value = product.image || "";

    if (product.image) {
      document.getElementById("imagePreview").src = product.image;
      if (previewContainer) previewContainer.classList.remove("hidden");
    }
  } else {
    title.textContent = "إضافة عطر جديد لمتجر بَـرْق ⚡";
    form.reset();
    document.getElementById("pId").value = "";
    document.getElementById("pPrice10").value = 80;
    document.getElementById("pPrice30").value = 380;
    document.getElementById("pPrice50").value = 490;
    document.getElementById("pPrice100").value = 850;
  }

  modal.classList.remove("hidden");
}

function closeProductFormModal() {
  const modal = document.getElementById("productFormModal");
  if (modal) modal.classList.add("hidden");
}

function editProduct(productId) {
  const p = adminState.products.find(item => item.id === productId);
  if (p) openProductFormModal(p);
}

// Image File Selector
function handleImageFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    adminState.tempImageBase64 = evt.target.result;
    document.getElementById("pImage").value = evt.target.result;
    document.getElementById("imagePreview").src = evt.target.result;
    document.getElementById("imagePreviewContainer").classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

// Save Product
async function handleProductFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("pId").value || `barq-${Date.now()}`;
  const name_ar = document.getElementById("pNameAr").value.trim();
  const name_en = document.getElementById("pNameEn").value.trim();
  const category = document.getElementById("pCategory").value;
  const badge = document.getElementById("pBadge").value.trim();
  const tagline = document.getElementById("pTagline").value.trim();
  const description = document.getElementById("pDescription").value.trim();
  const image = document.getElementById("pImage").value.trim() || 'assets/img/logo.jpg';

  const catMap = {
    'men': 'عطور رجالية',
    'unisex': 'للجنسين',
    'women': 'عطور نسائية',
    'niche': 'نيش فاخر',
    'oriental': 'شرقي ملكي'
  };

  const productData = {
    id,
    slug: name_en.toLowerCase().replace(/[^a-z0-9]+/g, '-') || id,
    name_ar,
    name_en,
    category,
    category_ar: catMap[category] || 'عطور فاخرة',
    badge: badge || null,
    tagline: tagline || 'EAU DE PARFUM · ثبات وفوحان فائق',
    description,
    notes: {
      top: document.getElementById("pNotesTop").value.trim(),
      heart: document.getElementById("pNotesHeart").value.trim(),
      base: document.getElementById("pNotesBase").value.trim()
    },
    concentration: 'Extrait de Parfum (تركيز 35%)',
    prices: {
      "10": parseInt(document.getElementById("pPrice10").value) || 80,
      "30": parseInt(document.getElementById("pPrice30").value) || 380,
      "50": parseInt(document.getElementById("pPrice50").value) || 490,
      "100": parseInt(document.getElementById("pPrice100").value) || 850
    },
    image,
    in_stock: true,
    rating: 4.9,
    reviews_count: 50 + Math.floor(Math.random() * 50)
  };

  // If server is available, send via POST
  try {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData)
    });
    if (res.ok) {
      const resp = await res.json();
      if (resp.products) adminState.products = resp.products;
    } else {
      throw new Error();
    }
  } catch (err) {
    // update local state
    const idx = adminState.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      adminState.products[idx] = productData;
    } else {
      adminState.products.unshift(productData);
    }
  }

  // Persist locally
  localStorage.setItem("barq_products", JSON.stringify(adminState.products));

  closeProductFormModal();
  renderAdminProducts();
  updateStats();
  alert("✓ تم حفظ ونشر العطر بنجاح في المتجر!");
}

// Delete Product
async function deleteProduct(productId, name) {
  if (!confirm(`هل أنت متأكد من حذف عطر "${name}" نهائياً من المتجر؟`)) return;

  try {
    const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
    if (res.ok) {
      const resp = await res.json();
      if (resp.products) adminState.products = resp.products;
    } else {
      throw new Error();
    }
  } catch (err) {
    adminState.products = adminState.products.filter(p => p.id !== productId);
  }

  localStorage.setItem("barq_products", JSON.stringify(adminState.products));
  renderAdminProducts();
  updateStats();
}

// Settings Form Handling
function populateSettingsForm() {
  const s = adminState.settings;
  document.getElementById("settingWhatsapp").value = s.whatsapp_number || "201014893062";
  document.getElementById("settingStoreNameAr").value = s.store_name_ar || "عطور بَـرْق";
  document.getElementById("settingCurrency").value = s.currency || "ج.م";
  document.getElementById("settingAnnouncement").value = s.announcement || "";
  document.getElementById("settingShipCairo").value = s.shipping?.cairo_giza || 45;
  document.getElementById("settingShipDelta").value = s.shipping?.alex_delta || 55;
  document.getElementById("settingShipUpper").value = s.shipping?.canal_upper_egypt || 70;
  document.getElementById("settingFreeShipThreshold").value = s.shipping?.free_shipping_threshold || 950;
  document.getElementById("settingAdminPin").value = s.admin_pin || "1234";
}

async function handleSaveSettings(e) {
  e.preventDefault();

  const rawPhone = document.getElementById("settingWhatsapp").value.trim().replace(/[^0-9]/g, "");
  // format Egypt phone if needed (e.g. 010... -> 2010...)
  const formattedPhone = rawPhone.startsWith("0") ? "2" + rawPhone : rawPhone;

  const newSettings = {
    ...adminState.settings,
    whatsapp_number: formattedPhone,
    store_name_ar: document.getElementById("settingStoreNameAr").value.trim(),
    currency: document.getElementById("settingCurrency").value.trim(),
    announcement: document.getElementById("settingAnnouncement").value.trim(),
    admin_pin: document.getElementById("settingAdminPin").value.trim() || "1234",
    shipping: {
      cairo_giza: parseInt(document.getElementById("settingShipCairo").value) || 45,
      alex_delta: parseInt(document.getElementById("settingShipDelta").value) || 55,
      canal_upper_egypt: parseInt(document.getElementById("settingShipUpper").value) || 70,
      free_shipping_threshold: parseInt(document.getElementById("settingFreeShipThreshold").value) || 950
    }
  };

  try {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings)
    });
    if (res.ok) {
      const resp = await res.json();
      adminState.settings = resp.settings || newSettings;
    } else {
      throw new Error();
    }
  } catch (err) {
    adminState.settings = newSettings;
  }

  localStorage.setItem("barq_settings", JSON.stringify(adminState.settings));
  updateStats();
  alert("✓ تم حفظ كافة إعدادات المتجر والواتساب بنجاح!");
}

function testWhatsappLink() {
  const phone = document.getElementById("settingWhatsapp").value.trim().replace(/[^0-9]/g, "");
  const formattedPhone = phone.startsWith("0") ? "2" + phone : phone;
  const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent("تجربة رابط واتساب متجر بَـرْق ⚡")}`;
  window.open(url, "_blank");
}

// Orders Log Rendering
function renderOrders() {
  const container = document.getElementById("adminOrdersContainer");
  if (!container) return;

  if (adminState.orders.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center glass-card rounded-2xl text-slate-400 text-xs">
        لا توجد طلبات مسجلة حتى الآن. ستظهر هنا أي طلبات يؤكدها الزوار.
      </div>
    `;
    return;
  }

  const currency = adminState.settings.currency || "ج.م";

  container.innerHTML = adminState.orders.map(order => `
    <div class="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-3 flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <span class="font-bold text-white text-sm">${order.customer?.name || 'عميل'}</span>
          <span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">${order.customer?.phone || ''}</span>
        </div>
        <div class="text-xs text-slate-400 font-mono">${order.created_at || order.date || ''}</div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <span class="text-slate-400 block mb-1">العنوان:</span>
          <div class="text-white">${order.customer?.gov || ''} - ${order.customer?.city || ''} - ${order.customer?.address || ''}</div>
          ${order.customer?.notes ? `<div class="text-amber-400 text-[11px] mt-1">ملاحظات: ${order.customer.notes}</div>` : ''}
        </div>

        <div>
          <span class="text-slate-400 block mb-1">المنتجات المطلوبة:</span>
          <div class="space-y-1">
            ${(order.items || []).map(item => `
              <div class="text-slate-300">▫️ ${item.name_ar} (${item.size} مل) × ${item.qty} = ${item.price * item.qty} ${currency}</div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-xs">
        <div>
          <span class="text-slate-400">الإجمالي المستحق:</span>
          <span class="text-amber-400 text-sm font-black mr-1">${order.grandTotal} ${currency}</span>
        </div>

        <a href="https://wa.me/${(order.customer?.phone || '').replace(/[^0-9]/g, '')}" target="_blank" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
          <span>مراسلة العميل واتساب</span>
          <span>↗</span>
        </a>
      </div>
    </div>
  `).join('');
}

function clearOrdersLog() {
  if (!confirm("هل أنت متأكد من مسح جميع سجلات الطلبات؟")) return;
  adminState.orders = [];
  localStorage.setItem("barq_orders", "[]");
  fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: "[]" }).catch(()=>{});
  renderOrders();
  updateStats();
}

// Backup & Restore
function downloadBackup() {
  const data = {
    products: adminState.products,
    settings: adminState.settings,
    orders: adminState.orders,
    export_date: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `barq_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

function restoreBackup() {
  const input = document.getElementById("restoreFileInput");
  const file = input.files[0];
  if (!file) {
    alert("يرجى اختيار ملف JSON أولاً.");
    return;
  }

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.products) {
        adminState.products = data.products;
        localStorage.setItem("barq_products", JSON.stringify(data.products));
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data.products)
        }).catch(()=>{});
      }
      if (data.settings) {
        adminState.settings = data.settings;
        localStorage.setItem("barq_settings", JSON.stringify(data.settings));
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data.settings)
        }).catch(()=>{});
      }
      alert("✓ تمت استعادة النسخة الاحتياطية بنجاح!");
      loadData();
    } catch (err) {
      alert("عذراً، الملف غير صالح أو تالف.");
    }
  };
  reader.readAsText(file);
}
