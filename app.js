/* ==========================================================================
   TRAVESÍA DE KAYAK PARQUE NACIONAL LOS ALERCES - FCE UNPSJB
   Application JavaScript Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    /* ----------------------------------------------------------------------
       1. PARALLAX EFFECT FOR HERO VIDEO AND FCE SHIELD LOGO
       ---------------------------------------------------------------------- */
    const parallaxShield = document.getElementById('parallaxShield');
    const parallaxBg = document.getElementById('parallaxBg');
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        
        // Sticky Navbar effect
        if (scrolled > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Parallax transform on background video & transparent shield
        if (parallaxShield && scrolled < 800) {
            parallaxShield.style.transform = `translateY(${scrolled * 0.15}px) rotate(${scrolled * 0.02}deg)`;
        }

        if (parallaxBg && scrolled < 1000) {
            parallaxBg.style.transform = `translateY(${scrolled * 0.25}px)`;
        }
    });

    // Mouse tilt / parallax movement on the FCE shield logo
    document.addEventListener('mousemove', (e) => {
        if (!parallaxShield) return;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const mouseX = (e.clientX - windowWidth / 2) / (windowWidth / 2);
        const mouseY = (e.clientY - windowHeight / 2) / (windowHeight / 2);

        parallaxShield.style.transform = `translate(${mouseX * 15}px, ${mouseY * 15}px) rotate(${mouseX * 3}deg)`;
    });

    /* ----------------------------------------------------------------------
       2. TAB NAVIGATION & SECTION SWITCHING
       ---------------------------------------------------------------------- */
    const navLinks = document.querySelectorAll('.nav-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const navMenu = document.getElementById('navMenu');
    const hamburgerBtn = document.getElementById('hamburgerBtn');

    function switchTab(targetTab) {
        // Activate target nav button
        navLinks.forEach(link => {
            if (link.getAttribute('data-tab') === targetTab) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Show target tab content section
        tabContents.forEach(content => {
            const sectionName = content.getAttribute('data-section');
            if (sectionName === targetTab || (targetTab === 'inicio' && sectionName === 'inicio')) {
                content.classList.add('active-tab');
            } else {
                content.classList.remove('active-tab');
            }
        });

        // Close mobile drawer if open
        if (navMenu) navMenu.classList.remove('mobile-open');

        // Scroll to top of content smoothly if switching away from hero
        if (targetTab !== 'inicio') {
            window.scrollTo({ top: 80, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetTab = link.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    // Mobile Hamburger Menu Toggle
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            navMenu.classList.toggle('mobile-open');
        });
    }

    /* ----------------------------------------------------------------------
       3. PHOTO GALLERY CONTROLLER (MASONRY vs CAROUSEL)
       ---------------------------------------------------------------------- */
    const btnViewMasonry = document.getElementById('btnViewMasonry');
    const btnViewCarousel = document.getElementById('btnViewCarousel');
    const galleryGrid = document.getElementById('galleryGrid');
    const galleryCarousel = document.getElementById('galleryCarousel');

    if (btnViewMasonry && btnViewCarousel) {
        btnViewMasonry.addEventListener('click', () => {
            btnViewMasonry.classList.add('active');
            btnViewCarousel.classList.remove('active');
            galleryGrid.classList.add('active-view');
            galleryCarousel.classList.remove('active-view');
        });

        btnViewCarousel.addEventListener('click', () => {
            btnViewCarousel.classList.add('active');
            btnViewMasonry.classList.remove('active');
            galleryCarousel.classList.add('active-view');
            galleryGrid.classList.remove('active-view');
        });
    }

    // CAROUSEL SLIDER LOGIC
    const track = document.querySelector('.carousel-track');
    const slides = document.querySelectorAll('.carousel-slide');
    const prevBtn = document.getElementById('prevSlideBtn');
    const nextBtn = document.getElementById('nextSlideBtn');
    const dotsContainer = document.getElementById('carouselDots');
    let currentIndex = 0;

    // Create Dots dynamically
    if (dotsContainer && slides.length > 0) {
        slides.forEach((_, idx) => {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (idx === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(idx));
            dotsContainer.appendChild(dot);
        });
    }

    function goToSlide(index) {
        if (!track) return;
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        currentIndex = index;

        track.style.transform = `translateX(-${currentIndex * 100}%)`;

        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === currentIndex);
        });
    }

    if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));

    // Auto advance carousel every 5 seconds
    setInterval(() => {
        if (galleryCarousel && galleryCarousel.classList.contains('active-view')) {
            goToSlide(currentIndex + 1);
        }
    }, 5000);

    /* ----------------------------------------------------------------------
       4. LIGHTBOX IMAGE VIEWER
       ---------------------------------------------------------------------- */
    const lightboxModal = document.getElementById('lightboxModal');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const closeLightboxBtn = document.getElementById('closeLightboxBtn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            const src = item.getAttribute('data-src');
            const caption = item.getAttribute('data-caption');
            lightboxImage.src = src;
            lightboxCaption.textContent = caption || '';
            lightboxModal.classList.add('show');
        });
    });

    if (closeLightboxBtn) {
        closeLightboxBtn.addEventListener('click', () => {
            lightboxModal.classList.remove('show');
        });
    }

    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) {
                lightboxModal.classList.remove('show');
            }
        });
    }

    /* ----------------------------------------------------------------------
       5. MODAL REVIEWS AND INSCRIPCIÓN CONTROLLER
       ---------------------------------------------------------------------- */
    const reviewsModal = document.getElementById('reviewsModal');
    const openReviewsModalBtn = document.getElementById('openReviewsModalBtn');
    const closeReviewsModalBtn = document.getElementById('closeReviewsModalBtn');
    const openInscripcionBtn = document.getElementById('openInscripcionBtn');

    if (openReviewsModalBtn) {
        openReviewsModalBtn.addEventListener('click', () => {
            reviewsModal.classList.add('show');
        });
    }

    if (openInscripcionBtn) {
        openInscripcionBtn.addEventListener('click', () => {
            reviewsModal.classList.add('show');
        });
    }

    if (closeReviewsModalBtn) {
        closeReviewsModalBtn.addEventListener('click', () => {
            reviewsModal.classList.remove('show');
        });
    }

    if (reviewsModal) {
        reviewsModal.addEventListener('click', (e) => {
            if (e.target === reviewsModal) {
                reviewsModal.classList.remove('show');
            }
        });
    }

    // Scroll Down Button from hero
    const scrollDownBtn = document.getElementById('scrollDownBtn');
    if (scrollDownBtn) {
        scrollDownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetEl = document.getElementById('resumen-travesia');
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
});