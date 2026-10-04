/* ==================================================================
   LIMONS — GLOBAL MOTION CONTROLLER
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
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          settleReveal(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -8% 0px'
    });
    els.forEach(el => io.observe(el));
  }

  /* ------------------------------------------------------------------
     4. STAGGER CHILDREN — auto-assign stagger delays
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
     7. FOOTER COLUMNS — auto-stagger
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
     8. BRAND STRIP LOGOS — auto-stagger
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
     9. DASHBOARD POINTS — auto-stagger
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
     10. FORM INPUTS — add mo-input class
  ------------------------------------------------------------------ */
  function initFormInputs() {
    $$('.unified-cta-form input, .contact-card input, .contact-card textarea, .contact-card select, .contact-form input, .contact-form textarea').forEach(input => {
      input.classList.add('mo-input');
    });
  }

  /* ------------------------------------------------------------------
     11. FEATURE NOTES — add hover class
  ------------------------------------------------------------------ */
  function initFeatureNotes() {
    $$('.feature-note').forEach(note => {
      note.classList.add('mo-note');
    });
  }

  /* ------------------------------------------------------------------
     12. CTA BAND — special reveal
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
    requestAnimationFrame(() => {
      $$('.mo-hero-logo, .mo-hero-title, .mo-hero-sub, .mo-hero-img').forEach(el => {
        el.classList.add('in');
      });
    });
  }

  /* ------------------------------------------------------------------
     15. INIT EVERYTHING
  ------------------------------------------------------------------ */
  function init() {
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

    // Scroll reveals must run AFTER all dynamic classes are added
    requestAnimationFrame(() => {
      initScrollReveals();
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
