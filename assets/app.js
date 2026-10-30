/**
 * BARQ FRAGRANCES — Core Application Logic
 * Lail Fragrances Luxury Minimalist Theme
 * Clean light luxury aesthetic, WhatsApp checkout engine, REST API sync
 */

// Application State
let state = {
  products: [],
  settings: {
    store_name: "BARQ FRAGRANCES",
    store_name_ar: "عطور بَـرْق",
    tagline: "الفخامة في كل رشة · Extrait de Parfum",
    whatsapp_number: "201014893062",
    currency: "ج.م",
    shipping: {
      cairo_giza: 45,
      alex_delta: 55,
      canal_upper_egypt: 70,
      free_shipping_threshold: 950
    },
    coupons: [
      { code: "BARQ10", discount_percent: 10, active: true },
      { code: "VIP20", discount_percent: 20, min_order: 1000, active: true }
    ],
    announcement: "⚡ شحن سريع لكافة محافظات مصر · كود خصم ترحيبي 10%: BARQ10 · الدفع عند الاستلام بعد المعاينة 💵"
  },
  cart: [],
  activeCoupon: null,
  selectedGovernorate: "",
  activeCategory: "all",
  searchQuery: "",
  productSizesSelected: {} // maps productId -> currently selected size string (e.g. "50")
};

// Egyptian governorates shipping category classifier
function getShippingFeeForGov(govName, subtotalAfterDiscount) {
  if (subtotalAfterDiscount >= (state.settings.shipping?.free_shipping_threshold || 950)) {
    return 0; // Free shipping threshold met!
  }

  const cairoGiza = ["القاهرة", "الجيزة", "القليوبية"];
  const deltaAlex = ["الإسكندرية", "البحيرة", "الغربية", "كفر الشيخ", "المنوفية", "الدقهلية", "الشرقية", "دمياط"];
  
  if (cairoGiza.includes(govName)) {
    return state.settings.shipping?.cairo_giza || 45;
  } else if (deltaAlex.includes(govName)) {
    return state.settings.shipping?.alex_delta || 55;
  } else {
    // Upper Egypt, Canal, Red Sea, Sinai, Matrouh
    return state.settings.shipping?.canal_upper_egypt || 70;
  }
}

// ==========================================
// Initialization & Data Loading
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  const yr = document.getElementById("currentYear");
  if (yr) yr.textContent = new Date().getFullYear();
  loadCartFromStorage();
  await loadSettings();
  await loadProducts();
  setupEventListeners();
  updateWhatsAppLinks();
});

// Load Settings from API or LocalStorage
async function loadSettings() {
  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      state.settings = { ...state.settings, ...data };
      localStorage.setItem("barq_settings", JSON.stringify(state.settings));
    } else {
      throw new Error("API not available");
    }
  } catch (err) {
    const cached = localStorage.getItem("barq_settings");
    if (cached) {
      try {
        state.settings = { ...state.settings, ...JSON.parse(cached) };
      } catch (e) {}
    }
  }

  // Update Announcement Bar
  if (state.settings.announcement) {
    const el = document.getElementById("announcementText");
    if (el) el.innerHTML = state.settings.announcement;
  }
}

// Load Products from API or LocalStorage/Fallback JSON
async function loadProducts() {
  try {
    const res = await fetch("/api/products");
    if (res.ok) {
      state.products = await res.json();
      localStorage.setItem("barq_products", JSON.stringify(state.products));
    } else {
      throw new Error("API error");
    }
  } catch (err) {
    // Try localStorage
    const cached = localStorage.getItem("barq_products");
    if (cached) {
      try {
        state.products = JSON.parse(cached);
      } catch (e) {}
    } else {
      // Try local data/products.json file
      try {
        const fileRes = await fetch("data/products.json");
        if (fileRes.ok) {
          state.products = await fileRes.json();
          localStorage.setItem("barq_products", JSON.stringify(state.products));
        }
      } catch (e) {}
    }
  }

  // Initialize default selected size (50ml) for each product
  state.products.forEach(p => {
    if (!state.productSizesSelected[p.id]) {
      state.productSizesSelected[p.id] = "50";
    }
  });

  renderProducts();
}

// Update all direct WhatsApp links across the page
function updateWhatsAppLinks() {
  const phone = (state.settings.whatsapp_number || "201014893062").replace(/[^0-9]/g, "");
  const directLink = `https://wa.me/${phone}?text=${encodeURIComponent("مرحباً عطور بَـرْق، أود الاستفسار عن تشكيلة العطور والعروض المتاحة ⚡")}`;
  
  const directBtn = document.getElementById("directWaChatBtn");
  if (directBtn) directBtn.href = directLink;

  const footerBtn = document.getElementById("footerWaBtn");
  if (footerBtn) footerBtn.href = directLink;

  const floatingBtn = document.getElementById("floatingWaBtn");
  if (floatingBtn) floatingBtn.href = directLink;

  const menuWaBtn = document.getElementById("menuWaBtn");
  if (menuWaBtn) menuWaBtn.href = directLink;
}

