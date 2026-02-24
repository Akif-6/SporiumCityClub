// Sayfa Yüklenirken Kontrol Et
let activeMemberId = null;
const token = localStorage.getItem("token");
const kullaniciVerisi = localStorage.getItem("kullanici");
const kullanici = kullaniciVerisi ? JSON.parse(kullaniciVerisi) : null;
let adminChatInterval = null; // Chat otomatik yenileme için

if (!token || !kullanici || (kullanici.rol || kullanici.Rol || "").toString().toLowerCase() !== "admin") {
    window.location.href = "giris.html";
}

const API_URL = "https://localhost:7028/api";
const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true, background: '#1e1e1e', color: '#fff' });

// ============================================================
// 1. MERKEZİ VERİLER (VERİ YÖNETİMİ & FİYATLAR)
// ============================================================

// Egzersiz Veritabanı
let exerciseDB = JSON.parse(localStorage.getItem('sporium_exercises')) || {
    "Göğüs": ["Bench Press", "Incline DB Press", "Cable Fly", "Chest Press"],
    "Sırt": ["Lat Pulldown", "Barbell Row", "Deadlift", "Seated Row"],
    "Bacak": ["Squat", "Leg Press", "Lunge", "Leg Extension"],
    "Omuz": ["Military Press", "Lateral Raise", "Face Pull"],
    "Kol": ["Bicep Curl", "Tricep Pushdown", "Hammer Curl"],
    "Karın": ["Crunch", "Plank", "Leg Raise"],
    "Kardiyo": ["Koşu Bandı", "Bisiklet", "Elliptical"]
};

// Besin Veritabanı
let globalFoods = JSON.parse(localStorage.getItem('sporium_foods')) || { 
    "Tavuk Göğsü (100g)": {c:165, p:31, k:0, f:3}, 
    "Pilav (100g)": {c:130, p:2, k:28, f:0},
    "Yulaf (100g)": {c:389, p:16, k:66, f:6},
    "Yumurta (1 Adet)": {c:70, p:6, k:0, f:5}
};

// Fiyat Listesi
let currentPrices = JSON.parse(localStorage.getItem('sporium_fiyatlar')) || {
    "price-salon-1": 3000, "price-salon-3": 7500, "price-salon-6": 11000, "price-salon-12": 18500,
    "price-online-1": 2500, "price-online-3": 6000,
    "price-diyet": 6000, "price-kur": 10000,
    "price-pt-7": 7500, "price-pt-12": 13500, "price-pt-24": 24000,
    "price-salon-1-old": 3500, "price-salon-3-old": 8000, "price-salon-6-old": 12500, "price-salon-12-old": 20000,
    "price-online-1-old": 3000, "price-online-3-old": 6500
};

let globalToplamGelir = 0, globalToplamGider = 0, activeAdminId = 0;

