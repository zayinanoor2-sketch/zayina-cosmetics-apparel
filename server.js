// Firebase Configuration (Compat Version)
const firebaseConfig = {
  apiKey: "AIzaSyB1iOKtsVgNh8dVW0wQv0kR1eOsyXymYaI",
  authDomain: "zayina-cosmetics.firebaseapp.com",
  projectId: "zayina-cosmetics",
  storageBucket: "zayina-cosmetics.firebasestorage.app",
  messagingSenderId: "1089060456207",
  appId: "1:1089060456207:web:7fd9860b3bdd96488c207a",
  measurementId: "G-79HBTDTQBN"
};

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

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
 {id: "1", name: "Luxury Matte Lipstick", category: "cosmetics", occasion: "Party", marketPrice: 1200, retailPrice: 650, wholesalePrice: 450, img: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600", desc: "Long-lasting waterproof velvet finish.", highlights: ["Long Lasting", "Velvet Finish", "Party Pick"]},
 {id: "2", name: "Glow Primer Serum", category: "cosmetics", occasion: "Wedding", marketPrice: 1800, retailPrice: 950, wholesalePrice: 700, img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600", desc: "Hydrating glow-focused primer serum.", highlights: ["Hydrating", "Glow Finish", "Wedding Pick"]},
 {id: "3", name: "Bridal Party Lawn Suit", category: "clothes", occasion: "Wedding", marketPrice: 4500, retailPrice: 2450, wholesalePrice: 1900, img: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600", desc: "Elegant 3-piece embroidered digital print suit.", highlights: ["3 Piece", "Embroidered", "Bridal Pick"]},
 {id: "4", name: "Casual College Kurti", category: "clothes", occasion: "College", marketPrice: 2200, retailPrice: 1200, wholesalePrice: 900, img: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600", desc: "Breathable daily wear cotton kurti.", highlights: ["Comfortable", "Daily Wear", "College Pick"]},
 {id: "5", name: "Complete Glamour Kit", category: "bundles", occasion: "Party", marketPrice: 5000, retailPrice: 2800, wholesalePrice: 2100, img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600", desc: "Complete makeup essentials in one glamour kit.", highlights: ["Full Kit", "Best Value", "Gift Ready"]},
 {id: "6", name: "Oversized Flower Claw Clip", category: "cosmetics", occasion: "Casual", marketPrice: 399, retailPrice: 299, wholesalePrice: 229, img: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600", desc: "Trendy oversized floral claw clip for everyday hairstyles.", highlights: ["Trending", "Strong Grip", "Daily Style"]}
];

let cart = JSON.parse(localStorage.getItem("zayinaCart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("zayinaWishlist") || "[]");

let resellerApproved = localStorage.getItem("zayinaResellerApproved") === "true";
let resellerUID = localStorage.getItem("zayinaResellerUID") || "";
let resellerPoints = 10;
let resellerSales = 0;
let storeName = "My Zayina Store";
let selectedShareProduct = null;
let stagedAdminImageFile = null;
let dna = JSON.parse(localStorage.getItem("zayinaDNA") || "{}");

document.addEventListener("DOMContentLoaded", () => {
 fetchProductsRealtime();
 updateCartCount();
 updateDealMeter();
 updateResellerDashboard();
});

function fetchProductsRealtime() {
 db.collection("products").onSnapshot((snapshot) => {
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
  console.log("Offline mode or permission issue:", error);
  renderProducts();
 });
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
 const liked = wishlist.includes(String(p.id));
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

function stageAdminImage(event) {
 const file = event.target.files[0];
 if (file) {
  stagedAdminImageFile = file;
  showToast("Image staged for upload");
 }
}

async function addNewProductByAdmin() {
 const name = document.getElementById("new_name").value.trim();
 if (!name) { alert("Product name required."); return; }
 
 let imageUrl = document.getElementById("new_img").value.trim() || "https://via.press/600";

 if (stagedAdminImageFile) {
  try {
   showToast("Uploading image...");
   const storageRef = storage.ref().child("products/" + Date.now() + "_" + stagedAdminImageFile.name);
   const snapshot = await storageRef.put(stagedAdminImageFile);
   imageUrl = await snapshot.ref.getDownloadURL();
  } catch(err) {
   console.log("Image upload failed, using default:", err);
  }
 }

 const newProduct = {
  name,
  category: document.getElementById("new_category").value,
  occasion: document.getElementById("new_occasion").value,
  marketPrice: Number(document.getElementById("new_marketPrice").value || 0),
  retailPrice: Number(document.getElementById("new_retailPrice").value || 0),
  wholesalePrice: Number(document.getElementById("new_wholesalePrice").value || 0),
  img: imageUrl,
  desc: document.getElementById("new_desc").value || "Premium Zayina product.",
  highlights: document.getElementById("new_highlights").value.split(",").map(x => x.trim()).filter(Boolean)
 };

 db.collection("products").add(newProduct).then(() => {
  showToast("Product added to cloud successfully!");
  closeModal("adminModal");
  stagedAdminImageFile = null;
 }).catch(e => {
  alert("Error adding product: " + e.message);
 });
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

function saveToMiniStore() {
 showToast("Product saved to your mini store!");
 closeModal("resellerShareModal");
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

function openLeaderboard() {
 document.getElementById("leaderboardList").innerHTML = `
  <div style="background:#faf7ef; padding:8px; border-radius:6px; font-size:9px; display:flex; justify-content:space-between;">
   <span>1. ${resellerUID || "You"} (Elite Reseller)</span>
   <b>${resellerPoints} Pts</b>
  </div>
 `;
 openModal("leaderboardModal");
}

function openResellerDashboardTab() {
 closeModal("resellerModal");
 updateResellerDashboard();
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

function changeCurrency() {
 currentCurrency = document.getElementById("currencySelector").value;
 renderProducts();
}

function changeLanguage() {
 currentLang = document.getElementById("langSelector").value;
 showToast("Language changed to " + currentLang);
}
