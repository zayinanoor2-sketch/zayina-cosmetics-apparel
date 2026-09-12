import { db, collection, onSnapshot } from './firebase-config.js';

const ADMIN_WHATSAPP = "923400766741";
let productsList = [];
let cart = [];
let currentCurrency = "PKR";
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
        renderProducts();
    });
}

function renderProducts() {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';

    if (productsList.length === 0) {
        grid.innerHTML = '<p style="font-size:12px; color:#64748b;">No products added yet.</p>';
        return;
    }

    productsList.forEach(p => {
        const rate = rates[currentCurrency];
        const displayPrice = (p.price * rate).toFixed(0);
        const marketPrice = p.marketCutPrice ? (p.marketCutPrice * rate).toFixed(0) : (p.price * 1.2 * rate).toFixed(0);

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <span class="match-badge">85% Match</span>
            <img src="${p.image || 'https://via.placeholder.com/150'}" alt="${p.title}">
            <h4>${p.title}</h4>
            <p>${p.description || ''}</p>
            <div class="price-row">
                <span class="market-price">${currentCurrency} ${marketPrice}</span>
                <span class="retail-price">${currentCurrency} ${displayPrice}</span>
                <span class="discount-tag">-15%</span>
            </div>
            <div class="card-actions">
                <button class="btn-card-cart" onclick="addToCart('${p.id}')"><i class="fa-solid fa-cart-shopping"></i> Cart</button>
                <button class="btn-card-buy" onclick="buyNow('${p.id}')"><i class="fa-solid fa-bolt"></i> Buy</button>
                <button class="btn-card-share" onclick="openShareModal('${p.id}')"><i class="fa-solid fa-share"></i> Share</button>
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
    
    // Deal Progress Meter
    const pct = Math.min((totalPKR / 2000) * 100, 100);
    document.getElementById('dealProgressBar').style.width = `${pct}%`;
    document.getElementById('dealPercent').innerText = `${pct.toFixed(0)}%`;
    if(totalPKR >= 2000) {
        document.getElementById('dealLabel').innerText = "🎉 Congratulations! Free Delivery Unlocked!";
    }

    const container = document.getElementById('cartItemsContainer');
    container.innerHTML = '';
    cart.forEach(item => {
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
                <span>${item.title} x${item.qty}</span>
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

function setupUIEvents() {
    document.getElementById('currencySwitcher').addEventListener('change', (e) => {
        currentCurrency = e.target.value;
        renderProducts();
        updateCart();
    });

    document.getElementById('resellerCommissionInput').addEventListener('input', updateShareCalc);

    document.getElementById('cartBtn').onclick = () => document.getElementById('cartModal').classList.add('show');
    document.getElementById('closeCart').onclick = () => document.getElementById('cartModal').classList.remove('show');
    document.getElementById('closeShare').onclick = () => document.getElementById('shareModal').classList.remove('show');

    document.getElementById('checkoutBtn').onclick = () => {
        if(cart.length === 0) return alert("Cart is empty!");
        let text = `Hello Zayina Glamour,\nI want to order:\n`;
        let total = 0;
        cart.forEach(i => {
            text += `- ${i.title} = Rs. ${i.price * i.qty}\n`;
            total += i.price * i.qty;
        });
        text += `Total: Rs. ${total}\nPlease confirm my order.`;
        window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank');
    };
}
