import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

export { db, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp };
