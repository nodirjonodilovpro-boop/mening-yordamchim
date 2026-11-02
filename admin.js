// ==========================================
// ADMIN PANEL - JAVASCRIPT KODI
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Sizning Firebase konfiguratsiyangiz
const firebaseConfig = {
    apiKey: "AIzaSyB7y7XTFrPwvTycEGkmPBh7S3c2s-3t_xs",
    authDomain: "mening-yordamchim-e6fd6.firebaseapp.com",
    projectId: "mening-yordamchim-e6fd6",
    storageBucket: "mening-yordamchim-e6fd6.firebasestorage.app",
    messagingSenderId: "357533463074",
    appId: "1:357533463074:web:140183cac77b3aa4f507b",
    measurementId: "G-BX5ZY09CGZ"
};

// Firebase'ni ishga tushirish
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 1. Sahifalar o'rtasida o'tish (Tabs)
window.showSection = function(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(sec => sec.style.display = 'none');

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    const links = document.querySelectorAll('.sidebar ul li a');
    links.forEach(link => link.classList.remove('active'));
    
    // Qaysi tugma bosilgan bo'lsa, unga active class qo'shish
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
};

// 2. Himoya: Foydalanuvchi haqiqatan ham admin ekanligini tekshirish
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists() && userSnap.data().role === "admin") {
                console.log("Admin tasdiqlandi!");
                loadDashboardStats();
                loadUsers();
            } else {
                alert("Sizda bu sahifaga kirish huquqi yo'q!");
                window.location.href = "../index.html";
            }
        } catch (error) {
            console.error("Rolni tekshirishda xatolik:", error);
            window.location.href = "../index.html";
        }
    } else {
        // Agar tizimga kirmagan bo'lsa asosiy sahifaga otib yuborish
        window.location.href = "../index.html";
    }
});

// 3. Statistika ma'lumotlarini yuklash (Jami foydalanuvchilar soni)
async function loadDashboardStats() {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const totalUsersElement = document.getElementById("total-users");
        if (totalUsersElement) {
            totalUsersElement.innerText = querySnapshot.size;
        }
    } catch (error) {
        console.error("Statistikani yuklashda xatolik:", error);
    }
}

// 4. Foydalanuvchilar ro'yxatini yuklash va jadvalga chiqarish
async function loadUsers() {
    const usersTableBody = document.querySelector("#users-table tbody");
    if (!usersTableBody) return;
    usersTableBody.innerHTML = "";

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        querySnapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            const userId = docSnap.id;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${userData.name || "Noma'lum"}</td>
                <td>${userData.email}</td>
                <td>
                    <button onclick="blockUser('${userId}', ${userData.isBlocked || false})" style="background: orange; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer;">
                        ${userData.isBlocked ? "Blokdan chiqarish" : "Bloklash"}
                    </button>
                    <button onclick="deleteUser('${userId}')" style="background: red; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; margin-left: 5px;">
                        O'chirish
                    </button>
                </td>
            `;
            usersTableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Foydalanuvchilarni yuklashda xatolik:", error);
    }
}

// 5. Foydalanuvchini bloklash / Blokdan chiqarish
window.blockUser = async function(userId, currentStatus) {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            isBlocked: !currentStatus
        });
        alert("Foydalanuvchi statusi muvaffaqiyatli o'zgartirildi!");
        loadUsers(); // Jadvalni yangilash
    } catch (error) {
        console.error("Bloklashda xatolik:", error);
        alert("Xatolik yuz berdi!");
    }
};

// 6. Foydalanuvchini bazadan butunlay o'chirish
window.deleteUser = async function(userId) {
    if (confirm("Haqiqatan ham bu foydalanuvchini o'chirmoqchimisiz?")) {
        try {
            await deleteDoc(doc(db, "users", userId));
            alert("Foydalanuvchi o'chirildi!");
            loadUsers(); // Jadvalni yangilash
            loadDashboardStats(); // Statistikani yangilash
        } catch (error) {
            console.error("O'chirishda xatolik:", error);
            alert("O'chirishda xatolik yuz berdi!");
        }
    }
};

// 7. Chiqish (Logout) tugmasi funksiyasi
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            window.location.href = "../index.html";
        }).catch((error) => {
            console.error("Chiqishda xatolik:", error);
        });
    });
}