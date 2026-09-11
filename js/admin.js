import { db, collection, addDoc, deleteDoc, doc, serverTimestamp } from './firebase-config.js';

const ADMIN_PASS = "Zayina66#";

document.addEventListener('DOMContentLoaded', () => {
    const adminBtn = document.getElementById('adminLoginBtn');
    const adminModal = document.getElementById('adminModal');
    const closeAdmin = document.getElementById('closeAdmin');
    const loginSubmit = document.getElementById('adminLoginSubmit');

    adminBtn.onclick = () => adminModal.classList.add('show');
    closeAdmin.onclick = () => adminModal.classList.remove('show');

    loginSubmit.onclick = () => {
        const pass = document.getElementById('adminPasswordInput').value;
        if (pass === ADMIN_PASS) {
            document.getElementById('adminLoginForm').classList.add('hidden');
            document.getElementById('adminPanel').classList.remove('hidden');
        } else {
            alert('Incorrect Admin Password!');
        }
    };

    // Add Product to Firestore Realtime DB
    document.getElementById('addProductBtn').onclick = async () => {
        const title = document.getElementById('prodTitle').value;
        const price = parseFloat(document.getElementById('prodPrice').value);
        const image = document.getElementById('prodImg').value;
        const description = document.getElementById('prodDesc').value;

        if (!title || !price) {
            alert('Please enter Title and Price');
            return;
        }

        try {
            await addDoc(collection(db, "products"), {
                title,
                price,
                image,
                description,
                createdAt: serverTimestamp()
            });
            alert('Product Published Live Successfully!');
            document.getElementById('prodTitle').value = '';
            document.getElementById('prodPrice').value = '';
            document.getElementById('prodImg').value = '';
            document.getElementById('prodDesc').value = '';
        } catch (error) {
            alert('Error publishing product: ' + error.message);
        }
    };
});