// --- SAYFA YÜKLENİNCE ---
document.addEventListener("DOMContentLoaded", () => {
    const localUser = localStorage.getItem('kullanici');
    if (!localUser) { window.location.href = "giris.html"; return; }
    const user = JSON.parse(localUser);
    const userRole = (user.rol || user.Rol || "").toString().toLowerCase().trim();

    if (userRole !== 'admin') { 
        window.location.href = "index.html"; 
        return; 
    }

    activeAdminId = user.id;
    
    // Admin bilgilerini forma doldur
    if(document.getElementById('adminAd')) document.getElementById('adminAd').value = user.adSoyad;
    if(document.getElementById('adminEmail')) document.getElementById('adminEmail').value = user.email;

    // Tüm modülleri başlat
    renderGlobalLists();
    fiyatlariYukle();
    verileriGetir();
    giderleriGetir();
    // loadInbox(); // ESKİ FONKSİYON SİLİNDİ, ARTIK GEREK YOK
    
    if(document.getElementById('tarihGosterge')) {
        document.getElementById('tarihGosterge').innerText = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    // --- MOBİL MENÜ TETİKLEYİCİSİ ---
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if(menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : 'auto';
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && sidebar.classList.contains('active') && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    }
});

// ============================================================
// 2. VERİ YÖNETİMİ (HAREKET & BESİN EKLEME/SİLME)
// ============================================================
function renderGlobalLists() {
    const exListEl = document.getElementById('global-ex-list');
    if(exListEl) {
        let exHTML = "";
        let exCount = 0;
        for (const [category, list] of Object.entries(exerciseDB)) {
            if(Array.isArray(list)) {
                list.forEach((ex, i) => {
                    exCount++;
                    exHTML += `
                    <div class="data-item">
                        <span><b style="color:var(--primary)">${category}</b> - ${ex}</span>
                        <i class="fas fa-trash" style="color:var(--danger); cursor:pointer" onclick="deleteGlobalEx('${category}', ${i})"></i>
                    </div>`;
                });
            }
        }
        exListEl.innerHTML = exHTML;
        if(document.getElementById('ex-count')) document.getElementById('ex-count').innerText = exCount + " Kayıt";
        
        const dl = document.getElementById('global-exercise-datalist');
        if(dl) {
            let opts = "";
            for (const list of Object.values(exerciseDB)) {
                if(Array.isArray(list)) list.forEach(ex => opts += `<option value="${ex}">`);
            }
            dl.innerHTML = opts;
        }
    }

    const foodListEl = document.getElementById('global-food-list');
    if(foodListEl) {
        foodListEl.innerHTML = Object.keys(globalFoods).map(name => `
            <div class="data-item">
                <span>${name} <small style="color:#666">C:${globalFoods[name].c} P:${globalFoods[name].p}</small></span>
                <i class="fas fa-trash" style="color:var(--danger); cursor:pointer" onclick="deleteGlobalFood('${name}')"></i>
            </div>`).join('');
        
        if(document.getElementById('food-count')) document.getElementById('food-count').innerText = Object.keys(globalFoods).length + " Kayıt";
        
        const fdl = document.getElementById('global-food-datalist');
        if(fdl) fdl.innerHTML = Object.keys(globalFoods).map(x => `<option value="${x}">`).join('');
    }
}

function addGlobalExercise() {
    const target = document.getElementById('new-ex-target').value;
    const name = document.getElementById('new-ex-name').value;
    if(name) {
        if(!exerciseDB[target]) exerciseDB[target] = [];
        exerciseDB[target].push(name);
        localStorage.setItem('sporium_exercises', JSON.stringify(exerciseDB));
        renderGlobalLists();
        document.getElementById('new-ex-name').value="";
        Toast.fire({icon:'success',title:'Hareket Eklendi'});
    }
}

function deleteGlobalEx(category, index) {
    if(confirm('Silmek istediğine emin misin?')) {
        exerciseDB[category].splice(index, 1);
        if(exerciseDB[category].length === 0) delete exerciseDB[category];
        localStorage.setItem('sporium_exercises', JSON.stringify(exerciseDB));
        renderGlobalLists();
    }
}

function addGlobalFood() {
    const n = document.getElementById('nf-name').value;
    if(n){ 
        globalFoods[n]={
            c:document.getElementById('nf-c').value, 
            p:document.getElementById('nf-p').value, 
            k:document.getElementById('nf-k').value, 
            f:document.getElementById('nf-f').value
        }; 
        localStorage.setItem('sporium_foods', JSON.stringify(globalFoods)); 
        renderGlobalLists(); 
        document.getElementById('nf-name').value=""; document.getElementById('nf-c').value=""; document.getElementById('nf-p').value=""; document.getElementById('nf-k').value=""; document.getElementById('nf-f').value="";
        Toast.fire({icon:'success',title:'Besin Eklendi'});
    }
}

function deleteGlobalFood(n) { 
    if(confirm('Silmek istediğine emin misin?')) {
        delete globalFoods[n]; 
        localStorage.setItem('sporium_foods', JSON.stringify(globalFoods)); 
        renderGlobalLists(); 
    }
}

// ============================================================
// 3. ÜYE YÖNETİMİ & LİSTELEME
// ============================================================
async function verileriGetir() {
    try {
        const res = await fetch(`${API_URL}/Uyeler`, {
            method: "GET",
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
        });

        if (!res.ok) {
            if (res.status === 401) window.location.href = "giris.html";
            return;
        }

        const uyeler = await res.json();
        const tablo = document.getElementById("uyeTablo");
        if(!tablo) return;

        tablo.innerHTML = "";
        globalToplamGelir = 0;
        
        const gelirCont = document.getElementById("gelirListesiContainer");
        if(gelirCont) gelirCont.innerHTML = "";

        uyeler.forEach(uye => {
            if(uye.rol && uye.rol.toLowerCase() === 'admin') return;
            
            let kalanHTML = '-';
            if (uye.bitisTarihi) {
                const fark = Math.ceil((new Date(uye.bitisTarihi) - new Date().setHours(0,0,0,0)) / 86400000);
                kalanHTML = fark > 0 ? `${fark} Gün` : "BİTTİ";
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
    <td data-label="Üye Bilgisi">
        <div style="font-weight:bold; font-size:1rem;">${uye.adSoyad}</div>
        <div style="font-size:0.85rem; color:#666; margin-top:4px;">
            <i class="fas fa-envelope"></i> ${uye.email}
        </div>
    </td>
    <td data-label="Üyelik Paketi">${uye.paket}</td>
    <td data-label="Kalan Süre">${kalanHTML}</td>
    <td data-label="Ödenen Tutar">₺${uye.fiyat}</td>
    <td data-label="İşlemler" class="action-cell">
        <div class="action-buttons-wrapper">
            <button class="action-btn program" title="Program Yaz" onclick="programModalAc(${uye.id}, '${uye.adSoyad}')">
                <i class="fas fa-dumbbell"></i>
            </button>
            
            <button class="action-btn" title="Fotoğraflar" style="color:#e056fd" onclick="photoModalAc(${uye.id}, '${uye.adSoyad}')">
                <i class="fas fa-camera"></i>
            </button>

            <button class="action-btn" title="Gelişim Takibi" style="color:#e1b12c" onclick="progressModalAc(${uye.id}, '${uye.adSoyad}')">
                <i class="fas fa-chart-line"></i>
            </button>
            
            <button class="action-btn" title="Düzenle" onclick="duzenleModal(${uye.id})">
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" title="Sil" onclick="sil(${uye.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    </td>`;
            tablo.appendChild(tr);

            if(uye.rol === "uye") {
                globalToplamGelir += uye.fiyat;
                if(gelirCont) gelirCont.innerHTML += `<div class="finance-row"><span class="row-name">${uye.adSoyad}</span><span class="text-green">+ ₺${uye.fiyat}</span></div>`;
            }
        });
        
        document.getElementById("toplamUye").innerText = uyeler.length - 1;
        hesaplaVeGuncelle();
    } catch (e) { console.error(e); }
}

async function kaydet() {
    const id = document.getElementById("duzenlenecekId").value;
    const adSoyad = document.getElementById("adSoyad").value;
    const email = document.getElementById("email").value;
    const sifre = document.getElementById("sifre").value;
    let baslangicTarihi = document.getElementById("baslangicTarihi").value;
    if (!baslangicTarihi) baslangicTarihi = new Date().toISOString().split('T')[0];
    
    let fiyat = parseFloat(document.getElementById("toplamFiyat").value) || 0;
    const selectAna = document.getElementById("paketAna");
    const anaAd = selectAna.options[selectAna.selectedIndex].getAttribute("data-ad");
    const selectEk = document.getElementById("paketEk");
    const ekAd = selectEk.options[selectEk.selectedIndex].getAttribute("data-ad");
    
    let tamPaketAdi = anaAd || "";
    if(ekAd && ekAd !== "Yok" && ekAd !== "") tamPaketAdi += (tamPaketAdi ? " + " : "") + ekAd;
    
    if(!id && (!tamPaketAdi || selectAna.value == "0" && selectEk.value == "0")) { Swal.fire('Uyarı', 'Lütfen en az bir paket seçiniz!', 'warning'); return; }

    let bitisTarihi = new Date(baslangicTarihi);
    let ayEkle = 1;
    if (tamPaketAdi.includes("3 Ay")) ayEkle = 3; else if (tamPaketAdi.includes("6 Ay")) ayEkle = 6; else if (tamPaketAdi.includes("Yıllık")) ayEkle = 12;
    bitisTarihi.setMonth(bitisTarihi.getMonth() + ayEkle);

    let veri = { id: id ? parseInt(id) : 0, adSoyad, email, sifre, paket: tamPaketAdi || "Özel", fiyat, rol: "uye", durum: "Aktif", baslangicTarihi: new Date(baslangicTarihi).toISOString(), bitisTarihi: bitisTarihi.toISOString(), antrenmanProgrami: " ", diyetProgrami: " " };
    
    const url = id ? `${API_URL}/Uyeler/${id}` : `${API_URL}/Uyeler`;
    const method = id ? "PUT" : "POST";
    
    if(id) { 
        try { 
            const resEski = await fetch(`${API_URL}/Uyeler/${id}`, { headers: { "Authorization": "Bearer " + token } });
            const eski = await resEski.json(); 
            veri.antrenmanProgrami = eski.antrenmanProgrami; 
            veri.diyetProgrami = eski.diyetProgrami; 
        } catch {} 
    }

    try { 
        const res = await fetch(url, { 
            method: method, 
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, 
            body: JSON.stringify(veri) 
        });

        if(res.ok) { modalKapat('uyeModal'); verileriGetir(); Toast.fire({ icon: 'success', title: 'Kaydedildi' }); } 
        else { const errText = await res.text(); Swal.fire('Hata', errText, 'error'); }
    } catch (e) { Swal.fire('Hata', e.message, 'error'); }
}

async function sil(id){ 
    if(confirm('Silmek istediğine emin misin?')) { 
        await fetch(`${API_URL}/Uyeler/${id}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + token }
        }); 
        verileriGetir(); 
    } 
}

async function duzenleModal(id) { 
    const res = await fetch(`${API_URL}/Uyeler/${id}`, { headers: { "Authorization": "Bearer " + token } });
    const u = await res.json(); 
    document.getElementById("duzenlenecekId").value = u.id; 
    document.getElementById("modalBaslik").innerText = "Üye Düzenle"; 
    document.getElementById("adSoyad").value = u.adSoyad; 
    document.getElementById("email").value = u.email; 
    document.getElementById("sifre").value = ""; 
    document.getElementById("sifre").placeholder = "Değişmeyecekse boş bırakın";
    if(u.baslangicTarihi) document.getElementById("baslangicTarihi").value = u.baslangicTarihi.split('T')[0]; 
    document.getElementById("toplamFiyat").value = u.fiyat; 
    document.getElementById("uyeModal").style.display = "flex"; 
}

// ============================================================
// 4. ADMİN İÇİN İLERLEME/ÖLÇÜM & FOTOĞRAF TAKİBİ
// ============================================================

// --- YENİ AYRILMIŞ ÖLÇÜM MODALI (Grafik İkonu) ---
function progressModalAc(userId, userName) {
    activeMemberId = userId;
    document.getElementById('progTargetName').innerText = userName;
    document.getElementById('progressModal').style.display = 'flex';
    document.getElementById('admin-prog-date').valueAsDate = new Date();
    
    // Sadece ölçümleri yükle
    loadAdminProgress(userId);
}

// --- YENİ AYRILMIŞ FOTOĞRAF MODALI (Kamera İkonu) ---
function photoModalAc(userId, userName) {
    activeMemberId = userId;
    document.getElementById('photoTargetName').innerText = userName;
    document.getElementById('photoModal').style.display = 'flex';
    document.getElementById('admin-photo-date').valueAsDate = new Date();
    
    // Sadece fotoğrafları yükle
    loadAdminGallery(userId);
}

// --- ÖLÇÜM YÖNETİMİ (Sadece Ölçümler) ---
function loadAdminProgress(userId) {
    const userKey = 'sporium_progress_' + userId;
    const history = JSON.parse(localStorage.getItem(userKey)) || [];
    const tbody = document.getElementById('admin-prog-list');
    if (!tbody) return; 
    tbody.innerHTML = '';
    
    const measurements = history.filter(rec => rec.type === 'measurement');

    measurements.forEach((rec) => {
        const originalIndex = history.indexOf(rec);
        const h = rec.height && rec.height !== "-" ? rec.height + " cm" : "-";
        const w = rec.weight && rec.weight !== "-" ? rec.weight + " kg" : "-";

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color:#fff">${rec.date}</td>
            <td style="color:var(--info); font-weight:bold;">${h}</td>
            <td style="color:var(--primary); font-weight:bold;">${w}</td>
            <td>${rec.arm || '-'}</td> 
            <td>${rec.chest || '-'}</td> 
            <td>${rec.shoulder || '-'}</td> 
            <td>${rec.waist || '-'}</td> 
            <td>${rec.hip || '-'}</td> 
            <td>${rec.leg || '-'}</td> 
            <td><button class="btn-delete-x" onclick="deleteAdminProgress(${originalIndex})">x</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function addAdminProgress() {
    const weightVal = document.getElementById('admin-prog-weight').value;
    
    if (!weightVal) {
        Swal.fire('Eksik', 'Lütfen en azından kilo değerini girin.', 'warning');
        return; 
    }

    const record = {
        date: document.getElementById('admin-prog-date').value,
        weight: weightVal,
        height: document.getElementById('admin-prog-height').value || "-", 
        arm: document.getElementById('admin-prog-arm').value || "-",        
        chest: document.getElementById('admin-prog-chest').value || "-",    
        shoulder: document.getElementById('admin-prog-shoulder').value || "-",
        waist: document.getElementById('admin-prog-waist').value || "-",    
        hip: document.getElementById('admin-prog-hip').value || "-",        
        leg: document.getElementById('admin-prog-leg').value || "-",
        type: 'measurement'
    };

    const userKey = 'sporium_progress_' + activeMemberId;
    const history = JSON.parse(localStorage.getItem(userKey)) || [];
    history.unshift(record); 
    localStorage.setItem(userKey, JSON.stringify(history));
    
    loadAdminProgress(activeMemberId);
    Toast.fire({ icon: 'success', title: 'Ölçüm Kaydedildi' });
    
    document.getElementById('admin-prog-weight').value = "";
    document.getElementById('admin-prog-arm').value = "";
    document.getElementById('admin-prog-chest').value = "";
}

function deleteAdminProgress(index) {
    if (!activeMemberId) return;
    if(confirm('Bu kaydı silmek istediğine emin misin?')) {
        const userKey = 'sporium_progress_' + activeMemberId;
        const history = JSON.parse(localStorage.getItem(userKey)) || [];
        history.splice(index, 1);
        localStorage.setItem(userKey, JSON.stringify(history));
        
        loadAdminProgress(activeMemberId);
        loadAdminGallery(activeMemberId); 
    }
}

// --- FOTOĞRAF YÖNETİMİ (Sadece Fotoğraflar) ---
function addAdminPhotoBtn() {
    const fileInput = document.getElementById('admin-prog-photo');
    if (!fileInput.files || fileInput.files.length === 0) {
        Swal.fire('Eksik', 'Lütfen yüklemek için bir fotoğraf seçin!', 'warning');
        return;
    }
    saveAdminPhotoCustom(fileInput); 
}

async function saveAdminPhotoCustom(input) {
    const file = input.files[0];
    const dateInput = document.getElementById('admin-photo-date').value; 

    if (file.size > 3 * 1024 * 1024) { Swal.fire('Hata', 'Dosya boyutu çok büyük (Max 3MB)', 'warning'); return; }

    try {
        const photoBase64 = await toBase64(file);
        
        const record = {
            date: dateInput,
            photo: photoBase64,
            type: 'photo' 
        };

        const userKey = 'sporium_progress_' + activeMemberId;
        const history = JSON.parse(localStorage.getItem(userKey)) || [];
        history.unshift(record);
        localStorage.setItem(userKey, JSON.stringify(history));

        Toast.fire({ icon: 'success', title: 'Fotoğraf Kaydedildi' });
        
        input.value = "";
        document.getElementById('photo-status-label').innerHTML = `<i class="fas fa-camera"></i> Seç`;
        
        loadAdminGallery(activeMemberId);

    } catch (e) { console.error(e); }
}

function updatePhotoLabel(input) {
    const label = document.getElementById('photo-status-label');
    if (input.files && input.files[0]) {
        label.innerHTML = `<i class="fas fa-check"></i> ${input.files[0].name.substring(0, 10)}...`;
        label.style.borderColor = "#00e640";
        label.style.color = "#00e640";
    }
}

function loadAdminGallery(userId) {
    const userKey = 'sporium_progress_' + userId;
    const history = JSON.parse(localStorage.getItem(userKey)) || [];
    const container = document.getElementById('admin-photo-gallery');
    if (!container) return;
    container.innerHTML = '';

    const photos = history.filter(rec => rec.type === 'photo');

    if (photos.length === 0) {
        container.innerHTML = '<p style="color:#666; grid-column:1/-1; text-align:center;">Henüz fotoğraf yüklenmemiş.</p>';
        return;
    }

    photos.forEach((rec) => {
        const originalIndex = history.indexOf(rec);
        const div = document.createElement('div');
        div.className = 'gallery-item'; 
        div.style = "position:relative; border-radius:8px; overflow:hidden; border:1px solid #333;";
        div.innerHTML = `
            <img src="${rec.photo}" onclick="showImageModal('${rec.photo}')" style="width:100%; height:120px; object-fit:cover; cursor:pointer; display:block;">
            <div style="background:#111; color:#fff; font-size:0.75rem; padding:5px; text-align:center;">${rec.date}</div>
            <button onclick="deleteAdminProgress(${originalIndex})" style="position:absolute; top:5px; right:5px; background:rgba(255,0,0,0.8); color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer;">&times;</button>
        `;
        container.appendChild(div);
    });
}

// ============================================================
// 5. PROGRAM HAZIRLAMA (ANTRENMAN & BESLENME)
// ============================================================
async function programModalAc(id, name) {
    activeMemberId = id;
    const token = localStorage.getItem("token");

    document.getElementById('targetUserName').innerText = name;
    document.getElementById('programModal').style.display = "flex";
    
    createWorkoutDays();
    createDietDays();
    
    try {
        const res = await fetch(`${API_URL}/Uyeler/${id}`, { headers: { "Authorization": "Bearer " + token } });
        if (!res.ok) throw new Error("Veri çekilemedi");
        const user = await res.json();

        if(user.antrenmanProgrami && user.antrenmanProgrami.length > 5) {
            try {
                const wData = JSON.parse(user.antrenmanProgrami);
                wData.forEach(item => {
                    const dayBox = document.querySelector(`#pro-workout .day-body[data-day="${item.day}"]`);
                    if(dayBox) {
                        const addBtn = dayBox.querySelector('.btn-add');
                        addExRow(addBtn, item); 
                        dayBox.previousElementSibling.classList.add('active'); 
                        dayBox.classList.add('show'); 
                    }
                });
            } catch(e){}
        }

        if(user.diyetProgrami && user.diyetProgrami.length > 5) {
            try {
                const dData = JSON.parse(user.diyetProgrami);
                const grouped = {};
                dData.forEach(item => {
                    if(!grouped[item.day]) grouped[item.day] = {};
                    if(!grouped[item.day][item.meal]) grouped[item.day][item.meal] = [];
                    grouped[item.day][item.meal].push(item);
                });

                for (const [day, meals] of Object.entries(grouped)) {
                    const dayBox = document.querySelector(`#pro-diet .day-body[data-day="${day}"]`);
                    if(dayBox) {
                        const addMealBtn = dayBox.querySelector('.btn-add');
                        for(const [mealName, foods] of Object.entries(meals)) {
                            addMealBox(addMealBtn, mealName, foods);
                        }
                        dayBox.previousElementSibling.classList.add('active');
                        dayBox.classList.add('show');
                    }
                }
            } catch(e){}
        }
    } catch (e) { console.error("Program yüklenirken hata:", e); }
    switchProTab('workout');
}

async function saveProProgram() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const wList = [], dList = [];
    
    document.querySelectorAll('#pro-workout .day-body').forEach(d => { 
        const day = d.dataset.day; 
        d.querySelectorAll('tbody tr').forEach(tr => { 
            const setsInput = tr.cells[3]?.querySelector('input');
            const repsInput = tr.cells[4]?.querySelector('input');
            const noteInput = tr.cells[5]?.querySelector('input');
            const targetSelect = tr.querySelector('.muscle-sel');
            const exSelect = tr.querySelector('.ex-list');

            if(setsInput && repsInput && targetSelect && exSelect) {
                wList.push({ day: day, target: targetSelect.value, exercise: exSelect.value, sets: setsInput.value, reps: repsInput.value, note: noteInput ? noteInput.value : "" }); 
            }
        }); 
    });
    
    document.querySelectorAll('#pro-diet .day-body').forEach(d => { 
        const day = d.dataset.day; 
        d.querySelectorAll('.meal-box').forEach(m => { 
            const mealInput = m.querySelector('.meal-title input');
            const meal = mealInput ? mealInput.value : "Öğün"; 
            
            m.querySelectorAll('tbody tr').forEach(tr => { 
                const foodSelect = tr.querySelector('.food-sel');
                const amtInput = tr.querySelector('.amt');
                const cal = tr.querySelector('.c-cal')?.innerText || "0";
                const pro = tr.querySelector('.c-pro')?.innerText || "0";
                const carb = tr.querySelector('.c-carb')?.innerText || "0";
                const fat = tr.querySelector('.c-fat')?.innerText || "0";

                if(foodSelect && amtInput) {
                    dList.push({ day: day, meal: meal, food: foodSelect.value, amount: amtInput.value, cal, pro, carb, fat }); 
                }
            }); 
        }); 
    });

    try { 
        const resGet = await fetch(`${API_URL}/Uyeler/${activeMemberId}`, { headers: { "Authorization": "Bearer " + token } });
        const u = await resGet.json(); 
        u.antrenmanProgrami = JSON.stringify(wList); 
        u.diyetProgrami = JSON.stringify(dList); 
        
        await fetch(`${API_URL}/Uyeler/${activeMemberId}`, { 
            method: 'PUT', headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(u) 
        }); 
        Toast.fire({ icon: 'success', title: 'Program Gönderildi!' }); 
        modalKapat('programModal'); 
    } catch(e) { Swal.fire('Hata', 'Program kaydedilemedi.', 'error'); }
}

function createWorkoutDays() { const c = document.getElementById('workout-days-container'); c.innerHTML = ""; for (let i = 1; i <= 7; i++) { c.innerHTML += `<div class="day-accordion"><div class="day-header" onclick="toggleAccordion(this)">${i}. GÜN <i class="fas fa-chevron-down"></i></div><div class="day-body" data-day="${i}. Gün"><table class="sheet-table"><thead><tr><th style="width:30px">X</th><th style="width:150px">Bölge</th><th>Hareket</th><th style="width:80px">Set</th><th style="width:80px">Tekrar</th><th>Not</th></tr></thead><tbody class="day-tbody"></tbody></table><button class="btn-add" style="font-size:0.8rem; padding:5px 15px; margin-top:10px;" onclick="addExRow(this)">+ Hareket Ekle</button></div></div>`; } }
function createDietDays() { const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]; const c = document.getElementById('diet-days-container'); c.innerHTML = ""; days.forEach(day => { c.innerHTML += `<div class="day-accordion"><div class="day-header" onclick="toggleAccordion(this)">${day} <i class="fas fa-chevron-down"></i></div><div class="day-body" data-day="${day}"><div class="meals-container"></div><button class="btn-add" style="font-size:0.8rem; background:#333; padding:5px 15px; margin-top:10px;" onclick="addMealBox(this)">+ Öğün Ekle</button></div></div>`; }); }

function addExRow(btn, data = {}) {
    const tbody = btn.previousElementSibling.querySelector('tbody');
    const tr = document.createElement('tr');
    let muscleOpts = `<option value="">Seç</option>` + Object.keys(exerciseDB).map(m => `<option value="${m}" ${data.target===m?'selected':''}>${m}</option>`).join('');
    tr.innerHTML = `<td><span class="row-del-btn" onclick="this.closest('tr').remove()" style="cursor:pointer;color:red;">X</span></td><td><select class="sheet-select muscle-sel" onchange="updateExOptions(this)">${muscleOpts}</select></td><td><select class="sheet-select ex-list"><option>${data.exercise || '-'}</option></select></td><td><input type="text" class="sheet-input" value="${data.sets || '4'}"></td><td><input type="text" class="sheet-input" value="${data.reps || '12'}"></td><td><input type="text" class="sheet-input" value="${data.note || ''}"></td>`;
    tbody.appendChild(tr);
    if(data.target) updateExOptions(tr.querySelector('.muscle-sel'), data.exercise);
}

function updateExOptions(select, selected = null) {
    const muscle = select.value;
    const exSelect = select.closest('tr').querySelector('.ex-list');
    exSelect.innerHTML = exerciseDB[muscle] ? exerciseDB[muscle].map(ex => `<option value="${ex}">${ex}</option>`).join('') : "<option>-</option>";
    if(selected) exSelect.value = selected;
}

function addMealBox(btn, mealName = null, foods = []) {
    const container = btn.previousElementSibling; const count = container.children.length + 1; const name = mealName || `${count}. Öğün`;
    const div = document.createElement('div'); div.className = 'meal-box';
    div.innerHTML = `<div class="meal-title"><input type="text" class="sheet-input" value="${name}" style="font-weight:bold; color:var(--primary); width:200px;"><span class="meal-remove" style="cursor:pointer; color:red;" onclick="this.closest('.meal-box').remove()">Öğünü Sil</span></div><table class="sheet-table"><thead><tr><th style="width:30px"></th><th>Besin</th><th style="width:80px">Miktar</th><th style="width:50px">Kalori</th><th style="width:50px">Pro</th><th style="width:50px">Karb</th><th style="width:50px">Yağ</th></tr></thead><tbody class="meal-tbody"></tbody></table><button style="background:#333; color:#fff; border:none; padding:5px; margin-top:5px; cursor:pointer;" onclick="addFoodRow(this)">+ Besin</button>`;
    container.appendChild(div);
    if(foods.length > 0) foods.forEach(f => addFoodRow(div.querySelector('button'), f)); else addFoodRow(div.querySelector('button'));
}

function addFoodRow(btn, data = {}) {
    const tbody = btn.previousElementSibling.querySelector('tbody');
    const tr = document.createElement('tr');
    let foodOpts = `<option value="">Seç</option>` + Object.keys(globalFoods).map(f => `<option value="${f}" ${data.food===f?'selected':''}>${f}</option>`).join('');
    const vCal = data.cal || 0; const vPro = data.pro || 0; const vCarb = data.carb || 0; const vFat = data.fat || 0;
    tr.innerHTML = `<td><span class="row-del-btn" onclick="this.closest('tr').remove()" style="cursor:pointer;color:red;">x</span></td><td><select class="sheet-select food-sel" onchange="calcRow(this)">${foodOpts}</select></td><td><input type="number" class="sheet-input amt" value="${data.amount || 100}" oninput="calcRow(this)"></td><td class="macro-cell c-cal">${vCal}</td><td class="macro-cell c-pro">${vPro}</td><td class="macro-cell c-carb">${vCarb}</td><td class="macro-cell c-fat">${vFat}</td>`;
    tbody.appendChild(tr);
    if(!data.cal) calcRow(tr.querySelector('.food-sel'));
}

function calcRow(el) {
    const tr = el.closest('tr');
    const foodName = tr.querySelector('.food-sel').value;
    const amount = parseFloat(tr.querySelector('.amt').value) || 0;
    if(globalFoods[foodName]) {
        const ref = globalFoods[foodName];
        const ratio = amount / 100;
        tr.querySelector('.c-cal').innerText = Math.round(ref.c * ratio);
        tr.querySelector('.c-pro').innerText = Math.round(ref.p * ratio);
        tr.querySelector('.c-carb').innerText = Math.round(ref.k * ratio);
        tr.querySelector('.c-fat').innerText = Math.round(ref.f * ratio);
    }
}

// ============================================================
// 6. FİYAT YÖNETİMİ
// ============================================================
function fiyatlariYukle() { 
    const saved = localStorage.getItem('sporium_fiyatlar');
    let savedData = saved ? JSON.parse(saved) : {};
    for (const key in savedData) { if (savedData[key] > 0) currentPrices[key] = savedData[key]; }
    for (const [key, value] of Object.entries(currentPrices)) { const el = document.getElementById(key); if(el) el.value = value; }
    updateDropdownPrices(); 
}
function updateDropdownPrices() { document.querySelectorAll('select option').forEach(opt => { const k = opt.getAttribute('data-key'); if(k && currentPrices[k] !== undefined) { opt.value = currentPrices[k]; opt.innerText = `${opt.getAttribute('data-ad')} (${currentPrices[k].toLocaleString('tr-TR')} TL)`; } }); }
function fiyatlariKaydet() { const np = {}; document.querySelectorAll('.price-grid input').forEach(i => { if(i.id) np[i.id] = parseFloat(i.value) || 0; }); localStorage.setItem('sporium_fiyatlar', JSON.stringify(np)); currentPrices = np; updateDropdownPrices(); Toast.fire({icon:'success', title:'Fiyatlar Güncellendi'}); }
function fiyatHesapla() { const f1 = parseFloat(document.getElementById("paketAna").value) || 0; const f2 = parseFloat(document.getElementById("paketEk").value) || 0; document.getElementById("toplamFiyat").value = f1 + f2; }

// ============================================================
// 7. 🔥 YENİ ADMIN MESAJLAŞMA SİSTEMİ 🔥
// ============================================================

// Üye Listesini Yükle (Sol Sidebar)
async function loadChatUserList() {
    const container = document.getElementById('chat-user-list');
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Yükleniyor...</div>';

    try {
        const res = await fetch(`${API_URL}/Uyeler`, { headers: { "Authorization": "Bearer " + token } });
        const users = await res.json();
        
        container.innerHTML = '';
        
        // Sadece normal üyeleri al (Adminleri hariç tut)
        const members = users.filter(u => u.rol !== 'admin');

        if (members.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Hiç üye yok.</div>';
            return;
        }

        members.forEach(u => {
            const div = document.createElement('div');
            div.className = 'chat-user-item';
            div.dataset.uid = u.id; // Filtreleme için
            div.dataset.name = u.adSoyad;
            div.onclick = () => openAdminChat(u.id, u.adSoyad);
            div.innerHTML = `
                <div class="chat-avatar">${u.adSoyad.charAt(0).toUpperCase()}</div>
                <div class="chat-user-info">
                    <h4>${u.adSoyad}</h4>
                    <p style="font-size:0.75rem; color:#aaa;">${u.email}</p>
                </div>
            `;
            container.appendChild(div);
        });

    } catch (e) { console.error(e); }
}

// Bir Üyeye Tıklayınca Sohbeti Aç
let currentChatUserId = null;

function openAdminChat(userId, userName) {
    currentChatUserId = userId;
    
    // UI Güncelleme
    document.getElementById('active-chat-avatar').innerText = userName.charAt(0).toUpperCase();
    document.getElementById('active-chat-name').innerText = userName;
    document.getElementById('active-chat-status').innerText = 'Sohbet Geçmişi';
    document.getElementById('admin-chat-input-wrapper').style.display = 'flex';
    
    // Aktif sınıfı ekle
    document.querySelectorAll('.chat-user-item').forEach(i => i.classList.remove('active'));
    const activeItem = document.querySelector(`.chat-user-item[data-uid="${userId}"]`);
    if(activeItem) activeItem.classList.add('active');

    // Mesajları Yükle
    loadAdminMessages();
    
    // Otomatik Yenileme Başlat
    if (adminChatInterval) clearInterval(adminChatInterval);
    adminChatInterval = setInterval(() => {
        if(currentChatUserId === userId) loadAdminMessages();
    }, 3000);
}

// Mesajları Çek ve Listele
async function loadAdminMessages() {
    if (!currentChatUserId) return;

    try {
        const res = await fetch(`${API_URL}/Uyeler/${currentChatUserId}`, { 
            headers: { "Authorization": "Bearer " + token } 
        });
        const user = await res.json();
        
        let msgs = [];
        if (user.mesajlar) {
            msgs = typeof user.mesajlar === 'string' ? JSON.parse(user.mesajlar) : user.mesajlar;
        }

        // Tarihe göre sırala
        msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        const chatArea = document.getElementById('admin-chat-area');
        chatArea.innerHTML = '';

        if (msgs.length === 0) {
            chatArea.innerHTML = '<div style="text-align:center; color:#666; margin-top:50px;">Bu üye ile henüz mesajlaşma yok.</div>';
        } else {
            msgs.forEach(m => {
                const isAdmin = m.sender === 'admin'; 
                const dateObj = new Date(m.timestamp || Date.now());
                const timeStr = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                const div = document.createElement('div');
                div.className = `msg-bubble ${isAdmin ? 'msg-admin' : 'msg-user'}`;
                div.innerHTML = `
                    ${m.text}
                    <span class="msg-time">${timeStr}</span>
                `;
                chatArea.appendChild(div);
            });
        }
        chatArea.scrollTop = chatArea.scrollHeight;

    } catch (e) { console.error(e); }
}

// Admin Mesaj Gönderiyor
async function sendAdminMessage() {
    const input = document.getElementById('admin-chat-input');
    const txt = input.value.trim();
    
    if (!txt || !currentChatUserId) return;

    try {
        const resGet = await fetch(`${API_URL}/Uyeler/${currentChatUserId}`, { 
            headers: { "Authorization": "Bearer " + token } 
        });
        const user = await resGet.json();
        
        let msgs = user.mesajlar ? (typeof user.mesajlar === 'string' ? JSON.parse(user.mesajlar) : user.mesajlar) : [];

        const newMsg = {
            id: 'msg_' + Date.now(),
            text: txt,
            sender: 'admin', // Gönderen Admin
            timestamp: Date.now(),
            read: false
        };
        
        msgs.push(newMsg);

        user.mesajlar = JSON.stringify(msgs);
        user.sifre = ""; 

        await fetch(`${API_URL}/Uyeler/${currentChatUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(user)
        });

        input.value = ""; 
        loadAdminMessages(); 

    } catch (e) { 
        console.error(e);
        Toast.fire({ icon: 'error', title: 'Mesaj gönderilemedi' });
    }
}

function handleAdminChatEnter(e) {
    if (e.key === 'Enter') sendAdminMessage();
}

// Liste Filtreleme (Arama)
function filterChatUsers(val) {
    val = val.toLowerCase();
    document.querySelectorAll('.chat-user-item').forEach(item => {
        const name = item.dataset.name.toLowerCase();
        if (name.includes(val)) item.style.display = 'flex';
        else item.style.display = 'none';
    });
}

// ============================================================
// 8. YARDIMCI & DİĞER FONKSİYONLAR
// ============================================================
async function adminGuncelle() { const ad=document.getElementById('adminAd').value; const em=document.getElementById('adminEmail').value; const sif=document.getElementById('adminSifre').value; let u; try{u=await(await fetch(`${API_URL}/Uyeler/${activeAdminId}`)).json();}catch{} let data={id:activeAdminId, adSoyad:ad, email:em, sifre:sif?sif:u.sifre, paket:u.paket, fiyat:u.fiyat, rol:"admin", baslangicTarih:u.baslangicTarihi, antrenmanProgrami:u.antrenmanProgrami, diyetProgrami:u.diyetProgrami}; await fetch(`${API_URL}/Uyeler/${activeAdminId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); Toast.fire({icon:'success', title:'Güncellendi'}); }
async function giderleriGetir() { const d=await(await fetch(`${API_URL}/Giderler`)).json(); globalToplamGider=0; const c = document.getElementById("giderListesiContainer"); if(!c) return; c.innerHTML = d.map(g => { globalToplamGider += g.tutar; return `<div class="finance-row"><span class="row-name">${g.aciklama}</span><div style="display:flex; gap:10px;"><span class="text-red">- ₺${g.tutar}</span><button class="btn-delete-x" onclick="giderSil(${g.id})">x</button></div></div>`; }).join(''); hesaplaVeGuncelle(); }
async function giderEkleModal() { const {value:v}=await Swal.fire({title:'Gider Ekle', html:'<input id="s1" class="swal2-input" placeholder="Açıklama"><input id="s2" class="swal2-input" type="number" placeholder="Tutar">', preConfirm:()=>{return {aciklama: document.getElementById('s1').value, tutar: document.getElementById('s2').value}}}); if(v){ await fetch(`${API_URL}/Giderler`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({aciklama:v.aciklama, tutar:parseFloat(v.tutar), tarih:new Date().toISOString()})}); giderleriGetir(); } }
async function giderSil(id){ if(confirm('Sil?')) { await fetch(`${API_URL}/Giderler/${id}`,{method:"DELETE"}); giderleriGetir(); } }
function hesaplaVeGuncelle() { if(document.getElementById("toplamGelir")) document.getElementById("toplamGelir").innerText="₺"+globalToplamGelir; if(document.getElementById("toplamGider")) document.getElementById("toplamGider").innerText="₺"+globalToplamGider; if(document.getElementById("kasa")) document.getElementById("kasa").innerText="₺"+(globalToplamGelir-globalToplamGider); if(document.getElementById("netKar")) document.getElementById("netKar").innerText="₺"+(globalToplamGelir-globalToplamGider); }
function toggleAccordion(h) { h.classList.toggle('active'); h.nextElementSibling.classList.toggle('show'); }
function switchProTab(t) { document.getElementById('pro-workout').style.display = t==='workout'?'block':'none'; document.getElementById('pro-diet').style.display = t==='diet'?'block':'none'; document.querySelectorAll('.pro-tab-btn').forEach(b => b.classList.toggle('active', b.innerText.includes(t.toUpperCase()))); }
function modalAc() { document.getElementById("duzenlenecekId").value=""; document.getElementById("modalBaslik").innerText="Yeni Üye"; document.getElementById("uyeModal").style.display="flex"; document.getElementById("adSoyad").value=""; document.getElementById("email").value=""; document.getElementById("baslangicTarihi").valueAsDate=new Date(); document.getElementById("paketAna").value="0"; document.getElementById("paketEk").value="0"; document.getElementById("toplamFiyat").value=""; }
function modalKapat(id) { document.getElementById(id).style.display="none"; }

function showSection(id, el) { 
    document.querySelectorAll(".section").forEach(s=>s.classList.remove("active-section")); 
    document.getElementById(id).classList.add("active-section"); 
    document.querySelectorAll(".menu-items a").forEach(a=>a.classList.remove("active")); 
    if(el) el.classList.add("active");
    
    // Mesaj Kutusuna Tıklandığında Listeyi Yenile
    if (id === 'mesaj-kutusu') {
        loadChatUserList();
    } else {
        // Başka sayfaya geçince chat yenilemesini durdur
        if(adminChatInterval) { clearInterval(adminChatInterval); adminChatInterval = null; }
    }

    if(window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function logout() { localStorage.removeItem('kullanici'); window.location.href="giris.html"; }

// --- YARDIMCI FOTOĞRAF ARAÇLARI ---
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function showImageModal(src) {
    const modal = document.getElementById('imageZoomModal');
    const img = document.getElementById('zoomedImage');
    if(modal && img) { img.src = src; modal.style.display = 'flex'; }
}

function closeImageModal() {
    document.getElementById('imageZoomModal').style.display = 'none';
}

document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") closeImageModal();
});

// --- 📢 TOPLU DUYURU SİSTEMİ ---
async function sendAnnouncement() {
    const text = document.getElementById('announcement-text').value.trim();
    if (!text) return Swal.fire('Uyarı', 'Duyuru metni boş olamaz!', 'warning');

    const result = await Swal.fire({
        title: 'Emin misiniz?',
        text: "Bu mesaj tüm üyelere gönderilecek!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff9f43',
        cancelButtonColor: '#333',
        confirmButtonText: 'Evet, Yayınla!',
        cancelButtonText: 'İptal'
    });

    if (!result.isConfirmed) return;

    // Yükleniyor animasyonu
    Swal.fire({
        title: 'Yayınlanıyor...',
        html: 'Üyeler güncelleniyor, lütfen bekleyin.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        // 1. Tüm üyeleri çek
        const res = await fetch(`${API_URL}/Uyeler`, { 
            headers: { "Authorization": "Bearer " + token } 
        });
        const users = await res.json();

        // 2. Admin olmayanları filtrele
        const targets = users.filter(u => u.rol !== 'admin');
        const timestamp = Date.now();
        const dateStr = new Date().toLocaleDateString('tr-TR');

        // 3. Her üyeye mesajı ekle
        let successCount = 0;

        for (const user of targets) {
            let msgs = [];
            if (user.mesajlar) {
                try { msgs = typeof user.mesajlar === 'string' ? JSON.parse(user.mesajlar) : user.mesajlar; } catch(e) {}
            }

            // Duyuru objesi
            msgs.unshift({
                id: 'ann_' + timestamp,
                text: text,
                sender: 'duyuru', // 👈 ÖZEL GÖNDERİCİ TİPİ
                date: dateStr,
                timestamp: timestamp,
                read: false
            });

            // Üyeyi güncelle
            const updateData = { ...user, mesajlar: JSON.stringify(msgs), sifre: "" }; 
            
            await fetch(`${API_URL}/Uyeler/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(updateData)
            });
            successCount++;
        }

        document.getElementById('announcement-text').value = "";
        Swal.fire('Başarılı!', `${successCount} üyeye duyuru gönderildi.`, 'success');

    } catch (e) {
        console.error(e);
        Swal.fire('Hata', 'Duyuru gönderilirken bir sorun oluştu.', 'error');
    }
}