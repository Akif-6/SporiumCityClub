document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. GİRİŞ KONTROLÜ VE BUTON AYARLARI
    // ==========================================
    const localData = localStorage.getItem("kullanici");
    const btn = document.getElementById("nav-login-btn");

    if (localData && btn) {
        const kullanici = JSON.parse(localData);

        // --- MOBİL İSİM KISALTMA ---
        const isMobile = window.innerWidth < 768;
        const gorunenIsim = isMobile ? kullanici.adSoyad.split(' ')[0] : kullanici.adSoyad;

        // ROLÜ AL, KÜÇÜK HARF YAP VE BOŞLUKLARI SİL (HAYAT KURTARAN SATIR)
        const userRole = (kullanici.rol || kullanici.Rol || kullanici.role || "").toString().toLowerCase().trim();

        const icon = userRole === 'admin' ? '<i class="fas fa-crown"></i>' : '<i class="fas fa-user"></i>';
        
        btn.innerHTML = `${icon} ${gorunenIsim}`;

        // Buton Stilleri
        btn.style.background = "#1e1e1e";
        btn.style.border = "1px solid #00e640";
        btn.style.color = "#00e640";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.gap = "8px";
        btn.style.padding = "8px 15px"; 
        
        btn.removeAttribute("href"); 
        btn.style.cursor = "pointer";

        btn.onclick = () => {
            if (userRole === "admin") {
                // Admin panelinin adına göre burayı ayarlayabilirsin
                window.location.href = "admin_panel.html"; 
            } else {
                window.location.href = "profil.html";
            }
        };
    }

    // ==========================================
    // 2. MOBİL MENÜ KONTROLÜ
    // ==========================================
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');
    const body = document.querySelector('body');
    const navLinks = document.querySelectorAll('nav ul li a');

    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); 
            nav.classList.toggle('active');
            
            const icon = menuToggle.querySelector('i');
            if (nav.classList.contains('active')) {
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

    navLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', (e) => {
        if (nav && nav.classList.contains('active') && !nav.contains(e.target) && !menuToggle.contains(e.target)) {
            closeMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            closeMenu();
        }
    });

    function closeMenu() {
        if(nav) nav.classList.remove('active');
        body.style.overflow = 'auto';
        if (menuToggle) {
            const icon = menuToggle.querySelector('i');
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-times');
        }
    }

    // ==========================================
    // 3. FİYAT GÜNCELLEME SİSTEMİ
    // ==========================================
    updateAllPrices();

    function updateAllPrices() {
        const savedPrices = localStorage.getItem('sporium_fiyatlar');
        if (!savedPrices) return; 

        const prices = JSON.parse(savedPrices);

        // -- Salon Fiyatları --
        setPrice("show-salon-1", prices["price-salon-1"]);
        setPrice("show-salon-1-old", prices["price-salon-1-old"], true);
        
        setPrice("show-salon-3", prices["price-salon-3"]);
        setPrice("show-salon-3-old", prices["price-salon-3-old"], true);
        
        setPrice("show-salon-6", prices["price-salon-6"]);
        setPrice("show-salon-6-old", prices["price-salon-6-old"], true);
        
        setPrice("show-salon-12", prices["price-salon-12"]);
        setPrice("show-salon-12-old", prices["price-salon-12-old"], true);
        
        // -- Online Fiyatları --
        setPrice("show-online-1", prices["price-online-1"]);
        setPrice("show-online-1-old", prices["price-online-1-old"], true);
        
        setPrice("show-online-3", prices["price-online-3"]);
        setPrice("show-online-3-old", prices["price-online-3-old"], true);
        
        // -- Ekstra Hizmetler --
        setPrice("show-diyet", prices["price-diyet"]);
        setPrice("show-kur", prices["price-kur"]);
        setPrice("show-pt-7", prices["price-pt-7"]);
        setPrice("show-pt-12", prices["price-pt-12"]);
        setPrice("show-pt-24", prices["price-pt-24"]);
    }

    function setPrice(elementId, priceValue, isOld = false) {
        const el = document.getElementById(elementId);
        if (el && priceValue && priceValue > 0) {
            let html = `₺${parseInt(priceValue).toLocaleString('tr-TR')}`;
            if (!isOld) {
                html += `<span class="currency">,00</span>`;
            }
            el.innerHTML = html;
        }
    }

    // ==========================================
    // 4. SCROLL ANİMASYONLARI (OBSERVER)
    // ==========================================
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('gorundu');
            }
        });
    }, { threshold: 0.1 }); 

    const hiddenElements = document.querySelectorAll('section, .card, .pricing-card');
    hiddenElements.forEach((el) => observer.observe(el));
});

// --- PRELOADER ANİMASYONU (SADECE İLK GİRİŞTE) ---
        window.addEventListener('load', () => {
            const preloader = document.getElementById('preloader');
            // Eğer yukarıdaki sihirli kod preloader'ı gizlemediyse (yani ilk girişse) şovu yap:
            if (preloader && preloader.style.display !== 'none') {
                setTimeout(() => {
                    preloader.style.opacity = '0';
                    preloader.style.visibility = 'hidden';
                }, 800); 
                // Bir daha göstermemek üzere hafızaya yaz
                sessionStorage.setItem('sporiumIntroIzlendi', 'true');
            }
        });