// ==========================================
// Product Rendering & Filtering (Lail Mobile 2-Column Luxury Style)
// ==========================================
function renderProducts() {
  const container = document.getElementById("productsGrid");
  const noFound = document.getElementById("noProductsFound");
  if (!container) return;

  const filtered = state.products.filter(p => {
    // Category match
    const matchCat = state.activeCategory === "all" || p.category === state.activeCategory;
    // Search match
    const q = state.searchQuery.toLowerCase().trim();
    const matchSearch = !q || 
      (p.name_ar && p.name_ar.toLowerCase().includes(q)) ||
      (p.name_en && p.name_en.toLowerCase().includes(q)) ||
      (p.inspired_short && p.inspired_short.toLowerCase().includes(q)) ||
      (p.inspired && p.inspired.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.notes && (
        (p.notes.top && p.notes.top.toLowerCase().includes(q)) ||
        (p.notes.heart && p.notes.heart.toLowerCase().includes(q)) ||
        (p.notes.base && p.notes.base.toLowerCase().includes(q))
      ));
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = "";
    if (noFound) noFound.classList.remove("hidden");
    return;
  }

  if (noFound) noFound.classList.add("hidden");

  container.innerHTML = filtered.map(product => {
    const prices = Object.values(product.prices || { "30": 280, "50": 390 });
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const origPrices = Object.values(product.original_prices || { "30": 350, "50": 450 });
    const minOrig = Math.min(...origPrices);
    const maxOrig = Math.max(...origPrices);

    return `
      <article class="lail-card group cursor-pointer flex flex-col select-none transition-all duration-300" 
               onclick="openProductModal('${product.id}')" 
               data-product-id="${product.id}">
        
        <!-- Image Box (Square Container, Rounded, Soft Neutral BG) -->
        <div class="relative aspect-square w-full bg-[#f6f6f8] rounded-2xl sm:rounded-3xl overflow-hidden flex items-center justify-center p-3 sm:p-5 border border-gray-100 transition-all duration-300 group-hover:shadow-md">
          
          <!-- Top-Left 'Inspired By' Badge -->
          <div dir="ltr" class="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full border border-gray-200/60 shadow-xs">
            <span class="text-[9px] sm:text-[10px] text-gray-700 font-semibold italic">Inspired By</span>
            <span class="text-[9px] sm:text-[10px]">✨</span>
          </div>

          <!-- Top-Right Discount Badge -->
          <div dir="ltr" class="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10">
            <span class="bg-[#4E3D97] text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
              ${product.discount_label || '21% OFF!'}
            </span>
          </div>

          <!-- Bottle Image with Smooth Hover Zoom -->
          <img src="${product.image || 'assets/img/logo.jpg'}" 
               alt="${product.name_en}" 
               loading="lazy" 
               class="w-full h-full object-contain p-2 sm:p-3 transition-transform duration-500 group-hover:scale-105">

          <!-- Bottom-Right Circular Quick Details / Action Button -->
          <button type="button" 
                  onclick="event.stopPropagation(); openProductModal('${product.id}')" 
                  class="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 bg-white/95 hover:bg-white text-gray-800 rounded-full shadow-md border border-gray-200 flex items-center justify-center transition-all duration-200 active:scale-95" 
                  title="عرض التفاصيل والنوتات">
            <svg class="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
            </svg>
          </button>
        </div>

        <!-- Typography Below Image (Centered, Clean Luxury) -->
        <div class="pt-2.5 sm:pt-3 pb-1 text-center space-y-1">
          <!-- Line 1: Short Inspiration Name -->
          <p class="text-[11px] sm:text-xs text-gray-500 font-medium truncate px-1 leading-tight">
            ${product.inspired_short || product.inspired || ''}
          </p>

          <!-- Line 2: Perfume Name in Bold Uppercase -->
          <h3 class="text-xs sm:text-sm font-black text-gray-900 tracking-wider uppercase font-display">
            ${product.name_en}
          </h3>

          <!-- Line 3: Price Range & Crossed-out Original Price -->
          <div class="flex flex-col items-center justify-center leading-tight">
            <span class="text-xs sm:text-sm font-black text-[#4E3D97]">
              LE ${minPrice}.00 – LE ${maxPrice}.00
            </span>
            <span class="text-[10px] sm:text-xs text-gray-400 line-through">
              LE ${minOrig}.00 – LE ${maxOrig}.00
            </span>
          </div>
        </div>

      </article>
    `;
  }).join('');
}

// Drawer & Filter Navigation Helpers
function toggleFilterDrawer() {
  const drawer = document.getElementById("filterDrawer");
  if (!drawer) return;
  drawer.classList.toggle("hidden");
  if (!drawer.classList.contains("hidden")) {
    drawer.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function focusSearchDrawer() {
  const drawer = document.getElementById("filterDrawer");
  if (drawer && drawer.classList.contains("hidden")) {
    drawer.classList.remove("hidden");
  }
  const input = document.getElementById("searchInput");
  if (input) {
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => input.focus(), 300);
  }
}

function sortProducts(criteria) {
  if (criteria === "price-asc") {
    state.products.sort((a, b) => (a.prices?.["50"] || 390) - (b.prices?.["50"] || 390));
  } else if (criteria === "price-desc") {
    state.products.sort((a, b) => (b.prices?.["50"] || 390) - (a.prices?.["50"] || 390));
  } else if (criteria === "popular") {
    state.products.sort((a, b) => (b.reviews_count || 48) - (a.reviews_count || 48));
  } else {
    // Default
    state.products.sort((a, b) => a.id.localeCompare(b.id));
  }
  renderProducts();
}

// Reset search and category filters
function resetFilters() {
  state.activeCategory = "all";
  state.searchQuery = "";
  const sInput = document.getElementById("searchInput");
  if (sInput) sInput.value = "";
  
  document.querySelectorAll(".cat-pill").forEach(p => {
    if (p.dataset.cat === "all") {
      p.className = "cat-pill active px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap bg-[#111111] text-white shadow-sm";
    } else {
      p.className = "cat-pill px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap bg-white text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-400";
    }
  });

  renderProducts();
}

// Seamless 3D Studio Navigation & Spray Trigger
function showIn3D(productId) {
  if (window.BARQ_3D) {
    window.BARQ_3D.switchPerfume(productId);
  }
  const el = document.getElementById("studio3dSection");
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      if (window.BARQ_3D) {
        window.BARQ_3D.spray();
      }
    }, 700);
  }
}

