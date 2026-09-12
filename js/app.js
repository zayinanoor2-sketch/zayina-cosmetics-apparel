import { db, collection, onSnapshot } from './firebase-config.js';

const ADMIN_WHATSAPP = "923400766741";
let productsList = [];
let filteredProducts = [];
let cart = [];
let currentCurrency = "PKR";
let activeCategory = "Cosmetics";
let rates = { PKR: 1, USD: 0.0036, INR: 0.30 };
let currentShareProduct = null;

window.addEventListener('DOMContentLoaded', () => {
    listenProducts();
    setupUIEvents();
});

function listenProducts() {
    onSnapshot(collection(db, "products"), (snapshot) => {
        productsList = [];
        snapshot.forEach((doc) => {
            productsList.push({ id: doc.id, ...doc.data() });
        });
        applyFilters();
    });
}

function applyFilters() {
    const searchVal = document.getElementById('searchInput').value.toLowerCase();
    const sortVal = document.getElementById('sortSelect').value;

    filteredProducts = productsList.filter(p => {
        const matchesCategory = (p.category || 'Cosmetics') === activeCategory;
        const matchesSearch = p.title.toLowerCase().includes(searchVal) || (p.description && p.description.toLowerCase().includes(searchVal));
        return matchesCategory && matchesSearch;
    });

    if (sortVal === 'low') filteredProducts.sort((a, b) => a.price - b.price);
    if (sortVal === 'high') filteredProducts.sort((a, b) => b.price - a.price);

    renderProducts();
}

function renderProducts() {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';

    if (filteredProducts.length === 0) {
        grid.innerHTML = '<p style="font-size:12px; color:#64748b; grid-column: 1/-1; text-align:center; padding: 20px 0;">No products found in this category.</p>';
        return;
    }

    filteredProducts.forEach(p => {
        const rate = rates[currentCurrency];
        const displayPrice = (p.price * rate).toFixed(0);

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${p.image || 'https://via.placeholder.com/150'}" alt="${p.title}">
            <h4>${p.title}</h4>
            <p>${p.description || ''}</p>
            <div class="price-row">
                <span class="retail-price">${currentCurrency} ${displayPrice}</span>
            </div>
            <div class="card-actions">
                <button class="btn-card-cart" onclick="addToCart('${p.id}')"><i class="fa-solid fa-cart-shopping"></i></button>
                <button class="btn-card-buy" onclick="buyNow('${p.id}')">Buy</button>
                <button class="btn-card-share" onclick="openShareModal('${p.id}')"><i class="fa-solid fa-share"></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.addToCart = function(id) {
    const p = productsList.find(prod => prod.id === id);
    if (!p) return;
    const item = cart.find(i => i.id === id);
    if (item) item.qty += 1;
    else cart.push({ ...p, qty: 1 });
    updateCart();
};

window.buyNow = function(id) {
    window.addToCart(id);
    document.getElementById('cartModal').classList.add('show');
};

function updateCart() {
    document.getElementById('cartCount').innerText = cart.reduce((s, i) => s + i.qty, 0);
    const totalPKR = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    
    const pct = Math.min((totalPKR / 2000) * 100, 100);
    document.getElementById('dealProgressBar').style.width = `${pct}%`;
    document.getElementById('dealPercent').innerText = `${pct.toFixed(0)}%`;

    const container = document.getElementById('cartItemsContainer');
    container.innerHTML = '';
    cart.forEach(item => {
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:4px;">
                <span>${item.title} (x${item.qty})</span>
                <span>Rs. ${item.price * item.qty}</span>
            </div>
        `;
    });
    document.getElementById('cartTotal').innerText = (totalPKR * rates[currentCurrency]).toFixed(0);
}

window.openShareModal = function(id) {
    currentShareProduct = productsList.find(p => p.id === id);
    if (!currentShareProduct) return;

    document.getElementById('shareProdImg').src = currentShareProduct.image;
    document.getElementById('shareProdTitle').innerText = currentShareProduct.title;
    document.getElementById('shareBasePrice').innerText = currentShareProduct.price;
    
    updateShareCalc();
    document.getElementById('shareModal').classList.add('show');
};

function updateShareCalc() {
    const comm = parseFloat(document.getElementById('resellerCommissionInput').value || 0);
    const base = currentShareProduct ? currentShareProduct.price : 0;
    document.getElementById('shareCustomerPrice').innerText = base + comm;
    document.getElementById('shareYourProfit').innerText = comm;
}

function showInfoModal(title, text) {
    document.getElementById('infoTitle').innerText = title;
    document.getElementById('infoBody').innerText = text;
    document.getElementById('infoModal').classList.add('show');
}

function setupUIEvents() {
    // Categories Navigation
    document.querySelectorAll('.top-nav-pills .pill-btn:not(.cart-pill)').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.top-nav-pills .pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.getAttribute('data-category');
            document.getElementById('currentCategoryTitle').innerText = `${activeCategory} Collection`;
            applyFilters();
        });
    });

    // Filters
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('sortSelect').addEventListener('change', applyFilters);
    document.getElementById('resellerCommissionInput').addEventListener('input', updateShareCalc);

    // Header Links
    document.getElementById('reviewsBtn').onclick = () => showInfoModal("Customer Reviews", "⭐ 4.9/5 Rating based on 1,200+ reseller orders across Pakistan.");
    document.getElementById('trackBtn').onclick = () => showInfoModal("Order Tracking", "Enter your Tracking ID sent to your WhatsApp number to check real-time status.");
    document.getElementById('resellerBtn').onclick = () => showInfoModal("Reseller Program", "Earn up to Rs. 50,000/month by setting your own profit margins on products.");
    document.getElementById('openMiniStore').onclick = () => showInfoModal("Mini Store Link", "Your store link is active: zayinaglamour.com/ref/ZG-432098");
    document.getElementById('openProfitCalc').onclick = () => showInfoModal("Profit Calculator", "Use the 'Share' button on any product to calculate customer pricing.");

    // Modals
    document.getElementById('cartBtn').onclick = () => document.getElementById('cartModal').classList.add('show');
    document.getElementById('closeCart').onclick = () => document.getElementById('cartModal').classList.remove('show');
    document.getElementById('closeShare').onclick = () => document.getElementById('shareModal').classList.remove('show');
    document.getElementById('closeInfo').onclick = () => document.getElementById('infoModal').classList.remove('show');

    // WhatsApp Direct Checkout
    document.getElementById('checkoutBtn').onclick = () => {
        if(cart.length === 0) return alert("Your cart is empty!");
        let text = `Hello Zayina Glamour,\nI want to order:\n`;
        let total = 0;
        cart.forEach(i => {
            text += `- ${i.title} (Qty: ${i.qty}) = Rs. ${i.price * i.qty}\n`;
            total += i.price * i.qty;
        });
        text += `Total Amount: Rs. ${total}\nPlease confirm my order.`;
        window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank');
    };

    // Share Product to WhatsApp
    document.getElementById('shareWhatsAppBtn').onclick = () => {
        if (!currentShareProduct) return;
        const comm = parseFloat(document.getElementById('resellerCommissionInput').value || 0);
        const finalPrice = currentShareProduct.price + comm;
        const shareText = `🔥 *${currentShareProduct.title}*\n\n${currentShareProduct.description || ''}\n\n🏷️ Price: Rs. ${finalPrice}\n🚚 Cash on Delivery Available!\n\nReply to order now!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    };
}
