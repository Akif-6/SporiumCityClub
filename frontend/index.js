document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // 1. GİRİŞ KONTROLÜ (MOBİL İSİM AYARLI)
    // ==========================================
    const localData = localStorage.getItem("kullanici");
    const btn = document.getElementById("nav-login-btn");

    if (localData && btn) {
        const kullanici = JSON.parse(localData);

        // --- YENİ: Mobilde uzun isim butonu bozmasın diye sadece ilk ismi alıyoruz ---
        const isMobile = window.innerWidth < 768;
        const gorunenIsim = isMobile ? kullanici.adSoyad.split(' ')[0] : kullanici.adSoyad;

        // ROLÜ AL, KÜÇÜK HARF YAP VE BOŞLUKLARI SİL (HAYAT KURTARAN GÜVENLİK SATIRI)
        const userRole = (kullanici.rol || kullanici.Rol || kullanici.role || "").toString().toLowerCase().trim();

        const icon = userRole === 'admin' ? '<i class="fas fa-crown"></i>' : '<i class="fas fa-user"></i>';
        
        btn.innerHTML = `${icon} ${gorunenIsim}`; // Düzenlenmiş isim

        // Buton Stilleri (Senin Orijinal Kodun)
        btn.style.background = "#1e1e1e";
        btn.style.border = "1px solid #00e640";
        btn.style.color = "#00e640";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.gap = "8px";

        btn.removeAttribute("href"); 
        btn.style.cursor = "pointer";

        btn.onclick = () => {
            if (userRole === "admin") {
                window.location.href = "admin_panel.html";
            } else {
                window.location.href = "profil.html";
            }
        };
    }

    // ==========================================
    // 2. MOBİL MENÜ AYARLARI
    // ==========================================
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');
    const body = document.querySelector('body');
    const navLinks = document.querySelectorAll('nav ul li a');

    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // --- YENİ: Tıklamanın dışarı taşmasını engelle ---
            
            nav.classList.toggle('active');
            
            // İkon değiştirme
            const icon = menuToggle.querySelector('i');
            if(nav.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
                body.style.overflow = 'hidden';
            } else {
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
                body.style.overflow = 'auto';
            }
        });
    }

    // Linklere tıklayınca menüyü kapat
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMenu();
        });
    });

    // --- YENİ: Menü açıkken boşluğa tıklanırsa kapat ---
    document.addEventListener('click', (e) => {
        if (nav.classList.contains('active') && !nav.contains(e.target) && !menuToggle.contains(e.target)) {
            closeMenu();
        }
    });

    // --- YENİ: Ekran genişletilirse (veya telefon yan çevrilirse) menüyü düzelt ---
    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            closeMenu();
        }
    });

    // Kapatma Fonksiyonu (Kod tekrarını önlemek için)
    function closeMenu() {
        nav.classList.remove('active');
        body.style.overflow = 'auto';
        if (menuToggle) {
            const icon = menuToggle.querySelector('i');
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-times');
        }
    }
});

// ==========================================
// 3. OBSERVER (KAYDIRMA ANİMASYONU)
// ==========================================
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('gorundu'); 
        }
    });
});

const hiddenElements = document.querySelectorAll('section');
hiddenElements.forEach((el) => observer.observe(el));

// --- PRELOADER GİZLEME MANTIĞI (SADECE İLK GİRİŞTE ÇALIŞIR) ---
        document.addEventListener('DOMContentLoaded', () => {
            const preloader = document.getElementById('preloader');
            if (preloader) {
                // Eğer bu sekmede siteye daha önce girildiyse anında yok et
                if (sessionStorage.getItem('sporiumIntroIzlendi')) {
                    preloader.style.display = 'none'; // Şok etkisiyle anında gizle
                } else {
                    // İlk defa giriyorsa, sayfa yüklenince animasyonu oynat
                    window.addEventListener('load', () => {
                        setTimeout(() => {
                            preloader.style.opacity = '0';
                            preloader.style.visibility = 'hidden';
                        }, 800); // 0.8 saniye şovu izlet

                        // Bir daha göstermemek üzere tarayıcı hafızasına not al
                        sessionStorage.setItem('sporiumIntroIzlendi', 'true');
                    });
                }
            }
        });