// Switch Image Tab in Modal (Bottle vs Scent Notes Infographic)
function switchModalTab(tab, bottleSrc, notesSrc) {
  const img = document.getElementById("modalActiveImg");
  const tabBottle = document.getElementById("modalTabBottle");
  const tabNotes = document.getElementById("modalTabNotes");
  if (!img) return;

  if (tab === 'bottle') {
    img.src = bottleSrc;
    img.className = "w-full h-full object-contain transition-all duration-300";
    if (tabBottle) {
      tabBottle.className = "flex-1 py-2 px-3 text-xs font-black rounded-xl bg-[#4E3D97] text-white shadow-sm transition-all flex items-center justify-center gap-1.5";
    }
    if (tabNotes) {
      tabNotes.className = "flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-white text-gray-700 hover:text-gray-900 border border-gray-200 transition-all flex items-center justify-center gap-1.5";
    }
  } else {
    img.src = notesSrc;
    img.className = "w-full h-full object-cover rounded-2xl transition-all duration-300";
    if (tabNotes) {
      tabNotes.className = "flex-1 py-2 px-3 text-xs font-black rounded-xl bg-[#4E3D97] text-white shadow-sm transition-all flex items-center justify-center gap-1.5";
    }
    if (tabBottle) {
      tabBottle.className = "flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-white text-gray-700 hover:text-gray-900 border border-gray-200 transition-all flex items-center justify-center gap-1.5";
    }
  }
}

// Select size in modal and update price labels
function modalSelectSize(productId, size) {
  state.productSizesSelected[productId] = size;
  openProductModal(productId);
}

// ==========================================
// Product Details Modal (Full Notes & Specs Inside)
// ==========================================
function openProductModal(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const selectedSize = state.productSizesSelected[product.id] || "50";
  const currentPrice = product.prices?.[selectedSize] || product.prices?.["50"] || 390;
  const oldPrice = product.original_prices?.[selectedSize] || 450;
  const savings = Math.max(0, oldPrice - currentPrice);
  const currency = state.settings.currency || "ج.م";

  const modal = document.getElementById("productModal");
  const content = document.getElementById("productModalContent");
  if (!modal || !content) return;

  const bottleImg = product.image || 'assets/img/logo.jpg';
  const notesImg = product.notes_image || product.banner_image || product.image;

  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
      
      <!-- Visuals Area with Tabs: Bottle Image vs Visual Pyramid Infographic -->
      <div class="space-y-3">
        <!-- Switcher Tabs -->
        <div class="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl">
          <button type="button" 
                  id="modalTabBottle"
                  onclick="switchModalTab('bottle', '${bottleImg}', '${notesImg}')"
                  class="flex-1 py-2 px-3 text-xs font-black rounded-xl bg-[#4E3D97] text-white shadow-sm transition-all flex items-center justify-center gap-1.5">
            <span>🧴</span> <span>صورة الزجاجة</span>
          </button>
          <button type="button" 
                  id="modalTabNotes"
                  onclick="switchModalTab('notes', '${bottleImg}', '${notesImg}')"
                  class="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-white text-gray-700 hover:text-gray-900 border border-gray-200 transition-all flex items-center justify-center gap-1.5">
            <span>🌿</span> <span>الهرم العطري المصور</span>
          </button>
        </div>

        <!-- Main Display Container -->
        <div class="relative aspect-square w-full rounded-3xl bg-[#f8f9fa] border border-gray-200 overflow-hidden flex items-center justify-center p-4 sm:p-6 shadow-inner">
          <img id="modalActiveImg" 
               src="${bottleImg}" 
               alt="${product.name_ar}" 
               class="w-full h-full object-contain transition-all duration-300">
          
          <div dir="ltr" class="absolute top-3 right-3">
            <span class="bg-[#4E3D97] text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
              ${product.discount_label || '21% OFF!'}
            </span>
          </div>

          <div dir="ltr" class="absolute top-3 left-3">
            <span class="bg-white/90 backdrop-blur-md text-gray-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-gray-200 shadow-sm flex items-center gap-1">
              <span>★ 5.0</span>
            </span>
          </div>
        </div>

        <div class="text-center">
          <span class="text-[11px] text-gray-500 font-medium">
            💡 اضغط على "الهرم العطري المصور" لعرض بوستر المكونات والنوتات الطبيعية
          </span>
        </div>
      </div>

      <!-- Details & Actions Area -->
      <div class="space-y-4">
        
        <!-- Header Info -->
        <div>
          <div class="flex flex-wrap items-center gap-2 mb-1.5">
            <span class="bg-[#4E3D97]/10 text-[#4E3D97] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              EXTRAIT DE PARFUM
            </span>
            <span class="text-amber-500 text-xs font-bold flex items-center gap-1">
              ★ 5.0 (تقييم ممتاز)
            </span>
          </div>

          <h2 class="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
            ${product.name_ar}
          </h2>

          <div class="text-xs font-extrabold text-[#4E3D97] uppercase tracking-wider mt-0.5">
            ${product.name_en} · EXTRAIT DE PARFUM · ${selectedSize} ML
          </div>

          <div class="mt-2 inline-flex items-center gap-1.5 bg-purple-50 text-[#4E3D97] border border-purple-200/70 text-xs font-bold px-3 py-1 rounded-xl">
            <span>✨</span>
            <span>${product.inspired || ('مستوحى من: ' + product.inspired_short)}</span>
          </div>
        </div>

        <!-- Performance Specs Badges (From user request screenshot) -->
        <div class="space-y-1.5">
          <div class="bg-gray-50 border border-gray-200/90 rounded-2xl p-2.5 flex items-center justify-between text-xs">
            <span class="font-extrabold text-gray-900">⚡ INTENSITY:</span>
            <span class="text-gray-700 font-semibold">${product.intensity || 'VERY STRONG (مغناطيسي جذاب)'}</span>
          </div>
          <div class="bg-gray-50 border border-gray-200/90 rounded-2xl p-2.5 flex items-center justify-between text-xs">
            <span class="font-extrabold text-gray-900">🕒 LONGEVITY:</span>
            <span class="text-gray-700 font-semibold">${product.longevity || '+12 HOURS (ثبات استثنائي)'}</span>
          </div>
          <div class="bg-gray-50 border border-gray-200/90 rounded-2xl p-2.5 flex items-center justify-between text-xs">
            <span class="font-extrabold text-gray-900">➕ PROJECTION:</span>
            <span class="text-gray-700 font-semibold">${product.projection || '+2.5 HOURS (هالة دافئة ساحرة)'}</span>
          </div>
        </div>

        <!-- Scent Notes & Hints Box -->
        <div class="bg-gray-50 rounded-2xl p-3.5 border border-gray-200/80 space-y-2">
          <div class="flex items-center justify-between text-xs border-b border-gray-200/70 pb-2">
            <span class="font-black text-gray-900 uppercase tracking-wider">الهرم العطري والمكونات:</span>
            <span class="text-[10px] text-gray-400 font-bold uppercase">NOTES & HINTS</span>
          </div>

          <!-- Raw Ingredients Summary -->
          <p class="text-xs text-gray-700 leading-relaxed font-medium">
            ${product.notes_list ? product.notes_list.join('، ') : (product.notes ? `${product.notes.top}، ${product.notes.heart}، ${product.notes.base}` : '')}
          </p>

          <!-- Pyramid Breakdown -->
          ${product.notes ? `
            <div class="grid grid-cols-1 gap-1.5 pt-1 text-[11px]">
              <div class="p-2 rounded-xl bg-purple-50/70 border border-purple-100/90 flex items-start gap-1.5">
                <span class="font-black text-[#4E3D97] whitespace-nowrap">🌸 قمة العطر:</span>
                <span class="text-gray-800 font-medium">${product.notes.top}</span>
              </div>
              <div class="p-2 rounded-xl bg-amber-50/70 border border-amber-100/90 flex items-start gap-1.5">
                <span class="font-black text-amber-900 whitespace-nowrap">🌿 قلب العطر:</span>
                <span class="text-gray-800 font-medium">${product.notes.heart}</span>
              </div>
              <div class="p-2 rounded-xl bg-slate-100/80 border border-slate-200/90 flex items-start gap-1.5">
                <span class="font-black text-gray-900 whitespace-nowrap">🪵 قاعدة العطر:</span>
                <span class="text-gray-800 font-medium">${product.notes.base}</span>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Size Selection (30ml vs 50ml) -->
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-2">اختر الحجم:</label>
          <div class="grid grid-cols-2 gap-2.5">
            ${Object.keys(product.prices || {}).map(sz => {
              const pPrice = product.prices[sz];
              const isSel = sz === selectedSize;
              return `
                <button type="button" 
                        onclick="modalSelectSize('${product.id}', '${sz}')" 
                        class="py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border text-center ${
                          isSel 
                            ? 'bg-[#4E3D97] border-[#4E3D97] text-white shadow-md' 
                            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:text-gray-900'
                        }">
                  <div class="font-black text-xs sm:text-sm">${sz} مل ${sz === '50' ? '(الحجم القياسي)' : ''}</div>
                  <div class="text-[11px] font-semibold ${isSel ? 'text-purple-200' : 'text-gray-500'}">${pPrice} ${currency}</div>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Pricing Display -->
        <div class="pt-2 border-t border-gray-100 flex items-center justify-between">
          <div class="text-xs text-gray-500 font-bold">
            السعر للحجم ${selectedSize} مل:
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-xs sm:text-sm text-gray-400 line-through">${oldPrice} ${currency}</span>
            <span class="text-2xl sm:text-3xl font-black text-gray-900 font-display">${currentPrice}</span>
            <span class="text-xs sm:text-sm font-bold text-gray-600">${currency}</span>
            ${savings > 0 ? `
              <span class="bg-red-50 text-red-600 border border-red-200 text-[10px] font-black px-2 py-0.5 rounded-md">
                وفر ${savings} ${currency}
              </span>
            ` : ''}
          </div>
        </div>

        <!-- CTAs: Add to Cart + Instant WhatsApp Checkout -->
        <div class="grid grid-cols-2 gap-2 pt-1">
          <button onclick="addToCart('${product.id}', '${selectedSize}'); closeProductModal();" 
                  class="bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-black py-3 px-3 rounded-2xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 hover:border-[#4E3D97]">
            <svg class="w-4 h-4 text-[#4E3D97]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            <span>أضف هذا العطر للسلة</span>
          </button>

          <button onclick="instantBuy('${product.id}', '${selectedSize}'); closeProductModal();" 
                  class="bg-[#4E3D97] hover:bg-[#3d2f78] text-white font-black py-3 px-3 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95">
            <span>⚡ طلب فوري</span>
          </button>
        </div>

        <!-- 3D Studio Live Switcher & Spray Button -->
        <div>
          <button onclick="closeProductModal(); showIn3D('${product.id}');" 
                  class="w-full bg-gray-50 hover:bg-purple-50 text-gray-800 hover:text-[#4E3D97] border border-gray-200 hover:border-[#4E3D97]/40 font-bold py-2.5 px-3 rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs">
            <span>✨ عرض وتجربة الرشة في استوديو 3D</span>
            <span>←</span>
          </button>
        </div>

      </div>

    </div>
  `;

  modal.classList.remove("hidden");
}

function closeProductModal() {
  const modal = document.getElementById("productModal");
  if (modal) modal.classList.add("hidden");
}

// ==========================================
// Cart State & Storage
// ==========================================
function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem("barq_cart");
    state.cart = raw ? JSON.parse(raw) : [];
  } catch (e) {
    state.cart = [];
  }
  updateCartUI();
}

function saveCartToStorage() {
  localStorage.setItem("barq_cart", JSON.stringify(state.cart));
  updateCartUI();
}

function addToCart(productId, size = "50") {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const price = product.prices?.[size] || product.prices?.["50"] || 450;
  const existing = state.cart.find(i => i.productId === productId && i.size === size);

  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({
      productId: product.id,
      name_ar: product.name_ar,
      name_en: product.name_en,
      size: size,
      price: price,
      qty: 1,
      image: product.image
    });
  }

  saveCartToStorage();
  showCartToast(`تمت إضافة ${product.name_ar} (${size} مل) إلى السلة`);
  openCart();
}

function updateCartItemQty(idx, change) {
  if (!state.cart[idx]) return;
  state.cart[idx].qty += change;
  if (state.cart[idx].qty <= 0) {
    state.cart.splice(idx, 1);
  }
  saveCartToStorage();
}

function removeCartItem(idx) {
  state.cart.splice(idx, 1);
  saveCartToStorage();
}

function calculateCartTotals() {
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let discount = 0;

  if (state.activeCoupon && state.activeCoupon.active) {
    if (!state.activeCoupon.min_order || subtotal >= state.activeCoupon.min_order) {
      discount = Math.round((subtotal * (state.activeCoupon.discount_percent || 0)) / 100);
    }
  }

  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const shippingFee = state.selectedGovernorate ? getShippingFeeForGov(state.selectedGovernorate, subtotalAfterDiscount) : null;
  const grandTotal = subtotalAfterDiscount + (shippingFee !== null ? shippingFee : 0);

  return { subtotal, discount, subtotalAfterDiscount, shippingFee, grandTotal };
}

function updateCartUI() {
  const totalItems = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const { subtotal, discount, shippingFee, grandTotal } = calculateCartTotals();
  const currency = state.settings.currency || "ج.م";

  // Badges
  const countBadge = document.getElementById("cartCountBadge");
  if (countBadge) countBadge.textContent = totalItems;

  const countMobile = document.getElementById("cartCountMobile");
  if (countMobile) countMobile.textContent = totalItems;

  const drawerCount = document.getElementById("cartDrawerCount");
  if (drawerCount) drawerCount.textContent = `(${totalItems})`;

  const totalNav = document.getElementById("cartTotalNav");
  if (totalNav) totalNav.textContent = `${subtotal} ${currency}`;

  // Totals in cart drawer
  const subtotalEl = document.getElementById("cartSubtotal");
  if (subtotalEl) subtotalEl.textContent = `${subtotal} ${currency}`;

  const discountRow = document.getElementById("discountRow");
  const discountEl = document.getElementById("cartDiscount");
  if (discountRow && discountEl) {
    if (discount > 0) {
      discountRow.classList.remove("hidden");
      discountEl.textContent = `-${discount} ${currency} (${state.activeCoupon.code})`;
    } else {
      discountRow.classList.add("hidden");
    }
  }

  const grandTotalEl = document.getElementById("cartGrandTotal");
  if (grandTotalEl) grandTotalEl.textContent = `${grandTotal} ${currency}`;

  // Free shipping progress bar
  const threshold = state.settings.shipping?.free_shipping_threshold || 950;
  const freeShipBar = document.getElementById("freeShippingProgress");
  const freeShipText = document.getElementById("freeShippingText");
  if (freeShipBar && freeShipText) {
    const remaining = Math.max(0, threshold - subtotal);
    const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
    freeShipBar.style.width = `${pct}%`;
    if (remaining === 0) {
      freeShipText.innerHTML = `🎉 مبروك! حصلت على <strong>شحن مجاني</strong> لكافة المحافظات!`;
    } else {
      freeShipText.innerHTML = `أضف بـ <strong>${remaining} ${currency}</strong> إضافية للحصول على <strong>شحن مجاني</strong> 🚚`;
    }
  }

  // Render items in cart drawer
  const container = document.getElementById("cartItemsList");
  if (!container) return;

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="text-center py-16 space-y-3">
        <div class="text-5xl opacity-40">🛍️</div>
        <p class="text-sm font-bold text-gray-800">سلة مشترياتك فارغة حالياً</p>
        <p class="text-xs text-gray-500">اختر عطرك المفضل من التشكيلة واطلبه الآن</p>
        <button onclick="closeCart()" class="text-xs text-[#4E3D97] underline font-bold mt-2">تصفح التشكيلة الآن</button>
      </div>
    `;
    const checkoutBtn = document.getElementById("goToCheckoutBtn");
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  const checkoutBtn = document.getElementById("goToCheckoutBtn");
  if (checkoutBtn) checkoutBtn.disabled = false;

  container.innerHTML = state.cart.map((item, idx) => `
    <div class="p-3.5 rounded-2xl bg-white border border-gray-200 flex items-center justify-between gap-3 shadow-sm">
      <div class="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 p-1 flex items-center justify-center">
        <img src="${item.image || 'assets/img/logo.jpg'}" alt="${item.name_ar}" class="w-full h-full object-contain">
      </div>

      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-sm text-gray-900 truncate">${item.name_ar}</h4>
        <div class="text-[11px] text-[#4E3D97] font-bold">${item.size} مل · ${item.price} ${currency}</div>
        
        <!-- Quantity control -->
        <div class="flex items-center gap-2 mt-2">
          <div class="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
            <button onclick="updateCartItemQty(${idx}, -1)" class="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-black hover:bg-gray-200 font-bold">-</button>
            <span class="w-7 text-center text-xs font-bold text-gray-900">${item.qty}</span>
            <button onclick="updateCartItemQty(${idx}, 1)" class="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-black hover:bg-gray-200 font-bold">+</button>
          </div>
          <span class="text-xs font-black text-gray-900">${item.price * item.qty} ${currency}</span>
        </div>
      </div>

      <button onclick="removeCartItem(${idx})" class="text-gray-400 hover:text-rose-600 p-1.5 transition-colors" title="حذف">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
      </button>
    </div>
  `).join('');
}

