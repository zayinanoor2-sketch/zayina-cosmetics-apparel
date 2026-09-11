import { db, collection, onSnapshot } from './firebase-config.js';

const ADMIN_WHATSAPP = "923400766741";
let productsList = [];
let cart = [];
let currentCurrency = "PKR";
let exchangeRates = { PKR: 1, USD: 0.0036, INR: 0.30 };
let activeReseller = null;

// Initialize Live Realtime Products Listener
window.addEventListener('DOMContentLoaded', () => {
    parseResellerURL();
    listenToProducts();
    setupEventListeners();
});

// URL Param Check for Reseller Share Links
function parseResellerURL() {
    const params = new URLSearchParams(window.location.search);
    const resellerUid = params.get('ref');
    const storeName = params.get('store');
    
    if (resellerUid) {
        activeReseller = { uid: resellerUid, storeName: storeName || 'Partner Store' };
        document.getElementById('resellerBanner').classList.remove('hidden');
        document.getElementById('resellerStoreName').innerText = activeReseller.storeName;
        document.getElementById('resellerUIDDisplay').innerText = activeReseller.uid;
    }
}

// Real-time Firestore Sync
function listenToProducts() {
    onSnapshot(collection(db, "products"), (snapshot) => {
        productsList = [];
        snapshot.forEach((doc) => {
            productsList.push({ id: doc.id, ...doc.data() });
        });
        renderProducts();
        populateResellerSelect();
    });
}

function renderProducts() {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';

    if (productsList.length === 0) {
        grid.innerHTML = '<p>No products available right now.</p>';
        return;
    }

    productsList.forEach(prod => {
        const finalPrice = calculateDisplayPrice(prod.price);
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${prod.image || 'https://via.placeholder.com/150'}" alt="${prod.title}">
            <h3>${prod.title}</h3>
            <p>${prod.description || ''}</p>
            <div class="price-tag">${currentCurrency} ${finalPrice.toFixed(2)}</div>
            <button onclick="addToCart('${prod.id}')" class="btn-primary">Add to Cart</button>
        `;
        grid.appendChild(card);
    });
}

function calculateDisplayPrice(basePrice) {
    const params = new URLSearchParams(window.location.search);
    const customMarkup = parseFloat(params.get('markup') || 0);
    const totalPkr = parseFloat(basePrice) + customMarkup;
    return totalPkr * exchangeRates[currentCurrency];
}

window.addToCart = function(productId) {
    const product = productsList.find(p => p.id === productId);
    if (!product) return;
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        const params = new URLSearchParams(window.location.search);
        const customMarkup = parseFloat(params.get('markup') || 0);
        cart.push({ ...product, qty: 1, sellingPrice: product.price + customMarkup });
    }
    updateCartUI();
};

function updateCartUI() {
    document.getElementById('cartCount').innerText = cart.reduce((sum, i) => sum + i.qty, 0);
    
    let totalPKR = cart.reduce((sum, i) => sum + (i.sellingPrice * i.qty), 0);
    
    // Deal Meter Update (Threshold 2000 PKR)
    const progressPercent = Math.min((totalPKR / 2000) * 100, 100);
    document.getElementById('dealProgressBar').style.width = `${progressPercent}%`;
    
    if (totalPKR >= 2000) {
        document.getElementById('dealStatus').innerText = `Unlocked Free Delivery! (Rs. ${totalPKR})`;
    } else {
        document.getElementById('dealStatus').innerText = `Rs. ${totalPKR} / Rs. 2000`;
    }

    // Render Cart Items
    const container = document.getElementById('cartItemsContainer');
    container.innerHTML = '';
    cart.forEach(item => {
        container.innerHTML += `
            <div class="cart-item-row">
                <span>${item.title} x ${item.qty}</span>
                <span>Rs. ${item.sellingPrice * item.qty}</span>
            </div>
        `;
    });

    document.getElementById('cartTotal').innerText = (totalPKR * exchangeRates[currentCurrency]).toFixed(2);
}

function setupEventListeners() {
    // Currency Switcher
    document.getElementById('currencySwitcher').addEventListener('change', (e) => {
        currentCurrency = e.target.value;
        renderProducts();
        updateCartUI();
    });

    // Modals Controls
    document.getElementById('cartBtn').onclick = () => document.getElementById('cartModal').classList.add('show');
    document.getElementById('closeCart').onclick = () => document.getElementById('cartModal').classList.remove('show');
    document.getElementById('resellerBtn').onclick = () => document.getElementById('resellerModal').classList.add('show');
    document.getElementById('closeReseller').onclick = () => document.getElementById('resellerModal').classList.remove('show');

    // Reseller Registration
    document.getElementById('resellerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('resellerName').value;
        const phone = document.getElementById('resellerPhone').value;
        const store = document.getElementById('resellerStore').value;
        const uid = 'ZG-' + Math.floor(100000 + Math.random() * 900000);

        document.getElementById('myUID').innerText = uid;
        document.getElementById('myStoreName').innerText = store;
        document.getElementById('resellerDashboard').classList.remove('hidden');
        alert(`Reseller Created Successfully! Your UID is ${uid}`);
    });

    // WhatsApp Checkout Routing
    document.getElementById('checkoutBtn').onclick = () => {
        const name = document.getElementById('custName').value;
        const address = document.getElementById('custAddress').value;
        const phone = document.getElementById('custPhone').value;

        if (!name || !address || !phone) {
            alert('Please fill out your delivery details!');
            return;
        }

        let orderText = `*NEW ORDER - ZAYINA COSMETICS*\n\n`;
        if (activeReseller) {
            orderText += `*Reseller UID:* ${activeReseller.uid}\n*Store Name:* ${activeReseller.storeName}\n\n`;
        }
        orderText += `*Customer:* ${name}\n*Phone:* ${phone}\n*Address:* ${address}\n\n*Items Ordered:*\n`;
        
        let total = 0;
        cart.forEach(item => {
            orderText += `- ${item.title} x${item.qty} = Rs. ${item.sellingPrice * item.qty}\n`;
            total += item.sellingPrice * item.qty;
        });

        orderText += `\n*Total Amount:* Rs. ${total}`;
        
        const waUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(orderText)}`;
        window.open(waUrl, '_blank');
    };
}

function populateResellerSelect() {
    const select = document.getElementById('shareProductSelect');
    select.innerHTML = '<option value="">Select Product to Share</option>';
    productsList.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.title} (Wholesale: Rs. ${p.price})</option>`;
    });
}
