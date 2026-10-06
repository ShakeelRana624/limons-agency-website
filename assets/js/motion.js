/* ==================================================================
   LIMONS - GLOBAL MOTION CONTROLLER
   Premium scroll reveals, text animations, navbar behavior,
   page transitions, and floating mockup orchestration.
   ================================================================== */
(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ------------------------------------------------------------------
     1. SCROLL PROGRESS BAR
  ------------------------------------------------------------------ */
  function initProgressBar() {
    const bar = document.createElement('div');
    bar.className = 'mo-progress';
    document.body.prepend(bar);
    const update = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = h > 0 ? (scrollY / h * 100) + '%' : '0%';
    };
    addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------
     2. PAGE TRANSITION OVERLAY
  ------------------------------------------------------------------ */
  function initPageTransitions() {
    const overlay = document.createElement('div');
    overlay.className = 'mo-page-transition';
    document.body.prepend(overlay);

    // Fade in on page load
    overlay.style.opacity = '1';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '0';
      });
    });

    // Intercept internal navigation links
    $$('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;
      // Skip anchors, external links, javascript:, mailto:, tel:
      if (href.startsWith('#') || href.startsWith('javascript:') ||
        href.startsWith('mailto:') || href.startsWith('tel:') ||
        a.target === '_blank' || a.hasAttribute('download')) return;
      // Only intercept .html links (local pages)
      if (href.endsWith('.html') || href.includes('.html#')) {
        // If clicking a link pointing to an anchor on the current page, smooth scroll immediately
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const [targetPath, targetHash] = href.split('#');
        if (targetHash && (targetPath === currentPath || targetPath === '')) {
          a.addEventListener('click', e => {
            e.preventDefault();
            const targetEl = document.getElementById(targetHash) || document.querySelector('#' + targetHash);
            if (targetEl) {
              if (window.lenis) {
                window.lenis.scrollTo(targetEl, { offset: -30, duration: 1.0 });
              } else {
                targetEl.scrollIntoView({ behavior: 'smooth' });
              }
              try { history.pushState(null, '', '#' + targetHash); } catch(err){}
            }
          });
          return;
        }

        a.addEventListener('click', e => {
          e.preventDefault();
          overlay.classList.add('active');
          setTimeout(() => {
            window.location.href = href;
          }, 280);
        });
      }
    });
  }

  /* ------------------------------------------------------------------
     3. SCROLL REVEAL (IntersectionObserver)
     Handles: .mo-reveal, .mo-fade, .mo-scale, .mo-from-left,
              .mo-from-right, .mo-img-reveal, .mo-badge,
              .mo-footer-col, .mo-brand-logo, .mo-dash-point,
              .mo-cta-band, .mo-hero-logo, .mo-hero-title,
              .mo-hero-sub, .mo-hero-img
  ------------------------------------------------------------------ */
  /* After an element has finished its reveal, drop the stagger delay so that
     hover transitions on it respond instantly (no laggy 80-300ms hover). */
  function settleReveal(el) {
    const delay = parseFloat(getComputedStyle(el).transitionDelay) * 1000 || 0;
    setTimeout(() => {
      el.style.transitionDelay = '';
      el.classList.add('mo-done');
    }, 1300 + delay);
  }

  function initScrollReveals() {
    const selectors = [
      '.mo-reveal', '.mo-fade', '.mo-scale',
      '.mo-from-left', '.mo-from-right',
      '.mo-img-reveal', '.mo-badge',
      '.mo-footer-col', '.mo-brand-logo',
      '.mo-dash-point', '.mo-cta-band',
      '.mo-hero-logo', '.mo-hero-title',
      '.mo-hero-sub', '.mo-hero-img',
      '.feature-note', '.dashboard-point', '.mo-note',
      '.feature-figure', '.mo-mockup-reveal', '.feat-display-stage',
      // Also handle the existing .reveal class from product pages
      '.reveal'
    ];
    const els = $$(selectors.join(','));
    if (reduce) {
      els.forEach(el => el.classList.add('in'));
      return;
    }
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          entry.target.classList.add('in');
          settleReveal(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0,
      rootMargin: '60px 0px -2% 0px'
    });
    els.forEach(el => io.observe(el));

    // Fallback: check already visible elements immediately
    setTimeout(() => {
      els.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight + 60 && r.bottom > -60) {
          el.classList.add('in');
          settleReveal(el);
          io.unobserve(el);
        }
      });
    }, 150);
  }

  /* ------------------------------------------------------------------
     4. STAGGER CHILDREN - auto-assign stagger delays
     Usage: add data-mo-stagger to the parent container
  ------------------------------------------------------------------ */
  function initStaggerContainers() {
    $$('[data-mo-stagger]').forEach(parent => {
      const children = [...parent.children];
      children.forEach((child, i) => {
        child.style.transitionDelay = (i * 90) + 'ms';
      });
    });
  }

  /* ------------------------------------------------------------------
     5. TEXT SCROLL REVEAL (grey → white)
     Elements with .mo-text-reveal get their words wrapped in spans,
     words progressively light up as you scroll through them.
  ------------------------------------------------------------------ */
  function initTextReveal() {
    const els = $$('.mo-text-reveal');
    if (!els.length) return;
    if (reduce) {
      els.forEach(el => {
        el.style.color = '#fff';
      });
      return;
    }

    els.forEach(el => {
      // Wrap each word in a span if not already done
      if (!el.querySelector('.mo-word')) {
        const text = el.textContent.trim();
        el.innerHTML = text.split(/\s+/).map(w =>
          `<span class="mo-word">${w}</span>`
        ).join(' ');
      }
    });

    const words = $$('.mo-text-reveal .mo-word');
    if (!words.length) return;

    function updateTextReveal() {
      const vh = innerHeight;
      words.forEach(word => {
        const rect = word.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        // Word lights up when it's in the top 75% of viewport
        const progress = 1 - Math.max(0, Math.min(1, (center - vh * .2) / (vh * .55)));
        if (progress > .5) {
          word.classList.add('lit');
        } else {
          word.classList.remove('lit');
        }
      });
    }

    addEventListener('scroll', updateTextReveal, { passive: true });
    updateTextReveal();
  }

  /* ------------------------------------------------------------------
     6. NAVBAR SCROLL BEHAVIOR
     - Add .scrolled class when scrolled past 60px
     - Hide on scroll down, show on scroll up
  ------------------------------------------------------------------ */
  function initNavbarScroll() {
    // Only works on product/inner pages where we might want a sticky nav
    // The home page has its own hero-bound nav, so we check
    const nav = $('.mo-navbar-wrap');
    if (!nav) return;

    let lastY = 0;
    let ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = scrollY;
        nav.classList.toggle('scrolled', y > 60);
        if (y > 300) {
          nav.classList.toggle('hidden', y > lastY && y - lastY > 4);
        } else {
          nav.classList.remove('hidden');
        }
        lastY = y;
        ticking = false;
      });
    }

    addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------
     7. FOOTER COLUMNS - auto-stagger
  ------------------------------------------------------------------ */
  function initFooterReveal() {
    const cols = $$('.footer-grid > div');
    if (!cols.length) return;
    cols.forEach((col, i) => {
      col.classList.add('mo-footer-col');
      col.style.transitionDelay = (i * 80) + 'ms';
    });
    // Re-observe after adding classes
    if (reduce || !('IntersectionObserver' in window)) {
      cols.forEach(c => c.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -4% 0px' });
    cols.forEach(c => io.observe(c));
  }

  /* ------------------------------------------------------------------
     8. BRAND STRIP LOGOS - auto-stagger
  ------------------------------------------------------------------ */
  function initBrandReveal() {
    const logos = $$('.brand-strip img');
    if (!logos.length) return;
    logos.forEach((img, i) => {
      img.classList.add('mo-brand-logo');
      img.style.transitionDelay = (200 + i * 120) + 'ms';
    });
  }

  /* ------------------------------------------------------------------
     9. DASHBOARD POINTS - auto-stagger
  ------------------------------------------------------------------ */
  function initDashboardPoints() {
    const points = $$('.dashboard-point');
    if (!points.length) return;
    points.forEach((pt, i) => {
      pt.classList.add('mo-dash-point');
      pt.style.transitionDelay = (i * 100) + 'ms';
    });
  }

  /* ------------------------------------------------------------------
     10. FORM INPUTS - add mo-input class
  ------------------------------------------------------------------ */
  function initFormInputs() {
    $$('.unified-cta-form input, .contact-card input, .contact-card textarea, .contact-card select, .contact-form input, .contact-form textarea').forEach(input => {
      input.classList.add('mo-input');
    });
  }

  /* ------------------------------------------------------------------
     11. FEATURE NOTES - add hover class
  ------------------------------------------------------------------ */
  function initFeatureNotes() {
    $$('.feature-note').forEach(note => {
      note.classList.add('mo-note');
    });
  }

  /* ------------------------------------------------------------------
     12. CTA BAND - special reveal
  ------------------------------------------------------------------ */
  function initCtaBand() {
    $$('.cta-band').forEach(band => {
      if (!band.classList.contains('mo-cta-band')) {
        band.classList.add('mo-cta-band');
      }
    });
  }

  /* ------------------------------------------------------------------
     12b. ENTRANCE FOR EVERY ELEMENT (opt-in: <body data-mo-entrance="all">)
     Gives each remaining block an entrance animation, staggered per group.
  ------------------------------------------------------------------ */
  function initEntranceAll() {
    if (document.body.dataset.moEntrance !== 'all') return;

    // 1. Feature Story Heads: kicker, h3, p staggered
    $$('.feature-story-head').forEach(head => {
      [...head.children].forEach((child, i) => {
        child.classList.add('mo-reveal');
        child.style.transitionDelay = (i * 100) + 'ms';
      });
    });

    // 2. Brand Strip: eyebrow text & logos
    $$('.brand-strip .inner > p').forEach(p => {
      p.classList.add('mo-reveal');
      p.style.transitionDelay = '60ms';
    });
    $$('.brand-strip img').forEach((img, i) => {
      img.classList.add('mo-brand-logo');
      img.style.transitionDelay = (140 + i * 120) + 'ms';
    });

    // 3. CTA Band: icon, title, subtitle, each input, and each button
    const ctaContainer = $('.cta-band .container');
    if (ctaContainer) {
      const icon = ctaContainer.querySelector('.band-icon');
      const title = ctaContainer.querySelector('h3');
      const subtitle = ctaContainer.querySelector('p');
      if (icon) { icon.classList.add('mo-reveal'); icon.style.transitionDelay = '60ms'; }
      if (title) { title.classList.add('mo-reveal'); title.style.transitionDelay = '140ms'; }
      if (subtitle) { subtitle.classList.add('mo-reveal'); subtitle.style.transitionDelay = '220ms'; }

      ctaContainer.querySelectorAll('.form-row-inputs input').forEach((inp, i) => {
        inp.classList.add('mo-reveal');
        inp.style.transitionDelay = (280 + i * 80) + 'ms';
      });

      ctaContainer.querySelectorAll('.form-row-buttons button, .form-row-buttons .btn-demo, .form-row-buttons .btn-start').forEach((btn, i) => {
        btn.classList.add('mo-reveal');
        btn.style.transitionDelay = (480 + i * 90) + 'ms';
      });
    }

    // 4. Footer bottom items
    $$('.footer-bottom > *').forEach((item, i) => {
      item.classList.add('mo-reveal');
      item.style.transitionDelay = (100 + i * 120) + 'ms';
    });
  }

  /* ------------------------------------------------------------------
     13. BUTTONS & CARDS AUTO-INTERACTIONS
  ------------------------------------------------------------------ */
  function initButtons() {
    $$('button, a.cta, .btn-contact, .btn-demo, .btn-start, .btn-read-more, .filter-btn, .btn-describe-project, .btn-expand-modal').forEach(btn => {
      if (!btn.classList.contains('mo-btn') && !btn.classList.contains('mobile-toggle')) {
        btn.classList.add('mo-btn');
      }
    });
  }

  function initCards() {
    $$('.app-card, .process-item, .contact-card, .why-card, .cta-dashed-box, .feature-card').forEach(card => {
      if (!card.classList.contains('mo-card')) {
        card.classList.add('mo-card');
      }
    });
  }

  /* ------------------------------------------------------------------
     14. HERO ENTRANCE GUARANTEE
  ------------------------------------------------------------------ */
  function initHeroEntrance() {
    setTimeout(() => {
      $$('.mo-hero-logo, .mo-hero-title, .mo-hero-sub, .mo-hero-img').forEach(el => {
        el.classList.add('in');
        settleReveal(el);
      });
    }, 60);
  }

  /* ------------------------------------------------------------------
     15. LENIS SMOOTH SCROLLING
  ------------------------------------------------------------------ */
  function initLenis() {
    if (typeof window.Lenis === 'undefined') return;
    if (reduce) return;

    const lenis = new window.Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
      infinite: false,
    });

    window.lenis = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Synchronize window scroll events with Lenis
    lenis.on('scroll', () => {
      window.dispatchEvent(new Event('scroll'));
    });

    // Smooth scroll for anchor links
    $$('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const id = anchor.getAttribute('href');
        if (id && id !== '#' && id.length > 1) {
          const target = document.querySelector(id);
          if (target) {
            e.preventDefault();
            lenis.scrollTo(target, { offset: -30, duration: 1.2 });
          }
        }
      });
    });

    // Handle initial hash on page load (e.g. from about.html -> services.html#contact-form)
    function scrollToHash() {
      if (window.location.hash) {
        const hash = window.location.hash;
        const target = document.querySelector(hash) || document.getElementById(hash.replace('#', ''));
        if (target) {
          setTimeout(() => {
            lenis.scrollTo(target, { offset: -30, duration: 1.0, immediate: false });
          }, 350);
          setTimeout(() => {
            lenis.scrollTo(target, { offset: -30, duration: 0.6, immediate: false });
          }, 950);
        }
      }
    }
    scrollToHash();
    window.addEventListener('load', scrollToHash);
    window.addEventListener('hashchange', scrollToHash);
  }

  /* ------------------------------------------------------------------
     16. PRELOADER (Luxury Brand Intro - No Dashes, Dividers, or AI Artifacts)
  ------------------------------------------------------------------ */
  function initPreloader() {
    let preloader = document.querySelector('.limons-preloader');
    if (!preloader) {
      preloader = document.createElement('div');
      preloader.className = 'limons-preloader';
      preloader.setAttribute('role', 'status');
      preloader.setAttribute('aria-label', 'Loading');
      preloader.innerHTML = `
        <div class="preloader-ambient-glow" aria-hidden="true"></div>
        <div class="preloader-center">
          <div class="preloader-brand-title">LIMONS</div>
          <div class="preloader-bar-wrap">
            <div class="preloader-bar-fill" id="preloaderBar"></div>
          </div>
          <div class="preloader-count" id="preloaderCount">0%</div>
        </div>
      `;
      document.body.prepend(preloader);
    }

    const bar = preloader.querySelector('#preloaderBar');
    const count = preloader.querySelector('#preloaderCount');
    let progress = 0;
    let isDone = false;

    const timer = setInterval(() => {
      if (isDone) return;
      if (progress < 90) {
        progress += Math.floor(Math.random() * 8 + 4);
        if (progress > 90) progress = 90;
        if (bar) bar.style.width = progress + '%';
        if (count) count.textContent = progress + '%';
      }
    }, 40);

    function dismissPreloader() {
      if (isDone) return;
      isDone = true;
      clearInterval(timer);
      if (bar) bar.style.width = '100%';
      if (count) count.textContent = '100%';

      setTimeout(() => {
        preloader.classList.add('is-loaded');
        if (window.location.hash) {
          const hashEl = document.querySelector(window.location.hash) || document.getElementById(window.location.hash.replace('#', ''));
          if (hashEl) {
            setTimeout(() => {
              if (window.lenis) {
                window.lenis.scrollTo(hashEl, { offset: -30, duration: 0.9, immediate: false });
              } else {
                hashEl.scrollIntoView({ behavior: 'smooth' });
              }
            }, 100);
          }
        }
        setTimeout(() => {
          preloader.remove();
        }, 800);
      }, 240);
    }

    if (document.readyState === 'complete') {
      setTimeout(dismissPreloader, 400);
    } else {
      window.addEventListener('load', () => setTimeout(dismissPreloader, 300));
      setTimeout(dismissPreloader, 1400); // Fail-safe
    }
  }

  /* ------------------------------------------------------------------
     17. INIT EVERYTHING
  ------------------------------------------------------------------ */
  function init() {
    initLenis();
    initPreloader();
    initProgressBar();
    initPageTransitions();
    initHeroEntrance();
    initStaggerContainers();
    initTextReveal();
    initNavbarScroll();
    initBrandReveal();
    initDashboardPoints();
    initFormInputs();
    initFeatureNotes();
    initCtaBand();
    initEntranceAll();
    initButtons();
    initCards();
    initFooterReveal();
    initGitHubModal();

    // Scroll reveals must run AFTER all dynamic classes are added
    requestAnimationFrame(() => {
      initScrollReveals();
    });
  }

  /* ------------------------------------------------------------------
     18. GITHUB MODAL HOVER & CLICK SUPPORT
  ------------------------------------------------------------------ */
  function initGitHubModal() {
    const hovers = document.querySelectorAll('.gh-hover');
    hovers.forEach(container => {
      const trigger = container.querySelector('.gh-trigger');
      const modal = container.querySelector('.gh-modal');
      if (!trigger || !modal) return;

      let closeTimer = null;

      const openModal = () => {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
        container.classList.add('is-open');
      };

      const closeModal = () => {
        closeTimer = setTimeout(() => {
          container.classList.remove('is-open');
        }, 180);
      };

      container.addEventListener('mouseenter', openModal);
      container.addEventListener('mouseleave', closeModal);
      trigger.addEventListener('focus', openModal);
      trigger.addEventListener('blur', (e) => {
        if (!modal.contains(e.relatedTarget)) closeModal();
      });
      modal.addEventListener('focusin', openModal);
      modal.addEventListener('focusout', (e) => {
        if (!container.contains(e.relatedTarget)) closeModal();
      });

      // Mobile/touch support: tap icon opens modal first
      trigger.addEventListener('click', (e) => {
        if (window.matchMedia('(hover: none)').matches) {
          if (!container.classList.contains('is-open')) {
            e.preventDefault();
            openModal();
          }
        }
      });
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