// Drawer Visibility
function openCart() {
  const drawer = document.getElementById("cartDrawer");
  if (drawer) drawer.classList.remove("hidden");
}

function closeCart() {
  const drawer = document.getElementById("cartDrawer");
  if (drawer) drawer.classList.add("hidden");
}

// Hamburger Menu Drawer Visibility
function openMenu() {
  const menu = document.getElementById("mobileMenuDrawer");
  if (menu) menu.classList.remove("hidden");
}

function closeMenu() {
  const menu = document.getElementById("mobileMenuDrawer");
  if (menu) menu.classList.add("hidden");
}

// Coupons
function applyCoupon() {
  const input = document.getElementById("couponInput");
  const msg = document.getElementById("couponMessage");
  if (!input || !msg) return;

  const code = input.value.trim().toUpperCase();
  if (!code) {
    msg.textContent = "يرجى كتابة كود الخصم أولاً";
    msg.className = "text-[11px] font-semibold text-rose-500";
    msg.classList.remove("hidden");
    return;
  }

  const found = (state.settings.coupons || []).find(c => c.code.toUpperCase() === code && c.active);
  if (found) {
    state.activeCoupon = found;
    msg.textContent = `✓ تم تطبيق كود الخصم بنجاح (${found.discount_percent}% خصم)`;
    msg.className = "text-[11px] font-semibold text-emerald-600";
    msg.classList.remove("hidden");
    updateCartUI();
  } else {
    state.activeCoupon = null;
    msg.textContent = "عذراً، هذا الكود غير صالح أو منتهي الصلاحية";
    msg.className = "text-[11px] font-semibold text-rose-500";
    msg.classList.remove("hidden");
    updateCartUI();
  }
}

