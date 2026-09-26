/**
 * THEWHY CONSULTING - Executive Management Dashboard JavaScript
 * Powers Blog CRUD, Inquiries, Product Launch Manager, Website Settings, and Media Library.
 */

(function () {
  let allArticles = [];
  let allInquiries = [];
  let allMedia = [];

  // 1. AUTHENTICATION & PASSCODE
  const authModal = document.getElementById('auth-modal');
  const authForm = document.getElementById('auth-form');
  const authPasscode = document.getElementById('auth-passcode');
  const authError = document.getElementById('auth-error');
  const logoutBtn = document.getElementById('admin-logout-btn');

  function checkAuth() {
    if (sessionStorage.getItem('whyng_admin_auth') === 'true') {
      authModal.classList.add('hidden');
      initDashboard();
    } else {
      authModal.classList.remove('hidden');
    }
  }

  authForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const pass = authPasscode.value.trim();
    authError.classList.add('hidden');

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: pass })
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('whyng_admin_auth', 'true');
        authModal.classList.add('hidden');
        initDashboard();
      } else {
        authError.innerText = data.error || 'Invalid passcode.';
        authError.classList.remove('hidden');
      }
    } catch (err) {
      authError.innerText = 'Authentication error. Please try again.';
      authError.classList.remove('hidden');
    }
  });

  logoutBtn.addEventListener('click', function () {
    sessionStorage.removeItem('whyng_admin_auth');
    authModal.classList.remove('hidden');
    authPasscode.value = '';
  });

  // 2. TAB SWITCHING
  const tabBtns = document.querySelectorAll('.tab-btn');
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
      const activeContent = document.getElementById(target);
      if (activeContent) activeContent.classList.remove('hidden');

      if (target === 'tab-media' && allMedia.length === 0) fetchMedia();
      if (target === 'tab-launch') fetchLaunchData();
      if (target === 'tab-website-text') fetchSettings();
    });
  });

  // 3. DASHBOARD INITIALIZATION
  function initDashboard() {
    fetchArticles();
    fetchInquiries();
    fetchLaunchData();
    fetchSettings();
  }

  // 4. BLOG & INSIGHTS MANAGEMENT
  async function fetchArticles() {
    try {
      const res = await fetch('/api/insights');
      const json = await res.json();
      if (json.success) {
        allArticles = json.data;
        renderArticles();
      }
    } catch (err) {
      console.error('Error fetching articles:', err);
    }
  }

  function renderArticles() {
    const tbody = document.getElementById('articles-tbody');
    if (!tbody) return;

    if (allArticles.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">No articles published yet. Click "Write New Article".</td></tr>`;
      return;
    }

    tbody.innerHTML = allArticles.map(art => `
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
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${art.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
            ${art.is_published ? 'Published' : 'Draft'}
          </span>
        </td>
        <td class="py-3 px-4 text-right space-x-2">
          <a href="/article?slug=${encodeURIComponent(art.slug)}" target="_blank" class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-[11px] font-semibold" title="View Article">
            <i class="fa-solid fa-eye"></i>
          </a>
          <button onclick="window.editArticle('${escapeHtml(art.slug)}')" class="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-[11px] font-semibold" title="Edit Article">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button onclick="window.togglePublishArticle('${escapeHtml(art.slug)}', ${!art.is_published})" class="px-2.5 py-1 rounded-lg ${art.is_published ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'} text-[11px] font-semibold">
            ${art.is_published ? 'Unpublish' : 'Publish'}
          </button>
          <button onclick="window.deleteArticle('${escapeHtml(art.slug)}')" class="px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[11px] font-semibold" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Article Modal Handlers
  const articleModal = document.getElementById('article-modal');
  const btnCreateArticle = document.getElementById('btn-create-article');
  const btnCloseModal = document.getElementById('btn-close-article-modal');
  const articleForm = document.getElementById('article-form');

  btnCreateArticle.addEventListener('click', () => {
    document.getElementById('art-modal-title').innerText = 'Write New Insight';
    document.getElementById('modal-art-slug').value = '';
    articleForm.reset();
    document.getElementById('modal-art-author').value = 'THEWHY Practice Team';
    document.getElementById('modal-art-readtime').value = '4 min read';
    document.getElementById('modal-art-published').checked = true;
    articleModal.classList.remove('hidden');
  });

  btnCloseModal.addEventListener('click', () => articleModal.classList.add('hidden'));

  window.editArticle = function (slug) {
    const art = allArticles.find(a => a.slug === slug);
    if (!art) return;

    document.getElementById('art-modal-title').innerText = 'Edit Insight Article';
    document.getElementById('modal-art-slug').value = art.slug;
    document.getElementById('modal-art-title').value = art.title || '';
    document.getElementById('modal-art-category').value = art.category || 'Corporate Compliance';
    document.getElementById('modal-art-author').value = art.author || 'THEWHY Practice Team';
    document.getElementById('modal-art-image').value = art.cover_image || '';
    document.getElementById('modal-art-readtime').value = art.readTime || '4 min read';
    document.getElementById('modal-art-excerpt').value = art.excerpt || '';
    document.getElementById('modal-art-content').value = art.content || '';
    document.getElementById('modal-art-published').checked = art.is_published !== false;

    articleModal.classList.remove('hidden');
  };

  articleForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const slug = document.getElementById('modal-art-slug').value;
    const isEdit = !!slug;

    const payload = {
      title: document.getElementById('modal-art-title').value,
      category: document.getElementById('modal-art-category').value,
      author: document.getElementById('modal-art-author').value,
      cover_image: document.getElementById('modal-art-image').value,
      readTime: document.getElementById('modal-art-readtime').value,
      excerpt: document.getElementById('modal-art-excerpt').value,
      content: document.getElementById('modal-art-content').value,
      is_published: document.getElementById('modal-art-published').checked
    };

    const url = isEdit ? `/api/insights/${encodeURIComponent(slug)}` : '/api/insights';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        articleModal.classList.add('hidden');
        await fetchArticles();
      } else {
        alert(data.error || 'Failed to save article.');
      }
    } catch (err) {
      alert('Error saving article: ' + err.message);
    }
  });

  window.togglePublishArticle = async function (slug, shouldPublish) {
    try {
      const res = await fetch(`/api/insights/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: shouldPublish })
      });
      const data = await res.json();
      if (data.success) await fetchArticles();
    } catch (err) {
      alert('Error toggling publish state: ' + err.message);
    }
  };

  window.deleteArticle = async function (slug) {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      const res = await fetch(`/api/insights/${encodeURIComponent(slug)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) await fetchArticles();
    } catch (err) {
      alert('Error deleting article: ' + err.message);
    }
  };

  // 5. INQUIRIES MANAGEMENT
  async function fetchInquiries() {
    try {
      const res = await fetch('/api/inquiries');
      const json = await res.json();
      if (json.success) {
        allInquiries = json.data;
        renderInquiries();
      }
    } catch (err) {
      console.error('Error fetching inquiries:', err);
    }
  }

  function renderInquiries() {
    const container = document.getElementById('inquiries-list');
    if (!container) return;

    if (allInquiries.length === 0) {
      container.innerHTML = `<div class="col-span-2 py-8 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 text-xs">No client inquiries received yet.</div>`;
      return;
    }

    container.innerHTML = allInquiries.map(inq => `
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-bold text-slate-800 text-sm">${escapeHtml(inq.name)}</div>
            <div class="text-slate-500">${escapeHtml(inq.email)} &bull; ${escapeHtml(inq.phone || 'No phone')}</div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${inq.status === 'CONTACTED' ? 'bg-blue-100 text-blue-700' : (inq.status === 'CLOSED' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700')}">
            ${inq.status || 'NEW'}
          </span>
        </div>

        <div class="bg-slate-50 p-3 rounded-xl">
          <div class="font-semibold text-slate-700 text-[11px] mb-1">Service / Program: ${escapeHtml(inq.serviceRequired || 'Consultation')}</div>
          <p class="text-slate-600 leading-relaxed">${escapeHtml(inq.message || '')}</p>
        </div>

        <div class="flex justify-between items-center pt-1 text-[11px] text-slate-400 border-t border-slate-100">
          <span>Ref: ${escapeHtml(inq.ref_code || inq.id || '')} &bull; ${inq.createdAt ? new Date(inq.createdAt).toLocaleDateString() : 'Recent'}</span>
          <div class="space-x-1">
            <button onclick="window.updateInquiryStatus('${escapeHtml(inq.id || inq.ref_code)}', 'CONTACTED')" class="px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold">Mark Contacted</button>
            <button onclick="window.deleteInquiry('${escapeHtml(inq.id || inq.ref_code)}')" class="px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-semibold"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('btn-refresh-inquiries').addEventListener('click', fetchInquiries);

  window.updateInquiryStatus = async function (id, status) {
    try {
      const res = await fetch(`/api/inquiries/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) await fetchInquiries();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  window.deleteInquiry = async function (id) {
    if (!confirm('Are you sure you want to delete this inquiry?')) return;
    try {
      const res = await fetch(`/api/inquiries/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) await fetchInquiries();
    } catch (err) {
      alert('Error deleting inquiry: ' + err.message);
    }
  };

  // 6. PRODUCT LAUNCH PAGE MANAGEMENT
  async function fetchLaunchData() {
    try {
      const res = await fetch('/api/launch');
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        document.getElementById('lp-title').value = d.title || '';
        document.getElementById('lp-badge').value = d.badge || '';
        document.getElementById('lp-headline').value = d.headline || '';
        document.getElementById('lp-subtitle').value = d.subtitle || '';
        document.getElementById('lp-date').value = d.startDate || '';
        document.getElementById('lp-audience').value = d.targetAudience || '';
      }
    } catch (err) {
      console.error('Error fetching launch campaign:', err);
    }
  }

  document.getElementById('launch-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const msg = document.getElementById('launch-save-msg');
    msg.classList.add('hidden');

    const payload = {
      title: document.getElementById('lp-title').value,
      badge: document.getElementById('lp-badge').value,
      headline: document.getElementById('lp-headline').value,
      subtitle: document.getElementById('lp-subtitle').value,
      startDate: document.getElementById('lp-date').value,
      targetAudience: document.getElementById('lp-audience').value
    };

    try {
      const res = await fetch('/api/admin/launch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        msg.innerText = 'Saved successfully!';
        msg.classList.remove('hidden');
        setTimeout(() => msg.classList.add('hidden'), 3000);
      }
    } catch (err) {
      alert('Error saving launch page: ' + err.message);
    }
  });

  // 7. WEBSITE TEXT & SETTINGS
  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.success && json.data) {
        const s = json.data;
        document.getElementById('set-announcement').value = s.announcement || '';
        document.getElementById('set-phone').value = s.phone || '';
        document.getElementById('set-email').value = s.email || '';
        document.getElementById('set-address-yaba').value = s.addressYaba || '';
        document.getElementById('set-address-ikeja').value = s.addressIkeja || '';
      }
    } catch (err) {
      console.error('Error fetching site settings:', err);
    }
  }

  document.getElementById('settings-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const msg = document.getElementById('settings-save-msg');
    msg.classList.add('hidden');

    const payload = {
      announcement: document.getElementById('set-announcement').value,
      phone: document.getElementById('set-phone').value,
      email: document.getElementById('set-email').value,
      addressYaba: document.getElementById('set-address-yaba').value,
      addressIkeja: document.getElementById('set-address-ikeja').value
    };

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        msg.innerText = 'Saved successfully!';
        msg.classList.remove('hidden');
        setTimeout(() => msg.classList.add('hidden'), 3000);
      }
    } catch (err) {
      alert('Error saving settings: ' + err.message);
    }
  });

  // 8. MEDIA LIBRARY
  async function fetchMedia() {
    try {
      const res = await fetch('/api/admin/media');
      const json = await res.json();
      if (json.success) {
        allMedia = json.data;
        renderMedia();
      }
    } catch (err) {
      console.error('Error fetching media:', err);
    }
  }

  function renderMedia() {
    const grid = document.getElementById('media-grid');
    if (!grid) return;

    if (allMedia.length === 0) {
      grid.innerHTML = `<div class="col-span-4 text-center text-slate-400 py-8 text-xs">No media assets found.</div>`;
      return;
    }

    grid.innerHTML = allMedia.map(m => `
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-2 group hover:shadow-md transition-all">
        <div class="aspect-video w-full rounded-xl overflow-hidden bg-slate-200 flex items-center justify-center relative">
          <img src="${escapeHtml(m.path)}" alt="${escapeHtml(m.name)}" class="w-full h-full object-cover">
        </div>
        <div class="text-[11px] font-semibold text-slate-700 truncate" title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</div>
        <button onclick="window.copyMediaPath('${escapeHtml(m.path)}')" class="w-full py-1.5 bg-white border border-slate-200 hover:bg-brandOrange hover:text-white rounded-lg text-[10px] font-bold text-slate-600 transition-colors flex items-center justify-center gap-1">
          <i class="fa-regular fa-copy"></i> Copy Path
        </button>
      </div>
    `).join('');
  }

  window.copyMediaPath = function (path) {
    navigator.clipboard.writeText(path).then(() => {
      alert('Path copied to clipboard: ' + path);
    }).catch(() => {
      prompt('Copy path:', path);
    });
  };

  // Helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Run initial authentication check on load
  document.addEventListener('DOMContentLoaded', checkAuth);
})();
