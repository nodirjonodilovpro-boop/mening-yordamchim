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

if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

           if (user.email !== ADMIN_EMAIL) {
                alert("Xatolik! Kirgan pochta: " + user.email + " | Talab qilinadigan admin: " + ADMIN_EMAIL);
                await signOut(auth);
                window.location.href = "index.html";
            }
            else {
                location.reload();
            }
        } catch (error) {
            console.error("Kirishda xatolik:", error);
            alert("Google orqali kirishda xatolik yuz berdi: " + error.message);
        }
    });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (user.email === ADMIN_EMAIL) {
            if (loginScreen) loginScreen.style.display = "none";
            if (adminMain) adminMain.style.display = "flex";
            loadUsersTable();
        } else {
            alert("Sizda bu sahifaga kirish huquqi yo'q!");
            await signOut(auth);
            if (adminMain) adminMain.style.display = "none";
            if (loginScreen) loginScreen.style.display = "flex";
        }
    } else {
        if (adminMain) adminMain.style.display = "none";
        if (loginScreen) loginScreen.style.display = "flex";
    }
});

async function loadUsersTable() {
    const tableBody = document.querySelector("#users-table tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const totalUsersEl = document.getElementById("total-users");
        if (totalUsersEl) totalUsersEl.textContent = querySnapshot.size;

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
        console.error("Ma'lumotlarni o'qishda xatolik:", error);
    }
}

window.saveUserChanges = async function(userId) {
    const nameInput = document.getElementById(`name-${userId}`);
    if (!nameInput) return;
    const newName = nameInput.value;
    try {
        await updateDoc(doc(db, "users", userId), { name: newName });
        alert("Muvaffaqiyatli yangilandi!");
    } catch (error) {
        console.error("Yangilashda xatolik:", error);
        alert("Xatolik yuz berdi!");
    }
}

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            window.location.href = "index.html";
        });
    });
}