// Instant 1-click buy for single product
function instantBuy(productId, size = "50") {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  // Add item if not already in cart
  const exists = state.cart.some(i => i.productId === productId && i.size === size);
  if (!exists) {
    state.cart = [{
      productId: product.id,
      name_ar: product.name_ar,
      name_en: product.name_en,
      size: size,
      price: product.prices?.[size] || 450,
      qty: 1,
      image: product.image
    }];
    saveCartToStorage();
  }

  openCheckoutModal();
}

// Toast notification
function showCartToast(message) {
  const toast = document.createElement("div");
  toast.className = "fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111111] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce";
  toast.innerHTML = `<span>⚡</span> <span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ==========================================
// WhatsApp Checkout Flow
// ==========================================
function openCheckoutModal() {
  if (state.cart.length === 0) {
    alert("سلتك فارغة! اختر عطراً أولاً.");
    return;
  }
  closeCart();

  const modal = document.getElementById("checkoutModal");
  const summary = document.getElementById("checkoutOrderSummary");
  const currency = state.settings.currency || "ج.م";

  const { subtotal, discount, shippingFee, grandTotal } = calculateCartTotals();

  summary.innerHTML = `
    <div class="font-bold text-gray-800 border-b border-gray-100 pb-2 flex justify-between">
      <span>العطور المختارة (${state.cart.reduce((s,i)=>s+i.qty, 0)} قطعة):</span>
      <span class="text-[#4E3D97]">${subtotal} ${currency}</span>
    </div>
    <div class="space-y-1 py-1 max-h-32 overflow-y-auto">
      ${state.cart.map(item => `
        <div class="flex justify-between text-gray-600 text-xs">
          <span>${item.name_ar} (${item.size} مل) × ${item.qty}</span>
          <span class="font-bold text-gray-900">${item.price * item.qty} ${currency}</span>
        </div>
      `).join('')}
    </div>
    <div class="border-t border-gray-100 pt-2 space-y-1 text-xs text-gray-600">
      ${discount > 0 ? `<div class="flex justify-between text-emerald-600"><span>الخصم:</span><span>-${discount} ${currency}</span></div>` : ''}
      <div class="flex justify-between">
        <span>مصاريف الشحن:</span>
        <span id="checkoutShippingLabel" class="font-bold text-[#4E3D97]">${shippingFee !== null ? (shippingFee === 0 ? 'مجاني 🎁' : `${shippingFee} ${currency}`) : 'اختر المحافظة لمعرفة الشحن'}</span>
      </div>
      <div class="flex justify-between text-sm font-black text-gray-900 pt-1 border-t border-gray-200">
        <span>الإجمالي النهائي المستحق:</span>
        <span id="checkoutGrandTotalLabel" class="text-xl text-[#4E3D97]">${grandTotal} ${currency}</span>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
}

function closeCheckoutModal() {
  const modal = document.getElementById("checkoutModal");
  if (modal) modal.classList.add("hidden");
}

function updateShippingFee() {
  const govSelect = document.getElementById("custGov");
  if (!govSelect) return;
  state.selectedGovernorate = govSelect.value;

  const { discount, shippingFee, grandTotal } = calculateCartTotals();
  const currency = state.settings.currency || "ج.م";

  const shipLabel = document.getElementById("checkoutShippingLabel");
  const totalLabel = document.getElementById("checkoutGrandTotalLabel");

  if (shipLabel) {
    shipLabel.textContent = shippingFee === 0 ? "مجاني 🎁 (عرض الشحن المجاني)" : `${shippingFee} ${currency}`;
  }
  if (totalLabel) {
    totalLabel.textContent = `${grandTotal} ${currency}`;
  }
}

// Generate the WhatsApp message and open it!
async function handleCheckoutSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const altPhone = document.getElementById("custAltPhone").value.trim();
  const gov = document.getElementById("custGov").value;
  const city = document.getElementById("custCity").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const notes = document.getElementById("custNotes").value.trim();

  if (!name || !phone || !gov || !city || !address) {
    alert("يرجى ملء جميع الحقول الإلزامية المطلوبة لإتمام الشحن.");
    return;
  }

  const { subtotal, discount, shippingFee, grandTotal } = calculateCartTotals();
  const currency = state.settings.currency || "ج.م";
  const storePhone = (state.settings.whatsapp_number || "201014893062").replace(/[^0-9]/g, "");

  // Construct Clean WhatsApp Order Message
  let messageLines = [
    `⚡ *طلب شراء جديد — عطور بَـرْق (BARQ FRAGRANCES)* ⚡`,
    `----------------------------------------`,
    `🛍️ *المنتجات المطلوبة:*`
  ];

  state.cart.forEach((item, index) => {
    messageLines.push(`${index + 1}. *${item.name_ar}* (${item.size} مل) × عدد ${item.qty} = ${item.price * item.qty} ${currency}`);
  });

  messageLines.push(`----------------------------------------`);
  messageLines.push(`💵 *المجموع الفرعي:* ${subtotal} ${currency}`);

  if (discount > 0 && state.activeCoupon) {
    messageLines.push(`🏷️ *كود الخصم:* ${state.activeCoupon.code} (خصم ${discount} ${currency})`);
  }

  const shippingText = shippingFee === 0 ? "مجاني 🎁" : `${shippingFee} ${currency}`;
  messageLines.push(`🚚 *الشحن (${gov}):* ${shippingText}`);
  messageLines.push(`💰 *الإجمالي المستحق:* *${grandTotal} ${currency}*`);
  messageLines.push(`💳 *طريقة الدفع:* الدفع عند الاستلام نقداً (COD) 💵`);
  messageLines.push(`----------------------------------------`);
  messageLines.push(`👤 *بيانات العميل ومكان التوصيل:*`);
  messageLines.push(`▫️ *الاسم:* ${name}`);
  messageLines.push(`▫️ *رقم الهاتف:* ${phone}`);
  if (altPhone) {
    messageLines.push(`▫️ *رقم بديل:* ${altPhone}`);
  }
  messageLines.push(`▫️ *المحافظة:* ${gov}`);
  messageLines.push(`▫️ *المدينة / المنطقة:* ${city}`);
  messageLines.push(`▫️ *العنوان بالتفصيل:* ${address}`);
  if (notes) {
    messageLines.push(`▫️ *ملاحظات خاصة:* ${notes}`);
  }
  messageLines.push(`----------------------------------------`);
  messageLines.push(`✨ *شكراً لاختيارك عطور بَـرْق! يرجى تأكيد الطلب للبدء في تجهيزه وشحنه فوراً.* ⚡`);

  const fullMessage = messageLines.join("\n");
  const encodedText = encodeURIComponent(fullMessage);
  const waUrl = `https://wa.me/${storePhone}?text=${encodedText}`;

  // Log order to backend / localStorage
  const orderRecord = {
    customer: { name, phone, altPhone, gov, city, address, notes },
    items: state.cart,
    subtotal,
    discount,
    coupon: state.activeCoupon?.code || null,
    shippingFee,
    grandTotal,
    date: new Date().toISOString()
  };

  try {
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderRecord)
    });
  } catch (err) {
    // save locally
    const savedOrders = JSON.parse(localStorage.getItem("barq_orders") || "[]");
    savedOrders.unshift(orderRecord);
    localStorage.setItem("barq_orders", JSON.stringify(savedOrders));
  }

  // Copy to clipboard as backup
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullMessage).catch(() => {});
  }

  // Close checkout modal & clear cart
  closeCheckoutModal();
  state.cart = [];
  saveCartToStorage();

  // Show Success Modal
  const successModal = document.getElementById("successModal");
  const linkWrapper = document.getElementById("whatsappLinkWrapper");

  linkWrapper.innerHTML = `
    <a href="${waUrl}" target="_blank" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg text-sm">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.353.101.174.449.741.964 1.2.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z"/></svg>
      <span>إرسال الرسالة إلى الواتساب الآن ⚡</span>
    </a>
  `;

  successModal.classList.remove("hidden");

  // Automatically trigger WhatsApp popup
  window.open(waUrl, "_blank", "noopener,noreferrer");
}

