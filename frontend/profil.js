const API_URL = "https://localhost:7028/api";
const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true, background: '#1e1e1e', color: '#fff' });

let currentUserId = 0;
let currentUserData = null;
let chatRefreshInterval = null; 

document.addEventListener('DOMContentLoaded', async () => {
    const localUser = localStorage.getItem('kullanici');
    const token = localStorage.getItem("token"); 

    if (!localUser || !token) { 
        window.location.href = "giris.html"; 
        return; 
    }
    
    const user = JSON.parse(localUser);
    currentUserId = user.id;

    // --- MOBİL İSİM KISALTMA ---
    const isMobile = window.innerWidth < 768;
    const gorunenIsim = isMobile ? user.adSoyad.split(' ')[0] : user.adSoyad;

    // Profil Bilgilerini Doldur
    document.getElementById('profile-name').textContent = gorunenIsim;
    document.getElementById('welcome-name').textContent = gorunenIsim;
    document.getElementById('profile-package').textContent = user.paket;
    document.getElementById('card-package').textContent = user.paket;
    
    // Ayarlar Formunu Doldur
    document.getElementById('edit-name').value = user.adSoyad;
    document.getElementById('edit-email').value = user.email;
    document.getElementById('edit-password').value = "";

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

    // Verileri Sunucudan Çek (GÜNCEL VERİ)
    try {
        const response = await fetch(`${API_URL}/Uyeler/${user.id}`, {
            headers: { "Authorization": "Bearer " + token } 
        });

        if (response.ok) {
            const freshUser = await response.json();
            currentUserData = freshUser; 
            
            loadAnnouncements(freshUser); 

            // --- 1. KALAN GÜN HESAPLAMA ---
            if (freshUser.bitisTarihi) {
                const bugun = new Date(); 
                const bitis = new Date(freshUser.bitisTarihi);
                bugun.setHours(0,0,0,0); 
                bitis.setHours(0,0,0,0);
                
                const fark = Math.ceil((bitis - bugun) / (1000 * 60 * 60 * 24));
                
                let kalanGunElement = document.getElementById("kalan-gun");
                if (!kalanGunElement) {
                    const statCards = document.querySelectorAll(".stat-card");
                    statCards.forEach(card => {
                        if(card.innerText.includes("Kalan Süre")) {
                            kalanGunElement = card.querySelector("p");
                        }
                    });
                }

                if (kalanGunElement) {
                    if (fark > 0) {
                        kalanGunElement.innerText = `${fark} Gün Kaldı`;
                        kalanGunElement.style.color = "var(--success)";
                    } else {
                        kalanGunElement.innerText = "SÜRE BİTTİ";
                        kalanGunElement.style.color = "#ff3d00";
                    }
                }
            } else {
                const el = document.getElementById("kalan-gun");
                if(el) { el.innerText = "-"; el.style.color = "#666"; }
            }

            renderWorkout(freshUser.antrenmanProgrami);
            renderNutrition(freshUser.diyetProgrami);
        } else {
            console.error("Veri çekilemedi, Token hatası olabilir:", response.status);
            if (response.status === 401) {
                window.location.href = "giris.html";
            }
        }
    } catch (error) { console.error("Veri çekme hatası:", error); }

    loadProgress();
    if(document.getElementById('prog-date')) {
        document.getElementById('prog-date').valueAsDate = new Date();
    }
});

// --- YARDIMCI FONKSİYON: RESMİ BASE64'E ÇEVİRİR ---
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// --- 🔥 VÜCUT ANALİZİ VE İLERLEME (AYRILMIŞ FONKSİYONLAR) 🔥 ---

