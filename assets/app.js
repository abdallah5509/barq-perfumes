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
// Product Rendering & Filtering (Lail Luxury Style)
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
    const selectedSize = state.productSizesSelected[product.id] || "50";
    const currentPrice = product.prices?.[selectedSize] || product.prices?.["50"] || Object.values(product.prices || {})[0] || 390;
    const oldPrice = product.original_prices?.[selectedSize] || (selectedSize === "50" ? 450 : 350);
    const currency = state.settings.currency || "ج.م";

    return `
      <article class="lail-card bg-white rounded-3xl border border-gray-100 overflow-hidden flex flex-col justify-between group shadow-sm hover:shadow-2xl transition-all duration-500" data-product-id="${product.id}">
        
        <!-- Image & Badges Container -->
        <div class="relative aspect-square w-full bg-[#fbfbfb] overflow-hidden flex items-center justify-center p-6 sm:p-8 border-b border-gray-100/80">
          
          <!-- Top Badges (Intensity & Longevity like Lail) -->
          <div class="absolute top-4 right-4 z-10 flex flex-col items-end gap-1.5">
            <span class="lail-badge-indigo bg-[#4E3D97] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
              <span>⚡</span> <span>INTENSITY: STRONG</span>
            </span>
            ${product.badge ? `
              <span class="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                ${product.badge}
              </span>
            ` : ''}
          </div>

          <!-- Longevity badge -->
          <div class="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
            <span class="bg-gray-100/90 backdrop-blur-md text-gray-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-gray-200 flex items-center gap-1 shadow-sm">
              <span>🕒</span> <span>LONGEVITY: +10H</span>
            </span>
            <span class="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
              <span>➕</span> <span>PROJECTION: +2H</span>
            </span>
          </div>

          <!-- Perfume Image with smooth zoom -->
          <img src="${product.image || 'assets/img/logo.jpg'}" 
               alt="${product.name_ar} - BARQ Fragrances" 
               loading="lazy"
               class="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105">
          
          <!-- Quick Details Button Overlay -->
          <button onclick="openProductModal('${product.id}')" class="absolute inset-x-6 bottom-4 bg-[#111111]/90 hover:bg-[#4E3D97] text-white text-xs font-bold py-2.5 rounded-2xl border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl backdrop-blur-sm flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            <span>تفاصيل النوتات والهرم العطري</span>
          </button>
        </div>

        <!-- Content Area -->
        <div class="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
          
          <div>
            <!-- Header title & English label -->
            <div class="flex items-baseline justify-between gap-2">
              <h3 class="font-black text-xl text-gray-900 group-hover:text-[#4E3D97] transition-colors">${product.name_ar}</h3>
              <span class="font-display text-xs text-gray-400 tracking-wider font-bold uppercase">${product.name_en || ''}</span>
            </div>

            <!-- Tagline / Inspiration -->
            <p class="text-[12px] text-[#4E3D97] font-bold mt-1 tracking-wide">
              ${product.tagline || 'EXTRAIT DE PARFUM · NATURAL LUXURY SPRAY'}
            </p>

            <!-- Description -->
            <p class="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
              ${product.description}
            </p>

            <!-- NOTES & HINTS section like Lail -->
            ${product.notes ? `
              <div class="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                <div class="flex items-center justify-between text-[11px]">
                  <span class="font-bold text-gray-800 uppercase tracking-wider text-[10px]">NOTES & HINTS</span>
                  <span class="text-[10px] text-gray-400 font-medium">الهرم العطري</span>
                </div>
                <div class="bg-gray-50 rounded-xl p-2.5 text-[11px] text-gray-600 border border-gray-100 flex flex-col gap-1">
                  <div class="truncate"><strong class="text-gray-900">القمة:</strong> ${product.notes.top || ''}</div>
                  <div class="truncate"><strong class="text-gray-900">القلب:</strong> ${product.notes.heart || ''}</div>
                  <div class="truncate"><strong class="text-gray-900">القاعدة:</strong> ${product.notes.base || ''}</div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Size Selector Buttons -->
          <div>
            <div class="flex items-center justify-between text-[11px] text-gray-500 mb-1.5">
              <span>اختر الحجم:</span>
              <span class="text-[#4E3D97] font-bold">${selectedSize} مل</span>
            </div>
            
            <div class="grid grid-cols-2 gap-2">
              ${Object.keys(product.prices || {}).map(size => {
                const isSelected = size === selectedSize;
                const hasPrice = product.prices[size];
                return `
                  <button type="button" 
                          onclick="selectProductSize('${product.id}', '${size}')" 
                          class="py-2 px-2 rounded-xl text-xs font-bold transition-all text-center border ${
                            isSelected 
                              ? 'bg-[#4E3D97] border-[#4E3D97] text-white shadow-md' 
                              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:text-gray-900'
                          }">
                    ${size} مل · ${hasPrice} ${currency}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Price & Action Buttons -->
          <div class="pt-3 border-t border-gray-100 space-y-3">
            
            <div class="flex items-baseline justify-between">
              <span class="text-xs text-gray-500">السعر:</span>
              <div class="flex items-baseline gap-2">
                <span class="text-xs text-gray-400 line-through">${oldPrice} ${currency}</span>
                <span class="font-black text-2xl text-gray-900 font-display">${currentPrice}</span>
                <span class="text-xs font-bold text-gray-600">${currency}</span>
                <span class="bg-red-50 text-red-600 border border-red-200 text-[10px] font-black px-1.5 py-0.5 rounded-md">وفر ${oldPrice - currentPrice} ${currency}</span>
              </div>
            </div>

            <!-- Buttons: Add To Cart + Instant WhatsApp Order -->
            <div class="grid grid-cols-2 gap-2">
              <button onclick="addToCart('${product.id}', '${selectedSize}')" class="bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-bold py-2.5 px-3 rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm hover:border-[#4E3D97]">
                <svg class="w-4 h-4 text-[#4E3D97]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                <span>أضف للسلة</span>
              </button>

              <button onclick="instantBuy('${product.id}', '${selectedSize}')" class="bg-[#4E3D97] hover:bg-[#3d2f78] text-white font-bold py-2.5 px-3 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.353.101.174.449.741.964 1.2.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z"/></svg>
                <span>شراء فوري ⚡</span>
              </button>
            </div>

            <!-- 3D Studio Interactive Button -->
            <button onclick="showIn3D('${product.id}')" class="w-full bg-gray-50 hover:bg-purple-50 text-gray-800 hover:text-[#4E3D97] border border-gray-200 hover:border-[#4E3D97]/40 font-bold py-2.5 px-3 rounded-2xl text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-sm">
              <span>✨ استعراض الزجاجة في استوديو 3D وتجربة الرشّة</span>
              <span>←</span>
            </button>

          </div>

        </div>

      </article>
    `;
  }).join('');
}

