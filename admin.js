import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDQL5eLdx0hIpqyQr3PNDz-NqqiuSqgzrg",
    authDomain: "mening-yordamchim-e6fd6.firebaseapp.com",
    projectId: "mening-yordamchim-e6fd6",
    storageBucket: "mening-yordamchim-e6fd6.firebasestorage.app",
    messagingSenderId: "357533463074",
    appId: "1:357533463074:web:d15e297e2d49d80f3f507b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const ADMIN_EMAIL = "nodirjonodilov.pro@gmail.com";

const loginScreen = document.getElementById("login-screen");
const adminMain = document.getElementById("admin-main");
const googleLoginBtn = document.getElementById("google-login-btn");

// Google orqali kirish tugmasi bosilganda
googleLoginBtn.addEventListener("click", async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        if (user.email !== ADMIN_EMAIL) {
            alert("Xatolik! Bu akkaunt admin emas.");
            await signOut(auth);
            window.location.href = "index.html";
        }
    } catch (error) {
        console.error("Kirishda xatolik:", error);
    }
});

// Foydalanuvchi holatini kuzatish
onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (user.email === ADMIN_EMAIL) {
            // Admin kirdi - panelni ko'rsatamiz
            loginScreen.style.display = "none";
            adminMain.style.display = "flex";
            loadUsersTable();
        } else {
            // Boshqa foydalanuvchi bo'lsa
            alert("Sizda bu sahifaga kirish huquqi yo'q!");
            await signOut(auth);
            window.location.href = "index.html";
        }
    } else {
        // Hali kirmagan bo'lsa - login oynasini chiqaramiz
        adminMain.style.display = "none";
        loginScreen.style.display = "flex";
    }
});

// Foydalanuvchilarni chiqarish va tahrirlash
async function loadUsersTable() {
    const tableBody = document.querySelector("#users-table tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        document.getElementById("total-users").textContent = querySnapshot.size;

        querySnapshot.forEach((documentSnap) => {
            const userData = documentSnap.data();
            const userId = documentSnap.id;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><input type="text" value="${userData.name || ''}" id="name-${userId}" class="edit-input"></td>
                <td>${userData.email || 'Mavjud emas'}</td>
                <td>
                    <button onclick="window.saveUserChanges('${userId}')" class="save-btn">Saqlash</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Xatolik:", error);
    }
}

window.saveUserChanges = async function(userId) {
    const newName = document.getElementById(`name-${userId}`).value;
    try {
        await updateDoc(doc(db, "users", userId), { name: newName });
        alert("Muvaffaqiyatli yangilandi!");
    } catch (error) {
        alert("Xatolik yuz berdi!");
    }
}

// Chiqish
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            window.location.href = "index.html";
        });
    });
}