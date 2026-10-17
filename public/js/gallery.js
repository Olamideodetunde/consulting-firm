/**
 * THEWHY Consulting - Gallery page
 * Albums (activities) -> moments within an album -> photo grid + lightbox.
 * Data: GET /api/gallery?album=&category=&page=&limit=
 */
(function () {
  'use strict';

  var PAGE_SIZE = 24;
  var ALL = 'All';

  // Short intros for known albums; any other album just shows its name.
  var ALBUM_INTROS = {
    'Rent-An-Accountant Launch': {
      text: 'Highlights from the official launch of Rent-An-Accountant by THEWHY Consulting in Lagos: keynotes, panel sessions and our guests.',
      link: { href: '/rent-an-accountant', label: 'About Rent-An-Accountant' }
    }
  };

  var escapeHtml = (window.WHY && window.WHY.escapeHtml) || function (v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  var state = {
    album: ALL,
    category: ALL,
    page: 1,
    totalPages: 1,
    total: 0,
    photos: [],
    albums: [],
    loading: false,
    requestId: 0,
    index: 0
  };

  var $ = function (id) { return document.getElementById(id); };
  var albumsEl = $('galleryAlbums');
  var introEl = $('galleryAlbumIntro');
  var momentsEl = $('galleryMoments');
  var grid = $('galleryGrid');
  var moreEl = $('galleryMore');
  var countEl = $('galleryCount');
  var loadMoreBtn = $('galleryLoadMore');
  var lightbox = $('galleryLightbox');
  var lbImg = $('lightboxImg');
  var lbLabel = $('lightboxLabel');
  var lbIndex = $('lightboxIndex');
  var lbCaption = $('lightboxCaption');
  var lastFocus = null;

  /** Small version for the grid: pre-built thumbnails for seeded photos, a resized delivery URL for Cloudinary. */
  function thumbUrl(url) {
    var u = String(url || '');
    var local = /^\/assets\/img\/gallery\/(DSC_[^/]+)$/.exec(u);
    if (local) return '/assets/img/gallery/thumbs/' + local[1];
    var cloud = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:f_auto,q_auto,c_limit,w_\d+\/)?(.+)$/.exec(u);
    if (cloud) return cloud[1] + 'f_auto,q_auto,c_limit,w_720/' + cloud[2];
    return u;
  }

  function photoLabel(p) {
    var parts = [];
    if (p.album) parts.push(p.album);
    if (p.category && p.category !== p.album && p.category !== 'General') parts.push(p.category);
    return parts.join(' · ');
  }

  function pill(label, count, active, attrs) {
    return '<button type="button" class="gallery-pill' + (active ? ' active' : '') + '" ' + attrs +
      ' aria-pressed="' + (active ? 'true' : 'false') + '"><span>' + escapeHtml(label) + '</span>' +
      (count != null ? '<span class="badge">' + count + '</span>' : '') + '</button>';
  }

  function renderAlbums() {
    var total = state.albums.reduce(function (n, a) { return n + a.count; }, 0);
    var html = pill('All activities', total, state.album === ALL, 'data-album="' + ALL + '"');
    state.albums.forEach(function (a) {
      html += pill(a.name, a.count, state.album === a.name, 'data-album="' + escapeHtml(a.name) + '"');
    });
    albumsEl.innerHTML = html;
  }

  function renderIntro() {
    var intro = state.album !== ALL && ALBUM_INTROS[state.album];
    if (!intro) { introEl.hidden = true; introEl.innerHTML = ''; return; }
    introEl.innerHTML = '<div><h2>' + escapeHtml(state.album) + '</h2><p>' + escapeHtml(intro.text) + '</p></div>' +
      (intro.link ? '<a class="btn btn-outline btn-sm" href="' + escapeHtml(intro.link.href) + '">' + escapeHtml(intro.link.label) + ' &rarr;</a>' : '');
    introEl.hidden = false;
  }

  function renderMoments(categories) {
    var list = (categories || []).filter(function (c) { return c.name && c.name !== 'General'; });
    if (state.album === ALL || list.length < 2) { momentsEl.innerHTML = ''; return; }
    var total = list.reduce(function (n, c) { return n + c.count; }, 0);
    var html = pill('All moments', total, state.category === ALL, 'data-category="' + ALL + '"');
    list.forEach(function (c) {
      html += pill(c.name, c.count, state.category === c.name, 'data-category="' + escapeHtml(c.name) + '"');
    });
    momentsEl.innerHTML = html;
  }

  function card(p, i) {
    var label = photoLabel(p);
    return '<button type="button" class="gallery-card" data-index="' + i + '" aria-label="Open photo ' + (i + 1) +
      (label ? ': ' + escapeHtml(label) : '') + '">' +
      '<img src="' + escapeHtml(thumbUrl(p.image_url)) + '" data-full="' + escapeHtml(p.image_url) + '" alt="' +
      escapeHtml(p.caption || label || 'Gallery photo') + '" loading="lazy" decoding="async">' +
      (p.category && p.category !== 'General' ? '<span class="gallery-card-tag">' + escapeHtml(p.category) + '</span>' : '') +
      '</button>';
  }

  function renderGrid(fromIndex) {
    if (!state.photos.length) {
      grid.innerHTML = '<div class="gallery-status">No photos here yet.</div>';
    } else if (fromIndex > 0) {
      grid.insertAdjacentHTML('beforeend', state.photos.slice(fromIndex).map(function (p, k) { return card(p, fromIndex + k); }).join(''));
    } else {
      grid.innerHTML = state.photos.map(card).join('');
    }
    var more = state.page < state.totalPages;
    moreEl.hidden = !state.photos.length;
    loadMoreBtn.hidden = !more;
    countEl.textContent = 'Showing ' + state.photos.length + ' of ' + state.total + ' photos';
  }

  function load(append) {
    var requestId = ++state.requestId;
    state.loading = true;
    if (!append) grid.innerHTML = '<div class="gallery-status"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading photos&hellip;</div>';
    loadMoreBtn.disabled = true;

    var params = new URLSearchParams({ page: String(state.page), limit: String(PAGE_SIZE) });
    if (state.album !== ALL) params.set('album', state.album);
    if (state.category !== ALL) params.set('category', state.category);

    fetch('/api/gallery?' + params.toString())
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (requestId !== state.requestId) return; // a newer filter won
        if (!json.success) throw new Error(json.error || 'Could not load photos.');
        var from = append ? state.photos.length : 0;
        state.photos = append ? state.photos.concat(json.data || []) : (json.data || []);
        state.total = json.total || 0;
        state.totalPages = json.totalPages || 1;
        if (Array.isArray(json.albums)) { state.albums = json.albums; renderAlbums(); }
        if (!append) { renderIntro(); renderMoments(json.categories); }
        renderGrid(from);
      })
      .catch(function () {
        if (requestId !== state.requestId) return;
        if (!append) grid.innerHTML = '<div class="gallery-status">Photos could not be loaded. Please refresh the page.</div>';
      })
      .then(function () {
        if (requestId !== state.requestId) return;
        state.loading = false;
        loadMoreBtn.disabled = false;
      });
  }

  // ---- Filters ----
  albumsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-album]');
    if (!btn || btn.getAttribute('data-album') === state.album) return;
    state.album = btn.getAttribute('data-album');
    state.category = ALL;
    state.page = 1;
    syncUrl();
    load(false);
  });

  momentsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-category]');
    if (!btn || btn.getAttribute('data-category') === state.category) return;
    state.category = btn.getAttribute('data-category');
    state.page = 1;
    momentsEl.querySelectorAll('.gallery-pill').forEach(function (b) {
      var on = b === btn;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    load(false);
  });

  loadMoreBtn.addEventListener('click', function () {
    if (state.loading || state.page >= state.totalPages) return;
    state.page += 1;
    load(true);
  });

  // Thumbnail missing (e.g. a photo uploaded without one): fall back to the full image.
  grid.addEventListener('error', function (e) {
    var img = e.target;
    if (img.tagName === 'IMG' && img.dataset.full && img.src.indexOf(img.dataset.full) === -1) img.src = img.dataset.full;
  }, true);

  function syncUrl() {
    try {
      var url = new URL(window.location.href);
      if (state.album === ALL) url.searchParams.delete('album'); else url.searchParams.set('album', state.album);
      window.history.replaceState(null, '', url.pathname + url.search);
    } catch (err) { /* ignore */ }
  }

  // ---- Lightbox ----
  function show(i) {
    var n = state.photos.length;
    if (!n) return;
    state.index = (i + n) % n;
    var p = state.photos[state.index];
    lbImg.src = p.image_url;
    lbImg.alt = p.caption || photoLabel(p) || 'Gallery photo';
    lbLabel.textContent = photoLabel(p);
    lbIndex.textContent = (state.index + 1) + ' / ' + (state.total || n);
    lbCaption.textContent = p.caption || '';
    lbCaption.hidden = !p.caption;
    // Preload the neighbours so arrowing through feels instant.
    [state.index + 1, state.index - 1].forEach(function (k) {
      var q = state.photos[(k + n) % n];
      if (q) { var im = new Image(); im.src = q.image_url; }
    });
    // Reaching the end of what is loaded: fetch the next page in the background.
    if (state.index >= n - 3 && state.page < state.totalPages && !state.loading) {
      state.page += 1;
      load(true);
    }
  }

  function open(i) {
    lastFocus = document.activeElement;
    show(i);
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('lightboxClose').focus();
  }

  function close() {
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lbImg.src = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  grid.addEventListener('click', function (e) {
    var c = e.target.closest('.gallery-card');
    if (c) open(parseInt(c.getAttribute('data-index'), 10));
  });
  $('lightboxClose').addEventListener('click', close);
  $('lightboxPrev').addEventListener('click', function () { show(state.index - 1); });
  $('lightboxNext').addEventListener('click', function () { show(state.index + 1); });
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox || e.target.classList.contains('gallery-lightbox-figure')) close();
  });
  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(state.index - 1);
    else if (e.key === 'ArrowRight') show(state.index + 1);
  });

  // Swipe on touch screens
  var touchX = null;
  lightbox.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', function (e) {
    if (touchX == null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) show(state.index + (dx < 0 ? 1 : -1));
  });

  // ---- Boot (supports /gallery?album=...) ----
  try {
    var requested = new URLSearchParams(window.location.search).get('album');
    if (requested) state.album = requested;
  } catch (err) { /* ignore */ }
  load(false);
})();
