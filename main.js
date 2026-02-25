// ==================== KONFIGURASI FIREBASE ====================
const firebaseConfig = {
    apiKey: "AIzaSyDGYnq4VKq-YGu4RbfoI_ZHez9fishYjZo",
    authDomain: "insan-cemerlang-afd2f.firebaseapp.com",
    projectId: "insan-cemerlang-afd2f",
    storageBucket: "insan-cemerlang-afd2f.appspot.com",
    messagingSenderId: "686649580589",
    appId: "1:686649580589:web:61374bbbd68adb604eaca4",
    measurementId: "G-LNZTQBCE26"
};

// ==================== IMPORT FIREBASE MODULAR ====================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js';
import { 
    getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, where, orderBy, serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js';

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==================== DAFTAR KATEGORI ====================
const KATEGORI = [
    "Gaji karyawan", "pakan", "vitamin", "antiseptik", "peti",
    "Upah panggul", "admin setor tunai", "buble wrap", "plastik",
    "uang lembur", "komsumsi", "listrik kandang"
];

// ==================== UTILITY FUNCTIONS ====================
function formatRupiah(number) {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(number);
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                         type === 'error' ? 'exclamation-circle' : 
                         'exclamation-triangle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== FUNGSI CRUD FIREBASE ====================
export async function loadExpenses(bulan, tahun) {
    try {
        const expensesRef = collection(db, 'expenses');
        // Coba dengan orderBy (perlu index)
        const q = query(
            expensesRef, 
            where('bulan', '==', bulan), 
            where('tahun', '==', tahun),
            orderBy('tanggal', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        const expenses = [];
        querySnapshot.forEach((docSnap) => {
            expenses.push({ id: docSnap.id, ...docSnap.data() });
        });
        return expenses;
    } catch (error) {
        if (error.code === 'failed-precondition') {
            console.warn('Index belum dibuat, menggunakan fallback tanpa orderBy. Silakan buat index di Firebase Console.');
            // Fallback: query tanpa orderBy, lalu sort manual
            const expensesRef = collection(db, 'expenses');
            const q = query(
                expensesRef, 
                where('bulan', '==', bulan), 
                where('tahun', '==', tahun)
            );
            const querySnapshot = await getDocs(q);
            const expenses = [];
            querySnapshot.forEach((docSnap) => {
                expenses.push({ id: docSnap.id, ...docSnap.data() });
            });
            // Sort manual descending by tanggal
            expenses.sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
            return expenses;
        } else {
            throw error;
        }
    }
}

export async function addExpense(data) {
    try {
        const expenseData = {
            ...data,
            pax: Number(data.pax),
            harga: Number(data.harga),
            jumlah: Number(data.pax) * Number(data.harga),
            createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'expenses'), expenseData);
        return docRef.id;
    } catch (error) {
        console.error('Error adding expense:', error);
        throw error;
    }
}

export async function updateExpense(id, data) {
    try {
        const expenseData = {
            ...data,
            pax: Number(data.pax),
            harga: Number(data.harga),
            jumlah: Number(data.pax) * Number(data.harga),
            updatedAt: serverTimestamp()
        };
        await updateDoc(doc(db, 'expenses', id), expenseData);
    } catch (error) {
        console.error('Error updating expense:', error);
        throw error;
    }
}

export async function deleteExpense(id) {
    try {
        await deleteDoc(doc(db, 'expenses', id));
    } catch (error) {
        console.error('Error deleting expense:', error);
        throw error;
    }
}

export async function getExpenseById(id) {
    try {
        const docSnap = await getDoc(doc(db, 'expenses', id));
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            throw new Error('Data tidak ditemukan');
        }
    } catch (error) {
        console.error('Error getting expense:', error);
        throw error;
    }
}

// ==================== RENDER FUNCTIONS ====================
async function renderData() {
    const bulanSelect = document.getElementById('bulanSelect');
    const tahunSelect = document.getElementById('tahunSelect');
    const bulanText = document.getElementById('bulanText');
    const totalSemuaEl = document.getElementById('totalSemua');
    const kategoriContainer = document.getElementById('kategoriContainer');
    const rekapBody = document.getElementById('rekapBody');
    const grandTotalRekap = document.getElementById('grandTotalRekap');

    if (!bulanSelect || !tahunSelect || !bulanText || !totalSemuaEl || !kategoriContainer || !rekapBody || !grandTotalRekap) {
        console.error('Elemen penting tidak ditemukan di DOM');
        return;
    }

    const bulan = parseInt(bulanSelect.value);
    const tahun = parseInt(tahunSelect.value);
    const bulanNama = bulanSelect.selectedOptions[0].text;
    bulanText.innerText = `${bulanNama} ${tahun}`;

    try {
        const semuaData = await loadExpenses(bulan, tahun);

        // Kelompokkan berdasarkan kategori
        const dataPerKategori = {};
        KATEGORI.forEach(kat => dataPerKategori[kat] = []);

        semuaData.forEach(item => {
            if (dataPerKategori.hasOwnProperty(item.kategori)) {
                dataPerKategori[item.kategori].push(item);
            }
        });

        // Hitung total keseluruhan
        let totalSemua = 0;
        Object.values(dataPerKategori).forEach(arr => {
            arr.forEach(item => totalSemua += item.jumlah);
        });
        totalSemuaEl.innerText = formatRupiah(totalSemua);

        // Render tabel per kategori
        renderKategoriTables(dataPerKategori, kategoriContainer);

        // Render rekap bulanan
        renderRekap(dataPerKategori, totalSemua, rekapBody, grandTotalRekap);

    } catch (error) {
        console.error('Gagal render data:', error);
        showNotification('Gagal memuat data: ' + error.message, 'error');
    }
}

function renderKategoriTables(dataPerKategori, container) {
    let html = '';

    for (let kategori of KATEGORI) {
        const items = dataPerKategori[kategori] || [];
        let subtotal = items.reduce((sum, item) => sum + item.jumlah, 0);
        let rows = '';

        if (items.length === 0) {
            rows = `<tr><td colspan="7" style="text-align:center; font-style:italic; padding:20px;">Belum ada data</td></tr>`;
        } else {
            items.forEach((item, index) => {
                rows += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${formatDate(item.tanggal)}</td>
                    <td>${escapeHtml(item.deskripsi || '-')}</td>
                    <td style="text-align:center;">${item.pax}</td>
                    <td style="text-align:right;">${formatRupiah(item.harga)}</td>
                    <td style="text-align:right;">${formatRupiah(item.jumlah)}</td>
                    <td>
                        <div class="action-buttons">
                            <a href="formubah.html?id=${item.id}" class="action-btn action-btn-edit" title="Edit">
                                <i class="fas fa-edit"></i> Edit
                            </a>
                            <button class="action-btn action-btn-delete" onclick="showDeleteConfirmation('${item.id}', '${escapeHtml(item.deskripsi || 'Data')}')" title="Hapus">
                                <i class="fas fa-trash"></i> Hapus
                            </button>
                        </div>
                    </td>
                </tr>
                `;
            });
        }

        html += `
        <div class="kategori-card">
            <div class="kategori-title">${kategori}</div>
            <table>
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Tanggal</th>
                        <th>Deskripsi</th>
                        <th>PAX/PCS</th>
                        <th>Harga</th>
                        <th>Jumlah</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            <div class="kategori-total">${formatRupiah(subtotal)}</div>
        </div>
        `;
    }
    container.innerHTML = html;
}

function renderRekap(dataPerKategori, totalSemua, rekapBody, grandTotalRekap) {
    let rows = '';
    for (let kategori of KATEGORI) {
        const items = dataPerKategori[kategori] || [];
        let subtotal = items.reduce((sum, item) => sum + item.jumlah, 0);
        rows += `
        <tr>
            <td>${kategori}</td>
            <td style="text-align:right;">${formatRupiah(subtotal)}</td>
        </tr>
        `;
    }
    rekapBody.innerHTML = rows;
    grandTotalRekap.innerText = formatRupiah(totalSemua);
}

// ==================== FUNGSI HAPUS DENGAN MODAL ====================
window.showDeleteConfirmation = function(id, description) {
    const modal = document.getElementById('deleteModal');
    const modalMessage = document.getElementById('modalMessage');
    const cancelBtn = document.getElementById('cancelBtn');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    if (!modal || !modalMessage || !cancelBtn || !confirmBtn) {
        alert('Modal tidak ditemukan!');
        return;
    }
    
    modalMessage.innerHTML = `
        <p>Anda akan menghapus data expense:</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #e74c3c;">
            <strong style="color: #1a237e;">${escapeHtml(description)}</strong>
        </div>
        <p style="color: #6c757d; font-size: 0.9rem;">Tindakan ini tidak dapat dibatalkan. Yakin ingin menghapus?</p>
    `;
    
    modal.style.display = 'flex';
    
    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    confirmBtn.onclick = async () => {
        modal.style.display = 'none';
        try {
            await deleteExpense(id);
            showNotification('Data berhasil dihapus!', 'success');
            renderData(); // Refresh data
        } catch (error) {
            console.error('Error deleting:', error);
            showNotification('Gagal menghapus data: ' + error.message, 'error');
        }
    };
};

// ==================== FUNGSI CETAK REKAP ====================
window.cetakRekap = function() {
    const bulanSelect = document.getElementById('bulanSelect');
    const tahunSelect = document.getElementById('tahunSelect');
    const rekapTable = document.getElementById('rekapTable');
    const grandTotalRekap = document.getElementById('grandTotalRekap');

    if (!bulanSelect || !tahunSelect || !rekapTable || !grandTotalRekap) {
        alert('Tidak dapat mencetak, elemen rekap tidak ditemukan.');
        return;
    }

    const bulan = bulanSelect.selectedOptions[0].text;
    const tahun = tahunSelect.value;
    const rekapTableClone = rekapTable.cloneNode(true);
    
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head><title>Rekap Bulanan ${bulan} ${tahun}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 30px; }
            h2 { text-align: center; color: #2c3e50; }
            h3 { text-align: center; color: #34495e; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #667eea; color: white; padding: 12px; text-align: left; }
            td, th { border: 1px solid #ddd; padding: 10px; }
            tfoot th { background: #2c3e50; }
            .footer { margin-top: 30px; text-align: center; font-size: 0.8rem; color: #7f8c8d; }
        </style>
        </head>
        <body>
            <h2>BUNDA CIPTA MANDIRI SEJAHTERA</h2>
            <h3>Rekap Pengeluaran Bulan ${bulan} ${tahun}</h3>
            ${rekapTableClone.outerHTML}
            <div class="footer">Dicetak pada ${new Date().toLocaleDateString('id-ID')}</div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
};

// ==================== EVENT LISTENER ====================
document.addEventListener('DOMContentLoaded', () => {
    const bulanSelect = document.getElementById('bulanSelect');
    const tahunSelect = document.getElementById('tahunSelect');
    
    if (bulanSelect && tahunSelect) {
        const today = new Date();
        bulanSelect.value = today.getMonth() + 1;
        tahunSelect.value = today.getFullYear();

        bulanSelect.addEventListener('change', renderData);
        tahunSelect.addEventListener('change', renderData);

        renderData().catch(err => {
            showNotification('Gagal memuat data awal', 'error');
        });
    } else {
        console.error('Elemen bulanSelect/tahunSelect tidak ditemukan di halaman ini.');
    }
});