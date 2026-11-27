// admin/js/dashboard.js
// Floralyn Admin Dashboard — Complete SPA Logic
// Uses Supabase JS v2 for auth, database, and storage

'use strict';

// ================================================================
// ⚙️ CONFIGURATION
// ================================================================
window.FloralynConfig = {
  SUPABASE_URL:      'https://znycuzuveqhybqgevjvj.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpueWN1enV2ZXFoeWJxZ2V2anZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MTcyMTQsImV4cCI6MjEwNjE5MzIxNH0.cPYdpp6peTFX4e88K4yb8f1tbaV96ifqoy7TrCyEAxQ',
};

// ================================================================
// IMAGE COMPRESSION
// Client-side compression before upload — reduces storage costs
// and speeds up page loads on the public gallery.
// ================================================================
async function compressImage(file, maxPx = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const ratio  = Math.min(maxPx / Math.max(img.width, img.height), 1);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          blob => blob
            ? resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
            : reject(new Error('Compression failed')),
          'image/jpeg', quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ================================================================
// ADMIN APP CLASS
// ================================================================
class FloralynAdmin {
  constructor() {
    this.db          = null;
    this.currentView = 'dashboard';
    this.currentAppt = null;
    this._confirmResolve = null;
    this._previewBound   = false;
  }

  // ── Initialization ─────────────────────────────────────────────
  async init() {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.FloralynConfig;
    if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') return;
    this.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await this.checkAuth();
  }

  async checkAuth() {
    const { data: { session } } = await this.db.auth.getSession();
    if (!session) { window.location.href = '/admin/'; return; }

    document.getElementById('auth-loading').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    this.bindNavigation();
    this.bindMobileHeader();
    this.bindLogout();
    this.bindModals();
    this.bindGalleryUpload();
    this.bindSettingsForm();
    this.bindFilters();

    await this.loadView('dashboard');

    this.db.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') window.location.href = '/admin/';
    });
  }

  // ── Navigation ──────────────────────────────────────────────────
  bindNavigation() {
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.loadView(btn.dataset.view);
        this.closeSidebar();
      });
    });
  }

  async loadView(view) {
    this.currentView = view;

    document.querySelectorAll('.nav-item').forEach(btn => {
      const isActive = btn.dataset.view === view;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    document.querySelectorAll('.view').forEach(v => {
      v.style.display = v.id === `view-${view}` ? '' : 'none';
    });

    const titles = {
      dashboard:    'Dashboard',
      appointments: 'Appointments',
      gallery:      'Gallery',
      services:     'Services & Prices',
      content:      'Shades, Hero & FAQ',
      promotions:   'Offer Banner',
      settings:     'Settings',
      audit:        'Audit Log',
      preview:      'Preview',
    };
    const mobileTitle = document.getElementById('mobile-title');
    if (mobileTitle) mobileTitle.textContent = titles[view] || view;

    const loaders = {
      dashboard:    () => this.loadDashboard(),
      appointments: () => this.loadAppointments(),
      gallery:      () => this.loadGallery(),
      services:     () => this.loadServices(),
      content:      () => this.loadSiteContent(),
      promotions:   () => this.loadPromotions(),
      settings:     () => this.loadSettings(),
      audit:        () => this.loadAuditLog(),
      preview:      () => this.loadPreview(),
    };
    if (loaders[view]) await loaders[view]();
  }

  // ── Mobile Sidebar ─────────────────────────────────────────────
  bindMobileHeader() {
    const hamburger = document.getElementById('hamburger-btn');
    const overlay   = document.getElementById('sidebar-overlay');
    hamburger?.addEventListener('click', () => this.toggleSidebar());
    overlay?.addEventListener('click',   () => this.closeSidebar());
  }

  toggleSidebar() {
    const sidebar   = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburger-btn');
    const overlay   = document.getElementById('sidebar-overlay');
    const isOpen    = sidebar.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    overlay.classList.toggle('visible', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
    overlay.setAttribute('aria-hidden', !isOpen);
  }

  closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('hamburger-btn')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('visible');
  }

  // ── Logout ──────────────────────────────────────────────────────
  bindLogout() {
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      const confirmed = await this.confirm('Sign out of Floralyn Admin?', 'Sign Out');
      if (!confirmed) return;
      await this.audit('LOGOUT', null, null, {});
      await this.db.auth.signOut();
      window.location.href = '/admin/';
    });
  }

  // ── Dashboard ───────────────────────────────────────────────────
  async loadDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const plus7 = new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0];

    const dashDate = document.getElementById('dash-date');
    if (dashDate) dashDate.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const [apptRes, galleryRes, servicesRes] = await Promise.all([
      this.db.from('appointments').select('id, status, preferred_date'),
      this.db.from('gallery').select('id, visible').eq('visible', true),
      this.db.from('services').select('id, enabled').eq('enabled', true),
    ]);

    const appts    = apptRes.data   || [];
    const gallery  = galleryRes.data  || [];
    const services = servicesRes.data || [];

    const pending   = appts.filter(a => a.status === 'PENDING').length;
    const confirmed = appts.filter(a => a.status === 'CONFIRMED').length;
    const upcoming  = appts.filter(a =>
      ['CONFIRMED', 'PENDING'].includes(a.status) &&
      a.preferred_date >= today && a.preferred_date <= plus7
    ).length;

    this.setText('stat-total',     appts.length);
    this.setText('stat-pending',   pending);
    this.setText('stat-confirmed', confirmed);
    this.setText('stat-upcoming',  upcoming);
    this.setText('stat-gallery',   gallery.length);
    this.setText('stat-services',  services.length);

    const { data: recent } = await this.db
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    const container = document.getElementById('recent-appointments');
    if (!container) return;

    if (!recent || recent.length === 0) {
      container.innerHTML = this.emptyState('📅', 'No appointments yet');
      return;
    }

    container.innerHTML = (recent || []).map(a => this.renderApptCard(a)).join('');
    container.querySelectorAll('.appt-card').forEach(card => {
      card.addEventListener('click', () => this.openApptModal(card.dataset.id));
    });
  }

  // ── Appointments ────────────────────────────────────────────────
  async loadAppointments() {
    const status   = document.getElementById('filter-status')?.value  || 'ALL';
    const search   = (document.getElementById('filter-search')?.value || '').trim().toLowerCase();
    const dateFrom = document.getElementById('filter-date')?.value   || '';

    let query = this.db.from('appointments').select('*').order('created_at', { ascending: false });
    if (status !== 'ALL') query = query.eq('status', status);
    if (dateFrom)         query = query.gte('preferred_date', dateFrom);

    const { data, error } = await query.limit(100);
    const container = document.getElementById('appointments-list');
    if (!container) return;

    if (error) {
      container.innerHTML = `<p style="color:var(--danger);padding:20px">Failed to load appointments.</p>`;
      return;
    }

    let appts = data || [];
    if (search) {
      appts = appts.filter(a =>
        a.name?.toLowerCase().includes(search) ||
        a.phone?.toLowerCase().includes(search) ||
        a.service?.toLowerCase().includes(search) ||
        a.email?.toLowerCase().includes(search)
      );
    }

    if (appts.length === 0) {
      container.innerHTML = this.emptyState('📅', 'No appointments found matching your filters');
      return;
    }

    container.innerHTML = appts.map(a => this.renderApptCard(a)).join('');
    container.querySelectorAll('.appt-card').forEach(card => {
      card.addEventListener('click', () => this.openApptModal(card.dataset.id));
    });
  }

  bindFilters() {
    ['filter-status', 'filter-date'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        if (this.currentView === 'appointments') this.loadAppointments();
      });
    });

    let searchTimer;
    document.getElementById('filter-search')?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        if (this.currentView === 'appointments') this.loadAppointments();
      }, 300);
    });

    document.getElementById('filter-reset')?.addEventListener('click', () => {
      ['filter-status', 'filter-search', 'filter-date'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = id === 'filter-status' ? 'ALL' : '';
      });
      if (this.currentView === 'appointments') this.loadAppointments();
    });

    document.getElementById('audit-refresh')?.addEventListener('click', () => this.loadAuditLog());
  }

  renderApptCard(a) {
    const date = a.preferred_date
      ? new Date(a.preferred_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';

    return `
      <div class="appt-card" data-id="${this.esc(a.id)}" tabindex="0" role="button"
           aria-label="View appointment for ${this.esc(a.name)}">
        <div>
          <div class="appt-name">${this.esc(a.name)}</div>
          <div class="appt-phone">📞 ${this.esc(a.phone)}</div>
          <div class="appt-service">💅 ${this.esc(a.service)}</div>
          <div class="appt-meta">📅 ${date} • ${this.esc(a.preferred_time || '—')}</div>
        </div>
        <div class="appt-right">
          <span class="badge badge-${this.esc(a.status)}">${this.esc(a.status)}</span>
          <span style="font-size:11px;color:var(--text-muted)">${this.timeAgo(a.created_at)}</span>
        </div>
      </div>`;
  }

  async openApptModal(id) {
    const { data: a, error } = await this.db
      .from('appointments').select('*').eq('id', id).single();
    if (error || !a) { this.toast('Could not load appointment.', 'error'); return; }

    this.currentAppt = a;

    const date    = a.preferred_date ? new Date(a.preferred_date + 'T00:00:00').toLocaleDateString('en-IN', { dateStyle: 'long' }) : '—';
    const created = a.created_at ? new Date(a.created_at).toLocaleString('en-IN') : '—';

    const body = document.getElementById('appt-modal-body');
    const foot = document.getElementById('appt-modal-footer');

    body.innerHTML = `
      <div class="appt-detail-grid">
        <div class="appt-detail-field">
          <label>Customer Name</label>
          <p>${this.esc(a.name)}</p>
        </div>
        <div class="appt-detail-field">
          <label>Phone</label>
          <p><a href="tel:${this.esc(this.safeTel(a.phone))}">${this.esc(a.phone)}</a></p>
        </div>
        <div class="appt-detail-field">
          <label>Email</label>
          <p>${a.email ? `<a href="mailto:${this.esc(a.email.replace(/[\r\n\s<>]/g, ''))}">${this.esc(a.email)}</a>` : '<span style="color:var(--text-muted)">Not provided</span>'}</p>
        </div>
        <div class="appt-detail-field">
          <label>Instagram</label>
          <p>${a.instagram ? this.esc(a.instagram) : '<span style="color:var(--text-muted)">Not provided</span>'}</p>
        </div>
        <div class="appt-detail-field">
          <label>Date</label>
          <p>${date}</p>
        </div>
        <div class="appt-detail-field">
          <label>Time</label>
          <p>${this.esc(a.preferred_time || '—')}</p>
        </div>
        <div class="appt-detail-field appt-detail-full">
          <label>Service</label>
          <p>${this.esc(a.service)}</p>
        </div>
        ${a.message ? `
        <div class="appt-detail-field appt-detail-full">
          <label>Customer Message</label>
          <p>${this.esc(a.message)}</p>
        </div>` : ''}
        <div class="appt-detail-field">
          <label>Current Status</label>
          <p><span class="badge badge-${this.esc(a.status)}">${this.esc(a.status)}</span></p>
        </div>
        <div class="appt-detail-field">
          <label>Submitted</label>
          <p>${created}</p>
        </div>
        <div class="appt-detail-field appt-detail-full">
          <label>Reference ID</label>
          <p style="font-family:monospace;font-size:12px;color:var(--text-muted)">${this.esc(a.id)}</p>
        </div>
      </div>

      <div class="status-actions">
        <span style="font-size:12px;color:var(--text-muted);align-self:center;">Change status:</span>
        ${a.status !== 'CONFIRMED'  ? `<button class="status-btn btn-confirm"  data-status="CONFIRMED">✅ Confirm</button>`    : ''}
        ${a.status !== 'DECLINED'   ? `<button class="status-btn btn-decline"  data-status="DECLINED">❌ Decline</button>`    : ''}
        ${a.status !== 'COMPLETED'  ? `<button class="status-btn btn-complete" data-status="COMPLETED">🏁 Complete</button>` : ''}
        ${a.status !== 'CANCELLED'  ? `<button class="status-btn btn-cancel"   data-status="CANCELLED">🚫 Cancel</button>`   : ''}
      </div>

      <div class="appt-notes-group">
        <label for="appt-notes-input">Private Notes (owner only)</label>
        <textarea id="appt-notes-input" placeholder="Add internal notes…" maxlength="2000">${this.esc(a.notes || '')}</textarea>
      </div>`;

    foot.innerHTML = `
      <button class="btn-secondary" id="appt-delete-btn">🗑️ Delete</button>
      <button class="btn-secondary" id="appt-notes-save">💾 Save Notes</button>
      <button class="btn-primary" id="appt-modal-done">Done</button>`;

    body.querySelectorAll('.status-btn').forEach(btn => {
      btn.addEventListener('click', () => this.changeApptStatus(a.id, btn.dataset.status));
    });

    foot.querySelector('#appt-notes-save').addEventListener('click', async () => {
      const notes = document.getElementById('appt-notes-input').value.slice(0, 2000);
      await this.db.from('appointments').update({ notes }).eq('id', a.id);
      this.toast('Notes saved.', 'success');
      await this.audit('UPDATE_NOTES', 'appointment', a.id, { name: a.name });
    });

    foot.querySelector('#appt-delete-btn').addEventListener('click', async () => {
      const confirmed = await this.confirm(
        `Permanently delete ${a.name}'s appointment? This cannot be undone.`,
        'Delete Permanently', true
      );
      if (!confirmed) return;
      await this.db.from('appointments').delete().eq('id', a.id);
      await this.audit('DELETE_APPOINTMENT', 'appointment', a.id, { name: a.name });
      this.closeApptModal();
      this.toast('Appointment deleted.', 'success');
      if (this.currentView === 'appointments') await this.loadAppointments();
      else await this.loadDashboard();
    });

    foot.querySelector('#appt-modal-done').addEventListener('click', () => this.closeApptModal());
    this.openModal('appt-modal-overlay');
  }

  async changeApptStatus(id, newStatus) {
    const confirmed = await this.confirm(`Set appointment status to ${newStatus}?`, 'Update Status');
    if (!confirmed) return;

    const { error } = await this.db.from('appointments').update({ status: newStatus }).eq('id', id);
    if (error) { this.toast('Failed to update status.', 'error'); return; }

    await this.audit('UPDATE_STATUS', 'appointment', id, { status: newStatus, name: this.currentAppt?.name });
    this.toast(`Status updated to ${newStatus}.`, 'success');
    this.closeApptModal();
    if (this.currentView === 'appointments') await this.loadAppointments();
    else await this.loadDashboard();
  }

  closeApptModal() { this.closeModal('appt-modal-overlay'); }

  // ── Gallery ─────────────────────────────────────────────────────
  async loadGallery() {
    const container = document.getElementById('gallery-grid-admin');
    if (!container) return;

    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading gallery…</p></div>`;

    const [{ data, error }, metaRes] = await Promise.all([
      this.db.from('gallery').select('*').order('sort_order', { ascending: true }),
      this.db.from('settings').select('value').eq('key', 'gallery_meta').maybeSingle(),
    ]);

    this._galleryMeta = metaRes?.data?.value || {};

    if (error) {
      container.innerHTML = `<p style="color:var(--danger)">Failed to load gallery.</p>`;
      return;
    }

    if (!data || data.length === 0) {
      container.innerHTML = this.emptyState('🖼️', 'No photos yet — upload your first gallery image!');
      return;
    }

    const catLabels = { studio: 'Real Chair Sets', floral: 'Florals & Velvet', bridal: 'Bridal & Minimal' };
    container.innerHTML = data.map((item, idx) => {
      const meta = this._galleryMeta[item.id] || {};
      const catTag = catLabels[meta.category] || 'Studio Set';
      return `
      <div class="gallery-item ${item.visible ? '' : 'gallery-item-hidden'}" data-id="${this.esc(item.id)}">
        <img
          src="${this.esc(this.safeUrl(item.public_url))}"
          alt="${this.esc(item.alt_text || 'Gallery image')}"
          loading="lazy" />
        <div style="padding:8px 10px 0;font-size:11px;color:var(--text-secondary)">
          <div style="font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this.esc(item.title || 'Untitled Look')}</div>
          <div style="font-size:10px;color:var(--text-muted)">${this.esc(catTag)}</div>
        </div>
        <div class="gallery-item-controls">
          <button class="btn-edit-gallery" data-id="${this.esc(item.id)}" title="Edit title, category and alt text">✏️ Edit</button>
          <button class="btn-move-up" data-id="${this.esc(item.id)}" data-idx="${idx}" title="Move up" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn-move-dn" data-id="${this.esc(item.id)}" data-idx="${idx}" title="Move down" ${idx === data.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn-toggle-gallery" data-id="${this.esc(item.id)}" data-visible="${item.visible}" title="${item.visible ? 'Hide' : 'Show'}">
            ${item.visible ? '👁️ Hide' : '🙈 Show'}
          </button>
          <button class="btn-del btn-del-gallery" data-id="${this.esc(item.id)}" title="Delete photo">🗑️</button>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('.btn-edit-gallery').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = data.find(i => i.id === btn.dataset.id);
        if (item) this.openGalleryEditModal(item);
      });
    });

    container.querySelectorAll('.btn-toggle-gallery').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleGalleryVisibility(btn.dataset.id, btn.dataset.visible === 'true');
      });
    });

    container.querySelectorAll('.btn-del-gallery').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteGalleryItem(btn.dataset.id, data);
      });
    });

    // Sort order: move up
    container.querySelectorAll('.btn-move-up').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx  = parseInt(btn.dataset.idx, 10);
        if (idx <= 0) return;
        const curr = data[idx];
        const prev = data[idx - 1];
        await Promise.all([
          this.db.from('gallery').update({ sort_order: prev.sort_order }).eq('id', curr.id),
          this.db.from('gallery').update({ sort_order: curr.sort_order }).eq('id', prev.id),
        ]);
        await this.loadGallery();
      });
    });

    // Sort order: move down
    container.querySelectorAll('.btn-move-dn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx  = parseInt(btn.dataset.idx, 10);
        if (idx >= data.length - 1) return;
        const curr = data[idx];
        const next = data[idx + 1];
        await Promise.all([
          this.db.from('gallery').update({ sort_order: next.sort_order }).eq('id', curr.id),
          this.db.from('gallery').update({ sort_order: curr.sort_order }).eq('id', next.id),
        ]);
        await this.loadGallery();
      });
    });
  }

  bindGalleryUpload() {
    const input = document.getElementById('gallery-file-input');
    if (!input) return;

    input.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
      const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB pre-compression
      const MAX_BATCH      = 20;

      if (files.length > MAX_BATCH) {
        this.toast(`Max ${MAX_BATCH} files per upload batch.`, 'error');
        return;
      }

      // Validate type and size before compression
      const invalid = files.filter(f => !ALLOWED_TYPES.has(f.type) || f.size > MAX_SIZE_BYTES);
      if (invalid.length > 0) {
        this.toast(`${invalid.length} file(s) rejected. Only JPEG, PNG, WebP, AVIF up to 15 MB.`, 'error');
      }
      const valid = files.filter(f => ALLOWED_TYPES.has(f.type) && f.size <= MAX_SIZE_BYTES);
      if (!valid.length) return;

      const progressDiv  = document.getElementById('upload-progress');
      const progressFill = document.getElementById('upload-fill');
      const statusText   = document.getElementById('upload-status-text');

      progressDiv.style.display = '';
      progressFill.style.width  = '0%';

      // Get current max sort_order
      const { data: sortData } = await this.db
        .from('gallery').select('sort_order').order('sort_order', { ascending: false }).limit(1);
      let nextOrder = (sortData?.[0]?.sort_order ?? 0) + 100;

      let successCount = 0;
      for (let i = 0; i < valid.length; i++) {
        const file = valid[i];
        statusText.textContent = `Compressing ${i + 1}/${valid.length}: ${file.name}`;

        let compressed;
        try {
          compressed = await compressImage(file);
        } catch (compressErr) {
          this.toast(`Compression failed for ${file.name}.`, 'error');
          continue;
        }

        // Sanitized storage path — no user-controlled characters in filename
        const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        statusText.textContent = `Uploading ${i + 1}/${valid.length}: ${file.name}`;

        const { error: uploadErr } = await this.db.storage
          .from('gallery')
          .upload(path, compressed, { contentType: 'image/jpeg', upsert: false });

        if (uploadErr) {
          this.toast(`Upload failed for ${file.name}: ${uploadErr.message}`, 'error');
          continue;
        }

        const { data: { publicUrl } } = this.db.storage.from('gallery').getPublicUrl(path);

        // Get dimensions from compressed canvas (reuse the image)
        const dims = await this._getImageDimensions(compressed);

        const { error: dbErr } = await this.db.from('gallery').insert({
          storage_path: path,
          public_url:   publicUrl,
          alt_text:     'Nail art by Floralyn',
          visible:      true,
          sort_order:   nextOrder,
          file_size:    compressed.size,
          width:        dims.w,
          height:       dims.h,
        });

        if (dbErr) {
          this.toast(`Database error for ${file.name}: ${dbErr.message}`, 'error');
          continue;
        }

        await this.audit('GALLERY_UPLOAD', 'gallery', path, {
          filename: file.name,
          original_size: file.size,
          compressed_size: compressed.size,
        });

        nextOrder += 100;
        successCount++;
        progressFill.style.width = `${Math.round(((i + 1) / valid.length) * 100)}%`;
      }

      statusText.textContent = `Done! ${successCount}/${valid.length} photo(s) uploaded.`;
      input.value = '';
      setTimeout(() => { progressDiv.style.display = 'none'; }, 2500);

      if (successCount > 0) {
        await this.loadGallery();
        this.toast(`${successCount} photo(s) uploaded successfully.`, 'success');
      }
    });
  }

  /** Returns image dimensions from a File/Blob */
  _getImageDimensions(file) {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({ w: img.naturalWidth, h: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => { resolve({ w: 0, h: 0 }); URL.revokeObjectURL(url); };
      img.src = url;
    });
  }

  openGalleryEditModal(item) {
    const meta = (this._galleryMeta || {})[item.id] || {};
    document.getElementById('gallery-edit-id').value    = item.id;
    document.getElementById('gallery-edit-preview').src = this.safeUrl(item.public_url);
    document.getElementById('gallery-edit-alt').value   = item.alt_text || '';
    document.getElementById('gallery-edit-title').value = item.title || '';
    const techEl = document.getElementById('gallery-edit-tech');
    if (techEl) techEl.value = meta.tech || '';
    const catEl = document.getElementById('gallery-edit-cat');
    if (catEl) catEl.value = meta.category || 'studio';
    this.openModal('gallery-modal-overlay');
  }

  async toggleGalleryVisibility(id, currentVisible) {
    const newVisible = !currentVisible;
    await this.db.from('gallery').update({ visible: newVisible }).eq('id', id);
    await this.audit('GALLERY_TOGGLE', 'gallery', id, { visible: newVisible });
    this.toast(newVisible ? 'Photo is now visible.' : 'Photo is now hidden.', 'success');
    await this.loadGallery();
  }

  async deleteGalleryItem(id, data) {
    const item = data.find(i => i.id === id);
    if (!item) return;

    const confirmed = await this.confirm(
      'Delete this photo permanently? It will be removed from the website.',
      'Delete Photo', true
    );
    if (!confirmed) return;

    if (item.storage_path) {
      await this.db.storage.from('gallery').remove([item.storage_path]);
    }
    await this.db.from('gallery').delete().eq('id', id);
    await this.audit('GALLERY_DELETE', 'gallery', id, { path: item.storage_path });
    this.toast('Photo deleted.', 'success');
    await this.loadGallery();
  }

  // ── Services & Prices (Unified CRUD + Display Metadata) ─────────
  async loadServices() {
    const [{ data, error }, dispRes] = await Promise.all([
      this.db.from('services').select('*').order('sort_order', { ascending: true }),
      this.db.from('settings').select('value').eq('key', 'services_display').maybeSingle(),
    ]);

    this._servicesDisplay = dispRes?.data?.value || {};
    this._servicesList    = data || [];

    const container = document.getElementById('services-list');
    if (!container) return;

    if (error) {
      container.innerHTML = `<p style="color:var(--danger)">Failed to load services.</p>`;
      return;
    }

    if (!data || data.length === 0) {
      container.innerHTML = this.emptyState('💅', 'No services yet. Click "+ Add Service" to create one.');
      return;
    }

    container.innerHTML = data.map((s, idx) => {
      const m = this._servicesDisplay[s.id] || this._servicesDisplay[s.name] || {};
      const includesHtml = Array.isArray(m.includes) && m.includes.length
        ? m.includes.map(tag => `<span class="svc-chip-dur">${this.esc(tag)}</span>`).join('')
        : '';
      return `
      <div class="service-card ${s.enabled ? '' : 'disabled'}" data-id="${this.esc(s.id)}">
        <label class="toggle-switch" title="${s.enabled ? 'Disable service' : 'Enable service'}">
          <input type="checkbox" class="service-toggle" data-id="${this.esc(s.id)}" ${s.enabled ? 'checked' : ''} aria-label="Enable ${this.esc(s.name)}" />
          <span class="toggle-slider"></span>
        </label>
        <div class="service-info">
          <div class="service-name">
            <span>${this.esc(m.icon || '💅')}</span>
            <span>${this.esc(s.name)}</span>
            ${m.tag ? `<span class="svc-chip-tag">${this.esc(m.tag)}</span>` : ''}
            ${m.featured ? `<span class="svc-chip-tag" style="background:#fef3c7;color:#92400e">★ Featured</span>` : ''}
          </div>
          ${s.description ? `<div class="service-desc">${this.esc(s.description)}</div>` : ''}
          <div class="service-meta-chips">
            ${m.price ? `<span class="svc-chip-price">${this.esc(m.price)}</span>` : '<span class="svc-chip-dur">Price not set</span>'}
            ${m.duration ? `<span class="svc-chip-dur">⏱ ${this.esc(m.duration)}</span>` : ''}
            ${includesHtml}
          </div>
        </div>
        <div class="service-actions">
          <button class="btn-secondary btn-svc-up" data-idx="${idx}" title="Move up" ${idx === 0 ? 'disabled' : ''} style="font-size:12px;padding:6px 10px;">↑</button>
          <button class="btn-secondary btn-svc-dn" data-idx="${idx}" title="Move down" ${idx === data.length - 1 ? 'disabled' : ''} style="font-size:12px;padding:6px 10px;">↓</button>
          <button class="btn-secondary btn-edit-service" data-id="${this.esc(s.id)}" style="font-size:12px;padding:6px 12px;">✏️ Edit</button>
          <button class="btn-secondary btn-del-service" data-id="${this.esc(s.id)}" style="font-size:12px;padding:6px 12px;color:var(--danger);border-color:var(--danger)">🗑️</button>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('.service-toggle').forEach(toggle => {
      toggle.addEventListener('change', async () => {
        await this.db.from('services').update({ enabled: toggle.checked }).eq('id', toggle.dataset.id);
        await this.audit('SERVICE_TOGGLE', 'service', toggle.dataset.id, { enabled: toggle.checked });
        this.toast(`Service ${toggle.checked ? 'enabled' : 'disabled'}.`, 'success');
        await this.loadServices();
      });
    });

    container.querySelectorAll('.btn-svc-up').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (idx <= 0) return;
        const curr = data[idx], prev = data[idx - 1];
        await Promise.all([
          this.db.from('services').update({ sort_order: prev.sort_order }).eq('id', curr.id),
          this.db.from('services').update({ sort_order: curr.sort_order }).eq('id', prev.id),
        ]);
        await this.loadServices();
      });
    });

    container.querySelectorAll('.btn-svc-dn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (idx >= data.length - 1) return;
        const curr = data[idx], next = data[idx + 1];
        await Promise.all([
          this.db.from('services').update({ sort_order: next.sort_order }).eq('id', curr.id),
          this.db.from('services').update({ sort_order: curr.sort_order }).eq('id', next.id),
        ]);
        await this.loadServices();
      });
    });

    container.querySelectorAll('.btn-edit-service').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = data.find(x => x.id === btn.dataset.id);
        if (s) this.openServiceModal(s);
      });
    });

    container.querySelectorAll('.btn-del-service').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = data.find(x => x.id === btn.dataset.id);
        if (s) this.deleteService(s);
      });
    });

    const addSvcBtn = document.getElementById('add-service-btn');
    if (addSvcBtn && !addSvcBtn._bound) {
      addSvcBtn._bound = true;
      addSvcBtn.addEventListener('click', () => this.openServiceModal(null));
    }
  }

  openServiceModal(service) {
    const DEFAULTS = {
      'Simple Manicure': { price: 'from ₹300', duration: '~45 min', tag: '', icon: '🌸', featured: false, includes: ['Cuticle Ritual', 'Shaping', 'Classic Gloss'] },
      'Gel Nails': { price: 'from ₹700', duration: '~60 min', tag: '', icon: '✨', featured: false, includes: ['Natural Builder', '2–4 Wk Wear', 'Glaze / Ombre'] },
      'Custom Design': { price: 'from ₹1,200', duration: '~90 min', tag: 'Signature Atelier', icon: '🎨', featured: true, includes: ['100% Freehand', '3D / Velvet Art', 'Mood Consultation'] },
      'Bridal / Special Occasion': { price: 'from ₹2,000', duration: '~2 hrs', tag: '', icon: '💍', featured: false, includes: ['Outfit Matching', 'Micro-Pearls & Foil', 'Private Prep'] },
    };
    const def = service ? (DEFAULTS[service.name] || {}) : {};
    const m   = service ? ((this._servicesDisplay || {})[service.id] || (this._servicesDisplay || {})[service.name] || {}) : {};
    const inc = Array.isArray(m.includes) && m.includes.length ? m.includes : (def.includes || []);
    document.getElementById('service-edit-id').value         = service?.id || '';
    document.getElementById('service-edit-name').value       = service?.name || '';
    document.getElementById('service-edit-desc').value       = service?.description || m.description || '';
    document.getElementById('service-edit-price').value      = m.price || def.price || '';
    document.getElementById('service-edit-dur').value        = m.duration || def.duration || '';
    document.getElementById('service-edit-tag').value        = m.tag !== undefined ? m.tag : (def.tag || '');
    document.getElementById('service-edit-icon').value       = m.icon || def.icon || '💅';
    document.getElementById('service-edit-includes').value   = inc.join(', ');
    document.getElementById('service-edit-featured').checked = m.featured !== undefined ? Boolean(m.featured) : Boolean(def.featured);
    document.getElementById('service-modal-title').textContent = service ? 'Edit Service & Price' : 'Add New Service';
    this.openModal('service-modal-overlay');
  }

  async deleteService(s) {
    const confirmed = await this.confirm(
      `Delete "${s.name}"? This will remove it from both the Service Menu and booking form.`,
      'Delete Service', true
    );
    if (!confirmed) return;
    await this.db.from('services').delete().eq('id', s.id);
    if (this._servicesDisplay) {
      delete this._servicesDisplay[s.id];
      delete this._servicesDisplay[s.name];
      await this.db.from('settings').upsert([{ key: 'services_display', value: this._servicesDisplay }], { onConflict: 'key' });
    }
    await this.audit('DELETE_SERVICE', 'service', s.id, { name: s.name });
    this.toast('Service deleted.', 'success');
    await this.loadServices();
  }

  // ── Settings ────────────────────────────────────────────────────
  async loadSettings() {
    const { data } = await this.db
      .from('settings')
      .select('*')
      .in('key', ['business', 'booking', 'timeslots']);

    if (!data) return;

    const biz      = data.find(r => r.key === 'business')?.value  || {};
    const booking  = data.find(r => r.key === 'booking')?.value   || {};
    const timeslots = data.find(r => r.key === 'timeslots')?.value || [];

    // Business info
    this.setVal('s-name',        biz.name        || 'Floralyn');
    this.setVal('s-email',       biz.email       || 'floralyyn7@gmail.com');
    this.setVal('s-instagram',   biz.instagram   || 'https://www.instagram.com/floralyn_nails_07');
    this.setVal('s-phone',       biz.phone       || '');
    this.setVal('s-location',    biz.location    || 'Jetpur, Gujarat · 360370');
    this.setVal('s-hours-text',  biz.hours_text  || 'Mon – Sat · 10 AM – 7 PM');
    this.setVal('s-closed-note', biz.closed_note || 'Closed Sundays · Appointment Only');
    const showPhoneCb = document.getElementById('s-show-phone');
    if (showPhoneCb) showPhoneCb.checked = Boolean(biz.show_phone);

    // Booking rules
    this.setVal('s-min-days', booking.advance_days_min     ?? 1);
    this.setVal('s-max-days', booking.advance_days_max     ?? 90);
    this.setVal('s-open',     booking.business_hours_start || '10:00');
    this.setVal('s-close',    booking.business_hours_end   || '19:00');

    // Closed days
    const closedDays = booking.closed_days || [];
    document.querySelectorAll('#closed-days-grid input[type="checkbox"]').forEach(cb => {
      cb.checked = closedDays.includes(parseInt(cb.value, 10));
    });

    // Time slots editor
    this._renderTimeslots(Array.isArray(timeslots) ? timeslots : []);

    // Wire up Add Time Slot button (only once)
    const addBtn = document.getElementById('add-timeslot-btn');
    if (addBtn && !addBtn._bound) {
      addBtn._bound = true;
      addBtn.addEventListener('click', () => {
        this._addTimeslotRow({ group: 'Morning', time: '', label: '' });
      });
    }
  }

  _renderTimeslots(slots) {
    const editor = document.getElementById('timeslots-editor');
    if (!editor) return;
    editor.innerHTML = '';
    slots.forEach(slot => this._addTimeslotRow(slot));
  }

  _addTimeslotRow(slot = { group: 'Morning', time: '', label: '' }) {
    const editor = document.getElementById('timeslots-editor');
    if (!editor) return;

    const row = document.createElement('div');
    row.className = 'timeslot-row';
    row.innerHTML = `
      <select class="ts-group">
        <option ${slot.group === 'Morning'   ? 'selected' : ''}>Morning</option>
        <option ${slot.group === 'Afternoon' ? 'selected' : ''}>Afternoon</option>
        <option ${slot.group === 'Evening'   ? 'selected' : ''}>Evening</option>
      </select>
      <input type="time" class="ts-time"  value="${this.esc(slot.time  || '')}" />
      <input type="text" class="ts-label" value="${this.esc(slot.label || '')}" placeholder="Display label e.g. 10:00 AM" maxlength="30" />
      <button type="button" class="timeslot-del" title="Remove slot">✕</button>`;

    row.querySelector('.timeslot-del').addEventListener('click', () => row.remove());
    editor.appendChild(row);
  }

  _collectTimeslots() {
    const rows = document.querySelectorAll('#timeslots-editor .timeslot-row');
    return Array.from(rows).map(row => ({
      group: row.querySelector('.ts-group').value,
      time:  row.querySelector('.ts-time').value,
      label: row.querySelector('.ts-label').value.trim(),
    })).filter(s => s.time);  // only include rows with a time set
  }

  _collectClosedDays() {
    const checked = document.querySelectorAll('#closed-days-grid input[type="checkbox"]:checked');
    return Array.from(checked).map(cb => parseInt(cb.value, 10));
  }

  bindSettingsForm() {
    const form = document.getElementById('settings-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Strip HTML from all string inputs
      const strip = str => str.replace(/<[^>]*>/g, '').trim();

      const bizData = {
        name:        strip(this.getVal('s-name')),
        email:       strip(this.getVal('s-email')),
        instagram:   strip(this.getVal('s-instagram')),
        phone:       strip(this.getVal('s-phone')),
        location:    strip(this.getVal('s-location')),
        hours_text:  strip(this.getVal('s-hours-text')),
        closed_note: strip(this.getVal('s-closed-note')),
        show_phone:  Boolean(document.getElementById('s-show-phone')?.checked),
      };

      const minRaw = parseInt(this.getVal('s-min-days'), 10);
      const maxRaw = parseInt(this.getVal('s-max-days'), 10);
      const bookingData = {
        advance_days_min:     Number.isFinite(minRaw) ? Math.max(0, Math.min(30, minRaw)) : 1,
        advance_days_max:     Number.isFinite(maxRaw) ? Math.max(1, Math.min(365, maxRaw)) : 90,
        business_hours_start: this.getVal('s-open'),
        business_hours_end:   this.getVal('s-close'),
        closed_days:          this._collectClosedDays(),
      };

      const slotsData = this._collectTimeslots();

      const { error } = await this.db.from('settings').upsert([
        { key: 'business',  value: bizData },
        { key: 'booking',   value: bookingData },
        { key: 'timeslots', value: slotsData },
      ], { onConflict: 'key' });

      if (error) {
        this.toast(`Save failed: ${error.message}`, 'error');
        return;
      }

      await this.audit('UPDATE_SETTINGS', 'settings', null, {
        slots_count: slotsData.length,
        closed_days: bookingData.closed_days,
      });

      const statusEl = document.getElementById('settings-status');
      if (statusEl) {
        statusEl.textContent = '✅ Settings saved!';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
      }

      this.toast('Settings saved successfully.', 'success');
    });
  }

  // ── Audit Log ───────────────────────────────────────────────────
  async loadAuditLog() {
    const { data, error } = await this.db
      .from('audit_log').select('*').order('created_at', { ascending: false }).limit(50);

    const container = document.getElementById('audit-list');
    if (!container) return;

    if (error) {
      container.innerHTML = `<p style="color:var(--danger)">Failed to load audit log.</p>`;
      return;
    }

    if (!data || data.length === 0) {
      container.innerHTML = this.emptyState('📋', 'No audit entries yet.');
      return;
    }

    container.innerHTML = data.map(entry => `
      <div class="audit-entry">
        <div class="audit-time">${new Date(entry.created_at).toLocaleString('en-IN')}</div>
        <div>
          <div class="audit-action">${this.esc(entry.action)}</div>
          <div class="audit-details">${entry.entity_type ? `${this.esc(entry.entity_type)} · ` : ''}${entry.entity_id ? `${this.esc(String(entry.entity_id).slice(0, 8))}` : ''}</div>
        </div>
      </div>`).join('');
  }

  async audit(action, entityType, entityId, details) {
    try {
      await this.db.from('audit_log').insert({
        action,
        entity_type: entityType || null,
        entity_id:   entityId   || null,
        details:     details    || {},
      });
    } catch (_) {
      // Non-fatal — audit failure should never block the operation
    }
  }

  // ── Preview Tab ─────────────────────────────────────────────────
  async loadPreview() {
    if (this._previewBound) return;
    this._previewBound = true;

    const frame = document.getElementById('preview-iframe');
    document.getElementById('preview-refresh')?.addEventListener('click', () => {
      if (frame) {
        // Force reload by temporarily clearing then restoring src
        const src = frame.src;
        frame.src = 'about:blank';
        setTimeout(() => { frame.src = src; }, 50);
      }
    });
  }

  // ── Modal Infrastructure ────────────────────────────────────────
  bindModals() {
    // Appointment modal
    document.getElementById('appt-modal-close')?.addEventListener('click', () => this.closeApptModal());
    document.getElementById('appt-modal-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'appt-modal-overlay') this.closeApptModal();
    });

    // Confirm modal
    document.getElementById('confirm-cancel')?.addEventListener('click', () => this.resolveConfirm(false));
    document.getElementById('confirm-ok')?.addEventListener('click',     () => this.resolveConfirm(true));

    // Service modal
    document.getElementById('service-modal-close')?.addEventListener('click', () => this.closeModal('service-modal-overlay'));
    document.getElementById('service-modal-cancel')?.addEventListener('click', () => this.closeModal('service-modal-overlay'));
    document.getElementById('service-modal-save')?.addEventListener('click',   () => this.saveService());
    document.getElementById('service-modal-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'service-modal-overlay') this.closeModal('service-modal-overlay');
    });

    // Gallery modal
    document.getElementById('gallery-modal-close')?.addEventListener('click', () => this.closeModal('gallery-modal-overlay'));
    document.getElementById('gallery-modal-cancel')?.addEventListener('click', () => this.closeModal('gallery-modal-overlay'));
    document.getElementById('gallery-modal-save')?.addEventListener('click',   () => this.saveGalleryEdit());
    document.getElementById('gallery-modal-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'gallery-modal-overlay') this.closeModal('gallery-modal-overlay');
    });

    // Escape key closes all modals
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        ['appt-modal-overlay', 'service-modal-overlay', 'gallery-modal-overlay', 'confirm-overlay']
          .forEach(id => this.closeModal(id));
      }
    });
  }

  openModal(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
      overlay.style.display = 'flex';
      setTimeout(() => {
        const first = overlay.querySelector('button, input, textarea, [tabindex]');
        first?.focus();
      }, 50);
    }
    document.body.style.overflow = 'hidden';
  }

  closeModal(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  async saveService() {
    const id   = document.getElementById('service-edit-id').value;
    const name = document.getElementById('service-edit-name').value.trim().slice(0, 100);
    const desc = document.getElementById('service-edit-desc').value.trim().slice(0, 500);
    const price = (document.getElementById('service-edit-price')?.value || '').trim().slice(0, 40);
    const dur   = (document.getElementById('service-edit-dur')?.value   || '').trim().slice(0, 24);
    const tag   = (document.getElementById('service-edit-tag')?.value   || '').trim().slice(0, 32);
    const icon  = (document.getElementById('service-edit-icon')?.value  || '').trim().slice(0, 8) || '💅';
    const featured = Boolean(document.getElementById('service-edit-featured')?.checked);
    const includes = (document.getElementById('service-edit-includes')?.value || '')
      .split(',').map(s => s.trim()).filter(Boolean).slice(0, 4);

    if (!name || name.length < 2) { this.toast('Service name must be 2–100 characters.', 'error'); return; }

    let savedId = id;
    let prevName = '';
    if (id) {
      prevName = (this._servicesList || []).find(x => x.id === id)?.name || '';
      const { error } = await this.db.from('services').update({ name, description: desc || null }).eq('id', id);
      if (error) { this.toast(`Update failed: ${error.message}`, 'error'); return; }
      await this.audit('UPDATE_SERVICE', 'service', id, { name, price });
      this.toast('Service updated.', 'success');
    } else {
      const { data, error } = await this.db.from('services')
        .insert({ name, description: desc || null, enabled: true, sort_order: Date.now() })
        .select('id').single();
      if (error) { this.toast(`Create failed: ${error.message}`, 'error'); return; }
      savedId = data?.id;
      await this.audit('CREATE_SERVICE', 'service', savedId, { name, price });
      this.toast('Service created.', 'success');
    }

    // Persist unified pricing, duration, badge, icon & highlights into settings.services_display
    const disp = { ...(this._servicesDisplay || {}) };
    if (prevName && prevName !== name) delete disp[prevName];
    const metaObj = { price, duration: dur, tag, icon, includes, featured, description: desc };
    if (savedId) disp[savedId] = metaObj;
    disp[name] = metaObj;
    this._servicesDisplay = disp;
    await this.db.from('settings').upsert([{ key: 'services_display', value: disp }], { onConflict: 'key' });

    this.closeModal('service-modal-overlay');
    await this.loadServices();
  }

  async saveGalleryEdit() {
    const id    = document.getElementById('gallery-edit-id').value;
    const alt   = document.getElementById('gallery-edit-alt').value.trim().slice(0, 200);
    const title = document.getElementById('gallery-edit-title').value.trim().slice(0, 100);
    const tech  = (document.getElementById('gallery-edit-tech')?.value || '').trim().slice(0, 100);
    const cat   = document.getElementById('gallery-edit-cat')?.value || 'studio';

    if (!alt) { this.toast('Alt text is required for accessibility.', 'error'); return; }

    const { error } = await this.db.from('gallery').update({ alt_text: alt, title: title || null }).eq('id', id);
    if (error) { this.toast(`Save failed: ${error.message}`, 'error'); return; }

    const meta = { ...(this._galleryMeta || {}) };
    meta[id] = { category: cat, tech };
    this._galleryMeta = meta;
    await this.db.from('settings').upsert([{ key: 'gallery_meta', value: meta }], { onConflict: 'key' });

    await this.audit('UPDATE_GALLERY', 'gallery', id, { alt_text: alt, category: cat });
    this.toast('Photo updated.', 'success');
    this.closeModal('gallery-modal-overlay');
    await this.loadGallery();
  }

  // Confirm dialog — returns Promise<boolean>
  confirm(message, actionLabel = 'Confirm', isDanger = false) {
    return new Promise(resolve => {
      this._confirmResolve = resolve;
      document.getElementById('confirm-message').textContent = message;
      const okBtn = document.getElementById('confirm-ok');
      okBtn.textContent = actionLabel;
      okBtn.className = isDanger ? 'btn-danger' : 'btn-primary';
      this.openModal('confirm-overlay');
    });
  }

  resolveConfirm(value) {
    this.closeModal('confirm-overlay');
    if (this._confirmResolve) {
      this._confirmResolve(value);
      this._confirmResolve = null;
    }
  }

  // ── Toast ───────────────────────────────────────────────────────
  toast(message, type = 'info') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.className   = `toast ${type} show`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.className = 'toast'; }, 3500);
  }

  // ── Utilities ───────────────────────────────────────────────────
  safeUrl(url) {
    const s = String(url || '').trim();
    return /^https:\/\//i.test(s) ? s : '';
  }

  safeTel(phone) {
    return String(phone || '').replace(/[^\d+]/g, '');
  }

  esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }

  emptyState(icon, message) {
    return `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${message}</p></div>`;
  }

  setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
  setVal(id, val)  { const el = document.getElementById(id); if (el) el.value = val; }
  getVal(id)       { return document.getElementById(id)?.value || ''; }

  timeAgo(iso) {
    if (!iso) return '';
    const ms   = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }
}

// ── Boot ──────────────────────────────────────────────────────────
// Only run on dashboard.html, not on index.html
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('app')) {
    const admin = new FloralynAdmin();
    admin.init().catch(err => console.error('[FloralynAdmin] Init error:', err));
  }
});


/* ═══════════════════════════════════════════════════════════════
   PROMOTIONS MODULE — banner + service display price editor
   Appended to dashboard.js (FloralynAdmin class methods added
   via prototype after class definition)
   ═══════════════════════════════════════════════════════════════ */

// Patch loadView to handle prototype modules cleanly (now handled inside class)
FloralynAdmin.prototype._viewTitles = {
  dashboard: 'Dashboard', appointments: 'Appointments',
  gallery: 'Gallery', services: 'Services & Prices',
  content: 'Shades, Hero & FAQ', promotions: 'Offer Banner',
  settings: 'Settings', preview: 'Preview', audit: 'Audit Log',
};

/* ═══════════════════════════════════════════════════════════════
   SHADES, HERO & FAQ CMS MODULE (view-content)
   ═══════════════════════════════════════════════════════════════ */
const DEFAULT_SHADES = [
  { name: 'Blush Silk',        hex: '#F4BFD3', note: 'Sheer Gel' },
  { name: 'Wild Lilac',        hex: '#B58FE0', note: 'Cat-Eye' },
  { name: 'Bridal Ivory',      hex: '#F5EAE2', note: 'Pearl Glaze' },
  { name: 'Mocha Foil',        hex: '#6B4539', note: 'Marble Foil' },
  { name: 'Spiced Terracotta', hex: '#9C4436', note: 'Festive Gloss' },
  { name: 'Rosewood',          hex: '#C86688', note: 'Jelly Tint' },
];

const DEFAULT_FAQS = [
  { q: 'Do you accept walk-ins?', a: 'Floralyn works strictly by appointment so every client receives unhurried 1-on-1 chair attention. Please request your slot online at least 24 hours in advance.' },
  { q: 'How long does gel nail art last?', a: 'With gentle builder reinforcement on natural nails, sets typically wear cleanly for 2–4 weeks depending on nail growth and daily care. Nightly cuticle oil helps keep flexibility high and edges chip-free.' },
  { q: 'Can I bring Pinterest inspiration or my wedding outfit palette?', a: 'Yes — bring saved references, lehenga embroidery photos, or blend a vibe in our Studio Polish Bar above. Every set is painted freehand and scaled thoughtfully to flatter your nail bed.' },
  { q: 'What is the price range at Floralyn?', a: 'Simple manicures start from ₹300, gel sets from ₹700, custom freehand nail art from ₹1,200, and bespoke bridal sets from ₹2,000. You receive a clear quote before your brush even touches paint.' },
  { q: 'Do you do acrylic extensions?', a: 'Floralyn focuses exclusively on soft & builder gel artistry over your natural nails so your natural keratin stays strong, flexible, and healthy.' },
  { q: 'How far ahead should brides or festive clients book?', a: '2–3 days ahead is ideal for everyday gel or custom sets, and 2–4 weeks prior for bridal or wedding functions so we can reserve an unhurried two-hour studio slot.' },
];

FloralynAdmin.prototype.loadSiteContent = async function() {
  try {
    const { data } = await this.db.from('settings').select('key, value')
      .in('key', ['hero', 'polish_bar', 'faq']);
    const rows = {};
    (data || []).forEach(r => { rows[r.key] = r.value; });

    const hero = rows.hero || {};
    this.setVal('c-hero-kicker',  hero.kicker       || 'Jetpur · Private 1-on-1 Nail Atelier');
    this.setVal('c-hero-l1',      hero.line1        || 'Every nail,');
    this.setVal('c-hero-em',      hero.accent       || 'love letter');
    this.setVal('c-hero-l3',      hero.line3        || 'painted by hand.');
    this.setVal('c-hero-sub',     hero.subtext      || 'An intimate nail artistry studio in Jetpur where soft sheer jellies, botanical micro-florals, and bridal pearl chromes come to life slowly over your natural nails.');
    this.setVal('c-booking-note', hero.booking_note || 'Send your preferred date & mood — I personally review and confirm every slot within 24 hours.');

    const shades = Array.isArray(rows.polish_bar?.shades) && rows.polish_bar.shades.length
      ? rows.polish_bar.shades
      : DEFAULT_SHADES;
    this._renderShadeRows(shades);

    const faqs = Array.isArray(rows.faq) && rows.faq.length ? rows.faq : DEFAULT_FAQS;
    this._renderFaqRows(faqs);

    const addShade = document.getElementById('add-shade-btn');
    if (addShade && !addShade._bound) {
      addShade._bound = true;
      addShade.addEventListener('click', () => this._addShadeRow({ name: '', hex: '#F4B8D0', note: '' }));
    }
    const addFaq = document.getElementById('add-faq-btn');
    if (addFaq && !addFaq._bound) {
      addFaq._bound = true;
      addFaq.addEventListener('click', () => this._addFaqRow({ q: '', a: '' }));
    }
    const saveContentBtn = document.getElementById('content-save-btn');
    if (saveContentBtn && !saveContentBtn._bound) {
      saveContentBtn._bound = true;
      saveContentBtn.addEventListener('click', () => this.saveSiteContent());
    }
  } catch (e) {
    this.toast('Failed to load site content settings', 'error');
  }
};

FloralynAdmin.prototype._renderShadeRows = function(shades) {
  const ed = document.getElementById('shades-editor');
  if (!ed) return;
  ed.innerHTML = '';
  shades.forEach(s => this._addShadeRow(s));
};

FloralynAdmin.prototype._addShadeRow = function(shade = { name: '', hex: '#F4B8D0', note: '' }) {
  const ed = document.getElementById('shades-editor');
  if (!ed) return;
  const row = document.createElement('div');
  row.className = 'cms-row';
  const safeHex = /^#[0-9a-f]{6}$/i.test(shade.hex || '') ? shade.hex : '#F4B8D0';
  row.innerHTML = `
    <input type="color" class="sh-hex" value="${this.esc(safeHex)}" aria-label="Shade colour" />
    <input type="text" class="sh-name" value="${this.esc(shade.name || '')}" placeholder="Shade / product name (e.g. Mint Silk)" maxlength="40" />
    <input type="text" class="sh-note" value="${this.esc(shade.note || '')}" placeholder="Tag or price (e.g. Sheer Gel or +₹150)" maxlength="40" />
    <button type="button" class="timeslot-del" title="Remove shade">✕</button>`;
  row.querySelector('.timeslot-del').addEventListener('click', () => row.remove());
  ed.appendChild(row);
};

FloralynAdmin.prototype._renderFaqRows = function(faqs) {
  const ed = document.getElementById('faq-editor');
  if (!ed) return;
  ed.innerHTML = '';
  faqs.forEach(f => this._addFaqRow(f));
};

FloralynAdmin.prototype._addFaqRow = function(item = { q: '', a: '' }) {
  const ed = document.getElementById('faq-editor');
  if (!ed) return;
  const row = document.createElement('div');
  row.className = 'cms-row faq-row';
  row.innerHTML = `
    <div class="faq-inputs">
      <input type="text" class="faq-q-in" value="${this.esc(item.q || '')}" placeholder="Question (e.g. Do you do gel extensions?)" maxlength="180" />
      <textarea class="faq-a-in" rows="2" placeholder="Clear answer shown to visitors & search engines…" maxlength="600">${this.esc(item.a || '')}</textarea>
    </div>
    <button type="button" class="timeslot-del" title="Remove FAQ">✕</button>`;
  row.querySelector('.timeslot-del').addEventListener('click', () => row.remove());
  ed.appendChild(row);
};

FloralynAdmin.prototype.saveSiteContent = async function() {
  const btn = document.getElementById('content-save-btn');
  const status = document.getElementById('content-status');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  if (status) status.textContent = '';

  try {
    const strip = s => String(s || '').replace(/<[^>]*>/g, '').trim();
    const hero = {
      kicker:       strip(this.getVal('c-hero-kicker')).slice(0, 100),
      line1:        strip(this.getVal('c-hero-l1')).slice(0, 40),
      accent:       strip(this.getVal('c-hero-em')).slice(0, 40),
      line3:        strip(this.getVal('c-hero-l3')).slice(0, 40),
      subtext:      strip(this.getVal('c-hero-sub')).slice(0, 260),
      booking_note: strip(this.getVal('c-booking-note')).slice(0, 200),
    };

    const shades = Array.from(document.querySelectorAll('#shades-editor .cms-row')).map(row => ({
      hex:  /^#[0-9a-f]{6}$/i.test(row.querySelector('.sh-hex')?.value || '') ? row.querySelector('.sh-hex').value : '#F4B8D0',
      name: strip(row.querySelector('.sh-name')?.value).slice(0, 40),
      note: strip(row.querySelector('.sh-note')?.value).slice(0, 40),
    })).filter(s => s.name);

    const faq = Array.from(document.querySelectorAll('#faq-editor .faq-row')).map(row => ({
      q: strip(row.querySelector('.faq-q-in')?.value).slice(0, 180),
      a: strip(row.querySelector('.faq-a-in')?.value).slice(0, 600),
    })).filter(f => f.q && f.a);

    const { error } = await this.db.from('settings').upsert([
      { key: 'hero',       value: hero },
      { key: 'polish_bar', value: { shades } },
      { key: 'faq',        value: faq },
    ], { onConflict: 'key' });

    if (error) throw error;
    await this.audit('CONTENT_SAVED', 'settings', 'content', { shades: shades.length, faqs: faq.length });
    this.toast('✅ Shades, Hero & FAQs saved! Live in ~15 seconds.', 'success');
    if (status) { status.textContent = '✅ Saved!'; setTimeout(() => { status.textContent = ''; }, 4000); }
  } catch (e) {
    this.toast('Failed to save content: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Site Content'; }
  }
};

/* ── loadPromotions ─────────────────────────────────────────── */
FloralynAdmin.prototype.loadPromotions = async function() {
  const FALLBACK_SERVICES = [
    { id: 'Simple Manicure',           name: 'Simple Manicure' },
    { id: 'Gel Nails',                 name: 'Gel Nails' },
    { id: 'Custom Design',             name: 'Custom Nail Art' },
    { id: 'Bridal / Special Occasion', name: 'Bridal & Occasions' },
  ];

  try {
    const [{ data }, svcRes] = await Promise.all([
      this.db.from('settings').select('key, value').in('key', ['banner', 'services_display']),
      this.db.from('services').select('id, name').order('sort_order', { ascending: true }),
    ]);

    const rows = {};
    (data || []).forEach(r => { rows[r.key] = r.value; });

    const b = rows.banner || {};
    const sd = rows.services_display || {};
    this._promoServices = (!svcRes.error && Array.isArray(svcRes.data) && svcRes.data.length)
      ? svcRes.data : FALLBACK_SERVICES;

    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
    const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

    setChk('banner-enabled', b.enabled);
    setVal('banner-text', b.text || '');
    setVal('banner-bg',   b.bg   || '#D4688E');
    setVal('banner-bg-hex', b.bg || '#D4688E');
    setVal('banner-color', b.textColor || '#ffffff');
    setVal('banner-color-hex', b.textColor || '#ffffff');

    const editor = document.getElementById('service-display-editor');
    if (editor) {
      editor.innerHTML = this._promoServices.map(s => {
        const info = sd[s.id] || sd[s.name] || {};
        return `
          <div class="svc-display-row" data-svc-id="${this.esc(s.id)}" data-svc-name="${this.esc(s.name)}">
            <div class="svc-display-name">${this.esc(s.name)}</div>
            <div class="svc-display-field">
              <label>Price (e.g. "from ₹700")</label>
              <input type="text" class="svc-price-input" maxlength="40" placeholder="from ₹..." value="${this.esc(info.price || '')}" />
            </div>
            <div class="svc-display-field">
              <label>Duration (e.g. "~60 min")</label>
              <input type="text" class="svc-dur-input" maxlength="24" placeholder="~XX min" value="${this.esc(info.duration || '')}" />
            </div>
            <div class="svc-display-field">
              <label>Badge Tag</label>
              <input type="text" class="svc-tag-input" maxlength="32" placeholder="Optional badge" value="${this.esc(info.tag || '')}" />
            </div>
          </div>`;
      }).join('');
    }

    this._bindBannerPreview();
  } catch (e) {
    this.toast('Failed to load promotions settings', 'error');
  }

  const saveBtn = document.getElementById('promo-save-btn');
  if (saveBtn && !saveBtn._bound) {
    saveBtn._bound = true;
    saveBtn.addEventListener('click', () => this.savePromotions());
  }
};

/* ── Live banner preview ─────────────────────────────────────── */
FloralynAdmin.prototype._bindBannerPreview = function() {
  const previewBar = document.getElementById('banner-preview-bar');
  const textInput  = document.getElementById('banner-text');
  const bgInput    = document.getElementById('banner-bg');
  const bgHex      = document.getElementById('banner-bg-hex');
  const colorInput = document.getElementById('banner-color');
  const colorHex   = document.getElementById('banner-color-hex');

  const sync = () => {
    if (!previewBar) return;
    previewBar.textContent = textInput?.value || '🌸 Your banner text will appear here';
    previewBar.style.background = bgInput?.value || '#D4688E';
    previewBar.style.color = colorInput?.value || '#ffffff';
  };

  // Sync color pickers ↔ hex inputs
  bgInput?.addEventListener('input', () => { if (bgHex) bgHex.value = bgInput.value; sync(); });
  bgHex?.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(bgHex.value)) { if (bgInput) bgInput.value = bgHex.value; sync(); } });
  colorInput?.addEventListener('input', () => { if (colorHex) colorHex.value = colorInput.value; sync(); });
  colorHex?.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(colorHex.value)) { if (colorInput) colorInput.value = colorHex.value; sync(); } });
  textInput?.addEventListener('input', sync);
  sync();
};

/* ── savePromotions ─────────────────────────────────────────── */
FloralynAdmin.prototype.savePromotions = async function() {
  const btn    = document.getElementById('promo-save-btn');
  const status = document.getElementById('promo-status');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  if (status) status.textContent = '';

  try {
    // Collect banner data
    const banner = {
      enabled:   document.getElementById('banner-enabled')?.checked || false,
      text:      (document.getElementById('banner-text')?.value || '').trim().slice(0,150),
      bg:        document.getElementById('banner-bg')?.value || '#D4688E',
      textColor: document.getElementById('banner-color')?.value || '#ffffff',
    };

    // Merge price quick-edits onto existing services_display metadata cleanly
    const existingRes = await this.db.from('settings').select('value').eq('key', 'services_display').maybeSingle();
    const servicesDisplay = { ...(existingRes?.data?.value || {}) };
    document.querySelectorAll('#service-display-editor [data-svc-id]').forEach(row => {
      const id    = row.dataset.svcId;
      const name  = row.dataset.svcName;
      const price = row.querySelector('.svc-price-input')?.value.trim() || '';
      const dur   = row.querySelector('.svc-dur-input')?.value.trim() || '';
      const tag   = row.querySelector('.svc-tag-input')?.value.trim() || '';
      const base  = servicesDisplay[id] || servicesDisplay[name] || {};
      const next  = { ...base, price, duration: dur, tag };
      if (id) servicesDisplay[id] = next;
      if (name) servicesDisplay[name] = next;
    });

    // Save to Supabase settings table
    const { error } = await this.db.from('settings').upsert([
      { key: 'banner',           value: banner },
      { key: 'services_display', value: servicesDisplay },
    ], { onConflict: 'key' });

    if (error) throw error;

    // Audit log
    try {
      await this.db.from('audit_log').insert({
        action: 'PROMOTIONS_SAVED',
        entity_type: 'settings',
        entity_id: 'banner',
        details: { banner_enabled: banner.enabled, text_length: banner.text.length },
      });
    } catch (_) {}

    this.toast('✅ Promotions saved! Changes will appear on your website within 1 minute.', 'success');
    if (status) { status.textContent = '✅ Saved!'; setTimeout(() => { status.textContent = ''; }, 4000); }

  } catch(e) {
    this.toast('Failed to save: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
  }
};
