// Import Firebase SDK modules from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- FIREBASE CONFIGURATION ---
// (Yahan apni asli Firebase credentials enter karein)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- TAB SWITCHER LOGIC ---
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-tab'));
    
    if(tabName === 'home') {
        document.getElementById('home-section').classList.add('active');
        event.currentTarget.classList.add('active-tab');
    } else if(tabName === 'admin') {
        document.getElementById('admin-section').classList.add('active');
        event.currentTarget.classList.add('active-tab');
    } else if(tabName === 'order') {
        document.getElementById('order-section').classList.add('active');
        event.currentTarget.classList.add('active-tab');
    } else if(tabName === 'reseller') {
        document.getElementById('reseller-section').classList.add('active');
        event.currentTarget.classList.add('active-tab');
    }
}

// --- 1. REAL-TIME PRODUCTS LISTENER ---
const productContainer = document.getElementById("product-container");
if (productContainer) {
    onSnapshot(collection(db, "products"), (snapshot) => {
        if (snapshot.empty) {
            productContainer.innerHTML = "<p>No products available right now.</p>";
            return;
        }
        let html = "";
        snapshot.forEach((doc) => {
            const p = doc.data();
            html += `
                <div class="product-card">
                    <h3>${p.name}</h3>
                    <p><strong>Price:</strong> Rs. ${p.price}</p>
                    <p>${p.description || ''}</p>
                </div>
            `;
        });
        productContainer.innerHTML = html;
    }, (error) => {
        console.error("Error loading real-time products:", error);
    });
}

// --- 2. ADMIN: ADD PRODUCT (Real-Time Sync) ---
const productForm = document.getElementById("product-form");
if (productForm) {
    productForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("p-name").value;
        const price = document.getElementById("p-price").value;
        const desc = document.getElementById("p-desc").value;
        const btn = document.getElementById("p-btn");

        try {
            btn.textContent = "Saving...";
            await addDoc(collection(db, "products"), {
                name: name,
                price: Number(price),
                description: desc,
                createdAt: new Date()
            });
            alert("Product added successfully and synced live across all devices!");
            productForm.reset();
        } catch (err) {
            console.error("Error adding product:", err);
            alert("Failed to save product.");
        } finally {
            btn.textContent = "Add Product (Real-Time)";
        }
    });
}

// --- 3. CUSTOMER: PLACE ORDER ---
const orderForm = document.getElementById("order-form");
if (orderForm) {
    orderForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("cust-name").value;
        const phone = document.getElementById("cust-phone").value;
        const address = document.getElementById("cust-address").value;

        try {
            await addDoc(collection(db, "orders"), {
                customerName: name,
                phone: phone,
                address: address,
                status: "Pending",
                createdAt: new Date()
            });
            alert("Order placed successfully! Admin will see it instantly.");
            orderForm.reset();
        } catch (err) {
            console.error("Error placing order:", err);
            alert("Failed to place order.");
        }
    });
}

// --- 4. RESELLER: SUBMIT APPLICATION ---
const resellerForm = document.getElementById("reseller-form");
if (resellerForm) {
    resellerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("res-name").value;
        const phone = document.getElementById("res-phone").value;

        try {
            await addDoc(collection(db, "resellerApplications"), {
                name: name,
                phone: phone,
                status: "Pending",
                createdAt: new Date()
            });
            document.getElementById("status-box").innerHTML = "Application submitted successfully! Waiting for Admin approval.";
            resellerForm.reset();
        } catch (err) {
            console.error("Error submitting reseller application:", err);
            alert("Submission failed.");
        }
    });
}
