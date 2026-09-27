/**
 * THEWHY CONSULTING - Core Frontend Client Script
 * Handles navigation, animations, interactive tools, tabs, and form submissions.
 */

// 0. IMMEDIATE BULLETPROOF PRELOADER DISMISSAL
(function initPagePreloader() {
  function dismiss() {
    const preloader = document.getElementById('pagePreloader');
    if (!preloader || preloader.dataset.dismissed === 'true') return;
    preloader.dataset.dismissed = 'true';
    preloader.classList.add('done');
    preloader.classList.add('loaded');
    setTimeout(() => {
      preloader.style.opacity = '0';
      preloader.style.pointerEvents = 'none';
      preloader.style.visibility = 'hidden';
      setTimeout(() => {
        if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
      }, 500);
    }, 250);
  }

  if (document.readyState === 'complete') {
    dismiss();
  } else if (document.readyState === 'interactive') {
    setTimeout(dismiss, 120);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(dismiss, 120));
  }

  window.addEventListener('load', dismiss);
  // Hard fallback: guaranteed dismissal within 800ms
  setTimeout(dismiss, 800);
})();

document.addEventListener('DOMContentLoaded', () => {
  // 1. DYNAMIC YEAR
  const yearEls = document.querySelectorAll('#year, .dynamic-year');
  const currentYear = new Date().getFullYear();
  yearEls.forEach(el => { el.textContent = currentYear; });

  // 2. NAV SCROLL EFFECT
  const siteNav = document.getElementById('siteNav');
  if (siteNav) {
    const handleScroll = () => {
      if (window.scrollY > 35) {
        siteNav.classList.add('scrolled');
      } else {
        siteNav.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // 3. MOBILE DRAWER NAVIGATION
  const menuBtn = document.getElementById('menuBtn');
  const drawer = document.getElementById('drawer');
  const drawerClose = document.getElementById('drawerClose');
  const drawerOverlay = document.getElementById('drawerOverlay');

  const openDrawer = () => {
    if (drawer) drawer.classList.add('open');
    if (drawerOverlay) drawerOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    if (drawer) drawer.classList.remove('open');
    if (drawerOverlay) drawerOverlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  if (menuBtn) menuBtn.addEventListener('click', openDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

  if (drawer) {
    const drawerLinks = drawer.querySelectorAll('a');
    drawerLinks.forEach(link => {
      link.addEventListener('click', closeDrawer);
    });
  }

  // 4. REVEAL ANIMATIONS ON SCROLL
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  if ('IntersectionObserver' in window && revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('show'));
  }

  // 4B. PRELOADER DISMISSAL SAFEGUARD
  const preloader = document.getElementById('pagePreloader');
  if (preloader && !preloader.dataset.dismissed) {
    preloader.dataset.dismissed = 'true';
    preloader.classList.add('done');
    preloader.classList.add('loaded');
    setTimeout(() => {
      preloader.style.opacity = '0';
      preloader.style.pointerEvents = 'none';
      preloader.style.visibility = 'hidden';
      setTimeout(() => {
        if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
      }, 500);
    }, 250);
  }

  // 4C. SCROLL TO TOP BUTTON
  const scrollTopBtn = document.getElementById('scrollTop');
  if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 380) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    }, { passive: true });

    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // 4D. ANIMATED STATS / COUNTERS (MONOLINE STYLE)
  const counterElements = document.querySelectorAll('.counter-number[data-target]');
  if (counterElements.length > 0) {
    const animateCounter = (el) => {
      const target = parseInt(el.getAttribute('data-target'), 10);
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 1600;
      const startTime = performance.now();
      const span = el.querySelector('span') || el;

      const updateCount = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - (1 - progress) * (1 - progress);
        const currentVal = Math.floor(easeOut * target);
        span.textContent = currentVal.toLocaleString() + suffix;

        if (progress < 1) {
          requestAnimationFrame(updateCount);
        } else {
          span.textContent = target.toLocaleString() + suffix;
        }
      };

      requestAnimationFrame(updateCount);
    };

    if ('IntersectionObserver' in window) {
      const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });

      counterElements.forEach(el => counterObserver.observe(el));
    } else {
      counterElements.forEach(animateCounter);
    }
  }

  // 4E. SKILL / PROGRESS BARS FILL ANIMATION
  const skillBars = document.querySelectorAll('.skill-bar-fill');
  if (skillBars.length > 0) {
    if ('IntersectionObserver' in window) {
      const skillObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animated');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.25 });

      skillBars.forEach(bar => skillObserver.observe(bar));
    } else {
      skillBars.forEach(bar => bar.classList.add('animated'));
    }
  }

  // 5. HERO BOARD / CALCULATOR ANIMATION & TILT
  const screenNumber = document.getElementById('screenNumber');
  if (screenNumber) {
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
  if (heroBoard && window.matchMedia('(pointer: fine)').matches) {
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
      tabButtons.forEach(btn => {
        const isActive = btn.getAttribute('data-tab') === targetTabId;
        btn.classList.toggle('active', isActive);
      });
      tabPanels.forEach(panel => {
        const isActive = panel.id === `tab-${targetTabId}` || panel.id === targetTabId;
        panel.classList.toggle('active', isActive);
      });
    };

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        activateTab(targetTab);
        history.replaceState(null, null, `#tab-${targetTab}`);
      });
    });

    // Check hash on load
    if (window.location.hash) {
      const hash = window.location.hash.replace('#tab-', '').replace('#', '');
      const matchingBtn = document.querySelector(`.tab-btn[data-tab="${hash}"]`);
      if (matchingBtn) {
        activateTab(hash);
      }
    }
  }

  // 7. FAQ ACCORDION
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const toggle = item.querySelector('.faq-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        faqItems.forEach(i => i.classList.remove('open'));
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    }
  });

  // 8. INTERACTIVE FEE CALCULATOR
  const calcForm = document.getElementById('calcForm');
  const calcResult = document.getElementById('calcResult');

  if (calcForm && calcResult) {
    calcForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const sizeInput = calcForm.querySelector('input[name="companySize"]:checked') || calcForm.querySelector('select[name="companySize"]');
      let baseFee = 380000;
      let sizeName = 'SME Growth (10-100 staff)';

      if (sizeInput) {
        const val = sizeInput.value;
        if (val === 'micro') { baseFee = 180000; sizeName = 'Micro / Startup (1-10 staff)'; }
        else if (val === 'sme') { baseFee = 380000; sizeName = 'SME Growth (10-100 staff)'; }
        else if (val === 'mid') { baseFee = 750000; sizeName = 'Mid-Market Enterprise (100-500 staff)'; }
        else if (val === 'large') { baseFee = 1200000; sizeName = 'Conglomerate / Large Enterprise'; }
      }

      const addons = calcForm.querySelectorAll('input[name="addons"]:checked');
      let addonsTotal = 0;
      const selectedAddonsList = [];

      addons.forEach(box => {
        const cost = parseInt(box.getAttribute('data-cost') || '0', 10);
        addonsTotal += cost;
        selectedAddonsList.push({ name: box.value, cost });
      });

      const totalMonthly = baseFee + addonsTotal;
      const fmt = (n) => '₦' + n.toLocaleString();

      let addonsHtml = '';
      if (selectedAddonsList.length > 0) {
        addonsHtml = `
          <div style="margin: 16px 0; padding-top: 14px; border-top: 1px dashed var(--line);">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: var(--muted); margin-bottom: 8px;">Included Add-ons:</div>
            ${selectedAddonsList.map(a => `
              <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px; color:#4a4641;">
                <span>• ${a.name}</span>
                <span style="font-weight:700;">+${fmt(a.cost)}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      calcResult.innerHTML = `
        <div style="background: #ffffff; border: 1px solid var(--line); border-radius: 24px; padding: 32px 28px; box-shadow: var(--shadow-soft);">
          <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--orange); margin-bottom: 6px;">
            Estimated Advisory Retainer
          </div>
          <div style="font-family: 'Manrope', sans-serif; font-size: clamp(32px, 4vw, 44px); font-weight: 800; color: var(--ink); letter-spacing: -0.04em;">
            ${fmt(totalMonthly)} <span style="font-size: 16px; font-weight: 600; color: var(--muted);">/ month</span>
          </div>
          <div style="font-size: 13px; color: var(--muted); margin-top: 4px;">
            Enterprise Profile: <strong>${sizeName}</strong>
          </div>
          
          ${addonsHtml}

          <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--line);">
            <div style="font-size: 12px; color: #76716a; line-height: 1.6; margin-bottom: 20px;">
              Includes dedicated lead consultant, monthly ledger governance, statutory compliance schedules, and board advisory sessions.
            </div>
            <a href="/booking?estimatedFee=${encodeURIComponent(fmt(totalMonthly))}&scale=${encodeURIComponent(sizeName)}" class="btn btn-primary" style="width: 100%; text-align: center;">
              Book Advisory with this Estimate &rarr;
            </a>
          </div>
        </div>
      `;
    });
  }

  // 9. BOOKING FORM SUBMISSION
  const bookingForm = document.getElementById('bookingForm');
  const bookingMsg = document.getElementById('bookingMsg');

  if (bookingForm) {
    // Pre-populate if query params exist
    const urlParams = new URLSearchParams(window.location.search);
    const feeParam = urlParams.get('estimatedFee');
    if (feeParam) {
      const feeInput = bookingForm.querySelector('input[name="estimatedFee"]');
      if (feeInput) feeInput.value = feeParam;
    }

    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.innerHTML : 'Submit';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
      }

      if (bookingMsg) {
        bookingMsg.style.display = 'none';
        bookingMsg.className = 'form-alert';
      }

      const formData = new FormData(bookingForm);
      const payload = Object.fromEntries(formData.entries());

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
          bookingForm.reset();
          if (bookingMsg) {
            bookingMsg.className = 'form-alert success';
            bookingMsg.style.display = 'block';
            bookingMsg.innerHTML = `
              <strong><i class="fa-solid fa-circle-check"></i> Consultation Requested!</strong><br>
              Reference Code: <strong>${data.data?.ref_code || data.data?.id || 'CONFIRMED'}</strong><br>
              A partner from our Lagos headquarters will review your submission and contact you within 24 hours.
              ${data.data?.id ? `<div style="margin-top:10px;"><a href="/api/bookings/${data.data.id}/calendar.ics" class="btn btn-ghost" style="min-height:36px;font-size:12px;padding:0 16px;"><i class="fa-regular fa-calendar-plus"></i> Add to Calendar (.ics)</a></div>` : ''}
            `;
          }
        } else {
          throw new Error(data.error || 'Failed to submit consultation request.');
        }
      } catch (err) {
        if (bookingMsg) {
          bookingMsg.className = 'form-alert error';
          bookingMsg.style.display = 'block';
          bookingMsg.innerHTML = `<strong>Error:</strong> ${err.message || 'Network error. Please try again or reach us directly at +234-8034-99-23-18.'}`;
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
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
      }

      if (contactMsg) {
        contactMsg.style.display = 'none';
        contactMsg.className = 'form-alert';
      }

      const formData = new FormData(contactForm);
      const payload = Object.fromEntries(formData.entries());

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
          contactForm.reset();
          if (contactMsg) {
            contactMsg.className = 'form-alert success';
            contactMsg.style.display = 'block';
            contactMsg.innerHTML = `
              <strong><i class="fa-solid fa-circle-check"></i> Message Sent!</strong><br>
              Reference: <strong>${data.ref_code || 'RECEIVED'}</strong>. Our team will respond shortly.
            `;
          }
        } else {
          throw new Error(data.error || 'Failed to submit your message.');
        }
      } catch (err) {
        if (contactMsg) {
          contactMsg.className = 'form-alert error';
          contactMsg.style.display = 'block';
          contactMsg.innerHTML = `<strong>Error:</strong> ${err.message || 'Unable to deliver message right now. Call us at +234-8034-99-23-18.'}`;
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
        }
      }
    });
  }

  // 11. DYNAMIC INSIGHTS & ARTICLE READER ENGINE
  const insightsListView = document.getElementById('insightsListView');
  const articleView = document.getElementById('articleView');

  // Simple Markdown Parser (modelled after Gloria-adah's InsightsSingle)
  function renderMarkdown(md) {
    if (!md) return '';
    const lines = md.split('\n');
    let inList = false;
    let html = '';

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h3>${parseInline(trimmed.slice(4))}</h3>`;
      } else if (trimmed.startsWith('## ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h2>${parseInline(trimmed.slice(3))}</h2>`;
      } else if (trimmed.startsWith('> ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<blockquote>${parseInline(trimmed.slice(2))}</blockquote>`;
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += `<li>${parseInline(trimmed.slice(2))}</li>`;
      } else if (/^\d+\.\s/.test(trimmed)) {
        if (!inList) { html += '<ol>'; inList = true; }
        html += `<li>${parseInline(trimmed.replace(/^\d+\.\s/, ''))}</li>`;
      } else if (trimmed === '') {
        if (inList) { html += '</ul>'; inList = false; }
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<p>${parseInline(trimmed)}</p>`;
      }
    });

    if (inList) html += '</ul>';
    return html;
  }

  function parseInline(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }

  // Detect route: /insights vs /insights/:slug
  const currentPath = window.location.pathname;
  const isInsightsRoute = currentPath.startsWith('/insights');
  const pathParts = currentPath.split('/').filter(Boolean);
  const articleSlug = (isInsightsRoute && pathParts.length >= 2 && pathParts[0] === 'insights') ? pathParts[1] : null;

  if (articleSlug && articleView) {
    // SINGLE ARTICLE READING MODE
    if (insightsListView) insightsListView.style.display = 'none';
    articleView.style.display = 'block';

    fetch(`/api/insights/${articleSlug}`)
      .then(res => {
        if (!res.ok) throw new Error('Article not found');
        return res.json();
      })
      .then(result => {
        if (result.success && result.data) {
          const post = result.data;
          
          // Page metadata
          document.title = `${post.title} | THEWHY Consulting`;
          const breadcrumbEl = document.getElementById('articleBreadcrumb');
          if (breadcrumbEl) breadcrumbEl.textContent = post.title;

          // Header fields
          const titleEl = document.getElementById('articleTitle');
          if (titleEl) titleEl.textContent = post.title;

          const catEl = document.getElementById('articleCategory');
          if (catEl) catEl.textContent = post.category || 'Advisory Insights';

          const authorEl = document.getElementById('articleAuthor');
          if (authorEl) authorEl.textContent = post.author || 'THEWHY Practice Team';

          const dateEl = document.getElementById('articleDate');
          if (dateEl) {
            dateEl.textContent = post.created_at ? new Date(post.created_at).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }) : '2026 Edition';
          }

          // Read time calculation (avg 200 wpm)
          const words = (post.content || '').split(/\s+/).length;
          const readMins = Math.max(2, Math.ceil(words / 180));
          const readTimeEl = document.getElementById('articleReadingTime');
          if (readTimeEl) {
            readTimeEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${readMins} min read`;
          }

          // Cover Image
          const coverEl = document.getElementById('articleCover');
          if (coverEl && post.cover_image) {
            coverEl.src = post.cover_image.startsWith('/') ? post.cover_image : `/${post.cover_image}`;
          }

          // Content Rendering
          const contentEl = document.getElementById('articleContent');
          if (contentEl) {
            contentEl.innerHTML = renderMarkdown(post.content);
          }

          // Related Articles
          loadRelatedArticles(post.slug);
        }
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
        .then(res => res.json())
        .then(result => {
          if (result.success && Array.isArray(result.data) && result.data.length > 0) {
            const cardsHtml = result.data.map(post => `
              <article class="insight-card reveal show">
                <div class="insight-thumb">
                  <img src="${post.cover_image ? (post.cover_image.startsWith('/') ? post.cover_image : `/${post.cover_image}`) : '/assets/img/blog/1.jpg'}" alt="${post.title}" onerror="this.src='/assets/img/portfolio/1.jpg'">
                </div>
                <div class="insight-body">
                  <div class="insight-cat">${post.category || 'Insights'}</div>
                  <h3>${post.title}</h3>
                  <p>${post.excerpt || (post.content ? post.content.substring(0, 140) + '...' : '')}</p>
                  <div class="insight-meta">
                    <span>${post.author || 'THEWHY Consulting'}</span>
                    <a href="/insights/${post.slug || post.id}">Read Article &rarr;</a>
                  </div>
                </div>
              </article>
            `).join('');

            insightsList.innerHTML = `<div class="insight-grid">${cardsHtml}</div>`;
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
      .then(res => res.json())
      .then(result => {
        if (result.success && Array.isArray(result.data)) {
          const others = result.data.filter(p => p.slug !== currentSlug).slice(0, 3);
          if (others.length > 0) {
            relatedContainer.innerHTML = others.map(post => `
              <article class="insight-card" style="box-shadow:var(--shadow-soft);">
                <div class="insight-thumb">
                  <img src="${post.cover_image ? (post.cover_image.startsWith('/') ? post.cover_image : `/${post.cover_image}`) : '/assets/img/blog/1.jpg'}" alt="${post.title}">
                </div>
                <div class="insight-body">
                  <div class="insight-cat">${post.category || 'Insights'}</div>
                  <h4 style="font-size:17px; margin-bottom:8px;">${post.title}</h4>
                  <p style="font-size:13px; color:var(--muted);">${post.excerpt || ''}</p>
                  <div class="insight-meta">
                    <span>${post.author}</span>
                    <a href="/insights/${post.slug}">Read &rarr;</a>
                  </div>
                </div>
              </article>
            `).join('');
          }
        }
      })
      .catch(() => {});
  }
});
