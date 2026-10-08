/**
 * THEWHY CONSULTING - Executive Management Dashboard
 * Blog CRUD, bookings, inquiries, contact messages, newsletter, launch page,
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
  // 9. PRODUCT LAUNCH PAGE
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
      reportError('Error saving launch page', err);
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
  // Boot: check the server-side session
  // -------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkSession);
  } else {
    checkSession();
  }
})();
