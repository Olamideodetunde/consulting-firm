/**
 * THEWHY CONSULTING - Core Frontend Client Script
 * Handles navigation, drawer, animations, interactive tools, tabs, and form submissions.
 * Loaded as the last script on every public page.
 */

// 0. SHARED HELPERS (exposed early for inline page scripts)
window.WHY = window.WHY || {};

window.WHY.escapeHtml = function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[ch]);
};

/**
 * Returns a safe URL for href/src use, or '' when the scheme is not allowed.
 * Allowed: http(s), mailto (when allowMailto), and relative URLs.
 */
window.WHY.safeUrl = function safeUrl(raw, allowMailto) {
  if (raw === null || raw === undefined) return '';
  const url = String(raw).replace(/[\u0000- \u007f]/g, '');
  if (!url) return '';
  const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!scheme) return url; // relative (/path, #hash, ./x, ../x, path)
  const s = scheme[1].toLowerCase();
  if (s === 'http' || s === 'https') return url;
  if (s === 'mailto' && allowMailto) return url;
  return '';
};

window.WHY.prefersReducedMotion = function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
};

// 0B. PRELOADER: shown at most once per session, dismissed on DOMContentLoaded (max ~600ms)
(function initPagePreloader() {
  const KEY = 'why_preloader_seen';
  let seen = false;
  try {
    seen = window.sessionStorage.getItem(KEY) === '1';
    window.sessionStorage.setItem(KEY, '1');
  } catch (e) {
    seen = false;
  }

  const removeNode = (el) => {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  };

  const preloader = document.getElementById('pagePreloader');
  if (!preloader) return;

  if (seen || window.WHY.prefersReducedMotion()) {
    preloader.dataset.dismissed = 'true';
    document.documentElement.classList.add('why-preloader-seen');
    removeNode(preloader);
    return;
  }

  const dismiss = () => {
    if (preloader.dataset.whyGone === 'true') return;
    preloader.dataset.whyGone = 'true';
    preloader.dataset.dismissed = 'true';
    preloader.classList.add('done', 'loaded');
    preloader.style.pointerEvents = 'none';
    setTimeout(() => removeNode(preloader), 450);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dismiss, { once: true });
  } else {
    dismiss();
  }
  setTimeout(dismiss, 600);
})();