// Select size on product card
function selectProductSize(productId, size) {
  state.productSizesSelected[productId] = size;
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
    }, 600);
  }
}

// ==========================================
// Product Details Modal (Lail Luxury Modal)
// ==========================================
function openProductModal(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const selectedSize = state.productSizesSelected[product.id] || "50";
  const currentPrice = product.prices?.[selectedSize] || product.prices?.["50"] || Object.values(product.prices || {})[0] || 390;
  const oldPrice = product.original_prices?.[selectedSize] || (selectedSize === "50" ? 450 : 350);
  const currency = state.settings.currency || "ج.م";

  const modal = document.getElementById("productModal");
  const content = document.getElementById("productModalContent");

  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      
      <!-- Bottle Image / Official Banner -->
      <div class="space-y-4">
        <div class="relative aspect-square w-full rounded-3xl bg-[#fbfbfb] border border-gray-200 overflow-hidden flex items-center justify-center p-8">
          <img id="modalMainImg" src="${product.image || 'assets/img/logo.jpg'}" alt="${product.name_ar}" class="w-full h-full object-contain">
          
          <div class="absolute top-4 right-4">
            <span class="bg-[#4E3D97] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              ⚡ INTENSITY: STRONG
            </span>
          </div>

          <div class="absolute top-4 left-4">
            <span class="bg-gray-100 text-gray-800 text-[10px] font-bold px-3 py-1 rounded-full border border-gray-200 shadow-sm">
              🕒 LONGEVITY: +10H
            </span>
          </div>
        </div>

        ${product.banner_image ? `
          <div class="rounded-2xl overflow-hidden border border-gray-200 h-24 bg-gray-50">
            <img src="${product.banner_image}" alt="${product.name_ar} Poster" class="w-full h-full object-cover">
          </div>
        ` : ''}
      </div>

      <!-- Details & Actions -->
      <div class="space-y-5">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="bg-[#4E3D97]/10 text-[#4E3D97] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              ${product.category_ar || 'عطر فاخر'}
            </span>
            <span class="text-xs text-amber-500 font-bold flex items-center gap-1">
              ★ 5.0 (42+ تقييم موثق)
            </span>
          </div>

          <h2 class="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">${product.name_ar}</h2>
          <p class="font-display text-sm text-[#4E3D97] font-bold tracking-wider mt-1 uppercase">${product.name_en || ''} — ${product.tagline || ''}</p>
        </div>

        <!-- Description -->
        <p class="text-xs sm:text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
          ${product.description}
        </p>

        <!-- NOTES & HINTS Pyramid like Lail -->
        ${product.notes ? `
          <div class="space-y-2 border-t border-b border-gray-100 py-3">
            <h4 class="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span>الهرم العطري</span>
              <span class="text-[10px] text-gray-400 font-normal">| NOTES & HINTS</span>
            </h4>
            <div class="grid grid-cols-1 gap-2 text-xs">
              <div class="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100/80">
                <span class="font-bold text-[#4E3D97]">🌸 قمة العطر (Top):</span>
                <span class="text-gray-700 mr-1">${product.notes.top}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100/80">
                <span class="font-bold text-amber-900">🌿 قلب العطر (Heart):</span>
                <span class="text-gray-700 mr-1">${product.notes.heart}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span class="font-bold text-gray-900">🪵 قاعدة العطر (Base):</span>
                <span class="text-gray-700 mr-1">${product.notes.base}</span>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Size selection in modal -->
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-2">اختر الحجم المطلوب:</label>
          <div class="grid grid-cols-2 gap-2.5">
            ${Object.keys(product.prices || {}).map(sz => {
              const pPrice = product.prices[sz];
              const isSel = sz === selectedSize;
              return `
                <button type="button" 
                        onclick="modalSelectSize('${product.id}', '${sz}')" 
                        class="py-3 px-3 rounded-2xl text-xs font-bold transition-all border text-center ${
                          isSel 
                            ? 'bg-[#4E3D97] border-[#4E3D97] text-white shadow-md' 
                            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:text-gray-900'
                        }">
                  <div class="font-black text-sm">${sz} مل</div>
                  <div class="text-[11px] font-semibold ${isSel ? 'text-purple-200' : 'text-gray-500'}">${pPrice} ${currency}</div>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Pricing & CTAs -->
        <div class="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-baseline gap-2">
            <span class="text-sm text-gray-400 line-through">${oldPrice} ${currency}</span>
            <span class="text-3xl font-black text-gray-900 font-display">${currentPrice}</span>
            <span class="text-sm font-bold text-gray-600">${currency}</span>
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto">
            <button onclick="addToCart('${product.id}', '${selectedSize}'); closeProductModal();" class="flex-1 sm:flex-none bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-bold py-3 px-5 rounded-2xl text-xs transition-all shadow-sm flex items-center justify-center gap-2">
              <svg class="w-4 h-4 text-[#4E3D97]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              <span>أضف للسلة</span>
            </button>
            <button onclick="instantBuy('${product.id}', '${selectedSize}'); closeProductModal();" class="flex-1 sm:flex-none bg-[#4E3D97] hover:bg-[#3d2f78] text-white font-bold py-3 px-6 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2">
              <span>طلب فوري عبر واتساب ⚡</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  `;

  modal.classList.remove("hidden");
}

function modalSelectSize(productId, size) {
  selectProductSize(productId, size);
  openProductModal(productId);
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