function closeSuccessModal() {
  const modal = document.getElementById("successModal");
  if (modal) modal.classList.add("hidden");
}

// ==========================================
// Secret Admin Verification Modal
// ==========================================
function promptAdminPin() {
  const pin = prompt("🔐 أدخل كلمة مرور لوحة التحكم (Admin PIN):");
  if (!pin) return;
  if (pin === (state.settings.admin_pin || "1234")) {
    window.location.href = "admin.html";
  } else {
    alert("❌ كلمة المرور غير صحيحة!");
  }
}

// ==========================================
// Event Listeners Setup
// ==========================================
function setupEventListeners() {
  // Cart toggle buttons
  const openBtn = document.getElementById("openCartBtn");
  if (openBtn) openBtn.addEventListener("click", openCart);

  const closeBtn = document.getElementById("closeCartBtn");
  if (closeBtn) closeBtn.addEventListener("click", closeCart);

  const backdrop = document.getElementById("cartBackdrop");
  if (backdrop) backdrop.addEventListener("click", closeCart);

  // Menu toggle buttons
  const openMenuBtn = document.getElementById("openMenuBtn");
  if (openMenuBtn) openMenuBtn.addEventListener("click", openMenu);

  const closeMenuBtn = document.getElementById("closeMenuBtn");
  if (closeMenuBtn) closeMenuBtn.addEventListener("click", closeMenu);

  const menuBackdrop = document.getElementById("menuBackdrop");
  if (menuBackdrop) menuBackdrop.addEventListener("click", closeMenu);

  const checkoutBtn = document.getElementById("goToCheckoutBtn");
  if (checkoutBtn) checkoutBtn.addEventListener("click", openCheckoutModal);

  // Search input live filtering
  const sInput = document.getElementById("searchInput");
  if (sInput) {
    sInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      renderProducts();
    });
  }

  // Category filter pills
  const catContainer = document.getElementById("categoryFilterContainer");
  if (catContainer) {
    catContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".cat-pill");
      if (!btn) return;
      const cat = btn.dataset.cat;
      state.activeCategory = cat;

      document.querySelectorAll(".cat-pill").forEach(p => {
        if (p === btn) {
          p.className = "cat-pill active px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap bg-[#111111] text-white shadow-sm";
        } else {
          p.className = "cat-pill px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap bg-white text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-400";
        }
      });

      renderProducts();
    });
  }

  // Secret Owner Shortcuts to open admin.html:
  // 1. Pressing Ctrl+Shift+A or Alt+A
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) || (e.altKey && (e.key === 'A' || e.key === 'a'))) {
      promptAdminPin();
    }
  });

  // 2. Secret: Clicking the centered BARQ logo 5 times quickly
  const logoCenter = document.getElementById("brandLogoCenter");
  if (logoCenter) {
    let clickCount = 0;
    let clickTimer = null;
    logoCenter.addEventListener("click", (e) => {
      clickCount++;
      clearTimeout(clickTimer);
      if (clickCount >= 5) {
        e.preventDefault();
        promptAdminPin();
        clickCount = 0;
      }
      clickTimer = setTimeout(() => { clickCount = 0; }, 1800);
    });
  }
}
