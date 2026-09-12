import { db, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from './firebase-config.js';

let selectedBase64Image = "";

window.addEventListener('DOMContentLoaded', () => {
    setupAdminEvents();
});

function setupAdminEvents() {
    const adminModal = document.getElementById('adminModal');
    
    document.getElementById('adminLoginBtn').onclick = () => adminModal.classList.add('show');
    document.getElementById('closeAdmin').onclick = () => adminModal.classList.remove('show');

    document.getElementById('adminLoginSubmit').onclick = () => {
        const pass = document.getElementById('adminPasswordInput').value;
        if (pass === "admin123") {
            document.getElementById('adminLoginForm').classList.add('hidden');
            document.getElementById('adminPanel').classList.remove('hidden');
            loadResellerRequests();
        } else {
            alert("Incorrect Admin Password!");
        }
    };

    // Admin Tabs Switch
    document.getElementById('tabAddProductBtn').onclick = () => switchAdminTab('product');
    document.getElementById('tabResellersBtn').onclick = () => switchAdminTab('resellers');
    document.getElementById('tabAddReviewBtn').onclick = () => switchAdminTab('reviews');

    // Image Upload
    document.getElementById('prodImgFile').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                selectedBase64Image = evt.target.result;
                document.getElementById('imagePreview').src = selectedBase64Image;
                document.getElementById('imagePreviewContainer').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    // Add Product with Wholesale + Retail
    document.getElementById('addProductBtn').onclick = async () => {
        const title = document.getElementById('prodTitle').value;
        const category = document.getElementById('prodCategory').value;
        const price = parseFloat(document.getElementById('prodWholesalePrice').value);
        const retailPrice = parseFloat(document.getElementById('prodRetailPrice').value || price);
        const description = document.getElementById('prodDesc').value;

        if (!title || !price || !selectedBase64Image) {
            return alert("Kripya Product Title, Wholesale Price aur Image upload karein.");
        }

        try {
            await addDoc(collection(db, "products"), {
                title,
                category,
                price,
                retailPrice,
                image: selectedBase64Image,
                description,
                createdAt: new Date()
            });

            alert("Product Live Add ho gaya hai!");
            document.getElementById('prodTitle').value = '';
            document.getElementById('prodWholesalePrice').value = '';
            document.getElementById('prodRetailPrice').value = '';
            document.getElementById('prodDesc').value = '';
            document.getElementById('imagePreviewContainer').classList.add('hidden');
            selectedBase64Image = "";
        } catch (e) {
            alert("Error: " + e.message);
        }
    };

    // Post Admin Review
    document.getElementById('postReviewBtn').onclick = async () => {
        const name = document.getElementById('reviewCustName').value;
        const rating = parseInt(document.getElementById('reviewRating').value);
        const comment = document.getElementById('reviewComment').value;

        if (!name || !comment) return alert("Customer Name aur Review Comment required hai.");

        try {
            await addDoc(collection(db, "reviews"), {
                name,
                rating,
                comment,
                createdAt: new Date()
            });
            alert("Review Published ho gaya!");
            document.getElementById('reviewCustName').value = '';
            document.getElementById('reviewComment').value = '';
        } catch (e) {
            alert("Error posting review: " + e.message);
        }
    };
}

function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('adminAddProductSec').classList.add('hidden');
    document.getElementById('adminResellersSec').classList.add('hidden');
    document.getElementById('adminAddReviewSec').classList.add('hidden');

    if (tab === 'product') {
        document.getElementById('tabAddProductBtn').classList.add('active');
        document.getElementById('adminAddProductSec').classList.remove('hidden');
    } else if (tab === 'resellers') {
        document.getElementById('tabResellersBtn').classList.add('active');
        document.getElementById('adminResellersSec').classList.remove('hidden');
    } else if (tab === 'reviews') {
        document.getElementById('tabAddReviewBtn').classList.add('active');
        document.getElementById('adminAddReviewSec').classList.remove('hidden');
    }
}

function loadResellerRequests() {
    onSnapshot(collection(db, "reseller_requests"), (snapshot) => {
        const list = document.getElementById('resellerRequestsList');
        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<p style="font-size:11px;">Koi pending request nahi hai.</p>';
            return;
        }

        snapshot.forEach(docSnap => {
            const req = docSnap.data();
            const id = docSnap.id;
            const isApproved = req.status === 'approved';

            list.innerHTML += `
                <div class="reseller-req-card">
                    <strong>${req.name}</strong> (${req.phone})<br>
                    <small>Store: ${req.store || 'N/A'} | Status: <b style="color:${isApproved ? '#16a34a':'#dc2626'}">${req.status.toUpperCase()}</b></small>
                    <div class="actions">
                        ${!isApproved ? `<button class="btn-approve" onclick="updateResellerStatus('${id}', 'approved')">Approve</button>` : ''}
                        ${isApproved ? `<button class="btn-reject" onclick="updateResellerStatus('${id}', 'rejected')">Reject (Remove Reseller)</button>` : ''}
                    </div>
                </div>
            `;
        });
    });
}

window.updateResellerStatus = async function(docId, newStatus) {
    try {
        await updateDoc(doc(db, "reseller_requests", docId), { status: newStatus });
        alert(`Reseller status updated to ${newStatus}`);
    } catch (e) {
        alert("Error updating reseller: " + e.message);
    }
};