document.addEventListener('DOMContentLoaded', () => {
  const esc = window.WHY.escapeHtml;
  const safeUrl = window.WHY.safeUrl;
  const reducedMotion = window.WHY.prefersReducedMotion();

  // 1. DYNAMIC YEAR
  const currentYear = String(new Date().getFullYear());
  document.querySelectorAll('#year, .dynamic-year, [data-year]').forEach((el) => {
    el.textContent = currentYear;
  });

  // 2. NAV SCROLL EFFECT
  const siteNav = document.getElementById('siteNav');
  if (siteNav) {
    const handleScroll = () => {
      siteNav.classList.toggle('scrolled', window.scrollY > 35);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // 3. MOBILE DRAWER NAVIGATION (accessible: inert when closed, focus trap, Escape)
  const menuBtn = document.getElementById('menuBtn');
  const drawer = document.getElementById('drawer');
  const drawerClose = document.getElementById('drawerClose');
  const drawerOverlay = document.getElementById('drawerOverlay');

  if (drawer) {
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    let isOpen = false;

    if (!drawer.hasAttribute('role')) drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    if (!drawer.hasAttribute('aria-label') && !drawer.hasAttribute('aria-labelledby')) {
      drawer.setAttribute('aria-label', 'Site navigation');
    }
    if (drawerOverlay) drawerOverlay.setAttribute('aria-hidden', 'true');
    if (menuBtn) {
      menuBtn.setAttribute('aria-controls', 'drawer');
      menuBtn.setAttribute('aria-expanded', 'false');
    }

    const setClosedAttrs = () => {
      drawer.inert = true;
      drawer.setAttribute('inert', '');
      drawer.setAttribute('aria-hidden', 'true');
    };

    const getFocusable = () => Array.from(drawer.querySelectorAll(FOCUSABLE))
      .filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);

    const onKeydown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        closeDrawer();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };

    const openDrawer = () => {
      if (isOpen) return;
      isOpen = true;
      drawer.inert = false;
      drawer.removeAttribute('inert');
      drawer.removeAttribute('aria-hidden');
      drawer.classList.add('open');
      if (drawerOverlay) drawerOverlay.classList.add('open');
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('drawer-open');
      document.body.classList.add('drawer-open');
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', onKeydown);
      const target = drawerClose || getFocusable()[0];
      // focus() forces a style recalc, so the now-visible close button can take focus
      if (target) target.focus();
    };

    function closeDrawer(options) {
      if (!isOpen) return;
      isOpen = false;
      drawer.classList.remove('open');
      if (drawerOverlay) drawerOverlay.classList.remove('open');
      setClosedAttrs();
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('drawer-open');
      document.body.classList.remove('drawer-open');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeydown);
      if (menuBtn && !(options && options.skipFocus)) menuBtn.focus();
    }

    // Initialise the closed state on load
    setClosedAttrs();

    if (menuBtn) menuBtn.addEventListener('click', openDrawer);
    if (drawerClose) drawerClose.addEventListener('click', () => closeDrawer());
    if (drawerOverlay) drawerOverlay.addEventListener('click', () => closeDrawer());
    drawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => closeDrawer({ skipFocus: true }));
    });

    // Close if the viewport grows to the desktop nav layout while open
    if (window.matchMedia) {
      const desktopMq = window.matchMedia('(min-width: 993px)');
      const onMqChange = (e) => { if (e.matches) closeDrawer({ skipFocus: true }); };
      if (desktopMq.addEventListener) desktopMq.addEventListener('change', onMqChange);
      else if (desktopMq.addListener) desktopMq.addListener(onMqChange);
    }
  }

  // 3B. FLOATING WHATSAPP BUTTON (injected once per page)
  if (!document.querySelector('.wa-float, #waFloat, [data-wa-float]')) {
    const waText = encodeURIComponent("Hello THEWHY Consulting, I'd like to discuss an advisory engagement.");
    const wa = document.createElement('a');
    wa.className = 'wa-float';
    wa.id = 'waFloat';
    wa.href = `https://wa.me/2348034992318?text=${waText}`;
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.setAttribute('aria-label', 'Chat with THEWHY Consulting on WhatsApp');
    wa.innerHTML = '<i class="fa-brands fa-whatsapp" aria-hidden="true"></i>';
    document.body.appendChild(wa);
  }

  // 4. REVEAL ANIMATIONS ON SCROLL
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealElements.forEach((el) => el.classList.add('show'));
  } else if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });

    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    revealElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // Above-the-fold (or already scrolled past) content is shown immediately
      if (rect.top < viewportH) {
        el.classList.add('show');
      } else {
        revealObserver.observe(el);
      }
    });
  }

  // 4C. SCROLL TO TOP BUTTON
  const scrollTopBtn = document.getElementById('scrollTop');
  if (scrollTopBtn) {
    const toggleScrollTop = () => {
      scrollTopBtn.classList.toggle('visible', window.scrollY > 380);
    };
    window.addEventListener('scroll', toggleScrollTop, { passive: true });
    toggleScrollTop();

    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }

  // 4D. ANIMATED STATS / COUNTERS
  const counterElements = document.querySelectorAll('.counter-number[data-target]');
  if (counterElements.length > 0) {
    const finalText = (el) => {
      const target = parseInt(el.getAttribute('data-target'), 10) || 0;
      const suffix = el.getAttribute('data-suffix') || '';
      return target.toLocaleString() + suffix;
    };
    const setFinal = (el) => {
      const span = el.querySelector('span') || el;
      span.textContent = finalText(el);
    };

    const animateCounter = (el) => {
      const target = parseInt(el.getAttribute('data-target'), 10) || 0;
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 1400;
      const startTime = performance.now();
      const span = el.querySelector('span') || el;

      const updateCount = (currentTime) => {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const easeOut = 1 - (1 - progress) * (1 - progress);
        span.textContent = Math.floor(easeOut * target).toLocaleString() + suffix;
        if (progress < 1) {
          requestAnimationFrame(updateCount);
        } else {
          span.textContent = target.toLocaleString() + suffix;
        }
      };
      requestAnimationFrame(updateCount);
    };

    if (reducedMotion || !('IntersectionObserver' in window)) {
      counterElements.forEach(setFinal);
    } else {
      const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2 });
      counterElements.forEach((el) => counterObserver.observe(el));
    }
  }

  // 4E. SKILL / PROGRESS BARS FILL ANIMATION
  const skillBars = document.querySelectorAll('.skill-bar-fill');
  if (skillBars.length > 0) {
    if (reducedMotion || !('IntersectionObserver' in window)) {
      skillBars.forEach((bar) => bar.classList.add('animated'));
    } else {
      const skillObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animated');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2 });
      skillBars.forEach((bar) => skillObserver.observe(bar));
    }
  }

  // 5. HERO BOARD / CALCULATOR ANIMATION & TILT
  const screenNumber = document.getElementById('screenNumber');
  if (screenNumber && !reducedMotion) {
    const displayValues = ['83,720', '41,250', '96,440', '72,300', '88,915'];
    let valIndex = 0;
    setInterval(() => {
      valIndex = (valIndex + 1) % displayValues.length;
      screenNumber.style.opacity = '0.2';
      setTimeout(() => {
        screenNumber.textContent = displayValues[valIndex];
        screenNumber.style.opacity = '1';
      }, 150);
    }, 2800);
  }

  const heroBoard = document.querySelector('.hero-board, .art-board');
  if (heroBoard && !reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5);
      const y = (e.clientY / window.innerHeight - 0.5);
      heroBoard.style.transform = `rotate(5deg) translate(${x * 8}px, ${y * 8}px)`;
    }, { passive: true });
  }

  // 6. TAB SWITCHING (SERVICES PAGE)
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  if (tabButtons.length > 0 && tabPanels.length > 0) {
    const activateTab = (targetTabId) => {
      tabButtons.forEach((btn) => {
        const isActive = btn.getAttribute('data-tab') === targetTabId;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      tabPanels.forEach((panel) => {
        const isActive = panel.id === `tab-${targetTabId}` || panel.id === targetTabId;
        panel.classList.toggle('active', isActive);
      });
    };

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        activateTab(targetTab);
        history.replaceState(null, '', `#tab-${targetTab}`);
      });
    });

    if (window.location.hash) {
      const hash = window.location.hash.replace('#tab-', '').replace('#', '');
      const matchingBtn = Array.from(tabButtons).find((b) => b.getAttribute('data-tab') === hash);
      if (matchingBtn) activateTab(hash);
    }
  }

  // 7. FAQ ACCORDION
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const toggle = item.querySelector('.faq-toggle');
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', item.classList.contains('open') ? 'true' : 'false');
    toggle.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      faqItems.forEach((i) => {
        i.classList.remove('open');
        const t = i.querySelector('.faq-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // 7b. PRACTICE JUMP BAR SCROLL SPY & AUTO-SCROLL
  const practiceJumpBar = document.querySelector('.practice-jump-bar');
  if (practiceJumpBar) {
    const pills = practiceJumpBar.querySelectorAll('.practice-pill');
    const scrollContainer = practiceJumpBar.querySelector('.practice-pills-scroll');
    const sections = Array.from(pills).map((pill) => {
      const href = pill.getAttribute('href') || '';
      const id = href.charAt(0) === '#' ? href.slice(1) : '';
      return id ? document.getElementById(id) : null;
    });

    const updateActivePill = () => {
      const scrollPos = window.scrollY + 170;
      let activeIndex = -1;
      sections.forEach((sec, idx) => {
        if (sec && sec.offsetTop <= scrollPos) activeIndex = idx;
      });

      pills.forEach((pill, idx) => {
        if (idx === activeIndex) {
          if (!pill.classList.contains('active')) {
            pill.classList.add('active');
            pill.setAttribute('aria-current', 'true');
            if (scrollContainer) {
              scrollContainer.scrollTo({
                left: pill.offsetLeft - scrollContainer.offsetWidth / 2 + pill.offsetWidth / 2,
                behavior: reducedMotion ? 'auto' : 'smooth'
              });
            }
          }
        } else {
          pill.classList.remove('active');
          pill.removeAttribute('aria-current');
        }
      });
    };

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateActivePill();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
    updateActivePill();
  }

  // 8. INTERACTIVE FEE CALCULATOR (prices come from the DOM: data-cost / label text)
  const calcForm = document.getElementById('calcForm');
  const calcResult = document.getElementById('calcResult');

  if (calcForm && calcResult) {
    const parseNaira = (text) => {
      if (!text) return NaN;
      const m = String(text).match(/₦\s*([\d,]+)/) || String(text).match(/([\d][\d,]*)/);
      return m ? parseInt(m[1].replace(/,/g, ''), 10) : NaN;
    };

    const readSize = () => {
      const radio = calcForm.querySelector('input[name="companySize"]:checked');
      const select = calcForm.querySelector('select[name="companySize"]');
      let source = radio;
      if (!source && select) source = select.options[select.selectedIndex] || null;
      if (!source) return { fee: 0, name: '' };

      const label = radio ? radio.closest('label') : null;
      let fee = parseInt((source.getAttribute('data-cost') || '').replace(/[^\d]/g, ''), 10);
      if (isNaN(fee) && label) {
        const feeText = Array.from(label.querySelectorAll('span, small, em'))
          .map((n) => n.textContent)
          .find((t) => /₦/.test(t));
        fee = parseNaira(feeText || label.textContent);
      }
      if (isNaN(fee)) fee = 0;

      let name = source.getAttribute('data-label') || '';
      if (!name && label) {
        const strong = label.querySelector('strong');
        name = strong ? strong.textContent.trim() : '';
      }
      if (!name) name = radio ? radio.value : source.textContent.trim();
      return { fee, name };
    };

    const readAddons = () => Array.from(calcForm.querySelectorAll('input[name="addons"]:checked')).map((box) => {
      const label = box.closest('label');
      let cost = parseInt((box.getAttribute('data-cost') || '').replace(/[^\d]/g, ''), 10);
      if (isNaN(cost)) cost = 0;
      let name = box.getAttribute('data-label') || '';
      if (!name && label) {
        const textEl = label.querySelector('span');
        name = textEl ? textEl.textContent.trim() : '';
      }
      if (!name) name = box.value;
      return { name, cost };
    });

    // Highlight the chosen option (inline border styles in the markup are static)
    const syncSelectedStyles = () => {
      calcForm.querySelectorAll('input[name="companySize"], input[name="addons"]').forEach((input) => {
        const label = input.closest('label');
        if (!label) return;
        label.classList.add('calc-option');
        label.classList.toggle('is-selected', input.checked);
      });
    };
    calcForm.addEventListener('change', syncSelectedStyles);
    syncSelectedStyles();

    calcForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const size = readSize();
      const addons = readAddons();
      const addonsTotal = addons.reduce((sum, a) => sum + a.cost, 0);
      const totalMonthly = size.fee + addonsTotal;
      const fmt = (n) => '₦' + n.toLocaleString();

      let addonsHtml = '';
      if (addons.length > 0) {
        addonsHtml = `
          <div class="calc-result-addons">
            <div class="calc-result-sublabel">Included Add-ons:</div>
            ${addons.map((a) => `
              <div class="calc-result-line">
                <span>&bull; ${esc(a.name)}</span>
                <span class="calc-result-amount">+${esc(fmt(a.cost))}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      const bookingHref = `/booking?estimatedFee=${encodeURIComponent(fmt(totalMonthly))}&scale=${encodeURIComponent(size.name)}`;

      calcResult.innerHTML = `
        <div class="calc-result-card" role="status" aria-live="polite">
          <div class="calc-result-kicker">Estimated Advisory Retainer</div>
          <div class="calc-result-total">
            ${esc(fmt(totalMonthly))} <span>/ month</span>
          </div>
          <div class="calc-result-profile">
            Enterprise Profile: <strong>${esc(size.name)}</strong>
          </div>
          ${addonsHtml}
          <div class="calc-result-foot">
            <div class="calc-result-note">
              Includes dedicated lead consultant, monthly ledger governance, statutory compliance schedules, and board advisory sessions.
            </div>
            <a href="${esc(bookingHref)}" class="btn btn-primary calc-result-cta">
              Book Advisory with this Estimate &rarr;
            </a>
          </div>
        </div>
      `;

      // On stacked (mobile/tablet) layouts, bring the result into view
      const rect = calcResult.getBoundingClientRect();
      if (rect.top > window.innerHeight * 0.8 || rect.bottom < 0) {
        calcResult.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });
  }

  // 9. BOOKING FORM SUBMISSION
  const bookingForm = document.getElementById('bookingForm');
  const bookingMsg = document.getElementById('bookingMsg');

  if (bookingForm) {
    const urlParams = new URLSearchParams(window.location.search);
    const feeParam = urlParams.get('estimatedFee');
    if (feeParam) {
      const feeInput = bookingForm.querySelector('input[name="estimatedFee"]');
      if (feeInput) feeInput.value = feeParam.slice(0, 80);
      // Show the carried-over calculator estimate so the client knows it was attached.
      const note = document.createElement('div');
      note.className = 'form-alert info';
      note.setAttribute('role', 'status');
      note.innerHTML = `<i class="fa-solid fa-calculator" aria-hidden="true"></i> Your calculator estimate of <strong>${esc(feeParam.slice(0, 80))}</strong> per month will be attached to this request.`;
      bookingForm.prepend(note);
    }

    // Preselect a <select> option from a URL hint, matching value or label text.
    const preselect = (selectName, matcher) => {
      const select = bookingForm.querySelector(`select[name="${selectName}"]`);
      if (!select) return;
      const option = [...select.options].find((o) => o.value && matcher(`${o.value} ${o.text}`.toLowerCase()));
      if (option) select.value = option.value;
    };

    const SERVICE_HINTS = {
      taxcompliance: 'accounting & tax',
      accounting: 'accounting & tax',
      corporatefinance: 'corporate finance',
      turnaround: 'corporate finance',
      bankcharges: 'bank charges',
      assetverification: 'fixed asset',
      strategy: 'strategy',
      training: 'hr training',
      hr: 'hr training',
      pencom: 'pencom'
    };
    const serviceParam = (urlParams.get('service') || '').toLowerCase().replace(/[^a-z]/g, '');
    if (serviceParam) {
      const hint = SERVICE_HINTS[serviceParam] || serviceParam;
      preselect('service', (text) => text.replace(/[^a-z& ]/g, '').includes(hint) || text.replace(/[^a-z]/g, '').includes(serviceParam));
    }

    // Map the calculator's enterprise scale (e.g. "Growing SME (10–100 Employees)") to company size.
    const scaleParam = (urlParams.get('scale') || '').toLowerCase();
    if (scaleParam) {
      const sizeKey = /500\+|conglomerate|group|large/.test(scaleParam) ? 'large'
        : /mid/.test(scaleParam) ? 'mid-market'
          : /micro|startup|1.10\b/.test(scaleParam) ? 'micro'
            : /sme|small|10.100/.test(scaleParam) ? 'sme' : '';
      if (sizeKey) preselect('companySize', (text) => text.includes(sizeKey));
    }

    const dateInput = bookingForm.querySelector('input[type="date"][name="date"]');
    if (dateInput && !dateInput.min) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      dateInput.min = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }

    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.innerHTML : 'Submit';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Processing...';
      }
      if (bookingMsg) {
        bookingMsg.style.display = 'none';
        bookingMsg.className = 'form-alert';
        bookingMsg.setAttribute('role', 'status');
        bookingMsg.setAttribute('aria-live', 'polite');
      }

      const payload = Object.fromEntries(new FormData(bookingForm).entries());

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        let data = {};
        try { data = await res.json(); } catch (parseErr) { data = {}; }

        if (res.ok && data.success) {
          bookingForm.reset();
          if (bookingMsg) {
            const rec = data.data || {};
            const ref = rec.ref_code || rec.id || 'CONFIRMED';
            const calLink = rec.id
              ? `<div class="form-alert-actions"><a href="/api/bookings/${encodeURIComponent(rec.id)}/calendar.ics" class="btn btn-ghost btn-sm"><i class="fa-regular fa-calendar-plus" aria-hidden="true"></i> Add to Calendar (.ics)</a></div>`
              : '';
            bookingMsg.className = 'form-alert success';
            bookingMsg.style.display = 'block';
            bookingMsg.innerHTML = `
              <strong><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Consultation Requested!</strong><br>
              Reference Code: <strong>${esc(ref)}</strong><br>
              A partner from our Lagos headquarters will review your submission and contact you within 24 hours.
              ${calLink}
            `;
            bookingMsg.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
          }
        } else {
          throw new Error(data.error || 'Failed to submit consultation request.');
        }
      } catch (err) {
        if (bookingMsg) {
          bookingMsg.className = 'form-alert error';
          bookingMsg.style.display = 'block';
          bookingMsg.innerHTML = `<strong>Error:</strong> ${esc((err && err.message) || 'Network error. Please try again or reach us directly at +234-8034-99-23-18.')}`;
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
        }
      }
    });
  }

  // 10. CONTACT FORM SUBMISSION
  const contactForm = document.getElementById('contactForm');
  const contactMsg = document.getElementById('contactMsg');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.innerHTML : 'Send Message';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Sending...';
      }
      if (contactMsg) {
        contactMsg.style.display = 'none';
        contactMsg.className = 'form-alert';
        contactMsg.setAttribute('role', 'status');
        contactMsg.setAttribute('aria-live', 'polite');
      }

      const payload = Object.fromEntries(new FormData(contactForm).entries());

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        let data = {};
        try { data = await res.json(); } catch (parseErr) { data = {}; }

        if (res.ok && data.success) {
          contactForm.reset();
          if (contactMsg) {
            contactMsg.className = 'form-alert success';
            contactMsg.style.display = 'block';
            contactMsg.innerHTML = `
              <strong><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Message Sent!</strong><br>
              Reference: <strong>${esc(data.ref_code || (data.data && data.data.ref_code) || 'RECEIVED')}</strong>. Our team will respond shortly.
            `;
          }
        } else {
          throw new Error(data.error || 'Failed to submit your message.');
        }
      } catch (err) {
        if (contactMsg) {
          contactMsg.className = 'form-alert error';
          contactMsg.style.display = 'block';
          contactMsg.innerHTML = `<strong>Error:</strong> ${esc((err && err.message) || 'Unable to deliver message right now. Call us at +234-8034-99-23-18.')}`;
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
        }
      }
    });
  }

  // 9b. CONTACT FORM SUBJECT PREFILL (/contact?subject=...)
  const contactSubjectInput = document.querySelector('#contactForm input[name="subject"]');
  if (contactSubjectInput && !contactSubjectInput.value) {
    const subjectParam = new URLSearchParams(window.location.search).get('subject');
    if (subjectParam) contactSubjectInput.value = subjectParam.replace(/\s+/g, ' ').trim().slice(0, 160);
  }

  // 10a. IMAGE FALLBACKS & ARTICLE SHARE (replaces inline onerror/onclick handlers)
  // Image errors don't bubble, so listen in the capture phase: this also covers
  // cards rendered later from the API. Each image falls back at most once.
  const applyImgFallback = (img) => {
    if (!img.dataset.fallback || img.dataset.fellBack) return;
    img.dataset.fellBack = '1';
    img.src = img.dataset.fallback;
  };
  document.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'IMG') applyImgFallback(e.target);
  }, true);
  document.querySelectorAll('img[data-fallback]').forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) applyImgFallback(img);
  });

  const articleShareBtn = document.getElementById('articleShareBtn');
  if (articleShareBtn) {
    articleShareBtn.addEventListener('click', async () => {
      const url = window.location.href;
      try {
        if (navigator.share) {
          await navigator.share({ title: document.title, url });
          return;
        }
        await navigator.clipboard.writeText(url);
        articleShareBtn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Link copied';
        setTimeout(() => {
          articleShareBtn.innerHTML = '<i class="fa-solid fa-share-nodes" aria-hidden="true"></i> Share';
        }, 2000);
      } catch (err) { /* share cancelled or clipboard unavailable */ }
    });
  }

  // 10b. NEWSLETTER SUBSCRIPTION
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    const newsletterMsg = document.getElementById('newsletterMsg');
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = newsletterForm.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      const setMsg = (text) => { if (newsletterMsg) newsletterMsg.textContent = text; };
      try {
        const res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newsletterForm.elements.email.value,
            source: newsletterForm.dataset.source || 'website'
          })
        });
        let data = {};
        try { data = await res.json(); } catch (parseErr) { data = {}; }
        if (!res.ok || !data.success) throw new Error(data.error || 'Subscription failed. Please try again.');
        newsletterForm.reset();
        setMsg('Thank you for subscribing to THEWHY Executive Advisory Briefs.');
      } catch (err) {
        setMsg((err && err.message) || 'Subscription failed. Please try again.');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  // 11. DYNAMIC INSIGHTS & ARTICLE READER ENGINE
  const insightsListView = document.getElementById('insightsListView');
  const articleView = document.getElementById('articleView');
  const DEFAULT_COVER = '/assets/img/blog/1.jpg';
  const FALLBACK_COVER = '/assets/img/portfolio/1.jpg';

  const coverSrc = (src) => {
    if (!src) return DEFAULT_COVER;
    const str = String(src).trim();
    const normalised = /^([a-z][a-z0-9+.-]*:|\/)/i.test(str) ? str : `/${str}`;
    return safeUrl(normalised, false) || DEFAULT_COVER;
  };

  const attachImageFallback = (root) => {
    root.querySelectorAll('img[data-fallback]').forEach((img) => {
      img.addEventListener('error', function onErr() {
        img.removeEventListener('error', onErr);
        img.src = img.getAttribute('data-fallback');
      });
    });
  };

  // Inline markdown on an ALREADY-ESCAPED string
  function parseInline(escaped) {
    const codeSpans = [];
    let out = escaped.replace(/`([^`]+?)`/g, (m, code) => {
      codeSpans.push(`<code>${code}</code>`);
      return `\u0000${codeSpans.length - 1}\u0000`;
    });

    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, rawHref) => {
      const href = safeUrl(rawHref, true);
      if (!href) return text;
      const isExternal = /^https?:/i.test(href) &&
        href.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase() !== window.location.host.toLowerCase();
      const extra = isExternal ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${href}"${extra}>${text}</a>`;
    });

    out = out
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>');

    return out.replace(/\u0000(\d+)\u0000/g, (m, i) => codeSpans[Number(i)] || '');
  }

  // Simple Markdown renderer: raw text is escaped first, then transformed
  function renderMarkdown(md) {
    if (!md) return '';
    const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    let listType = null;
    let html = '';
    const closeList = () => {
      if (listType) { html += `</${listType}>`; listType = null; }
    };
    const openList = (type) => {
      if (listType !== type) { closeList(); html += `<${type}>`; listType = type; }
    };

    lines.forEach((line) => {
      const trimmed = esc(line.trim());
      if (trimmed.startsWith('### ')) {
        closeList();
        html += `<h3>${parseInline(trimmed.slice(4))}</h3>`;
      } else if (trimmed.startsWith('## ')) {
        closeList();
        html += `<h2>${parseInline(trimmed.slice(3))}</h2>`;
      } else if (trimmed.startsWith('# ')) {
        closeList();
        html += `<h2>${parseInline(trimmed.slice(2))}</h2>`;
      } else if (trimmed.startsWith('&gt; ')) {
        closeList();
        html += `<blockquote>${parseInline(trimmed.slice(5))}</blockquote>`;
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        openList('ul');
        html += `<li>${parseInline(trimmed.slice(2))}</li>`;
      } else if (/^\d+\.\s/.test(trimmed)) {
        openList('ol');
        html += `<li>${parseInline(trimmed.replace(/^\d+\.\s/, ''))}</li>`;
      } else if (trimmed === '') {
        closeList();
      } else {
        closeList();
        html += `<p>${parseInline(trimmed)}</p>`;
      }
    });

    closeList();
    return html;
  }
  window.WHY.renderMarkdown = renderMarkdown;
  // Inline-only markdown (links, bold, italic, code) for plain text; escapes first.
  window.WHY.renderInline = (text) => parseInline(esc(String(text || '')));

  const insightHref = (post) => `/insights/${encodeURIComponent(post.slug || post.id || '')}`;

  const currentPath = window.location.pathname;
  const pathParts = currentPath.split('/').filter(Boolean);
  let articleSlug = (pathParts[0] === 'insights' && pathParts.length >= 2) ? pathParts[1] : null;
  if (articleSlug) {
    try { articleSlug = decodeURIComponent(articleSlug); } catch (e) { /* keep raw */ }
  }

  if (articleSlug && articleView) {
    // SINGLE ARTICLE READING MODE
    if (insightsListView) insightsListView.style.display = 'none';
    articleView.style.display = 'block';

    fetch(`/api/insights/${encodeURIComponent(articleSlug)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Article not found');
        return res.json();
      })
      .then((result) => {
        if (!(result && result.success && result.data)) throw new Error('Article not found');
        const post = result.data;

        document.title = `${post.title || 'Insight'} | THEWHY Consulting`;
        const setText = (id, value) => {
          const el = document.getElementById(id);
          if (el) el.textContent = value;
        };
        setText('articleBreadcrumb', post.title || '');
        setText('articleTitle', post.title || '');
        setText('articleCategory', post.category || 'Advisory Insights');
        setText('articleAuthor', post.author || 'THEWHY Practice Team');
        setText('articleDate', post.created_at
          ? new Date(post.created_at).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
          : '2026 Edition');

        const words = String(post.content || '').split(/\s+/).length;
        const readMins = Math.max(2, Math.ceil(words / 180));
        const readTimeEl = document.getElementById('articleReadingTime');
        if (readTimeEl) {
          readTimeEl.innerHTML = `<i class="fa-regular fa-clock" aria-hidden="true"></i> ${readMins} min read`;
        }

        const coverEl = document.getElementById('articleCover');
        if (coverEl && post.cover_image) coverEl.src = coverSrc(post.cover_image);

        const contentEl = document.getElementById('articleContent');
        if (contentEl) contentEl.innerHTML = renderMarkdown(post.content);

        loadRelatedArticles(post.slug);
      })
      .catch(() => {
        const contentEl = document.getElementById('articleContent');
        if (contentEl) {
          contentEl.innerHTML = `
            <div style="text-align:center; padding: 40px 0;">
              <h3>Article Not Found</h3>
              <p style="color:var(--muted); margin: 12px 0 24px;">The requested advisory brief may have moved or been updated.</p>
              <a href="/insights" class="btn btn-primary">Return to All Insights</a>
            </div>
          `;
        }
      });
  } else if (insightsListView) {
    // INSIGHTS LISTING MODE
    if (articleView) articleView.style.display = 'none';
    insightsListView.style.display = 'block';

    const insightsList = document.getElementById('insightsList');
    if (insightsList) {
      fetch('/api/insights')
        .then((res) => res.json())
        .then((result) => {
          if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
            const cardsHtml = result.data.map((post) => {
              const excerpt = post.excerpt || (post.content ? `${String(post.content).substring(0, 140)}...` : '');
              return `
              <article class="insight-card reveal show">
                <div class="insight-thumb">
                  <img src="${esc(coverSrc(post.cover_image))}" alt="${esc(post.title)}" loading="lazy" data-fallback="${FALLBACK_COVER}">
                </div>
                <div class="insight-body">
                  <div class="insight-cat">${esc(post.category || 'Insights')}</div>
                  <h3>${esc(post.title)}</h3>
                  <p>${esc(excerpt)}</p>
                  <div class="insight-meta">
                    <span>${esc(post.author || 'THEWHY Consulting')}</span>
                    <a href="${esc(insightHref(post))}">Read Article &rarr;</a>
                  </div>
                </div>
              </article>`;
            }).join('');

            insightsList.innerHTML = `<div class="insight-grid">${cardsHtml}</div>`;
            attachImageFallback(insightsList);
          }
        })
        .catch(() => {
          // Static fallback remains in place
        });
    }
  }

  function loadRelatedArticles(currentSlug) {
    const relatedContainer = document.getElementById('relatedArticles');
    if (!relatedContainer) return;

    fetch('/api/insights')
      .then((res) => res.json())
      .then((result) => {
        if (!(result && result.success && Array.isArray(result.data))) return;
        const others = result.data.filter((p) => p.slug !== currentSlug).slice(0, 3);
        if (others.length === 0) return;
        relatedContainer.innerHTML = others.map((post) => `
          <article class="insight-card" style="box-shadow:var(--shadow-soft);">
            <div class="insight-thumb">
              <img src="${esc(coverSrc(post.cover_image))}" alt="${esc(post.title)}" loading="lazy" data-fallback="${FALLBACK_COVER}">
            </div>
            <div class="insight-body">
              <div class="insight-cat">${esc(post.category || 'Insights')}</div>
              <h4 style="font-size:17px; margin-bottom:8px;">${esc(post.title)}</h4>
              <p style="font-size:13px; color:var(--muted);">${esc(post.excerpt || '')}</p>
              <div class="insight-meta">
                <span>${esc(post.author || 'THEWHY Consulting')}</span>
                <a href="${esc(insightHref(post))}">Read &rarr;</a>
              </div>
            </div>
          </article>
        `).join('');
        attachImageFallback(relatedContainer);
      })
      .catch(() => {});
  }

  // 12. HOMEPAGE "LATEST INSIGHTS" — live from the CMS. The static cards in
  // index.html stay as the no-JS / API-down fallback.
  const latestGrid = document.querySelector('[data-latest-insights]');
  if (latestGrid) {
    const limit = parseInt(latestGrid.getAttribute('data-latest-insights'), 10) || 3;
    const monthLabel = (value) => {
      const d = value ? new Date(value) : null;
      return d && !Number.isNaN(d.getTime())
        ? d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
        : '';
    };
    fetch('/api/insights')
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        const posts = result && result.success && Array.isArray(result.data) ? result.data.slice(0, limit) : [];
        if (!posts.length) return;
        latestGrid.innerHTML = posts.map((post, i) => {
          const excerpt = post.excerpt || (post.content ? `${String(post.content).substring(0, 140)}...` : '');
          const badge = monthLabel(post.published_at || post.created_at);
          return `
          <article class="blog-card reveal show${i ? ` delay-${i}` : ''}">
            <div class="blog-thumb">
              <img src="${esc(coverSrc(post.cover_image))}" alt="${esc(post.title)}" width="640" height="427" loading="lazy" decoding="async" data-fallback="${FALLBACK_COVER}">
              ${badge ? `<span class="blog-date-badge">${esc(badge)}</span>` : ''}
            </div>
            <div class="blog-body">
              <span class="blog-cat">${esc(post.category || 'Insights')}</span>
              <h3>${esc(post.title)}</h3>
              <p>${esc(excerpt)}</p>
              <div class="blog-meta">
                <span>${esc(post.author || 'THEWHY Practice Team')}</span>
                <a href="${esc(insightHref(post))}" class="blog-read-more">Read Analysis <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
              </div>
            </div>
          </article>`;
        }).join('');
        attachImageFallback(latestGrid);
      })
      .catch(() => { /* keep the static fallback cards */ });
  }
});
