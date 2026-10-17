/**
 * THEWHY CONSULTING - Executive Management Dashboard
 * Blog CRUD, bookings, inquiries, contact messages, newsletter, seminar page,
 * site settings and media library.
 *
 * Auth: server-side session cookie (HttpOnly). All requests use
 * credentials: 'same-origin'; any 401 shows the sign-in screen again.
 * All user-supplied values are escaped before being placed in innerHTML.
 */

(function () {
  'use strict';

  const state = {
    articles: [],
    bookings: [],
    inquiries: [],
    contacts: [],
    subscribers: [],
    media: [],
    gallery: [],
    galleryPage: 1,
    galleryTotal: 0,
    galleryTotalPages: 1,
    galleryFilter: { album: 'All', category: 'All', status: 'all', search: '' },
    galleryAlbums: [],
    galleryCategories: [],
    booted: false
  };

  const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
  }

  class AuthError extends Error {}

  /** fetch wrapper: same-origin credentials, JSON, 401 -> sign-in screen. */
  async function api(url, options = {}) {
    const opts = { credentials: 'same-origin', ...options };
    opts.headers = { Accept: 'application/json', ...(options.headers || {}) };
    if (options.body !== undefined && typeof options.body !== 'string') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, opts);
    if (res.status === 401) {
      showLogin('Your session has expired. Please sign in again.');
      throw new AuthError('Authentication required');
    }
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
    if (!res.ok || !data || data.success === false) {
      throw new Error((data && data.error) || `Request failed (${res.status})`);
    }
    return data;
  }

  function reportError(prefix, err) {
    if (err instanceof AuthError) return;
    console.error(prefix, err);
    alert(`${prefix}: ${err.message}`);
  }

  function flash(el, text) {
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3000);
  }

  function emptyRow(colspan, text) {
    return `<tr><td colspan="${colspan}" class="py-8 text-center text-slate-400">${escapeHtml(text)}</td></tr>`;
  }

  function emptyCard(text) {
    return `<div class="col-span-2 py-8 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 text-xs">${escapeHtml(text)}</div>`;
  }

  // -------------------------------------------------------------------------
  // 1. AUTHENTICATION
  // -------------------------------------------------------------------------
  const authModal = $('auth-modal');
  const authForm = $('auth-form');
  const authPasscode = $('auth-passcode');
  const authError = $('auth-error');
  const authBtn = $('auth-btn');

  function showLogin(message) {
    authModal.classList.remove('hidden');
    if (message) {
      authError.textContent = message;
      authError.classList.remove('hidden');
    } else {
      authError.classList.add('hidden');
    }
    authPasscode.value = '';
    setTimeout(() => authPasscode.focus(), 0);
  }

  function hideLogin() {
    authModal.classList.add('hidden');
    authError.classList.add('hidden');
    authPasscode.value = '';
  }

  async function checkSession() {
    try {
      const res = await fetch('/api/admin/session', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (res.ok) {
        hideLogin();
        initDashboard();
      } else {
        showLogin();
      }
    } catch (err) {
      showLogin('Could not reach the server. Please try again.');
    }
  }

  authForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    authError.classList.add('hidden');
    authBtn.disabled = true;
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ passcode: authPasscode.value })
      });
      let data = null;
      try { data = await res.json(); } catch (_) { data = null; }
      if (res.ok && data && data.success) {
        hideLogin();
        initDashboard();
      } else {
        authError.textContent = (data && data.error) || 'Invalid passcode.';
        authError.classList.remove('hidden');
      }
    } catch (err) {
      authError.textContent = 'Authentication error. Please try again.';
      authError.classList.remove('hidden');
    } finally {
      authBtn.disabled = false;
    }
  });

  $('admin-logout-btn').addEventListener('click', async function () {
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (e) { /* ignore */ }
    state.booted = false;
    showLogin();
  });

  // -------------------------------------------------------------------------
  // 2. TABS
  // -------------------------------------------------------------------------
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      tabBtns.forEach(b => {
        b.classList.remove('active', 'text-brandOrange', 'border-b-2', 'border-brandOrange');
        b.classList.add('text-slate-500');
      });
      btn.classList.add('active', 'text-brandOrange', 'border-b-2', 'border-brandOrange');
      btn.classList.remove('text-slate-500');

      tabContents.forEach(c => c.classList.add('hidden'));
      const active = $(target);
      if (active) active.classList.remove('hidden');

      if (target === 'tab-bookings') fetchBookings();
      if (target === 'tab-inquiries') fetchInquiries();
      if (target === 'tab-contacts') fetchContacts();
      if (target === 'tab-newsletter') fetchSubscribers();
      if (target === 'tab-media' && state.media.length === 0) fetchMedia();
      if (target === 'tab-launch') fetchLaunchData();
      if (target === 'tab-website-text') fetchSettings();
    });
  });

  // -------------------------------------------------------------------------
  // 3. INIT
  // -------------------------------------------------------------------------
  function initDashboard() {
    state.booted = true;
    fetchArticles();
    fetchBookings();
    fetchInquiries();
    fetchContacts();
    fetchSubscribers();
    fetchLaunchData();
    fetchSettings();
    fetchAdminGallery();
  }

  // -------------------------------------------------------------------------
  // 4. BLOG & INSIGHTS
  // -------------------------------------------------------------------------
  async function fetchArticles() {
    try {
      const json = await api('/api/admin/insights');
      state.articles = json.data || [];
      renderArticles();
    } catch (err) {
      if (!(err instanceof AuthError)) console.error('Error fetching articles:', err);
    }
  }

  function renderArticles() {
    const tbody = $('articles-tbody');
    if (!tbody) return;
    if (state.articles.length === 0) {
      tbody.innerHTML = emptyRow(5, 'No articles yet. Click "Write New Article".');
      return;
    }
    tbody.innerHTML = state.articles.map(art => {
      const slug = escapeHtml(art.slug);
      const published = art.is_published !== false;
      return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4">
          <div class="font-bold text-slate-800">${escapeHtml(art.title)}</div>
          <div class="text-[11px] text-slate-400 truncate max-w-xs">${escapeHtml(art.excerpt || '')}</div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">${escapeHtml(art.category || 'Insight')}</span>
        </td>
        <td class="py-3 px-4 text-slate-600">${escapeHtml(art.author || 'THEWHY Practice Team')}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
            ${published ? 'Published' : 'Draft'}
          </span>
        </td>
        <td class="py-3 px-4 text-right space-x-2 whitespace-nowrap">
          <a href="/insights/${encodeURIComponent(art.slug)}" target="_blank" rel="noopener" class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-[11px] font-semibold" title="View Article">
            <i class="fa-solid fa-eye"></i>
          </a>
          <button type="button" data-action="edit-article" data-slug="${slug}" class="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-[11px] font-semibold" title="Edit Article">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button type="button" data-action="toggle-article" data-slug="${slug}" data-publish="${published ? 'false' : 'true'}" class="px-2.5 py-1 rounded-lg ${published ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'} text-[11px] font-semibold">
            ${published ? 'Unpublish' : 'Publish'}
          </button>
          <button type="button" data-action="delete-article" data-slug="${slug}" class="px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[11px] font-semibold" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');
  }

  const articleModal = $('article-modal');
  const articleForm = $('article-form');
  const articleError = $('article-error');

  // -------------------------------------------------------------------------
  // CLOUDINARY UPLOADS (signed by the server, sent straight to Cloudinary)
  // -------------------------------------------------------------------------
  let uploadsConfigPromise = null;
  function getUploadsConfig() {
    if (!uploadsConfigPromise) {
      uploadsConfigPromise = api('/api/admin/uploads/config')
        .then(json => json.data || { enabled: false })
        .catch((err) => {
          uploadsConfigPromise = null; // retry next time
          if (err instanceof AuthError) throw err;
          return { enabled: false };
        });
    }
    return uploadsConfigPromise;
  }

  const MIME_FORMATS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

  function checkImageFile(file, cfg) {
    if (!file) return 'No file selected.';
    if (!MIME_FORMATS[file.type]) return 'Please choose a JPG, PNG, WebP or AVIF image.';
    const max = (cfg && cfg.maxBytes) || 8 * 1024 * 1024;
    if (file.size > max) return `That image is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${Math.round(max / 1048576)} MB.`;
    return '';
  }

  /** Delivery URL with auto format/quality and a 1600px max width. */
  function optimizedCloudinaryUrl(secureUrl, cloudName, width = 1600) {
    const prefix = `https://res.cloudinary.com/${cloudName}/image/upload/`;
    if (!secureUrl || !secureUrl.startsWith(prefix)) return secureUrl;
    const rest = secureUrl.slice(prefix.length);
    return /^f_auto/.test(rest) ? secureUrl : `${prefix}f_auto,q_auto,c_limit,w_${width}/${rest}`;
  }

  async function uploadImage(file, onProgress) {
    const sig = (await api('/api/admin/uploads/sign', { method: 'POST', body: {} })).data;
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);
    form.append('allowed_formats', sig.allowed_formats);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', sig.uploadUrl);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let body = {};
        try { body = JSON.parse(xhr.responseText); } catch (err) { body = {}; }
        if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
          resolve({ ...body, url: optimizedCloudinaryUrl(body.secure_url, sig.cloudName) });
        } else {
          reject(new Error((body.error && body.error.message) || `Upload failed (${xhr.status}).`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error while uploading. Check your connection and try again.'));
      xhr.ontimeout = () => reject(new Error('The upload timed out. Please try again.'));
      xhr.timeout = 120000;
      xhr.send(form);
    });
  }

  // Cover image field: preview, upload, drag & drop, paste URL.
  const coverInput = $('modal-art-image');
  const coverFile = $('cover-file');
  const coverPreview = $('cover-preview');
  const coverEmpty = $('cover-preview-empty');
  const coverStatus = $('cover-status');
  const coverClear = $('cover-clear');
  const coverProgress = $('cover-progress');
  const coverProgressBar = $('cover-progress-bar');
  const coverDropzone = $('cover-dropzone');
  const coverUploadBtn = $('cover-upload-btn');
  const COVER_HINT = 'JPG, PNG, WebP or AVIF up to 8 MB. Best at 1600 × 900 px.';
  let coverUploading = false;

  function coverPreviewSrc(value) {
    const v = String(value || '').trim();
    if (!v || /["'()\\\s<>]/.test(v)) return '';
    if (/^https:\/\//i.test(v)) return v;
    if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return ''; // no other schemes
    return v.startsWith('/') ? v : `/${v}`;
  }

  function setCoverStatus(text, tone) {
    coverStatus.textContent = text;
    coverStatus.className = `text-[11px] ${tone === 'error' ? 'text-red-600 font-semibold' : tone === 'ok' ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`;
  }

  function refreshCoverPreview() {
    const src = coverPreviewSrc(coverInput.value);
    coverPreview.style.backgroundImage = src ? `url("${src}")` : '';
    coverEmpty.classList.toggle('hidden', !!src);
    coverClear.classList.toggle('hidden', !coverInput.value.trim());
  }

  function resetCoverField() {
    coverFile.value = '';
    coverProgress.classList.add('hidden');
    coverProgressBar.style.width = '0%';
    setCoverStatus(COVER_HINT);
    refreshCoverPreview();
  }

  async function handleCoverFile(file) {
    if (coverUploading) return;
    const cfg = await getUploadsConfig().catch(() => ({ enabled: false }));
    if (!cfg.enabled) {
      setCoverStatus('Image uploads are not configured yet (Cloudinary). Paste an image URL or path instead.', 'error');
      return;
    }
    const problem = checkImageFile(file, cfg);
    if (problem) { setCoverStatus(problem, 'error'); return; }

    coverUploading = true;
    $('btn-save-article').disabled = true;
    coverUploadBtn.classList.add('opacity-60', 'pointer-events-none');
    coverProgress.classList.remove('hidden');
    coverProgressBar.style.width = '0%';
    setCoverStatus(`Uploading ${file.name}…`);
    try {
      const result = await uploadImage(file, (pct) => {
        coverProgressBar.style.width = `${pct}%`;
        coverProgress.setAttribute('aria-valuenow', String(pct));
        setCoverStatus(`Uploading ${file.name}… ${pct}%`);
      });
      coverInput.value = result.url;
      refreshCoverPreview();
      const dims = result.width && result.height ? ` (${result.width} × ${result.height})` : '';
      const small = result.width && result.width < 1000 ? ' This image is quite small and may look soft on large screens.' : '';
      setCoverStatus(`Uploaded${dims}. Save the article to use it.${small}`, small ? 'error' : 'ok');
    } catch (err) {
      if (!(err instanceof AuthError)) setCoverStatus(err.message || 'Upload failed.', 'error');
    } finally {
      coverUploading = false;
      $('btn-save-article').disabled = false;
      coverUploadBtn.classList.remove('opacity-60', 'pointer-events-none');
      coverProgress.classList.add('hidden');
      coverFile.value = '';
    }
  }

  coverFile.addEventListener('change', () => handleCoverFile(coverFile.files[0]));
  coverInput.addEventListener('input', refreshCoverPreview);
  coverClear.addEventListener('click', () => { coverInput.value = ''; resetCoverField(); });
  ['dragenter', 'dragover'].forEach(type => coverDropzone.addEventListener(type, (e) => {
    e.preventDefault();
    coverDropzone.classList.add('border-brandOrange', 'bg-orange-50');
  }));
  ['dragleave', 'drop'].forEach(type => coverDropzone.addEventListener(type, (e) => {
    e.preventDefault();
    coverDropzone.classList.remove('border-brandOrange', 'bg-orange-50');
  }));
  coverDropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleCoverFile(file);
  });

  $('btn-create-article').addEventListener('click', () => {
    $('art-modal-title').textContent = 'Write New Insight';
    articleForm.reset();
    $('modal-art-slug').value = '';
    $('modal-art-author').value = 'THEWHY Practice Team';
    $('modal-art-readtime').value = '4 min read';
    $('modal-art-published').checked = true;
    articleError.classList.add('hidden');
    resetCoverField();
    articleModal.classList.remove('hidden');
  });

  $('btn-close-article-modal').addEventListener('click', () => articleModal.classList.add('hidden'));

  function editArticle(slug) {
    const art = state.articles.find(a => a.slug === slug);
    if (!art) return;
    $('art-modal-title').textContent = 'Edit Insight Article';
    $('modal-art-slug').value = art.slug;
    $('modal-art-title').value = art.title || '';
    $('modal-art-category').value = art.category || 'Corporate Compliance';
    $('modal-art-author').value = art.author || 'THEWHY Practice Team';
    $('modal-art-image').value = art.cover_image || '';
    $('modal-art-readtime').value = art.readTime || '4 min read';
    $('modal-art-excerpt').value = art.excerpt || '';
    $('modal-art-content').value = art.content || '';
    $('modal-art-published').checked = art.is_published !== false;
    articleError.classList.add('hidden');
    resetCoverField();
    articleModal.classList.remove('hidden');
  }

  articleForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (coverUploading) {
      articleError.textContent = 'Please wait for the image upload to finish.';
      articleError.classList.remove('hidden');
      return;
    }
    const slug = $('modal-art-slug').value;
    const payload = {
      title: $('modal-art-title').value,
      category: $('modal-art-category').value,
      author: $('modal-art-author').value,
      cover_image: $('modal-art-image').value,
      readTime: $('modal-art-readtime').value,
      excerpt: $('modal-art-excerpt').value,
      content: $('modal-art-content').value,
      is_published: $('modal-art-published').checked
    };
    articleError.classList.add('hidden');
    try {
      await api(slug ? `/api/insights/${encodeURIComponent(slug)}` : '/api/insights', {
        method: slug ? 'PUT' : 'POST',
        body: payload
      });
      articleModal.classList.add('hidden');
      await fetchArticles();
    } catch (err) {
      if (err instanceof AuthError) return;
      articleError.textContent = err.message || 'Failed to save article.';
      articleError.classList.remove('hidden');
    }
  });

  async function togglePublishArticle(slug, shouldPublish) {
    try {
      await api(`/api/insights/${encodeURIComponent(slug)}`, { method: 'PUT', body: { is_published: shouldPublish } });
      await fetchArticles();
    } catch (err) {
      reportError('Error changing publish state', err);
    }
  }

  async function deleteArticle(slug) {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      await api(`/api/insights/${encodeURIComponent(slug)}`, { method: 'DELETE' });
      await fetchArticles();
    } catch (err) {
      reportError('Error deleting article', err);
    }
  }

  $('articles-tbody').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const slug = btn.dataset.slug;
    if (btn.dataset.action === 'edit-article') editArticle(slug);
    if (btn.dataset.action === 'toggle-article') togglePublishArticle(slug, btn.dataset.publish === 'true');
    if (btn.dataset.action === 'delete-article') deleteArticle(slug);
  });

  // -------------------------------------------------------------------------
  // 5. BOOKINGS
  // -------------------------------------------------------------------------
  const bookingsSearch = $('bookings-search');
  const bookingsFilter = $('bookings-status-filter');

  function bookingQuery() {
    const params = new URLSearchParams();
    if (bookingsFilter.value && bookingsFilter.value !== 'ALL') params.set('status', bookingsFilter.value);
    if (bookingsSearch.value.trim()) params.set('search', bookingsSearch.value.trim());
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  async function fetchBookings() {
    try {
      const json = await api(`/api/bookings${bookingQuery()}`);
      state.bookings = json.data || [];
      renderBookings();
    } catch (err) {
      if (!(err instanceof AuthError)) console.error('Error fetching bookings:', err);
    }
  }

  function statusBadgeClass(status) {
    switch (status) {
      case 'CONFIRMED': return 'bg-blue-100 text-blue-700';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      case 'CANCELLED': return 'bg-slate-200 text-slate-600';
      default: return 'bg-amber-100 text-amber-700';
    }
  }

  function renderBookings() {
    const tbody = $('bookings-tbody');
    if (!tbody) return;
    if (state.bookings.length === 0) {
      tbody.innerHTML = emptyRow(7, 'No bookings match the current filters.');
      return;
    }
    tbody.innerHTML = state.bookings.map(b => {
      const id = escapeHtml(b.id || b.ref_code);
      const options = BOOKING_STATUSES.map(s =>
        `<option value="${s}" ${s === b.status ? 'selected' : ''}>${s.charAt(0) + s.slice(1).toLowerCase()}</option>`).join('');
      return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors align-top">
        <td class="py-3 px-4">
          <div class="font-mono font-bold text-slate-800">${escapeHtml(b.ref_code || '')}</div>
          <div class="text-[11px] text-slate-400">${escapeHtml(formatDate(b.createdAt))}</div>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-slate-800">${escapeHtml(b.clientName)}</div>
          <div class="text-[11px] text-slate-500">${escapeHtml(b.companyName || '')}</div>
          <div class="text-[11px] text-slate-400">${escapeHtml(b.companySize || '')}</div>
        </td>
        <td class="py-3 px-4">
          <div class="text-slate-700">${escapeHtml(b.email)}</div>
          <div class="text-[11px] text-slate-500">${escapeHtml(b.phone)}</div>
        </td>
        <td class="py-3 px-4">
          <div class="text-slate-700 font-semibold">${escapeHtml(b.service)}</div>
          <div class="text-[11px] text-slate-500">${escapeHtml(b.meetingType)}</div>
          ${b.estimatedFee ? `<div class="text-[11px] text-slate-400">Fee: ${escapeHtml(b.estimatedFee)}</div>` : ''}
          ${b.message ? `<div class="text-[11px] text-slate-500 mt-1 max-w-xs whitespace-pre-line">${escapeHtml(b.message)}</div>` : ''}
        </td>
        <td class="py-3 px-4">
          <div class="text-slate-700">${escapeHtml(b.date)}</div>
          <div class="text-[11px] text-slate-500">${escapeHtml(b.timeSlot)}</div>
        </td>
        <td class="py-3 px-4">
          <span class="inline-block mb-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass(b.status)}">${escapeHtml(b.status)}</span>
          <select data-action="booking-status" data-id="${id}" class="block px-2 py-1 rounded-lg border border-slate-300 bg-white text-[11px]">${options}</select>
        </td>
        <td class="py-3 px-4 text-right">
          <button type="button" data-action="delete-booking" data-id="${id}" class="px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[11px] font-semibold" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');
  }

  $('bookings-tbody').addEventListener('change', async (e) => {
    const sel = e.target.closest('select[data-action="booking-status"]');
    if (!sel) return;
    if (!BOOKING_STATUSES.includes(sel.value)) return;
    try {
      await api(`/api/bookings/${encodeURIComponent(sel.dataset.id)}`, { method: 'PATCH', body: { status: sel.value } });
      await fetchBookings();
    } catch (err) {
      reportError('Error updating booking', err);
      fetchBookings();
    }
  });

  $('bookings-tbody').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action="delete-booking"]');
    if (!btn) return;
    if (!confirm('Delete this booking permanently?')) return;
    try {
      await api(`/api/bookings/${encodeURIComponent(btn.dataset.id)}`, { method: 'DELETE' });
      await fetchBookings();
    } catch (err) {
      reportError('Error deleting booking', err);
    }
  });

  let searchTimer = null;
  bookingsSearch.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(fetchBookings, 300);
  });
  bookingsFilter.addEventListener('change', fetchBookings);
  $('btn-refresh-bookings').addEventListener('click', fetchBookings);

  $('btn-export-bookings').addEventListener('click', async () => {
    try {
      const res = await fetch(`/api/stats/export/bookings.csv${bookingQuery()}`, { credentials: 'same-origin' });
      if (res.status === 401) {
        showLogin('Your session has expired. Please sign in again.');
        return;
      }
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `THEWHY_Bookings_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      reportError('Error exporting bookings', err);
    }
  });

  // -------------------------------------------------------------------------
  // 6. INQUIRIES & APPLICATIONS
  // -------------------------------------------------------------------------
  async function fetchInquiries() {
    try {
      const json = await api('/api/inquiries');
      state.inquiries = json.data || [];
      renderInquiries();
    } catch (err) {
      if (!(err instanceof AuthError)) console.error('Error fetching inquiries:', err);
    }
  }

  function renderInquiries() {
    const container = $('inquiries-list');
    if (!container) return;
    if (state.inquiries.length === 0) {
      container.innerHTML = emptyCard('No client inquiries received yet.');
      return;
    }
    container.innerHTML = state.inquiries.map(inq => {
      const id = escapeHtml(inq.id || inq.ref_code);
      const status = inq.status || 'NEW';
      const badge = status === 'CONTACTED' || status === 'RESPONDED'
        ? 'bg-blue-100 text-blue-700'
        : (status === 'CLOSED' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700');
      return `
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
        <div class="flex justify-between items-start gap-3">
          <div>
            <div class="font-bold text-slate-800 text-sm">${escapeHtml(inq.name)}</div>
            ${inq.company ? `<div class="text-slate-600 font-semibold">${escapeHtml(inq.company)}</div>` : ''}
            <div class="text-slate-500">${escapeHtml(inq.email)} &bull; ${escapeHtml(inq.phone || 'No phone')}</div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badge}">${escapeHtml(status)}</span>
        </div>
        <div class="bg-slate-50 p-3 rounded-xl">
          <div class="font-semibold text-slate-700 text-[11px] mb-1">Service / Programme: ${escapeHtml(inq.serviceRequired || 'Consultation')}</div>
          <p class="text-slate-600 leading-relaxed whitespace-pre-line">${escapeHtml(inq.message || '')}</p>
        </div>
        <div class="flex justify-between items-center pt-1 text-[11px] text-slate-400 border-t border-slate-100">
          <span>Ref: ${escapeHtml(inq.ref_code || '')} &bull; ${escapeHtml(formatDate(inq.createdAt) || 'Recent')}</span>
          <div class="space-x-1 whitespace-nowrap">
            <button type="button" data-action="inquiry-status" data-status="CONTACTED" data-id="${id}" class="px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold">Mark Contacted</button>
            <button type="button" data-action="inquiry-status" data-status="CLOSED" data-id="${id}" class="px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold">Close</button>
            <button type="button" data-action="delete-inquiry" data-id="${id}" class="px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-semibold" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  $('inquiries-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    try {
      if (btn.dataset.action === 'inquiry-status') {
        await api(`/api/inquiries/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status: btn.dataset.status } });
      } else if (btn.dataset.action === 'delete-inquiry') {
        if (!confirm('Are you sure you want to delete this inquiry?')) return;
        await api(`/api/inquiries/${encodeURIComponent(id)}`, { method: 'DELETE' });
      } else {
        return;
      }
      await fetchInquiries();
    } catch (err) {
      reportError('Error updating inquiry', err);
    }
  });

  $('btn-refresh-inquiries').addEventListener('click', fetchInquiries);

  // -------------------------------------------------------------------------
  // 7. CONTACT MESSAGES
  // -------------------------------------------------------------------------
  async function fetchContacts() {
    try {
      const json = await api('/api/contact');
      state.contacts = json.data || [];
      renderContacts();
    } catch (err) {
      if (!(err instanceof AuthError)) console.error('Error fetching contact messages:', err);
    }
  }

  function renderContacts() {
    const container = $('contacts-list');
    if (!container) return;
    if (state.contacts.length === 0) {
      container.innerHTML = emptyCard('No contact messages received yet.');
      return;
    }
    container.innerHTML = state.contacts.map(c => {
      const id = escapeHtml(c.id || c.ref_code);
      const status = c.status || 'unread';
      const badge = status === 'responded' ? 'bg-emerald-100 text-emerald-700'
        : (status === 'unread' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700');
      return `
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
        <div class="flex justify-between items-start gap-3">
          <div>
            <div class="font-bold text-slate-800 text-sm">${escapeHtml(c.name)}</div>
            <div class="text-slate-500">${escapeHtml(c.email)} &bull; ${escapeHtml(c.phone || 'No phone')}</div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badge}">${escapeHtml(status)}</span>
        </div>
        <div class="bg-slate-50 p-3 rounded-xl">
          <div class="font-semibold text-slate-700 text-[11px] mb-1">Subject: ${escapeHtml(c.subject || 'General Inquiry')}</div>
          <p class="text-slate-600 leading-relaxed whitespace-pre-line">${escapeHtml(c.message || '')}</p>
        </div>
        <div class="flex justify-between items-center pt-1 text-[11px] text-slate-400 border-t border-slate-100">
          <span>Ref: ${escapeHtml(c.ref_code || '')} &bull; ${escapeHtml(formatDate(c.createdAt) || 'Recent')}</span>
          <div class="space-x-1 whitespace-nowrap">
            ${status !== 'responded' ? `<button type="button" data-action="contact-responded" data-id="${id}" class="px-2 py-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-semibold">Mark Responded</button>` : ''}
            <button type="button" data-action="delete-contact" data-id="${id}" class="px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-semibold" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  $('contacts-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    try {
      if (btn.dataset.action === 'contact-responded') {
        await api(`/api/contact/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status: 'responded' } });
      } else if (btn.dataset.action === 'delete-contact') {
        if (!confirm('Delete this message permanently?')) return;
        await api(`/api/contact/${encodeURIComponent(id)}`, { method: 'DELETE' });
      } else {
        return;
      }
      await fetchContacts();
    } catch (err) {
      reportError('Error updating message', err);
    }
  });

  $('btn-refresh-contacts').addEventListener('click', fetchContacts);

  // -------------------------------------------------------------------------
  // 8. NEWSLETTER
  // -------------------------------------------------------------------------
  async function fetchSubscribers() {
    try {
      const json = await api('/api/admin/newsletter');
      state.subscribers = json.data || [];
      renderSubscribers();
    } catch (err) {
      if (!(err instanceof AuthError)) console.error('Error fetching subscribers:', err);
    }
  }

  function renderSubscribers() {
    const tbody = $('newsletter-tbody');
    $('newsletter-count').textContent = String(state.subscribers.length);
    if (!tbody) return;
    if (state.subscribers.length === 0) {
      tbody.innerHTML = emptyRow(5, 'No subscribers yet.');
      return;
    }
    tbody.innerHTML = state.subscribers.map(s => `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4 font-semibold text-slate-800">${escapeHtml(s.email)}</td>
        <td class="py-3 px-4 text-slate-600">${escapeHtml(s.name || '')}</td>
        <td class="py-3 px-4 text-slate-500">${escapeHtml(s.source || '')}</td>
        <td class="py-3 px-4 text-slate-500">${escapeHtml(formatDate(s.createdAt))}</td>
        <td class="py-3 px-4 text-right">
          <button type="button" data-action="delete-subscriber" data-id="${escapeHtml(s.id)}" class="px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[11px] font-semibold" title="Remove">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>`).join('');
  }

  $('newsletter-tbody').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action="delete-subscriber"]');
    if (!btn) return;
    if (!confirm('Remove this subscriber?')) return;
    try {
      await api(`/api/admin/newsletter/${encodeURIComponent(btn.dataset.id)}`, { method: 'DELETE' });
      await fetchSubscribers();
    } catch (err) {
      reportError('Error removing subscriber', err);
    }
  });

  $('btn-refresh-newsletter').addEventListener('click', fetchSubscribers);
  $('btn-copy-newsletter').addEventListener('click', () => {
    const emails = state.subscribers.map(s => s.email).join(', ');
    if (!emails) return;
    navigator.clipboard.writeText(emails)
      .then(() => alert(`Copied ${state.subscribers.length} email address(es).`))
      .catch(() => prompt('Copy emails:', emails));
  });

  // -------------------------------------------------------------------------
  // 9. SEMINAR PAGE (stored as the launch campaign)
  // -------------------------------------------------------------------------
  async function fetchLaunchData() {
    try {
      const json = await api('/api/launch');
      const d = json.data || {};
      $('lp-title').value = d.title || '';
      $('lp-badge').value = d.badge || '';
      $('lp-headline').value = d.headline || '';
      $('lp-subtitle').value = d.subtitle || '';
      $('lp-date').value = d.startDate || '';
      $('lp-audience').value = d.targetAudience || '';
    } catch (err) {
      if (!(err instanceof AuthError)) console.error('Error fetching launch campaign:', err);
    }
  }

  $('launch-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const msg = $('launch-save-msg');
    msg.classList.add('hidden');
    try {
      await api('/api/admin/launch', {
        method: 'PUT',
        body: {
          title: $('lp-title').value,
          badge: $('lp-badge').value,
          headline: $('lp-headline').value,
          subtitle: $('lp-subtitle').value,
          startDate: $('lp-date').value,
          targetAudience: $('lp-audience').value
        }
      });
      flash(msg, 'Saved successfully!');
    } catch (err) {
      reportError('Error saving seminar page', err);
    }
  });

  // -------------------------------------------------------------------------
  // 10. WEBSITE TEXT & SETTINGS
  // -------------------------------------------------------------------------
  async function fetchSettings() {
    try {
      const json = await api('/api/admin/settings');
      const s = json.data || {};
      $('set-announcement').value = s.announcement || '';
      $('set-phone').value = s.phone || '';
      $('set-email').value = s.email || '';
      $('set-address-yaba').value = s.addressYaba || '';
      $('set-address-ikeja').value = s.addressIkeja || '';
    } catch (err) {
      if (!(err instanceof AuthError)) console.error('Error fetching site settings:', err);
    }
  }

  $('settings-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const msg = $('settings-save-msg');
    msg.classList.add('hidden');
    try {
      await api('/api/admin/settings', {
        method: 'PUT',
        body: {
          announcement: $('set-announcement').value,
          phone: $('set-phone').value,
          email: $('set-email').value,
          addressYaba: $('set-address-yaba').value,
          addressIkeja: $('set-address-ikeja').value
        }
      });
      flash(msg, 'Saved successfully!');
    } catch (err) {
      reportError('Error saving settings', err);
    }
  });

  // -------------------------------------------------------------------------
  // 11. MEDIA LIBRARY
  // -------------------------------------------------------------------------
  state.cloudMedia = [];
  state.cloudEnabled = null;

  async function fetchMedia() {
    try {
      const json = await api('/api/admin/media');
      state.media = json.data || [];
      renderMedia();
    } catch (err) {
      if (!(err instanceof AuthError)) console.error('Error fetching media:', err);
    }
    fetchCloudMedia();
  }

  async function fetchCloudMedia() {
    const grid = $('cloud-grid');
    grid.innerHTML = '<div class="col-span-4 text-center text-slate-400 py-6 text-xs">Loading Cloudinary images…</div>';
    try {
      const json = await api('/api/admin/uploads');
      state.cloudEnabled = json.enabled !== false;
      state.cloudMedia = json.data || [];
    } catch (err) {
      if (err instanceof AuthError) return;
      state.cloudMedia = [];
      grid.innerHTML = `<div class="col-span-4 text-center text-red-600 py-6 text-xs font-semibold">${escapeHtml(err.message)}</div>`;
      return;
    }
    renderCloudMedia();
  }

  function mediaCard(m) {
    const src = m.thumb || m.path;
    return `
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-2 group hover:shadow-md transition-all">
        <div class="aspect-video w-full rounded-xl overflow-hidden bg-slate-200 flex items-center justify-center relative">
          <img src="${escapeHtml(src)}" alt="${escapeHtml(m.name)}" loading="lazy" class="w-full h-full object-cover">
        </div>
        <div class="text-[11px] font-semibold text-slate-700 truncate" title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</div>
        <button type="button" data-action="copy-media" data-path="${escapeHtml(m.path)}" class="w-full py-1.5 bg-white border border-slate-200 hover:bg-brandOrange hover:text-white rounded-lg text-[10px] font-bold text-slate-600 transition-colors flex items-center justify-center gap-1">
          <i class="fa-regular fa-copy"></i> ${m.source === 'cloudinary' ? 'Copy URL' : 'Copy Path'}
        </button>
      </div>`;
  }

  function renderCloudMedia() {
    const grid = $('cloud-grid');
    if (state.cloudEnabled === false) {
      grid.innerHTML = '<div class="col-span-4 text-center text-slate-500 py-6 text-xs">Cloudinary is not configured. Add <code class="font-mono">CLOUDINARY_URL</code> to the server .env to enable uploads.</div>';
      $('media-upload-btn').classList.add('opacity-50', 'pointer-events-none');
      return;
    }
    $('media-upload-btn').classList.remove('opacity-50', 'pointer-events-none');
    grid.innerHTML = state.cloudMedia.length
      ? state.cloudMedia.map(mediaCard).join('')
      : '<div class="col-span-4 text-center text-slate-400 py-6 text-xs">No uploads yet. Use “Upload image” to add one.</div>';
  }

  function renderMedia() {
    const grid = $('media-grid');
    if (!grid) return;
    if (state.media.length === 0) {
      grid.innerHTML = '<div class="col-span-4 text-center text-slate-400 py-8 text-xs">No media assets found.</div>';
      return;
    }
    grid.innerHTML = state.media.map(mediaCard).join('');
  }

  function onCopyMedia(e) {
    const btn = e.target.closest('button[data-action="copy-media"]');
    if (!btn) return;
    const p = btn.dataset.path;
    navigator.clipboard.writeText(p)
      .then(() => alert(`Copied to clipboard: ${p}`))
      .catch(() => prompt('Copy this:', p));
  }
  $('media-grid').addEventListener('click', onCopyMedia);
  $('cloud-grid').addEventListener('click', onCopyMedia);

  $('media-file').addEventListener('change', async () => {
    const input = $('media-file');
    const file = input.files[0];
    const status = $('media-status');
    const btn = $('media-upload-btn');
    input.value = '';
    const cfg = await getUploadsConfig().catch(() => ({ enabled: false }));
    const problem = cfg.enabled ? checkImageFile(file, cfg) : 'Image uploads are not configured yet (Cloudinary).';
    if (problem) {
      status.textContent = problem;
      status.className = 'text-[11px] text-red-600 font-semibold';
      return;
    }
    btn.classList.add('opacity-60', 'pointer-events-none');
    status.className = 'text-[11px] text-slate-500';
    try {
      const result = await uploadImage(file, pct => { status.textContent = `Uploading ${file.name}… ${pct}%`; });
      status.textContent = `Uploaded ${file.name}. Use “Copy URL” to place it in an article.`;
      status.className = 'text-[11px] text-emerald-700 font-semibold';
      state.cloudMedia.unshift({
        name: file.name,
        path: result.url,
        thumb: optimizedCloudinaryUrl(result.secure_url, cfg.cloudName, 400),
        source: 'cloudinary'
      });
      renderCloudMedia();
    } catch (err) {
      if (err instanceof AuthError) return;
      status.textContent = err.message || 'Upload failed.';
      status.className = 'text-[11px] text-red-600 font-semibold';
    } finally {
      btn.classList.remove('opacity-60', 'pointer-events-none');
    }
  });

  // -------------------------------------------------------------------------
  // 10. PHOTO GALLERY MANAGER
  // -------------------------------------------------------------------------
  let selectedGalleryFile = null;

  async function fetchAdminGallery(append = false) {
    const grid = $('admin-gallery-grid');
    const counter = $('admin-gallery-counter');
    const loadMoreStrip = $('admin-gallery-load-more-strip');
    const loadMoreBtn = $('btn-admin-gallery-load-more');
    if (!grid) return;

    if (!append) {
      state.galleryPage = 1;
      grid.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200"><i class="fa-solid fa-circle-notch fa-spin text-brandOrange text-2xl mb-2"></i><p>Loading gallery items…</p></div>';
    } else if (loadMoreBtn) {
      loadMoreBtn.disabled = true;
      loadMoreBtn.innerHTML = 'Loading… <i class="fa-solid fa-circle-notch fa-spin ml-2"></i>';
    }

    try {
      const params = new URLSearchParams({
        page: String(state.galleryPage),
        limit: '36'
      });
      if (state.galleryFilter.album && state.galleryFilter.album !== 'All') {
        params.append('album', state.galleryFilter.album);
      }
      if (state.galleryFilter.category && state.galleryFilter.category !== 'All') {
        params.append('category', state.galleryFilter.category);
      }
      if (state.galleryFilter.status && state.galleryFilter.status !== 'all') {
        params.append('status', state.galleryFilter.status);
      }
      if (state.galleryFilter.search) {
        params.append('search', state.galleryFilter.search);
      }

      const json = await api(`/api/admin/gallery?${params.toString()}`);
      state.galleryTotal = json.total;
      state.galleryTotalPages = json.totalPages;
      if (Array.isArray(json.albums)) state.galleryAlbums = json.albums;
      if (Array.isArray(json.categories) && !append) state.galleryCategories = json.categories;
      syncGalleryFilterOptions();

      if (append) {
        state.gallery = state.gallery.concat(json.data || []);
      } else {
        state.gallery = json.data || [];
      }

      if (counter) counter.textContent = `Showing ${state.gallery.length} of ${state.galleryTotal} photos`;

      if (loadMoreStrip) {
        if (state.gallery.length >= state.galleryTotal || state.galleryPage >= state.galleryTotalPages) {
          loadMoreStrip.classList.add('hidden');
        } else {
          loadMoreStrip.classList.remove('hidden');
        }
      }

      renderAdminGallery();
    } catch (err) {
      if (err instanceof AuthError) return;
      console.error('Error fetching gallery:', err);
      if (!append && grid) {
        grid.innerHTML = `<div class="col-span-full py-8 text-center text-red-500 bg-white rounded-3xl border border-slate-200 text-xs">Error loading gallery photos: ${escapeHtml(err.message)}</div>`;
      }
    } finally {
      if (loadMoreBtn) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More Photos';
      }
    }
  }

  /** Grid-sized version of a gallery photo (pre-built thumbs for seeded photos, resized Cloudinary URL). */
  function galleryThumb(url) {
    const u = String(url || '');
    const local = /^\/assets\/img\/gallery\/(DSC_[^/]+)$/.exec(u);
    if (local) return `/assets/img/gallery/thumbs/${local[1]}`;
    const cloud = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:f_auto,q_auto,c_limit,w_\d+\/)?(.+)$/.exec(u);
    if (cloud) return `${cloud[1]}f_auto,q_auto,c_limit,w_720/${cloud[2]}`;
    return u;
  }

  function fillOptions(select, items, allLabel, current) {
    if (!select) return;
    select.innerHTML = `<option value="All">${escapeHtml(allLabel)}</option>` +
      items.map(i => `<option value="${escapeHtml(i.name)}">${escapeHtml(i.name)} (${i.count})</option>`).join('');
    select.value = items.some(i => i.name === current) ? current : 'All';
  }

  function fillDatalist(list, names) {
    if (!list) return;
    list.innerHTML = names.map(n => `<option value="${escapeHtml(n)}">`).join('');
  }

  const SUGGESTED_ALBUMS = ['Rent-An-Accountant Launch', 'Executive Seminars', 'Trainings & Workshops', 'Corporate Events', 'Team & Office'];
  const SUGGESTED_MOMENTS = ['Arrivals & Red Carpet', 'Keynotes & Presentations', 'Panel & Discussions', 'Networking & Guests', 'Executive Team & VIPs'];

  function syncGalleryFilterOptions() {
    fillOptions($('admin-gallery-album-filter'), state.galleryAlbums, 'All Albums', state.galleryFilter.album);
    fillOptions($('admin-gallery-cat-filter'), state.galleryCategories.filter(c => c.name && c.name !== 'General'), 'All Moments', state.galleryFilter.category);
    const albumNames = [...new Set(state.galleryAlbums.map(a => a.name).concat(SUGGESTED_ALBUMS))];
    const momentNames = [...new Set(state.galleryCategories.map(c => c.name).filter(n => n && n !== 'General').concat(SUGGESTED_MOMENTS))];
    fillDatalist($('gallery-album-options'), albumNames);
    fillDatalist($('gallery-category-options'), momentNames);
  }

  function renderAdminGallery() {
    const grid = $('admin-gallery-grid');
    if (!grid) return;
    if (state.gallery.length === 0) {
      grid.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 text-xs">No photos found matching your criteria. Click "Add / Upload Photo" to add one.</div>';
      return;
    }

    grid.innerHTML = state.gallery.map(item => {
      const id = escapeHtml(item.id);
      const isFeatured = !!item.is_featured;
      const isActive = item.is_active !== false;

      return `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group transition-all hover:shadow-md">
          <div class="relative h-44 bg-slate-100 overflow-hidden">
            <img src="${escapeHtml(galleryThumb(item.image_url))}" data-full="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" loading="lazy" class="w-full h-full object-cover transition-transform group-hover:scale-105">
            <div class="absolute top-2 right-2 flex gap-1.5">
              <button data-action="toggle-featured" data-id="${id}" class="w-7 h-7 rounded-lg ${isFeatured ? 'bg-amber-400 text-amber-950' : 'bg-slate-900/60 text-white hover:bg-slate-900'} flex items-center justify-center text-xs shadow-sm transition-colors" title="${isFeatured ? 'Featured (click to unfeature)' : 'Mark as featured'}">
                <i class="fa-solid fa-star"></i>
              </button>
              <button data-action="toggle-active" data-id="${id}" class="w-7 h-7 rounded-lg ${isActive ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'} flex items-center justify-center text-xs shadow-sm transition-colors" title="${isActive ? 'Active on site (click to hide)' : 'Hidden (click to show)'}">
                <i class="fa-solid ${isActive ? 'fa-eye' : 'fa-eye-slash'}"></i>
              </button>
            </div>
            <div class="absolute bottom-2 left-2">
              <span class="px-2 py-0.5 rounded-md bg-slate-900/80 text-white font-bold text-[10px] uppercase tracking-wider backdrop-blur-sm">
                ${escapeHtml(item.album || 'Gallery')}${item.category && item.category !== 'General' ? ' · ' + escapeHtml(item.category) : ''}
              </span>
            </div>
          </div>

          <div class="p-3.5 flex-1 flex flex-col justify-between gap-3 text-xs">
            <div>
              <h4 class="font-bold text-slate-800 line-clamp-2 leading-tight" title="${escapeHtml(item.title)}">
                ${escapeHtml(item.title)}
              </h4>
              <p class="text-[11px] text-slate-400 mt-1 line-clamp-1 font-mono">
                ${escapeHtml(item.image_url)}
              </p>
            </div>

            <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <div class="flex gap-1.5">
                <button data-action="edit-photo" data-id="${id}" class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-colors">
                  <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>
                <button data-action="copy-url" data-url="${escapeHtml(item.image_url)}" class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] transition-colors" title="Copy URL">
                  <i class="fa-regular fa-copy"></i>
                </button>
              </div>
              <button data-action="delete-photo" data-id="${id}" class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 text-[11px] transition-colors" title="Delete photo">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    bindAdminGalleryEvents();
  }

  function bindAdminGalleryEvents() {
    const grid = $('admin-gallery-grid');
    if (!grid) return;

    grid.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');

        if (action === 'toggle-featured') {
          const item = state.gallery.find(p => String(p.id) === String(id));
          if (!item) return;
          try {
            await api(`/api/admin/gallery/${id}`, {
              method: 'PUT',
              body: { is_featured: !item.is_featured }
            });
            item.is_featured = !item.is_featured;
            renderAdminGallery();
          } catch (err) {
            reportError('Failed to toggle featured status', err);
          }
        } else if (action === 'toggle-active') {
          const item = state.gallery.find(p => String(p.id) === String(id));
          if (!item) return;
          try {
            await api(`/api/admin/gallery/${id}`, {
              method: 'PUT',
              body: { is_active: !item.is_active }
            });
            item.is_active = !item.is_active;
            renderAdminGallery();
          } catch (err) {
            reportError('Failed to toggle active status', err);
          }
        } else if (action === 'edit-photo') {
          const item = state.gallery.find(p => String(p.id) === String(id));
          if (item) openGalleryModal(item);
        } else if (action === 'delete-photo') {
          if (!confirm('Are you sure you want to delete this photo from the gallery?')) return;
          try {
            await api(`/api/admin/gallery/${id}`, { method: 'DELETE' });
            state.gallery = state.gallery.filter(p => String(p.id) !== String(id));
            state.galleryTotal = Math.max(0, state.galleryTotal - 1);
            const counter = $('admin-gallery-counter');
            if (counter) counter.textContent = `Showing ${state.gallery.length} of ${state.galleryTotal} photos`;
            renderAdminGallery();
          } catch (err) {
            reportError('Failed to delete photo', err);
          }
        } else if (action === 'copy-url') {
          const url = btn.getAttribute('data-url');
          if (url) {
            navigator.clipboard.writeText(url).then(() => {
              btn.innerHTML = '<i class="fa-solid fa-check text-emerald-600"></i>';
              setTimeout(() => { btn.innerHTML = '<i class="fa-regular fa-copy"></i>'; }, 1500);
            });
          }
        }
      };
    });
  }

  // Gallery Modal Elements
  const galModal = $('gallery-modal');
  const galForm = $('gallery-form');
  const galId = $('modal-gal-id');
  const galTitle = $('modal-gal-title');
  const galAlbum = $('modal-gal-album');
  const galCategory = $('modal-gal-category');
  const galUploadNote = $('modal-gal-upload-note');
  const galProgress = $('modal-gal-progress');
  const galOrder = $('modal-gal-order');
  const galUrl = $('modal-gal-url');
  const galFile = $('modal-gal-file');
  const galCaption = $('modal-gal-caption');
  const galActive = $('modal-gal-active');
  const galFeatured = $('modal-gal-featured');
  const galPreviewBox = $('modal-gal-preview-box');
  const galPreviewEmpty = $('modal-gal-preview-empty');
  const galError = $('gallery-modal-error');
  const galSubmitBtn = $('btn-save-gallery-item');

  function updateGalPreview(src) {
    if (!galPreviewBox) return;
    if (src) {
      galPreviewBox.style.backgroundImage = `url("${src}")`;
      if (galPreviewEmpty) galPreviewEmpty.classList.add('hidden');
    } else {
      galPreviewBox.style.backgroundImage = '';
      if (galPreviewEmpty) galPreviewEmpty.classList.remove('hidden');
    }
  }

  function openGalleryModal(photo = null) {
    if (!galModal) return;
    selectedGalleryFile = null;
    if (galFile) galFile.value = '';
    if (galError) galError.classList.add('hidden');

    if (photo) {
      const modalTitle = $('gal-modal-title');
      if (modalTitle) modalTitle.textContent = 'Edit Photo Details';
      if (galId) galId.value = photo.id;
      if (galTitle) galTitle.value = photo.title || '';
      if (galAlbum) galAlbum.value = photo.album || '';
      if (galCategory) galCategory.value = photo.category && photo.category !== 'General' ? photo.category : '';
      if (galOrder) galOrder.value = photo.display_order !== undefined ? photo.display_order : 0;
      if (galUrl) galUrl.value = photo.image_url || '';
      if (galCaption) galCaption.value = photo.caption || '';
      if (galActive) galActive.checked = photo.is_active !== false;
      if (galFeatured) galFeatured.checked = !!photo.is_featured;
      updateGalPreview(photo.image_url);
    } else {
      const modalTitle = $('gal-modal-title');
      if (modalTitle) modalTitle.textContent = 'Add / Upload New Photo';
      if (galId) galId.value = '';
      if (galTitle) galTitle.value = '';
      if (galAlbum) galAlbum.value = state.galleryFilter.album !== 'All' ? state.galleryFilter.album : '';
      if (galCategory) galCategory.value = '';
      if (galOrder) galOrder.value = 0;
      if (galUrl) galUrl.value = '';
      if (galCaption) galCaption.value = '';
      if (galActive) galActive.checked = true;
      if (galFeatured) galFeatured.checked = false;
      updateGalPreview('');
    }

    setGalProgress(null);
    getUploadsConfig().then((cfg) => {
      if (!galUploadNote) return;
      galUploadNote.textContent = cfg.enabled
        ? ''
        : 'Cloudinary is not set up, so uploads are saved on the web server and can be lost when the site is redeployed. Add CLOUDINARY_URL on the server to keep uploaded photos permanently.';
      galUploadNote.classList.toggle('hidden', !!cfg.enabled);
    }).catch(() => {});

    galModal.classList.remove('hidden');
    if (galAlbum) setTimeout(() => (galAlbum.value ? galTitle : galAlbum).focus(), 0);
  }

  /** Shrink large camera photos (longest side 2400px, JPEG) before upload; small files pass through unchanged. */
  function downscaleImage(file, maxEdge = 2400) {
    return new Promise((resolve) => {
      if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type) || !window.createImageBitmap) return resolve(file);
      createImageBitmap(file).then((bmp) => {
        const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
        if (scale === 1 && file.size <= 3 * 1024 * 1024) { bmp.close && bmp.close(); return resolve(file); }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bmp.width * scale);
        canvas.height = Math.round(bmp.height * scale);
        canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
        bmp.close && bmp.close();
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file);
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.86);
      }).catch(() => resolve(file));
    });
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Could not read the image file.'));
      r.readAsDataURL(file);
    });
  }

  function setGalProgress(pct) {
    if (!galProgress) return;
    galProgress.classList.toggle('hidden', pct == null);
    const bar = galProgress.firstElementChild;
    if (bar) bar.style.width = `${pct || 0}%`;
  }

  function closeGalleryModal() {
    if (galModal) galModal.classList.add('hidden');
    selectedGalleryFile = null;
    if (galFile) galFile.value = '';
    if (galError) galError.classList.add('hidden');
  }

  $('btn-add-gallery-item')?.addEventListener('click', () => openGalleryModal());
  $('btn-close-gallery-modal')?.addEventListener('click', closeGalleryModal);
  galModal?.addEventListener('click', (e) => {
    if (e.target === galModal) closeGalleryModal();
  });

  galUrl?.addEventListener('input', (e) => updateGalPreview(e.target.value.trim()));

  galFile?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!/\.(jpe?g|png|webp|avif)$/i.test(file.name)) {
      if (galError) {
        galError.textContent = 'Please choose a JPG, PNG, WebP or AVIF image file.';
        galError.classList.remove('hidden');
      }
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      if (galError) {
        galError.textContent = 'Image file exceeds the 20 MB limit.';
        galError.classList.remove('hidden');
      }
      return;
    }

    if (galError) galError.classList.add('hidden');
    const reader = new FileReader();
    reader.onload = (ev) => {
      selectedGalleryFile = {
        file,
        name: file.name,
        data: ev.target.result
      };
      updateGalPreview(ev.target.result);
      if (galTitle && !galTitle.value.trim()) {
        galTitle.value = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      }
    };
    reader.readAsDataURL(file);
  });

  galForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (galError) galError.classList.add('hidden');
    if (galSubmitBtn) {
      galSubmitBtn.disabled = true;
      galSubmitBtn.innerHTML = 'Saving… <i class="fa-solid fa-circle-notch fa-spin ml-2"></i>';
    }

    const id = galId.value;
    const album = galAlbum ? galAlbum.value.trim() : '';
    const category = galCategory.value.trim() || 'General';
    const title = galTitle.value.trim() || [album, category !== 'General' ? category : ''].filter(Boolean).join(' - ') || 'Gallery photo';
    const order = parseInt(galOrder.value || 0, 10);
    const caption = galCaption.value.trim();
    const is_active = galActive.checked;
    const is_featured = galFeatured.checked;

    try {
      if (!album) throw new Error('Please choose or type an album name.');
      const cfg = selectedGalleryFile ? await getUploadsConfig() : null;
      if (selectedGalleryFile && cfg && cfg.enabled) {
        // Straight to Cloudinary, then save the record with the hosted URL.
        const file = await downscaleImage(selectedGalleryFile.file);
        const problem = checkImageFile(file, cfg);
        if (problem) throw new Error(problem);
        setGalProgress(0);
        const uploaded = await uploadImage(file, setGalProgress);
        const payload = { title, image_url: uploaded.url, album, category, caption, display_order: order, is_active, is_featured };
        if (id) {
          await api(`/api/admin/gallery/${id}`, { method: 'PUT', body: payload });
        } else {
          await api('/api/admin/gallery', { method: 'POST', body: payload });
        }
      } else if (selectedGalleryFile) {
        const small = await downscaleImage(selectedGalleryFile.file);
        if (small !== selectedGalleryFile.file) selectedGalleryFile.data = await readAsDataUrl(small);
        const res = await api('/api/admin/gallery/upload', {
          method: 'POST',
          body: {
            filename: selectedGalleryFile.name,
            data: selectedGalleryFile.data,
            title,
            album,
            category,
            caption,
            display_order: order,
            is_active,
            is_featured
          }
        });

        if (id && res.data && res.data.id !== id) {
          await api(`/api/admin/gallery/${id}`, {
            method: 'PUT',
            body: {
              image_url: res.url,
              title,
              album,
              category,
              caption,
              display_order: order,
              is_active,
              is_featured
            }
          });
          await api(`/api/admin/gallery/${res.data.id}`, { method: 'DELETE' });
        }
      } else {
        const image_url = galUrl.value.trim();
        if (!image_url) {
          throw new Error('Please choose an image file or provide an image URL.');
        }

        const payload = {
          title,
          image_url,
          album,
          category,
          caption,
          display_order: order,
          is_active,
          is_featured
        };

        if (id) {
          await api(`/api/admin/gallery/${id}`, {
            method: 'PUT',
            body: payload
          });
        } else {
          await api('/api/admin/gallery', {
            method: 'POST',
            body: payload
          });
        }
      }

      setGalProgress(null);
      closeGalleryModal();
      fetchAdminGallery();
    } catch (err) {
      setGalProgress(null);
      if (galError) {
        galError.textContent = err.message || 'Failed to save photo.';
        galError.classList.remove('hidden');
      }
    } finally {
      if (galSubmitBtn) {
        galSubmitBtn.disabled = false;
        galSubmitBtn.textContent = 'Save Photo Details';
      }
    }
  });

  $('admin-gallery-album-filter')?.addEventListener('change', (e) => {
    state.galleryFilter.album = e.target.value;
    state.galleryFilter.category = 'All';
    state.galleryPage = 1;
    fetchAdminGallery();
  });

  // Missing thumbnail (uploaded photo): show the full image instead.
  $('admin-gallery-grid')?.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName === 'IMG' && img.dataset.full && !img.src.endsWith(img.dataset.full)) img.src = img.dataset.full;
  }, true);

  $('admin-gallery-cat-filter')?.addEventListener('change', (e) => {
    state.galleryFilter.category = e.target.value;
    state.galleryPage = 1;
    fetchAdminGallery();
  });

  $('admin-gallery-status-filter')?.addEventListener('change', (e) => {
    state.galleryFilter.status = e.target.value;
    state.galleryPage = 1;
    fetchAdminGallery();
  });

  let adminGalSearchTimer = null;
  $('admin-gallery-search')?.addEventListener('input', (e) => {
    clearTimeout(adminGalSearchTimer);
    adminGalSearchTimer = setTimeout(() => {
      state.galleryFilter.search = e.target.value.trim();
      state.galleryPage = 1;
      fetchAdminGallery();
    }, 300);
  });

  $('btn-admin-gallery-load-more')?.addEventListener('click', () => {
    if (state.galleryPage < state.galleryTotalPages) {
      state.galleryPage += 1;
      fetchAdminGallery(true);
    }
  });

  // -------------------------------------------------------------------------
  // Boot: check the server-side session
  // -------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkSession);
  } else {
    checkSession();
  }
})();
