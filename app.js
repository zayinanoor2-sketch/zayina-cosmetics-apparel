import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, deleteDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB1iOKtsVgNh8dVW0wQv0kR1eOsyXymYaI",
  authDomain: "zayina-cosmetics.firebaseapp.com",
  projectId: "zayina-cosmetics",
  storageBucket: "zayina-cosmetics.firebasestorage.app",
  messagingSenderId: "1089060456207",
  appId: "1:1089060456207:web:7fd9860b3bdd96488c207a",
  measurementId: "G-79HBTDTQBN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ADMIN_WHATSAPP = "923400766741";

let currentCurrency = "PKR";
let currentLang = "EN";
let currentSortValue = "all";

const conversionRates = {
 PKR: 1,
 USD: 0.0036,
 INR: 0.30
};

let products = [
 {id: 1, name: "Luxury Matte Lipstick", category: "cosmetics", occasion: "Party", marketPrice: 1200, retailPrice: 650, wholesalePrice: 450, img: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600", desc: "Long-lasting waterproof velvet finish.", highlights: ["Long Lasting", "Velvet Finish", "Party Pick"]},
 {id: 2, name: "Glow Primer Serum", category: "cosmetics", occasion: "Wedding", marketPrice: 1800, retailPrice: 950, wholesalePrice: 700, img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600", desc: "Hydrating glow-focused primer serum.", highlights: ["Hydrating", "Glow Finish", "Wedding Pick"]},
 {id: 3, name: "Bridal Party Lawn Suit", category: "clothes", occasion: "Wedding", marketPrice: 4500, retailPrice: 2450, wholesalePrice: 1900, img: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600", desc: "Elegant 3-piece embroidered digital print suit.", highlights: ["3 Piece", "Embroidered", "Bridal Pick"]},
 {id: 4, name: "Casual College Kurti", category: "clothes", occasion: "College", marketPrice: 2200, retailPrice: 1200, wholesalePrice: 900, img: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600", desc: "Breathable daily wear cotton kurti.", highlights: ["Comfortable", "Daily Wear", "College Pick"]},
 {id: 5, name: "Complete Glamour Kit", category: "bundles", occasion: "Party", marketPrice: 5000, retailPrice: 2800, wholesalePrice: 2100, img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600", desc: "Complete makeup essentials in one glamour kit.", highlights: ["Full Kit", "Best Value", "Gift Ready"]},
 {id: 6, name: "Oversized Flower Claw Clip", category: "cosmetics", occasion: "Casual", marketPrice: 399, retailPrice: 299, wholesalePrice: 229, img: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600", desc: "Trendy oversized floral claw clip for everyday hairstyles.", highlights: ["Trending", "Strong Grip", "Daily Style"]}
];

let cart = JSON.parse(localStorage.getItem("zayinaCart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("zayinaWishlist") || "[]");

let resellerApproved = localStorage.getItem("zayinaResellerApproved") === "true";
let resellerUID = localStorage.getItem("zayinaResellerUID") || "";
let resellerPoints = 10;
let resellerSales = 0;
let storeName = "My Zayina Store";
let selectedShareProduct = null;
let dna = JSON.parse(localStorage.getItem("zayinaDNA") || "{}");

document.addEventListener("DOMContentLoaded", () => {
 fetchProductsRealtime();
 updateCartCount();
 updateDealMeter();
 updateResellerDashboard();
});

function fetchProductsRealtime() {
 try {
  onSnapshot(collection(db, "products"), (snapshot) => {
   if (!snapshot.empty) {
    let cloudProducts = [];
    snapshot.forEach((docSnap) => {
     cloudProducts.push({ id: docSnap.id, ...docSnap.data() });
    });
    if (cloudProducts.length > 0) {
     products = cloudProducts;
    }
   }
   renderProducts();
  }, (error) => {
   console.log("Using default products due to offline/permission:", error);
   renderProducts();
  });
 } catch(e) {
  renderProducts();
 }
}

function formatPrice(val) {
 let converted = Number(val || 0) * conversionRates[currentCurrency];
 if (currentCurrency === "PKR") return "Rs. " + Math.round(converted);
 if (currentCurrency === "USD") return "$" + converted.toFixed(2);
 return "₹" + Math.round(converted);
}

function showToast(msg) {
 const t = document.getElementById("toast");
 if(!t) return;
 t.textContent = msg;
 t.classList.add("show");
 setTimeout(() => { t.classList.remove("show"); }, 2200);
}

function openModal(id) {
 const el = document.getElementById(id);
 if (el) el.style.display = "flex";
}

function closeModal(id) {
 const el = document.getElementById(id);
 if (el) el.style.display = "none";
}

function openSortModal() { openModal('sortModal'); }

function selectSortOption(val, labelName) {
 currentSortValue = val;
 const lbl = document.getElementById("currentSortLabel");
 if(lbl) lbl.textContent = labelName;
 document.querySelectorAll(".sort-option-item").forEach(el => el.classList.remove("active"));
 const opt = document.getElementById("sortOpt-" + val);
 if(opt) opt.classList.add("active");
 closeModal('sortModal');
 applyFilters();
}

function switchTab(tab) {
 document.querySelectorAll(".btn-nav").forEach(b => b.classList.remove("active-tab"));
 ["Cosmetics", "Clothes", "Bundles"].forEach(x => {
  let s = document.getElementById("section" + x);
  if (s) s.style.display = "none";
 });

 if (tab === "cosmetics") {
  document.getElementById("navCosmetics")?.classList.add("active-tab");
  document.getElementById("sectionCosmetics").style.display = "block";
 } else if (tab === "clothes") {
  document.getElementById("navClothes")?.classList.add("active-tab");
  document.getElementById("sectionClothes").style.display = "block";
 } else if (tab === "bundles") {
  document.getElementById("navBundles")?.classList.add("active-tab");
  document.getElementById("sectionBundles").style.display = "block";
 }
}

function getMatchScore(p) {
 let score = 70;
 if (dna.category && dna.category !== "all" && dna.category === p.category) score += 12;
 if (dna.occasion && dna.occasion !== "all" && dna.occasion === p.occasion) score += 10;
 if (dna.budget && p.retailPrice <= Number(dna.budget)) score += 5;
 return Math.min(99, score);
}

function productCard(p) {
 const discount = Math.max(0, Math.round(((p.marketPrice - p.retailPrice) / p.marketPrice) * 100));
 const liked = wishlist.includes(p.id);
 const highlights = (p.highlights || []).slice(0, 3).map(x => `<span>${x}</span>`).join("");
 const shareButtonHtml = resellerApproved ? `
     <button class="card-action-btn share-btn" onclick="event.stopPropagation();openResellerShare('${p.id}')">
      <i class="fas fa-share-nodes"></i> Share
     </button>` : '';

 return `
 <div class="product-card" onclick="openProductDetail('${p.id}')">
  <div class="product-img-wrap">
   <img src="${p.img}" class="product-img" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/600x500?text=Zayina+Product'">
   <span class="match-badge">${getMatchScore(p)}% Match</span>
   <button class="wish-btn" onclick="event.stopPropagation();toggleWishlist('${p.id}')">
    <i class="${liked ? 'fas' : 'far'} fa-heart"></i>
   </button>
  </div>
  <div class="product-body">
   <div>
    <div class="product-title">${p.name}</div>
    <div class="product-desc">${p.desc}</div>
    <div class="highlight-mini">${highlights}</div>
   </div>
   <div>
    <div class="price-box">
     <span class="old-price">${formatPrice(p.marketPrice)}</span>
     <span class="product-price">${formatPrice(p.retailPrice)}</span>
     <span class="discount-tag">-${discount}%</span>
    </div>
    <div class="card-actions">
     <button class="card-action-btn cart-btn" onclick="event.stopPropagation();addToCart('${p.id}')">
      <i class="fas fa-cart-plus"></i> Cart
     </button>
     <button class="card-action-btn whatsapp-btn" onclick="event.stopPropagation();buyNowWhatsApp('${p.id}')">
      <i class="fab fa-whatsapp"></i> Buy
     </button>
     ${shareButtonHtml}
    </div>
   </div>
  </div>
 </div>
 `;
}

function renderProducts(list = products) {
 let cos = "", clo = "", bun = "";
 list.forEach(p => {
  const card = productCard(p);
  if (p.category === "cosmetics") cos += card;
  else if (p.category === "clothes") clo += card;
  else if (p.category === "bundles") bun += card;
 });

 document.getElementById("cosmeticsGrid").innerHTML = cos || '<p style="font-size:10px">No items found.</p>';
 document.getElementById("clothesGrid").innerHTML = clo || '<p style="font-size:10px">No items found.</p>';
 document.getElementById("bundlesGrid").innerHTML = bun || '<p style="font-size:10px">No items found.</p>';
}

function applyFilters() {
 const sInput = document.getElementById("searchInput");
 let q = sInput ? sInput.value.toLowerCase() : "";
 let filtered = products.filter(p => {
  const text = (p.name + " " + p.desc + " " + (p.highlights || []).join(" ")).toLowerCase();
  return text.includes(q);
 });

 if (currentSortValue === "low") filtered.sort((a, b) => a.retailPrice - b.retailPrice);
 if (currentSortValue === "high") filtered.sort((a, b) => b.retailPrice - a.retailPrice);

 renderProducts(filtered);
}

function addToCart(id) {
 const p = products.find(x => String(x.id) === String(id));
 if (!p) return;
 cart.push({ ...p, cartKey: Date.now() + Math.random() });
 localStorage.setItem("zayinaCart", JSON.stringify(cart));
 updateCartCount();
 updateDealMeter();
 showToast(p.name + " added to cart");
}

function openCartModal() {
 const listEl = document.getElementById("cartItemsList");
 const totalEl = document.getElementById("cartTotalPrice");
 const savingEl = document.getElementById("cartSavingText");

 if(!listEl) return;

 if(cart.length === 0) {
  listEl.innerHTML = '<p style="font-size:9px;color:#777;text-align:center;padding:10px;">Your cart is empty.</p>';
  if(totalEl) totalEl.textContent = formatPrice(0);
  if(savingEl) savingEl.textContent = "";
  openModal("cartModal");
  return;
 }

 let total = 0;
 let marketTotal = 0;
 listEl.innerHTML = cart.map((item, index) => {
  total += Number(item.retailPrice || 0);
  marketTotal += Number(item.marketPrice || item.retailPrice || 0);
  return `
   <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #eee;">
    <div>
     <b>${item.name}</b><br><span style="color:var(--accent);">${formatPrice(item.retailPrice)}</span>
    </div>
    <button style="border:0; background:var(--red); color:#fff; padding:3px 6px; border-radius:4px; font-size:8px;" onclick="removeFromCart(${index})">Remove</button>
   </div>
  `;
 }).join("");

 if(totalEl) totalEl.textContent = formatPrice(total);
 if(savingEl) savingEl.textContent = `You saved ${formatPrice(marketTotal - total)} on this order!`;
 openModal("cartModal");
}

function removeFromCart(index) {
 cart.splice(index, 1);
 localStorage.setItem("zayinaCart", JSON.stringify(cart));
 updateCartCount();
 updateDealMeter();
 openCartModal();
}

function updateCartCount() {
 const el = document.getElementById("cartCount");
 if (el) el.textContent = cart.length;
}

function updateDealMeter() {
 const total = cart.reduce((s, x) => s + Number(x.retailPrice || 0), 0);
 const threshold = 2000;
 let percent = Math.min(100, Math.round(total / threshold * 100));

 const fill = document.getElementById("dealProgressFill");
 const text = document.getElementById("dealMeterText");
 const prog = document.getElementById("dealMeterProgress");

 if(prog) prog.textContent = percent + "%";
 if(fill) fill.style.width = percent + "%";
 if(text) {
  if (total >= threshold) text.textContent = "🎉 Congratulations! Free Delivery Unlocked!";
  else text.textContent = "Add " + formatPrice(threshold - total) + " more to unlock free delivery!";
 }
}

function toggleWishlist(id) {
 const strId = String(id);
 if (wishlist.includes(strId)) {
  wishlist = wishlist.filter(x => String(x) !== strId);
  showToast("Removed from wishlist");
 } else {
  wishlist.push(strId);
  showToast("Added to wishlist ❤️");
 }
 localStorage.setItem("zayinaWishlist", JSON.stringify(wishlist));
 renderProducts();
}

function openProductDetail(id) {
 const p = products.find(x => String(x.id) === String(id));
 if (!p) return;
 const highlights = (p.highlights || []).map(x => `<div class="feature-item">✨ ${x}</div>`).join("");
 const resellerOpportunityHtml = resellerApproved ? `
  <div class="reseller-price-box">
   <b style="font-size:10px">🤝 Reseller Opportunity</b>
   <p style="font-size:8px;margin-top:3px">Base wholesale price: <b>${formatPrice(p.wholesalePrice)}</b></p>
   <button class="btn-main" onclick="openResellerShare('${p.id}')"><i class="fas fa-share-nodes"></i> Set Commission & Share Product</button>
  </div>` : '';

 const content = document.getElementById("modalProductContentView");
 if(content) {
  content.innerHTML = `
   <img src="${p.img}" style="width:100%;height:190px;object-fit:cover;border-radius:9px" onerror="this.src='https://via.placeholder.com/600x500?text=Zayina+Product'">
   <h3 style="font-size:16px;margin-top:9px">${p.name}</h3>
   <p style="font-size:9px;color:#666;margin:4px 0">${p.desc}</p>
   <div class="feature-box">
    <div class="feature-title"><i class="fas fa-sparkles"></i> Product Highlights</div>
    <div class="feature-list">${highlights}</div>
   </div>
   <div>
    <span class="detail-market">${formatPrice(p.marketPrice)}</span>
    <span class="detail-price">${formatPrice(p.retailPrice)}</span>
   </div>
   ${resellerOpportunityHtml}
   <button class="btn-main" style="background:#25d366" onclick="buyNowWhatsApp('${p.id}')"><i class="fab fa-whatsapp"></i> Buy Now</button>
   <button class="btn-main" onclick="addToCart('${p.id}');closeModal('productDetailsModal')"><i class="fas fa-cart-plus"></i> Add to Cart</button>
  `;
 }
 openModal("productDetailsModal");
}

function buyNowWhatsApp(id) {
 const p = products.find(x => String(x.id) === String(id));
 if (!p) return;
 const msg = `Assalam-o-Alaikum! 👋 Welcome to Zayina Glamour! ✨\n\nI want to buy:\n${p.name}\n\nPrice: ${formatPrice(p.retailPrice)}\n\nPlease confirm my order.`;
 window.open("https://wa.me/" + ADMIN_WHATSAPP + "?text=" + encodeURIComponent(msg), "_blank");
}

function sendCartWhatsAppOrder() {
 if (!cart.length) { alert("Cart is empty!"); return; }
 let total = 0;
 let msg = `Assalam-o-Alaikum! 👋 Welcome to Zayina Glamour! ✨\n\nI want to order:\n\n`;
 cart.forEach(item => {
  total += item.retailPrice;
  msg += `• ${item.name} — ${formatPrice(item.retailPrice)}\n`;
 });
 msg += `\nTotal: ${formatPrice(total)}\n\nPlease confirm my order.`;
 window.open("https://wa.me/" + ADMIN_WHATSAPP + "?text=" + encodeURIComponent(msg), "_blank");
 cart = [];
 localStorage.setItem("zayinaCart", JSON.stringify(cart));
 updateCartCount();
 updateDealMeter();
 closeModal("cartModal");
}

function checkOrderStatus() {
 const trackInput = document.getElementById("trackIdInput");
 const id = trackInput ? trackInput.value.trim() : "";
 const box = document.getElementById("trackingResultBox");
 if(!box) return;
 box.style.display = "block";
 box.innerHTML = `<b>Order ID:</b> ${id}<br><b>Status:</b> <span class="status-badge status-approved">Order Received / Processing</span>`;
}

function submitResellerApp() {
 const name = document.getElementById("resName").value.trim();
 const phone = document.getElementById("resPhone").value.trim();
 if (!name || !phone) { alert("Please enter your name and phone."); return; }
 const generatedUID = "ZG-" + Math.floor(100000 + Math.random() * 900000);
 
 localStorage.setItem("zayinaResellerUID", generatedUID);
 resellerUID = generatedUID;
 resellerApproved = true;
 localStorage.setItem("zayinaResellerApproved", "true");

 document.getElementById("resellerFormView").style.display = "none";
 document.getElementById("resauthStatusView").style.display = "block";
 
 const badge = document.getElementById("userPortalStatusBadge");
 if(badge) {
  badge.className = "status-badge status-approved";
  badge.textContent = "Approved";
 }
 const uidText = document.getElementById("userPortalUIDText");
 if(uidText) uidText.textContent = "Your Reseller UID: " + generatedUID;

 showToast("Reseller account activated successfully!");
 updateResellerDashboard();
 renderProducts();
}

function updateResellerDashboard() {
 const area = document.getElementById("resellerDashboardArea");
 if (!area) return;
 if (!resellerApproved) { area.style.display = "none"; return; }
 area.style.display = "block";
 document.getElementById("dashResellerUID").textContent = resellerUID;
 document.getElementById("resellerPoints").textContent = resellerPoints;
 document.getElementById("resellerSales").textContent = resellerSales;
}

function openAdminPanel() {
 openModal("adminModal");
}

function verifyAdmin() {
 const passInput = document.getElementById("adminPassInput");
 const pass = passInput ? passInput.value : "";
 if (pass === "Zayina66#") {
  document.getElementById("adminLoginView").style.display = "none";
  document.getElementById("adminDashboardView").style.display = "block";
  renderAdmin();
  showToast("Admin login successful");
 } else {
  alert("Incorrect password! Use Zayina66#");
 }
}

function renderAdmin() {
 document.getElementById("adminTotalSales").textContent = "Rs. 15,400";
 document.getElementById("adminTotalProfit").textContent = "Rs. 2,310";
 document.getElementById("adminProductCount").textContent = products.length;
}

async function addNewProductByAdmin() {
 const name = document.getElementById("new_name").value.trim();
 if (!name) { alert("Product name required."); return; }
 
 const newProduct = {
  name,
  category: document.getElementById("new_category").value,
  occasion: document.getElementById("new_occasion").value,
  marketPrice: Number(document.getElementById("new_marketPrice").value || 0),
  retailPrice: Number(document.getElementById("new_retailPrice").value || 0),
  wholesalePrice: Number(document.getElementById("new_wholesalePrice").value || 0),
  img: document.getElementById("new_img").value || "https://via.placeholder.com/600x500?text=Zayina+Product",
  desc: document.getElementById("new_desc").value || "Premium Zayina product.",
  highlights: document.getElementById("new_highlights").value.split(",").map(x => x.trim()).filter(Boolean)
 };

 try {
  await addDoc(collection(db, "products"), newProduct);
  showToast("Product added to cloud successfully!");
 } catch(e) {
  // Fallback local addition if offline
  products.push({ id: Date.now(), ...newProduct });
  renderProducts();
  showToast("Product added locally!");
 }
 closeModal("adminModal");
}

function submitUserReview() {
 const name = document.getElementById("revName").value.trim();
 const text = document.getElementById("revText").value.trim();
 if (!name || !text) { alert("Please enter name and review."); return; }
 showToast("Review submitted successfully!");
 document.getElementById("revName").value = "";
 document.getElementById("revText").value = "";
}

function openResellerShare(id) {
 if (!resellerApproved) {
  alert("Please apply for the reseller program first.");
  openModal("resellerModal");
  return;
 }
 selectedShareProduct = products.find(x => String(x.id) === String(id));
 if (!selectedShareProduct) return;
 document.getElementById("shareCommissionInput").value = 100;
 updateSharePrice();
 document.getElementById("shareProductPreview").innerHTML = `
  <div style="display:flex;gap:7px;background:#faf7ef;padding:7px;border-radius:8px">
   <img src="${selectedShareProduct.img}" style="width:60px;height:60px;object-fit:cover;border-radius:6px">
   <div>
    <b style="font-size:10px">${selectedShareProduct.name}</b>
    <p style="font-size:8px;color:#666;margin-top:3px">${selectedShareProduct.desc}</p>
   </div>
  </div>
 `
 openModal("resellerShareModal");
}

function updateSharePrice() {
 if (!selectedShareProduct) return;
 const comm = Math.max(0, Number(document.getElementById("shareCommissionInput").value || 100));
 const base = Number(selectedShareProduct.wholesalePrice);
 document.getElementById("shareBasePrice").textContent = formatPrice(base);
 document.getElementById("shareCustomerPrice").textContent = formatPrice(base + comm);
 document.getElementById("shareProfit").textContent = formatPrice(comm);
}

function makeShareData() {
 const comm = Math.max(0, Number(document.getElementById("shareCommissionInput").value || 100));
 const p = selectedShareProduct;
 const customerPrice = p.wholesalePrice + comm;
 const shareUrl = window.location.href.split("#")[0] + "#reseller=" + encodeURIComponent(resellerUID) + "&product=" + p.id;
 return { p, customerPrice, shareUrl };
}

function shareMessage() {
 const d = makeShareData();
 return `Assalam-o-Alaikum! 👋 Welcome to Zayina Glamour! ✨\n\n✨ ${d.p.name}\n\n${d.p.desc}\n\n💰 Special Price: ${formatPrice(d.customerPrice)}\n\n${d.shareUrl}`;
}

function shareViaWhatsApp() {
 window.open("https://wa.me/?text=" + encodeURIComponent(shareMessage()), "_blank");
}

async function nativeShare() {
 const d = makeShareData();
 if (navigator.share) {
  try { await navigator.share({ title: d.p.name, text: shareMessage(), url: d.shareUrl }); } catch (e) {}
 } else {
  navigator.clipboard?.writeText(shareMessage());
  showToast("Details copied to clipboard!");
 }
}

function copyShareLink() {
 const d = makeShareData();
 navigator.clipboard?.writeText(shareMessage()).then(() => showToast("Link copied!")).catch(() => alert(d.shareUrl));
}

function openResellerProfitEngine() {
 const select = document.getElementById("profitProduct");
 if(select) {
  select.innerHTML = products.map(p => `<option value="${p.id}">${p.name} — ${formatPrice(p.wholesalePrice)}</option>`).join("");
 }
 openModal("profitModal");
}

function calculateResellerProfit() {
 const sel = document.getElementById("profitProduct");
 const p = products.find(x => String(x.id) === String(sel ? sel.value : 0));
 const selling = Number(document.getElementById("profitSellingPrice").value || 0);
 const qty = Math.max(1, Number(document.getElementById("profitQuantity").value || 1));
 if (!p || !selling) { alert("Enter selling price."); return; }
 const profit = (selling - p.wholesalePrice) * qty;
 document.getElementById("profitResult").innerHTML = `
  <p style="font-size:9px">Base Cost: <b>${formatPrice(p.wholesalePrice)}</b></p>
  <p style="font-size:9px;margin-top:4px">Customer Price: <b>${formatPrice(selling)}</b></p>
  <p style="font-size:10px;margin-top:5px">Total Profit: <b style="color:var(--green)">${formatPrice(profit)}</b></p>
 `;
}

function openResellerStore() {
 document.getElementById("storeName").value = storeName;
 openModal("storeModal");
}

function saveStoreName() {
 storeName = document.getElementById("storeName").value.trim() || "My Zayina Store";
 showToast("Store name saved!");
 closeModal("storeModal");
}

function copyStoreLink() {
 const link = window.location.href.split("#")[0] + "#store=" + encodeURIComponent(resellerUID);
 navigator.clipboard?.writeText(link).then(() => showToast("Store link copied!")).catch(() => alert(link));
}

function saveDNA() {
 dna = {
  category: document.getElementById("dnaCategory").value,
  occasion: document.getElementById("dnaOccasion").value,
  budget: document.getElementById("dnaBudget").value
 };
 localStorage.setItem("zayinaDNA", JSON.stringify(dna));
 showToast("Style DNA saved!");
 closeModal("dnaModal");
 renderProducts();
}

function openLeaderboard() {
 document.getElementById("leaderboardList").innerHTML = `
  <div style="background:#faf7ef; padding:8px; border-radius:6px; font-size:9px; display:flex; justify-content:space-between;">
   <span>1. ${resellerUID || "You"} (Elite Reseller)</span>
   <b>${resellerPoints} Pts</b>
  </div>
 `;
 openModal("leaderboardModal");
}

function changeCurrency() {
 currentCurrency = document.getElementById("currencySelector").value;
 renderProducts();
}

function changeLanguage() {
 currentLang = document.getElementById("langSelector").value;
 showToast("Language changed to " + currentLang);
} }, error => console.error(error));
}

function updateConnectionStatus(isConnected) {
 const indicator = document.getElementById("syncStatusIndicator");
 if (indicator) {
  if (isConnected) {
   indicator.className = "status-badge status-approved";
   indicator.textContent = "🟢 Live Sync";
  } else {
   indicator.className = "status-badge status-rejected";
   indicator.textContent = "🔴 Offline";
  }
 }
}

auth.signInAnonymously().then(cred => {
 currentUser = cred.user;
 initFirebaseSync();
}).catch(err => {
 console.error("Auth error:", err);
 updateConnectionStatus(false);
});

// ==========================================
// UTILS & HELPERS
// ==========================================
function saveLocalDeviceData() {
 localStorage.setItem("zayinaCart", JSON.stringify(cart));
 localStorage.setItem("zayinaWishlist", JSON.stringify(wishlist));
 localStorage.setItem("zayinaDNA", JSON.stringify(dna));
}

function esc(str) {
 return String(str ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");
}

function formatPrice(val) {
 let converted = Number(val || 0) * conversionRates[currentCurrency];
 if (currentCurrency === "PKR") return "Rs. " + Math.round(converted);
 if (currentCurrency === "USD") return "$" + converted.toFixed(2);
 return "₹" + Math.round(converted);
}

function showToast(msg) {
 const t = document.getElementById("toast");
 if(!t) return;
 t.textContent = msg;
 t.classList.add("show");
 setTimeout(() => { t.classList.remove("show"); }, 2200);
}

function playLoudSound() {
 try {
  new Audio("https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg").play();
 } catch (e) {}
}

function openModal(id) {
 const el = document.getElementById(id);
 if (el) el.style.display = "flex";
}

function closeModal(id) {
 const el = document.getElementById(id);
 if (el) el.style.display = "none";
}

function openSortModal() { openModal('sortModal'); }

function selectSortOption(val, labelName) {
 currentSortValue = val;
 const lbl = document.getElementById("currentSortLabel");
 if(lbl) lbl.textContent = labelName;
 document.querySelectorAll(".sort-option-item").forEach(el => el.classList.remove("active"));
 const opt = document.getElementById("sortOpt-" + val);
 if(opt) opt.classList.add("active");
 closeModal('sortModal');
 applyFilters();
}

function switchTab(tab) {
 document.querySelectorAll(".btn-nav").forEach(b => b.classList.remove("active-tab"));
 ["Cosmetics", "Clothes", "Bundles"].forEach(x => {
  let s = document.getElementById("section" + x);
  if (s) s.style.display = "none";
 });

 if (tab === "cosmetics") {
  document.getElementById("navCosmetics")?.classList.add("active-tab");
  document.getElementById("sectionCosmetics").style.display = "block";
 } else if (tab === "clothes") {
  document.getElementById("navClothes")?.classList.add("active-tab");
  document.getElementById("sectionClothes").style.display = "block";
 } else if (tab === "bundles") {
  document.getElementById("navBundles")?.classList.add("active-tab");
  document.getElementById("sectionBundles").style.display = "block";
 }
}

function getMatchScore(p) {
 let score = 70;
 if (dna.category && dna.category !== "all" && dna.category === p.category) score += 12;
 if (dna.occasion && dna.occasion !== "all" && dna.occasion === p.occasion) score += 10;
 if (dna.budget && p.retailPrice <= Number(dna.budget)) score += 5;
 return Math.min(99, score);
}

// ==========================================
// RENDER & CATALOGUE
// ==========================================
function productCard(p) {
 const discount = Math.max(0, Math.round(((p.marketPrice - p.retailPrice) / p.marketPrice) * 100));
 const liked = wishlist.includes(p.id);
 const highlights = (p.highlights || []).slice(0, 3).map(x => `<span>${esc(x)}</span>`).join("");
 const shareButtonHtml = resellerApproved ? `
     <button class="card-action-btn share-btn" onclick="event.stopPropagation();openResellerShare(${p.id})">
      <i class="fas fa-share-nodes"></i> Share
     </button>` : '';

 return `
 <div class="product-card" onclick="openProductDetail(${p.id})">
  <div class="product-img-wrap">
   <img src="${esc(p.img)}" class="product-img" alt="${esc(p.name)}" loading="lazy" onerror="this.src='https://via.placeholder.com/600x500?text=Zayina+Product'">
   <span class="match-badge">${getMatchScore(p)}% Match</span>
   <button class="wish-btn" onclick="event.stopPropagation();toggleWishlist(${p.id})">
    <i class="${liked ? 'fas' : 'far'} fa-heart"></i>
   </button>
  </div>
  <div class="product-body">
   <div>
    <div class="product-title">${esc(p.name)}</div>
    <div class="product-desc">${esc(p.desc)}</div>
    <div class="highlight-mini">${highlights}</div>
   </div>
   <div>
    <div class="price-box">
     <span class="old-price">${formatPrice(p.marketPrice)}</span>
     <span class="product-price">${formatPrice(p.retailPrice)}</span>
     <span class="discount-tag">-${discount}%</span>
    </div>
    <div class="card-actions">
     <button class="card-action-btn cart-btn" onclick="event.stopPropagation();addToCart(${p.id})">
      <i class="fas fa-cart-plus"></i> Cart
     </button>
     <button class="card-action-btn whatsapp-btn" onclick="event.stopPropagation();buyNowWhatsApp(${p.id})">
      <i class="fab fa-whatsapp"></i> Buy
     </button>
     ${shareButtonHtml}
    </div>
   </div>
  </div>
 </div>
 `;
}

function renderProducts(list = products) {
 let cos = "";
 let clo = "";
 let bun = "";

 list.forEach(p => {
  const card = productCard(p);
  if (p.category === "cosmetics") cos += card;
  else if (p.category === "clothes") clo += card;
  else if (p.category === "bundles") bun += card;
 });

 const cGrid = document.getElementById("cosmeticsGrid");
 const clGrid = document.getElementById("clothesGrid");
 const bGrid = document.getElementById("bundlesGrid");

 if(cGrid) cGrid.innerHTML = cos || '<p style="font-size:10px">No items found.</p>';
 if(clGrid) clGrid.innerHTML = clo || '<p style="font-size:10px">No items found.</p>';
 if(bGrid) bGrid.innerHTML = bun || '<p style="font-size:10px">No items found.</p>';

 updateDealMeter();
 updateCartCount();
}

function applyFilters() {
 const sInput = document.getElementById("searchInput");
 let q = sInput ? sInput.value.toLowerCase() : "";
 let filtered = products.filter(p => {
  const text = (p.name + " " + p.desc + " " + (p.highlights || []).join(" ")).toLowerCase();
  return text.includes(q);
 });

 if (currentSortValue === "low") filtered.sort((a, b) => a.retailPrice - b.retailPrice);
 if (currentSortValue === "high") filtered.sort((a, b) => b.retailPrice - a.retailPrice);

 renderProducts(filtered);
}

// ==========================================
// CART & ORDERS (CLOUD SYNCED)
// ==========================================
function addToCart(id) {
 const p = products.find(x => x.id === id);
 if (!p) return;
 cart.push({ ...p, cartKey: Date.now() + Math.random() });
 saveLocalDeviceData();
 updateCartCount();
 updateDealMeter();
 playLoudSound();
 showToast(p.name + " added to cart");
}

function openCartModal() {
 const listEl = document.getElementById("cartItemsList");
 const totalEl = document.getElementById("cartTotalPrice");
 const savingEl = document.getElementById("cartSavingText");

 if(!listEl) return;

 if(cart.length === 0) {
  listEl.innerHTML = '<p style="font-size:9px;color:#777;text-align:center;padding:10px;">Your cart is empty.</p>';
  if(totalEl) totalEl.textContent = formatPrice(0);
  if(savingEl) savingEl.textContent = "";
  openModal("cartModal");
  return;
 }

 let total = 0;
 let marketTotal = 0;
 listEl.innerHTML = cart.map((item, index) => {
  total += Number(item.retailPrice || 0);
  marketTotal += Number(item.marketPrice || item.retailPrice || 0);
  return `
   <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #eee;">
    <div>
     <b>${esc(item.name)}</b><br><span style="color:var(--accent);">${formatPrice(item.retailPrice)}</span>
    </div>
    <button style="border:0; background:var(--red); color:#fff; padding:3px 6px; border-radius:4px; font-size:8px;" onclick="removeFromCart(${index})">Remove</button>
   </div>
  `;
 }).join("");

 if(totalEl) totalEl.textContent = formatPrice(total);
 if(savingEl) savingEl.textContent = `You saved ${formatPrice(marketTotal - total)} on this order!`;
 openModal("cartModal");
}

function removeFromCart(index) {
 cart.splice(index, 1);
 saveLocalDeviceData();
 updateCartCount();
 updateDealMeter();
 openCartModal();
}

function updateCartCount() {
 const el = document.getElementById("cartCount");
 if (el) el.textContent = cart.length;
}

function updateDealMeter() {
 const total = cart.reduce((s, x) => s + Number(x.retailPrice || 0), 0);
 const threshold = 2000;
 let percent = Math.min(100, Math.round(total / threshold * 100));

 const fill = document.getElementById("dealProgressFill");
 const text = document.getElementById("dealMeterText");
 const prog = document.getElementById("dealMeterProgress");

 if(prog) prog.textContent = percent + "%";
 if(fill) fill.style.width = percent + "%";

 if (total >= threshold) {
  if(text) text.textContent = "🎉 Congratulations! Free Delivery Unlocked!";
 } else {
  if(text) text.textContent = "Add " + formatPrice(threshold - total) + " more to unlock free delivery!";
 }
}

function toggleWishlist(id) {
 if (wishlist.includes(id)) {
  wishlist = wishlist.filter(x => x !== id);
  showToast("Removed from wishlist");
 } else {
  wishlist.push(id);
  showToast("Added to wishlist ❤️");
 }
 saveLocalDeviceData();
 renderProducts();
}

function openProductDetail(id) {
 const p = products.find(x => x.id === id);
 if (!p) return;
 const highlights = (p.highlights || []).map(x => `<div class="feature-item">✨ ${esc(x)}</div>`).join("");
 const resellerOpportunityHtml = resellerApproved ? `
  <div class="reseller-price-box">
   <b style="font-size:10px">🤝 Reseller Opportunity</b>
   <p style="font-size:8px;margin-top:3px">Base wholesale price: <b>${formatPrice(p.wholesalePrice)}</b></p>
   <button class="btn-main" onclick="openResellerShare(${p.id})"><i class="fas fa-share-nodes"></i> Set Commission & Share Product</button>
  </div>` : '';

 const content = document.getElementById("modalProductContentView");
 if(content) {
  content.innerHTML = `
   <img src="${esc(p.img)}" style="width:100%;height:190px;object-fit:cover;border-radius:9px" onerror="this.src='https://via.placeholder.com/600x500?text=Zayina+Product'">
   <h3 style="font-size:16px;margin-top:9px">${esc(p.name)}</h3>
   <p style="font-size:9px;color:#666;margin:4px 0">${esc(p.desc)}</p>
   <div class="feature-box">
    <div class="feature-title"><i class="fas fa-sparkles"></i> Product Highlights</div>
    <div class="feature-list">${highlights}</div>
   </div>
   <div>
    <span class="detail-market">${formatPrice(p.marketPrice)}</span>
    <span class="detail-price">${formatPrice(p.retailPrice)}</span>
   </div>
   ${resellerOpportunityHtml}
   <button class="btn-main" style="background:#25d366" onclick="buyNowWhatsApp(${p.id})"><i class="fab fa-whatsapp"></i> Buy Now</button>
   <button class="btn-main" onclick="addToCart(${p.id});closeModal('productDetailsModal')"><i class="fas fa-cart-plus"></i> Add to Cart</button>
  `;
 }
 openModal("productDetailsModal");
}

function buyNowWhatsApp(id) {
 const p = products.find(x => x.id === id);
 if (!p) return;
 const msg = `Hello Zayina Glamour,\n\nI want to buy:\n${p.name}\n\nPrice: ${formatPrice(p.retailPrice)}\n\nPlease confirm my order.`;
 window.open("https://wa.me/" + ADMIN_WHATSAPP + "?text=" + encodeURIComponent(msg), "_blank");
 createCloudOrder([p]);
}

function sendCartWhatsAppOrder() {
 if (!cart.length) { alert("Cart is empty!"); return; }
 let total = 0;
 let msg = `Hello Zayina Glamour,\n\nI want to order:\n\n`;
 cart.forEach(item => {
  total += item.retailPrice;
  msg += `• ${item.name} — ${formatPrice(item.retailPrice)}\n`;
 });
 msg += `\nTotal: ${formatPrice(total)}\n\nPlease confirm my order.`;
 window.open("https://wa.me/" + ADMIN_WHATSAPP + "?text=" + encodeURIComponent(msg), "_blank");
 createCloudOrder(cart);
 resellerSales++;
 resellerPoints += 10;
 cart = [];
 saveLocalDeviceData();
 updateCartCount();
 updateResellerDashboard();
 closeModal("cartModal");
}

function createCloudOrder(items) {
 const orderId = "ZAYIN-" + Math.floor(1000 + Math.random() * 9000);
 const total = items.reduce((s, x) => s + Number(x.retailPrice || 0), 0);
 const newOrder = {
  id: orderId,
  items: items.map(x => x.name),
  total,
  status: "Order Received",
  date: new Date().toLocaleString(),
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
 };
 db.collection("orders").add(newOrder).catch(err => console.error("Order sync error:", err));
 const trackInput = document.getElementById("trackIdInput");
 if(trackInput) trackInput.value = orderId;
}

function checkOrderStatus() {
 const trackInput = document.getElementById("trackIdInput");
 const id = trackInput ? trackInput.value.trim() : "";
 const box = document.getElementById("trackingResultBox");
 if(!box) return;
 box.style.display = "block";
 const order = orders.find(x => x.id.toLowerCase() === id.toLowerCase());
 if (!order) {
  box.innerHTML = "<b>No order found in cloud database.</b><br>Check your Order ID.";
  return;
 }
 box.innerHTML = `<b>Order:</b> ${esc(order.id)}<br><b>Status:</b> <span class="status-badge status-approved">${esc(order.status)}</span><br><b>Total:</b> ${formatPrice(order.total)}<br><b>Date:</b> ${esc(order.date)}`;
}

// ==========================================
// RESELLER & REAL-TIME APPLICATION SYSTEM
// ==========================================
function submitResellerApp() {
 const name = document.getElementById("resName").value.trim();
 const phone = document.getElementById("resPhone").value.trim();
 if (!name || !phone) { alert("Please enter your name and phone."); return; }
 const generatedUID = "ZG-" + Math.floor(100000 + Math.random() * 900000);
 
 const appData = {
  name,
  phone,
  uid: generatedUID,
  status: "Pending",
  date: new Date().toLocaleString(),
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
 };

 db.collection("resellerApplications").add(appData).then(() => {
  localStorage.setItem("zayinaResellerUID", generatedUID);
  resellerUID = generatedUID;
  const fView = document.getElementById("resellerFormView");
  const sView = document.getElementById("resauthStatusView");
  if(fView) fView.style.display = "none";
  if(sView) sView.style.display = "block";
  const badge = document.getElementById("userPortalStatusBadge");
  if(badge) {
   badge.className = "status-badge status-pending";
   badge.textContent = "Pending Approval";
  }
  const uidText = document.getElementById("userPortalUIDText");
  if(uidText) uidText.textContent = "Your Reseller UID: " + generatedUID;
  showToast("Reseller application sent to Admin Cloud!");
 }).catch(err => alert("Error submitting application: " + err.message));
}

function checkResellerAppLiveStatus() {
 if (!resellerUID) return;
 const myApp = resellerApps.find(a => a.uid === resellerUID);
 if (myApp) {
  const badge = document.getElementById("userPortalStatusBadge");
  if (badge) {
   badge.textContent = myApp.status;
   if (myApp.status === "Approved") {
    badge.className = "status-badge status-approved";
    resellerApproved = true;
    localStorage.setItem("zayinaResellerApproved", "true");
    updateResellerDashboard();
    renderProducts();
   } else if (myApp.status === "Rejected") {
    badge.className = "status-badge status-rejected";
    resellerApproved = false;
    localStorage.setItem("zayinaResellerApproved", "false");
    updateResellerDashboard();
   }
  }
 }
}

function openResellerDashboardTab() {
 closeModal('resellerModal');
}

function updateResellerDashboard() {
 const area = document.getElementById("resellerDashboardArea");
 if (!area) return;
 if (!resellerApproved) { area.style.display = "none"; return; }
 area.style.display = "block";
 const uidEl = document.getElementById("dashResellerUID");
 const ptsEl = document.getElementById("resellerPoints");
 const salesEl = document.getElementById("resellerSales");
 const lvlEl = document.getElementById("resellerLevel");

 if(uidEl) uidEl.textContent = resellerUID;
 if(ptsEl) ptsEl.textContent = resellerPoints;
 if(salesEl) salesEl.textContent = resellerSales;

 let level = "Bronze";
 if (resellerPoints >= 100) level = "Silver";
 if (resellerPoints >= 250) level = "Gold";
 if (resellerPoints >= 500) level = "Elite";
 if(lvlEl) lvlEl.textContent = level;
}

// ==========================================
// ADMIN DASHBOARD & REAL-TIME CRUD
// ==========================================
function openAdminPanel() {
 openModal("adminModal");
}

function verifyAdmin() {
 const passInput = document.getElementById("adminPassInput");
 const pass = passInput ? passInput.value : "";
 if (pass === "Zayina66#") {
  const lView = document.getElementById("adminLoginView");
  const dView = document.getElementById("adminDashboardView");
  if(lView) lView.style.display = "none";
  if(dView) dView.style.display = "block";
  renderAdmin();
  showToast("Admin login successful");
 } else {
  alert("Incorrect password!");
 }
}

function renderAdmin() {
 const totalSales = orders.reduce((s, o) => s + Number(o.total || 0), 0);
 const totalProfit = orders.reduce((s, o) => s + Number(o.total || 0) * .15, 0);
 
 const salesEl = document.getElementById("adminTotalSales");
 const profitEl = document.getElementById("adminTotalProfit");
 const countEl = document.getElementById("adminProductCount");
 if (salesEl) salesEl.textContent = "Rs. " + Math.round(totalSales);
 if (profitEl) profitEl.textContent = "Rs. " + Math.round(totalProfit);
 if (countEl) countEl.textContent = products.length;

 const pendingCount = resellerApps.filter(a => a.status === "Pending").length;
 const badge = document.getElementById("appBadgeCount");
 if (badge) {
  badge.textContent = pendingCount;
  badge.style.display = pendingCount > 0 ? "inline-block" : "none";
 }

 const requestsBox = document.getElementById("adminRequestsBox");
 if (requestsBox) {
  requestsBox.innerHTML = resellerApps.length ? resellerApps.map((r) => `
   <div style="background:white;padding:6px;border-radius:5px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <b>${esc(r.name)}</b><br><span style="font-size:8px">${esc(r.phone)} (UID: ${esc(r.uid)})</span>
    </div>
    <div style="display:flex; gap:4px; align-items:center;">
     <span class="status-badge ${r.status === 'Approved' ? 'status-approved' : r.status === 'Rejected' ? 'status-rejected' : 'status-pending'}">${esc(r.status)}</span>
     ${r.status !== 'Approved' ? `<button style="border:0;background:var(--green);color:white;padding:3px 6px;border-radius:4px;font-size:7px;cursor:pointer;" onclick="updateResellerAppStatus('${r.firestoreId}', 'Approved')">Approve</button>` : ''}
     ${r.status !== 'Rejected' ? `<button style="border:0;background:var(--red);color:white;padding:3px 6px;border-radius:4px;font-size:7px;cursor:pointer;" onclick="updateResellerAppStatus('${r.firestoreId}', 'Rejected')">Reject</button>` : ''}
    </div>
   </div>
  `).join("") : "No reseller applications.";
 }

 const editList = document.getElementById("adminProductEditList");
 if (editList) {
  editList.innerHTML = products.map(p => `
   <div style="display:flex;justify-content:space-between;gap:5px;padding:5px;border-bottom:1px solid #eee;font-size:8px">
    <span>${esc(p.name)} (${formatPrice(p.retailPrice)})</span>
    <button style="border:0;background:var(--red);color:white;padding:4px;border-radius:4px;font-size:7px" onclick="deleteCloudProduct('${p.firestoreId}')">Delete</button>
   </div>
  `).join("");
 }

 const ordersList = document.getElementById("adminOrdersList");
 if (ordersList) {
  ordersList.innerHTML = orders.map(o => `
   <div style="display:flex;justify-content:space-between;gap:5px;padding:5px;background:#fff;border-radius:5px;margin-bottom:4px;font-size:8px">
    <span><b>${esc(o.id)}</b> — ${formatPrice(o.total)}</span>
    <select onchange="updateOrderStatus('${o.firestoreId}', this.value)" style="font-size:7px">
     <option ${o.status === 'Order Received' ? 'selected' : ''}>Order Received</option>
     <option ${o.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
     <option ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
     <option ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
     <option ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
    </select>
   </div>
  `).join("");
 }
}

function updateResellerAppStatus(firestoreId, status) {
 db.collection("resellerApplications").doc(firestoreId).update({ status }).then(() => {
  showToast("Reseller application " + status + "!");
 }).catch(err => alert(err.message));
}

function updateOrderStatus(firestoreId, status) {
 db.collection("orders").doc(firestoreId).update({ status }).then(() => {
  showToast("Order status updated in real-time!");
 }).catch(err => alert(err.message));
}

async function stageAdminImage(event) {
 const file = event.target.files[0];
 if (!file) return;
 showToast("Uploading image to Firebase Storage...");
 const storageRef = storage.ref(`products/${Date.now()}_${file.name}`);
 try {
  const snapshot = await storageRef.put(file);
  stagedAdminImageUrl = await snapshot.ref.getDownloadURL();
  showToast("Image uploaded successfully to cloud!");
 } catch (err) {
  alert("Image upload failed: " + err.message);
 }
}

function addNewProductByAdmin() {
 const name = document.getElementById("new_name").value.trim();
 if (!name) { alert("Product name required."); return; }
 const newProduct = {
  id: Date.now(),
  name,
  category: document.getElementById("new_category").value,
  occasion: document.getElementById("new_occasion").value,
  marketPrice: Number(document.getElementById("new_marketPrice").value || 0),
  retailPrice: Number(document.getElementById("new_retailPrice").value || 0),
  wholesalePrice: Number(document.getElementById("new_wholesalePrice").value || 0),
  img: stagedAdminImageUrl || document.getElementById("new_img").value || "https://via.placeholder.com/600x500?text=Zayina+Product",
  desc: document.getElementById("new_desc").value || "Premium Zayina product.",
  highlights: document.getElementById("new_highlights").value.split(",").map(x => x.trim()).filter(Boolean),
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
 };

 db.collection("products").add(newProduct).then(() => {
  showToast("Product added to cloud database!");
  stagedAdminImageUrl = "";
  ["new_name", "new_marketPrice", "new_retailPrice", "new_wholesalePrice", "new_img", "new_img_file", "new_desc", "new_highlights"].forEach(id => {
   let el = document.getElementById(id);
   if (el) el.value = "";
  });
 }).catch(err => alert("Error adding product: " + err.message));
}

function deleteCloudProduct(firestoreId) {
 if (!confirm("Delete this product from cloud database?")) return;
 db.collection("products").doc(firestoreId).delete().then(() => {
  showToast("Product deleted from cloud!");
 }).catch(err => alert(err.message));
}

// ==========================================
// REVIEWS & MISC MODALS
// ==========================================
function submitUserReview() {
 const name = document.getElementById("revName").value.trim();
 const text = document.getElementById("revText").value.trim();
 if (!name || !text) { alert("Please enter name and review."); return; }
 db.collection("reviews").add({
  name,
  text,
  date: new Date().toLocaleDateString(),
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
 }).then(() => {
  document.getElementById("revName").value = "";
  document.getElementById("revText").value = "";
  showToast("Review posted to cloud!");
 }).catch(err => alert(err.message));
}

function renderReviews() {
 const box = document.getElementById("reviewsFeedList");
 if (!box) return;
 if (!reviews.length) { box.innerHTML = '<p style="font-size:9px;color:#777">No reviews yet.</p>'; return; }
 box.innerHTML = reviews.slice(0, 10).map(r => `
  <div style="background:#faf7ef;padding:7px;border-radius:7px;margin-bottom:5px">
   <b style="font-size:9px">⭐ ${esc(r.name)}</b>
   <p style="font-size:8px;margin-top:3px">${esc(r.text)}</p>
   <small style="font-size:7px;color:#999">${esc(r.date)}</small>
  </div>
 `).join("");
}

function openResellerShare(id) {
 if (!resellerApproved) {
  alert("Please apply for the reseller program first.");
  openModal("resellerModal");
  return;
 }
 selectedShareProduct = products.find(x => x.id === id);
 if (!selectedShareProduct) return;
 const commInput = document.getElementById("shareCommissionInput");
 if(commInput) commInput.value = 100;
 updateSharePrice();
 const preview = document.getElementById("shareProductPreview");
 if(preview) {
  preview.innerHTML = `
   <div style="display:flex;gap:7px;background:#faf7ef;padding:7px;border-radius:8px">
    <img src="${esc(selectedShareProduct.img)}" style="width:60px;height:60px;object-fit:cover;border-radius:6px">
    <div>
     <b style="font-size:10px">${esc(selectedShareProduct.name)}</b>
     <p style="font-size:8px;color:#666;margin-top:3px">${esc(selectedShareProduct.desc)}</p>
    </div>
   </div>
  `;
 }
 openModal("resellerShareModal");
}

function updateSharePrice() {
 if (!selectedShareProduct) return;
 const commInput = document.getElementById("shareCommissionInput");
 const commission = Math.max(0, Number(commInput ? commInput.value : 100));
 const base = Number(selectedShareProduct.wholesalePrice);
 const customer = base + commission;
 
 const bPrice = document.getElementById("shareBasePrice");
 const cPrice = document.getElementById("shareCustomerPrice");
 const pProfit = document.getElementById("shareProfit");

 if(bPrice) bPrice.textContent = formatPrice(base);
 if(cPrice) cPrice.textContent = formatPrice(customer);
 if(pProfit) pProfit.textContent = formatPrice(commission);
}

function makeShareData() {
 const commInput = document.getElementById("shareCommissionInput");
 const commission = Math.max(0, Number(commInput ? commInput.value : 100));
 const p = selectedShareProduct;
 const customerPrice = p.wholesalePrice + commission;
 const shareUrl = window.location.href.split("#")[0] + "#reseller=" + encodeURIComponent(resellerUID) + "&product=" + p.id + "&commission=" + commission;
 return { p, commission, customerPrice, shareUrl };
}

function shareMessage() {
 const d = makeShareData();
 return `✨ ${d.p.name}\n\n${d.p.desc}\n\n💰 Special Price: ${formatPrice(d.customerPrice)}\n\n🤝 Reseller Offer\n📦 Product: ${d.p.name}\n💎 Premium Zayina Glamour Collection\n\n${d.shareUrl}`;
}

function shareViaWhatsApp() {
 window.open("https://wa.me/?text=" + encodeURIComponent(shareMessage()), "_blank");
 resellerPoints += 2;
 updateResellerDashboard();
}

async function nativeShare() {
 const d = makeShareData();
 if (navigator.share) {
  try {
   await navigator.share({ title: d.p.name + " | Zayina Glamour", text: shareMessage(), url: d.shareUrl });
   resellerPoints += 2;
   updateResellerDashboard();
  } catch (e) {}
 } else {
  copyShareLink();
 }
}

async function copyShareLink() {
 const d = makeShareData();
 try {
  await navigator.clipboard.writeText(shareMessage());
  showToast("Product details copied!");
 } catch (e) {
  showToast("Copied to clipboard!");
 }
 resellerPoints += 1;
 updateResellerDashboard();
}

function saveToMiniStore() {
 if (!selectedShareProduct) return;
 showToast("Added to your mini store!");
 updateResellerDashboard();
}

function openResellerProfitEngine() {
 const select = document.getElementById("profitProduct");
 if(select) {
  select.innerHTML = products.map(p => `<option value="${p.id}">${esc(p.name)} — ${formatPrice(p.wholesalePrice)}</option>`).join("");
 }
 openModal("profitModal");
}

function calculateResellerProfit() {
 const sel = document.getElementById("profitProduct");
 const id = Number(sel ? sel.value : 0);
 const p = products.find(x => x.id === id);
 const sellInput = document.getElementById("profitSellingPrice");
 const qtyInput = document.getElementById("profitQuantity");
 const selling = Number(sellInput ? sellInput.value : 0);
 const qty = Math.max(1, Number(qtyInput ? qtyInput.value : 1));
 
 if (!p || !selling) { alert("Enter selling price."); return; }
 const profit = (selling - p.wholesalePrice) * qty;
 const resBox = document.getElementById("profitResult");
 if(resBox) {
  resBox.innerHTML = `
   <p style="font-size:9px">Base Cost: <b>${formatPrice(p.wholesalePrice)}</b></p>
   <p style="font-size:9px;margin-top:4px">Customer Price: <b>${formatPrice(selling)}</b></p>
   <p style="font-size:10px;margin-top:5px">Total Profit: <b style="color:${profit >= 0 ? "var(--green)" : "var(--red)"}">${formatPrice(profit)}</b></p>
  `;
 }
}

function openResellerStore() {
 const sInput = document.getElementById("storeName");
 if(sInput) sInput.value = storeName;
 openModal("storeModal");
}

function saveStoreName() {
 const sInput = document.getElementById("storeName");
 storeName = sInput ? (sInput.value.trim() || "My Zayina Store") : "My Zayina Store";
 showToast("Store name saved!");
}

function copyStoreLink() {
 const link = window.location.href.split("#")[0] + "#store=" + encodeURIComponent(resellerUID);
 navigator.clipboard?.writeText(link).then(() => showToast("Store link copied!")).catch(() => alert(link));
}

function saveDNA() {
 const cat = document.getElementById("dnaCategory");
 const occ = document.getElementById("dnaOccasion");
 const bud = document.getElementById("dnaBudget");
 
 dna = {
  category: cat ? cat.value : "all",
  occasion: occ ? occ.value : "all",
  budget: bud ? bud.value : ""
 };
 saveLocalDeviceData();
 showToast("Style DNA saved successfully!");
 closeModal("dnaModal");
 renderProducts();
}

function openLeaderboard() {
 const lList = document.getElementById("leaderboardList");
 if(lList) {
  lList.innerHTML = `
   <div style="background:#faf7ef; padding:8px; border-radius:6px; margin-bottom:5px; font-size:9px; display:flex; justify-content:space-between;">
    <span>1. ${resellerUID || "You"} (Elite Reseller)</span>
    <b>${resellerPoints} Pts</b>
   </div>
  `;
 }
 openModal("leaderboardModal");
}

function changeCurrency() {
 const sel = document.getElementById("currencySelector");
 if(sel) {
  currentCurrency = sel.value;
  renderProducts();
 }
}

function changeLanguage() {
 const sel = document.getElementById("langSelector");
 if(sel) {
  currentLang = sel.value;
  showToast("Language changed to " + currentLang);
 }
}

// Initial Call to load data & UI
document.addEventListener("DOMContentLoaded", () => {
 updateResellerDashboard();
});
