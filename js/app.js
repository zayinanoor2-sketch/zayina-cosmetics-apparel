import { db, collection, onSnapshot, addDoc } from './firebase-config.js';

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
        const matchesSearch = p.title.toLowerCase().includes(searchVal);
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
        grid.innerHTML = '<p style="font-size:12px; color:#64748b; grid-column: 1/-1; text-align:center; padding: 20px 0;">Is category mein abhi koi product nahi hai.</p>';
        return;
    }

    filteredProducts.forEach(p => {
        const rate = rates[currentCurrency];
        const wholesalePrice = (p.price * rate).toFixed(0);
        const retailPrice = p.retailPrice ? (p.retailPrice * rate).toFixed(0) : '';

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${p.image || 'https://via.placeholder.com/150'}" alt="${p.title}">
            <h4>${p.title}</h4>
            <p>${p.description || ''}</p>
            <div class="price-row">
                <span class="wholesale-price">${currentCurrency} ${wholesalePrice}</span>
                ${retailPrice ? `<span class="retail-price-cut">${currentCurrency} ${retailPrice}</span>` : ''}
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
    document.getElementById('shareProdDescText').innerText = currentShareProduct.description || '';
    document.getElementById('shareBasePrice').innerText = currentShareProduct.price;
    document.getElementById('shareRetailPrice').innerText = currentShareProduct.retailPrice || currentShareProduct.price;
    
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
    // Categories
    document.querySelectorAll('.top-nav-pills .pill-btn:not(.cart-pill)').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.top-nav-pills .pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.getAttribute('data-category');
            document.getElementById('currentCategoryTitle').innerText = `${activeCategory} Collection`;
            applyFilters();
        });
    });

    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('sortSelect').addEventListener('change', applyFilters);
    document.getElementById('resellerCommissionInput').addEventListener('input', updateShareCalc);

    // Header Links
    document.getElementById('trackBtn').onclick = () => document.getElementById('trackModal').classList.add('show');
    document.getElementById('resellerBtn').onclick = () => document.getElementById('resellerApplyModal').classList.add('show');
    document.getElementById('reviewsBtn').onclick = () => {
        document.getElementById('reviewsModal').classList.add('show');
        loadReviews();
    };

    // Close Modals
    document.getElementById('closeTrack').onclick = () => document.getElementById('trackModal').classList.remove('show');
    document.getElementById('closeResellerApply').onclick = () => document.getElementById('resellerApplyModal').classList.remove('show');
    document.getElementById('closeReviews').onclick = () => document.getElementById('reviewsModal').classList.remove('show');
    document.getElementById('cartBtn').onclick = () => document.getElementById('cartModal').classList.add('show');
    document.getElementById('closeCart').onclick = () => document.getElementById('cartModal').classList.remove('show');
    document.getElementById('closeShare').onclick = () => document.getElementById('shareModal').classList.remove('show');

    // Order Tracking Logic
    document.getElementById('searchOrderBtn').onclick = () => {
        const id = document.getElementById('trackOrderIdInput').value.trim();
        const res = document.getElementById('orderStatusResult');
        if (!id) return alert("Kripya Order ID enter karein");
        res.innerHTML = `<div style="background:#e0f2fe; color:#0369a1; padding:8px; border-radius:6px;">📦 Order ID: <strong>${id}</strong><br>Status: <strong>Dispatched (In Transit)</strong><br>Delivery Expected: 2-3 Days.</div>`;
    };

    // Reseller Request Submit
    document.getElementById('submitResellerReqBtn').onclick = async () => {
        const name = document.getElementById('applicantName').value;
        const phone = document.getElementById('applicantPhone').value;
        const store = document.getElementById('applicantStore').value;

        if (!name || !phone) return alert("Naam aur WhatsApp number enter karein");

        try {
            await addDoc(collection(db, "reseller_requests"), {
                name,
                phone,
                store,
                status: 'pending',
                createdAt: new Date()
            });
            alert("Aapki Reseller Request submit ho gayi hai! Admin approval ke baad aapka portal activate ho jayega.");
            document.getElementById('resellerApplyModal').classList.remove('show');
        } catch (e) {
            alert("Error submitting request: " + e.message);
        }
    };

    document.getElementById('whatsappResellerApplyBtn').onclick = () => {
        const text = `Hello Zayina Glamour Admin,\nMain Reseller Program ke liye apply karna chahta hoon. Please mera account approve karein.`;
        window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank');
    };

    // Share Product Logic with Image
    document.getElementById('shareWhatsAppBtn').onclick = () => {
        if (!currentShareProduct) return;
        const comm = parseFloat(document.getElementById('resellerCommissionInput').value || 0);
        const finalPrice = currentShareProduct.price + comm;
        
        const shareText = `🛍️ *${currentShareProduct.title}*\n\n📝 ${currentShareProduct.description || ''}\n\n💰 *Special Price: Rs. ${finalPrice}*\n🚚 Cash on Delivery Available across Pakistan!\n\n📲 Order karne ke liye abhi reply karein.\n\nImage Link: ${currentShareProduct.image}`;
        
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    };

    // Cart Order
    document.getElementById('checkoutBtn').onclick = () => {
        if(cart.length === 0) return alert("Cart khali hai!");
        let text = `Hello Zayina Glamour,\nMain order place karna chahta hoon:\n`;
        let total = 0;
        cart.forEach(i => {
            text += `- ${i.title} (x${i.qty}) = Rs. ${i.price * i.qty}\n`;
            total += i.price * i.qty;
        });
        text += `Total Amount: Rs. ${total}\nPlease confirm order.`;
        window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank');
    };
}

function loadReviews() {
    onSnapshot(collection(db, "reviews"), (snapshot) => {
        const container = document.getElementById('reviewsListContainer');
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p>Abhi koi reviews nahi hain.</p>';
            return;
        }
        snapshot.forEach(doc => {
            const rev = doc.data();
            container.innerHTML += `
                <div style="background:#f8fafc; padding:8px; border-radius:6px; margin-bottom:8px; border:1px solid #e2e8f0;">
                    <strong>${rev.name}</strong> <span style="color:#f59e0b;">${'⭐'.repeat(rev.rating)}</span>
                    <p style="color:#475569; margin-top:2px;">"${rev.comment}"</p>
                </div>
            `;
        });
    });
}