// 1. SADECE ÖLÇÜMLERİ KAYDEDEN FONKSİYON
function addProgress(e) {
    e.preventDefault();
    
    // Eğer butona basan kişi fotoğraf kaydet butonundan geldiyse iptal et
    const isPhotoUpload = e.submitter && e.submitter.innerText.toUpperCase().includes('FOTOĞRAFI');
    if (isPhotoUpload) {
        addPhotoProgress(); // Yönlendir
        return; 
    }

    const record = {
        date: document.getElementById('prog-date').value,
        weight: document.getElementById('prog-weight').value,
        arm: document.getElementById('prog-arm').value || "-",
        chest: document.getElementById('prog-chest').value || "-",
        waist: document.getElementById('prog-waist').value || "-",
        hip: document.getElementById('prog-hip').value || "-", 
        leg: document.getElementById('prog-leg').value || "-",
        shoulder: document.getElementById('prog-shoulder').value || "-",
        type: 'measurement' 
    }; 

    saveRecordToStorage(record);
    
    loadProgress(); 
    Toast.fire({ icon: 'success', title: 'Ölçümler Kaydedildi!' });
    document.getElementById('prog-weight').value = "";
}

// 2. SADECE FOTOĞRAF KAYDEDEN YENİ FONKSİYON
async function addPhotoProgress() {
    const fileInput = document.getElementById('prog-photo');
    
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        Swal.fire('Uyarı', 'Lütfen yüklemek için bir fotoğraf seçin.', 'warning');
        return;
    }
    
    const file = fileInput.files[0];
    if (file.size > 3 * 1024 * 1024) { 
        Swal.fire('Hata', 'Fotoğraf boyutu 3MB\'dan küçük olmalıdır.', 'error');
        return;
    }

    try {
        const photoData = await toBase64(file);
        
        const record = {
            date: new Date().toLocaleDateString('tr-TR'),
            photo: photoData,
            type: 'photo' 
        };

        saveRecordToStorage(record);
        
        fileInput.value = ""; 
        Toast.fire({ icon: 'success', title: 'Fotoğraf Galeriye Eklendi!' });
        
        if(document.getElementById('galleryModal').style.display === 'flex') {
            loadGallery();
        }
    } catch (err) {
        console.error("Resim hatası", err);
        Swal.fire('Hata', 'Fotoğraf işlenirken bir sorun oluştu.', 'error');
    }
}


function saveRecordToStorage(record) {
    const userKey = 'sporium_progress_' + currentUserId;
    const history = JSON.parse(localStorage.getItem(userKey)) || [];
    history.unshift(record);
    localStorage.setItem(userKey, JSON.stringify(history));
}

function loadProgress() {
    const userKey = 'sporium_progress_' + currentUserId;
    const history = JSON.parse(localStorage.getItem(userKey)) || [];
    const tbody = document.getElementById('progress-body');
    tbody.innerHTML = '';
    
    const measurements = history.filter(rec => rec.type === 'measurement');

    if(measurements.length > 0) {
        document.getElementById('current-weight-display').innerText = measurements[0].weight + ' kg';
    }
    
    measurements.forEach((rec) => {
        const originalIndex = history.indexOf(rec);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color:#fff; font-size:0.85rem;">${rec.date}</td>
            <td style="font-weight:bold; color:var(--primary)">${rec.weight} kg</td>
            <td>${rec.arm || '-'}</td>
            <td>${rec.chest || '-'}</td>
            <td>${rec.waist || '-'}</td>
            <td>${rec.hip || '-'}</td> 
            <td>${rec.leg || '-'}</td>
            <td>${rec.shoulder || '-'}</td>
            <td><button style="background:none; border:none; color:#ff3d00; cursor:pointer;" onclick="deleteProgress(${originalIndex})"><i class="fas fa-trash"></i></button></td>`;
        tbody.appendChild(tr);
    });
}

function showImageModal(src) {
    Swal.fire({
        imageUrl: src,
        imageAlt: 'Gelişim Fotoğrafı',
        background: '#111',
        showConfirmButton: false,
        width: 'auto',
        padding: '1em'
    });
}

function deleteProgress(index) {
    const userKey = 'sporium_progress_' + currentUserId;
    const history = JSON.parse(localStorage.getItem(userKey)) || [];
    if(confirm('Bu kaydı silmek istediğine emin misin?')) { 
        history.splice(index, 1); 
        localStorage.setItem(userKey, JSON.stringify(history)); 
        loadProgress(); 
        if(document.getElementById('galleryModal').style.display === 'flex') loadGallery();
    }
}

// --- DİĞER FONKSİYONLAR ---
function renderWorkout(jsonData) {
    const container = document.getElementById('workout-content');
    try {
        const wData = JSON.parse(jsonData);
        if (Array.isArray(wData) && wData.length > 0) {
            container.innerHTML = "";
            for (let i = 1; i <= 7; i++) {
                const dayName = `${i}. Gün`;
                const dayExercises = wData.filter(x => x.day === dayName);
                if(dayExercises.length > 0) {
                    let rowsHtml = "";
                    dayExercises.forEach(ex => {
                        rowsHtml += `<tr><td style="color:var(--primary); font-weight:600;">${ex.target}</td><td>${ex.exercise}</td><td>${ex.sets}</td><td>${ex.reps}</td><td style="color:#aaa; font-style:italic;">${ex.note || '-'}</td></tr>`;
                    });
                    container.innerHTML += `<div class="day-accordion"><div class="day-header" onclick="toggleAccordion(this)">${dayName.toUpperCase()} - ${dayExercises[0].target} Günü <i class="fas fa-chevron-down"></i></div><div class="day-body"><table class="pro-table"><thead><tr><th>Bölge</th><th>Hareket</th><th>Set</th><th>Tekrar</th><th>Not</th></tr></thead><tbody>${rowsHtml}</tbody></table></div></div>`;
                }
            }
            if(container.innerHTML === "") container.innerHTML = '<div style="padding:20px;text-align:center;color:#666">Program atanmamış.</div>';
        } else { throw new Error("Boş"); }
    } catch (e) { container.innerHTML = `<div style="padding:20px; text-align:center; color:#666">Henüz antrenman programı atanmadı.</div>`; }
}

function renderNutrition(jsonData) {
    const container = document.getElementById('nutrition-content');
    try {
        const dData = JSON.parse(jsonData);
        if (Array.isArray(dData) && dData.length > 0) {
            container.innerHTML = "";
            const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
            days.forEach(day => {
                const dayFoods = dData.filter(x => x.day === day);
                if(dayFoods.length > 0) {
                    let rowsHtml = ""; let tCal = 0, tPro = 0, tCarb = 0, tFat = 0;
                    dayFoods.forEach(f => {
                        const amt = f.amount || 0; const cal = parseInt(f.cal) || 0; const pro = parseInt(f.pro) || 0; const carb = parseInt(f.carb) || 0; const fat = parseInt(f.fat) || 0;   
                        tCal += cal; tPro += pro; tCarb += carb; tFat += fat;
                        rowsHtml += `<tr><td style="font-weight:bold; color:#fff;">${f.meal}</td><td style="color:var(--primary)">${f.food}</td><td>${amt}</td><td>${cal}</td><td style="color:#00d2ff">${pro}g</td><td style="color:#ff9f43">${carb}g</td><td style="color:#ff3d00">${fat}g</td></tr>`;
                    });
                    container.innerHTML += `<div class="day-accordion"><div class="day-header" onclick="toggleAccordion(this)"><div>${day.toUpperCase()} <span style="font-size:0.8rem; color:#888; margin-left:10px;">(${tCal} kcal | P:${tPro} K:${tCarb} Y:${tFat})</span></div><i class="fas fa-chevron-down"></i></div><div class="day-body"><table class="pro-table"><thead><tr><th>Öğün</th><th>Besin</th><th>Miktar</th><th>Cal</th><th style="color:#00d2ff">Pro</th><th style="color:#ff9f43">Karb</th><th style="color:#ff3d00">Yağ</th></tr></thead><tbody>${rowsHtml}</tbody></table></div></div>`;
                }
            });
            if(container.innerHTML === "") container.innerHTML = '<div style="padding:20px;text-align:center;color:#666">Program atanmamış.</div>';
        } else { throw new Error("Boş"); }
    } catch (e) { container.innerHTML = `<div style="padding:20px; text-align:center; color:#666">Henüz beslenme programı atanmadı.</div>`; }
}

function toggleAccordion(header) { header.classList.toggle('active'); header.nextElementSibling.classList.toggle('show'); }

async function updateProfile() {
    const token = localStorage.getItem("token");
    if (!token) {
        Swal.fire('Hata', 'Oturum süresi dolmuş, lütfen tekrar giriş yapın.', 'warning');
        return;
    }

    if (!currentUserData) return;

    const adSoyad = document.getElementById('edit-name').value;
    const email = document.getElementById('edit-email').value;
    const yeniSifre = document.getElementById('edit-password').value; 

    let updateData = { ...currentUserData, adSoyad, email };
    if (yeniSifre.trim() !== "") updateData.sifre = yeniSifre;

    try {
        const res = await fetch(`${API_URL}/Uyeler/${currentUserId}`, { 
            method: 'PUT', 
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token 
            }, 
            body: JSON.stringify(updateData) 
        });
        
        if(res.ok) {
            Swal.fire('Başarılı', 'Bilgiler güncellendi.', 'success');
            document.getElementById('profile-name').textContent = adSoyad;
            localStorage.setItem('kullanici', JSON.stringify(updateData));
        } else {
            const errText = await res.text();
            Swal.fire('Hata', errText, 'error');
        }
    } catch(e) { 
        Swal.fire('Kritik Hata', e.message, 'error'); 
    }
}

function showSection(id, el) { 
    document.querySelectorAll('.menu-items a').forEach(item => item.classList.remove('active'));
    if(el) el.classList.add('active');
    
    if(id === 'messages' && !el) {
        const msgLink = document.getElementById('nav-messages');
        if(msgLink) msgLink.classList.add('active');
    }
    
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active-section')); 
    document.getElementById('section-' + id).classList.add('active-section'); 

    if(id === 'messages') {
        loadChatMessages(); 
        if(!chatRefreshInterval) {
            chatRefreshInterval = setInterval(loadChatMessages, 3000); 
        }
    } else {
        if(chatRefreshInterval) {
            clearInterval(chatRefreshInterval);
            chatRefreshInterval = null;
        }
    }

    if(window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function logout() { 
    localStorage.removeItem('kullanici'); 
    window.location.href = "giris.html"; 
}

// --- 🔥 YENİ TAM EKRAN CHAT SİSTEMİ 🔥 ---
async function loadChatMessages() {
    const msgSection = document.getElementById('section-messages');
    if (!msgSection || !msgSection.classList.contains('active-section')) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/Uyeler/${currentUserId}`, { 
            headers: { "Authorization": "Bearer " + token } 
        });
        
        if (!res.ok) return;
        const user = await res.json();
        
        let msgs = [];
        if (user.mesajlar) {
            msgs = typeof user.mesajlar === 'string' ? JSON.parse(user.mesajlar) : user.mesajlar;
        }

        const chatOnly = msgs.filter(m => m.sender === 'uye' || m.sender === 'admin');

        chatOnly.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        const chatArea = document.getElementById('chat-messages-area');
        chatArea.innerHTML = '';

        if (chatOnly.length === 0) {
            chatArea.innerHTML = `
                <div style="text-align:center; color:#666; margin-top:50px;">
                    <p>Henüz özel bir mesajınız yok.<br>Buradan yöneticinizle yazışabilirsiniz. 👋</p>
                </div>`;
        } else {
            chatOnly.forEach(m => {
                const isMe = m.sender === 'uye'; 
                const dateObj = new Date(m.timestamp || Date.now());
                const timeStr = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                const div = document.createElement('div');
                div.className = `message-bubble ${isMe ? 'msg-sent' : 'msg-received'}`;
                div.innerHTML = `
                    ${m.text}
                    <span class="msg-time">${timeStr} ${isMe ? '<i class="fas fa-check" style="font-size:0.6rem; margin-left:5px;"></i>' : ''}</span>
                `;
                chatArea.appendChild(div);
            });
        }
        chatArea.scrollTop = chatArea.scrollHeight;

    } catch (e) { console.error("Chat hatası:", e); }
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const txt = input.value.trim();
    
    if (!txt) return; 

    const chatArea = document.getElementById('chat-messages-area');
    const tempDiv = document.createElement('div');
    tempDiv.className = 'message-bubble msg-sent';
    tempDiv.style.opacity = '0.7';
    const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    tempDiv.innerHTML = `${txt} <span class="msg-time">${timeStr} <i class="fas fa-clock"></i></span>`;
    chatArea.appendChild(tempDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
    
    input.value = ""; 

    const token = localStorage.getItem("token");
    
    try {
        const resGet = await fetch(`${API_URL}/Uyeler/${currentUserId}`, { 
            headers: { "Authorization": "Bearer " + token } 
        });
        const user = await resGet.json();
        
        let msgs = user.mesajlar ? (typeof user.mesajlar === 'string' ? JSON.parse(user.mesajlar) : user.mesajlar) : [];

        const newMsg = {
            id: 'msg_' + Date.now(),
            text: txt,
            sender: 'uye',
            timestamp: Date.now(),
            read: false
        };
        
        msgs.push(newMsg);

        user.mesajlar = JSON.stringify(msgs);
        user.sifre = ""; 

        await fetch(`${API_URL}/Uyeler/${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(user)
        });

        loadChatMessages(); 

    } catch (e) { 
        console.error(e);
        tempDiv.style.background = 'red';
        tempDiv.innerText = 'Gönderilemedi!';
        Swal.fire({toast:true, position:'top-end', icon:'error', title:'Mesaj hatası'});
    }
}

function handleChatEnter(e) {
    if (e.key === 'Enter') sendChatMessage();
}

// --- GALERİ YÖNETİMİ ---
function openGalleryModal() {
    document.getElementById('galleryModal').style.display = 'flex';
    loadGallery();
}

function closeGalleryModal() {
    document.getElementById('galleryModal').style.display = 'none';
}

function loadGallery() {
    const userKey = 'sporium_progress_' + currentUserId;
    const history = JSON.parse(localStorage.getItem(userKey)) || [];
    const container = document.getElementById('gallery-container');
    if(!container) return;
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
        div.innerHTML = `
            <img src="${rec.photo}" onclick="showImageModal('${rec.photo}')" style="width:100%; height:150px; object-fit:cover; border-radius:8px; cursor:pointer;">
            <div class="gallery-date" style="text-align:center; font-size:0.8rem; margin-top:5px; color:#aaa;">${rec.date}</div>
            <button onclick="deleteProgress(${originalIndex}); setTimeout(loadGallery, 100);" 
                    style="position:absolute; top:5px; right:5px; background:rgba(255,0,0,0.8); color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer;">&times;</button>
        `;
        container.appendChild(div);
    });
}

window.onclick = function(event) {
    const gallery = document.getElementById('galleryModal');
    if (event.target == gallery) closeGalleryModal();
}

// --- 📢 DUYURULARI YÜKLEME FONKSİYONU ---
function loadAnnouncements(user) {
    const container = document.getElementById('announcements-list');
    if (!container) return;

    let msgs = [];
    try {
        if (user.mesajlar) {
            msgs = typeof user.mesajlar === 'string' ? JSON.parse(user.mesajlar) : user.mesajlar;
        }
    } catch (e) { msgs = []; }

    const announcements = msgs.filter(m => m.sender === 'duyuru');
    announcements.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    container.innerHTML = '';

    if (announcements.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; color:#555; padding:20px;">
                <i class="far fa-bell-slash" style="font-size:2rem; margin-bottom:10px;"></i><br>
                Henüz güncel bir duyuru yok.
            </div>`;
        return;
    }

    announcements.forEach(ann => {
        const div = document.createElement('div');
        div.className = 'announcement-card';
        div.innerHTML = `
            <div class="ann-header">
                <span class="ann-badge"><i class="fas fa-bullhorn"></i> GENEL DUYURU</span>
                <span class="ann-date">${ann.date}</span>
            </div>
            <div class="ann-content">${ann.text}</div>
        `;
        container.appendChild(div);
    });
}