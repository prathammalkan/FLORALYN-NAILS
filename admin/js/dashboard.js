// admin/js/dashboard.js
// Floralyn Admin Dashboard â€” Complete SPA Logic
// Uses Supabase JS v2 for auth, database, and storage

'use strict';

// ================================================================
// âš™ï¸ CONFIGURATION
// Replace these with your actual Supabase project credentials.
// Get them from: https://supabase.com/dashboard â†’ your project â†’ Settings â†’ API
// The ANON KEY is safe for browser use â€” RLS enforces all access control.
// NEVER use the service_role key here.
// ================================================================
window.FloralynConfig = {
  SUPABASE_URL:      'https://znycuzuveqhybqgevjvj.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpueWN1enV2ZXFoeWJxZ2V2anZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MTcyMTQsImV4cCI6MjEwNjE5MzIxNH0.cPYdpp6peTFX4e88K4yb8f1tbaV96ifqoy7TrCyEAxQ',
};

// ================================================================
// ADMIN APP CLASS
// ================================================================
class FloralynAdmin {
  constructor() {
    this.db          = null;
    this.currentView = 'dashboard';
    this.currentAppt = null;
    this._confirmResolve = null;
  }

  // â”€â”€ Initialization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async init() {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.FloralynConfig;

    if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
      // Config not set â€” handled by login page
      return;
    }

    this.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    await this.checkAuth();
  }

  async checkAuth() {
    const { data: { session } } = await this.db.auth.getSession();

    if (!session) {
      window.location.href = '/admin/';
      return;
    }

    // Auth confirmed â€” show app
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

    // Auto-refresh auth session silently
    this.db.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = '/admin/';
      }
    });
  }

  // â”€â”€ Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  bindNavigation() {
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.loadView(view);
        this.closeSidebar();
      });
    });
  }

  async loadView(view) {
    this.currentView = view;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(btn => {
      const isActive = btn.dataset.view === view;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // Show/hide views
    document.querySelectorAll('.view').forEach(v => {
      v.style.display = v.id === `view-${view}` ? '' : 'none';
    });

    // Update mobile header title
    const titles = {
      dashboard:    'Dashboard',
      appointments: 'Appointments',
      gallery:      'Gallery',
      services:     'Services',
      settings:     'Settings',
      audit:        'Audit Log',
    };
    const mobileTitle = document.getElementById('mobile-title');
    if (mobileTitle) mobileTitle.textContent = titles[view] || view;

    // Load data for the view
    const loaders = {
      dashboard:    () => this.loadDashboard(),
      appointments: () => this.loadAppointments(),
      gallery:      () => this.loadGallery(),
      services:     () => this.loadServices(),
      settings:     () => this.loadSettings(),
      audit:        () => this.loadAuditLog(),
    };

    if (loaders[view]) await loaders[view]();
  }

  // â”€â”€ Mobile Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Logout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  bindLogout() {
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      const confirmed = await this.confirm('Sign out of Floralyn Admin?', 'Sign Out');
      if (!confirmed) return;
      await this.audit('LOGOUT', null, null, {});
      await this.db.auth.signOut();
      window.location.href = '/admin/';
    });
  }

  // â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // Recent appointments (last 5)
    const { data: recent } = await this.db
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    const container = document.getElementById('recent-appointments');
    if (!container) return;

    if (!recent || recent.length === 0) {
      container.innerHTML = this.emptyState('ðŸ“…', 'No appointments yet');
      return;
    }

    container.innerHTML = (recent || []).map(a => this.renderApptCard(a)).join('');
    container.querySelectorAll('.appt-card').forEach(card => {
      card.addEventListener('click', () => this.openApptModal(card.dataset.id));
    });
  }

  // â”€â”€ Appointments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async loadAppointments() {
    const status  = document.getElementById('filter-status')?.value  || 'ALL';
    const search  = (document.getElementById('filter-search')?.value || '').trim().toLowerCase();
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

    // Client-side text search (name, phone, service)
    if (search) {
      appts = appts.filter(a =>
        a.name?.toLowerCase().includes(search) ||
        a.phone?.toLowerCase().includes(search) ||
        a.service?.toLowerCase().includes(search) ||
        a.email?.toLowerCase().includes(search)
      );
    }

    if (appts.length === 0) {
      container.innerHTML = this.emptyState('ðŸ“…', 'No appointments found matching your filters');
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
      : 'â€”';

    return `
      <div class="appt-card" data-id="${this.esc(a.id)}" tabindex="0" role="button"
           aria-label="View appointment for ${this.esc(a.name)}">
        <div>
          <div class="appt-name">${this.esc(a.name)}</div>
          <div class="appt-phone">ðŸ“ž ${this.esc(a.phone)}</div>
          <div class="appt-service">ðŸ’… ${this.esc(a.service)}</div>
          <div class="appt-meta">ðŸ“… ${date} â€¢ ${this.esc(a.preferred_time || 'â€”')}</div>
        </div>
        <div class="appt-right">
          <span class="badge badge-${this.esc(a.status)}">${this.esc(a.status)}</span>
          <span style="font-size:11px;color:var(--text-muted)">${this.timeAgo(a.created_at)}</span>
        </div>
      </div>`;
  }

  async openApptModal(id) {
    const { data: a, error } = await this.db
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !a) { this.toast('Could not load appointment.', 'error'); return; }

    this.currentAppt = a;

    const date = a.preferred_date
      ? new Date(a.preferred_date + 'T00:00:00').toLocaleDateString('en-IN', { dateStyle: 'long' })
      : 'â€”';
    const created = a.created_at
      ? new Date(a.created_at).toLocaleString('en-IN')
      : 'â€”';

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
          <p><a href="tel:${this.esc(a.phone)}">${this.esc(a.phone)}</a></p>
        </div>
        <div class="appt-detail-field">
          <label>Email</label>
          <p>${a.email ? `<a href="mailto:${this.esc(a.email)}">${this.esc(a.email)}</a>` : '<span style="color:var(--text-muted)">Not provided</span>'}</p>
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
          <p>${this.esc(a.preferred_time || 'â€”')}</p>
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
        ${a.status !== 'CONFIRMED'  ? `<button class="status-btn btn-confirm"  data-status="CONFIRMED">âœ… Confirm</button>`    : ''}
        ${a.status !== 'DECLINED'   ? `<button class="status-btn btn-decline"  data-status="DECLINED">âŒ Decline</button>`    : ''}
        ${a.status !== 'COMPLETED'  ? `<button class="status-btn btn-complete" data-status="COMPLETED">ðŸ Complete</button>` : ''}
        ${a.status !== 'CANCELLED'  ? `<button class="status-btn btn-cancel"   data-status="CANCELLED">ðŸš« Cancel</button>`   : ''}
      </div>

      <div class="appt-notes-group">
        <label for="appt-notes-input">Private Notes (owner only)</label>
        <textarea id="appt-notes-input" placeholder="Add internal notesâ€¦" maxlength="2000">${this.esc(a.notes || '')}</textarea>
      </div>`;

    foot.innerHTML = `
      <button class="btn-secondary" id="appt-delete-btn">ðŸ—‘ï¸ Delete</button>
      <button class="btn-secondary" id="appt-notes-save">ðŸ’¾ Save Notes</button>
      <button class="btn-primary" id="appt-modal-done">Done</button>`;

    // Status change buttons
    body.querySelectorAll('.status-btn').forEach(btn => {
      btn.addEventListener('click', () => this.changeApptStatus(a.id, btn.dataset.status));
    });

    // Save notes
    foot.querySelector('#appt-notes-save').addEventListener('click', async () => {
      const notes = document.getElementById('appt-notes-input').value.slice(0, 2000);
      await this.db.from('appointments').update({ notes }).eq('id', a.id);
      this.toast('Notes saved.', 'success');
      await this.audit('UPDATE_NOTES', 'appointment', a.id, { name: a.name });
    });

    // Delete
    foot.querySelector('#appt-delete-btn').addEventListener('click', async () => {
      const confirmed = await this.confirm(
        `Permanently delete ${a.name}'s appointment? This cannot be undone.`,
        'Delete Permanently',
        true
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
    const confirmed = await this.confirm(
      `Set appointment status to ${newStatus}?`,
      'Update Status'
    );
    if (!confirmed) return;

    const { error } = await this.db
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) { this.toast('Failed to update status.', 'error'); return; }

    await this.audit('UPDATE_STATUS', 'appointment', id, { status: newStatus, name: this.currentAppt?.name });
    this.toast(`Status updated to ${newStatus}.`, 'success');
    this.closeApptModal();

    if (this.currentView === 'appointments') await this.loadAppointments();
    else await this.loadDashboard();
  }

  closeApptModal() { this.closeModal('appt-modal-overlay'); }

  // â”€â”€ Gallery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async loadGallery() {
    const { data, error } = await this.db
      .from('gallery')
      .select('*')
      .order('sort_order', { ascending: true });

    const container = document.getElementById('gallery-grid-admin');
    if (!container) return;

    if (error) {
      container.innerHTML = `<p style="color:var(--danger)">Failed to load gallery.</p>`;
      return;
    }

    if (!data || data.length === 0) {
      container.innerHTML = this.emptyState('ðŸ–¼ï¸', 'No photos yet â€” upload your first gallery image!');
      return;
    }

    container.innerHTML = data.map((item, idx) => `
      <div class="gallery-item ${item.visible ? '' : 'gallery-item-hidden'}" data-id="${this.esc(item.id)}">
        <img
          src="${this.esc(item.public_url)}"
          alt="${this.esc(item.alt_text || 'Gallery image')}"
          loading="lazy" />
        <div class="gallery-item-controls">
          <button class="btn-edit-gallery" data-id="${this.esc(item.id)}" title="Edit alt text and title">âœï¸ Edit</button>
          <button class="btn-toggle-gallery" data-id="${this.esc(item.id)}" data-visible="${item.visible}" title="${item.visible ? 'Hide' : 'Show'}">
            ${item.visible ? 'ðŸ‘ï¸ Hide' : 'ðŸ™ˆ Show'}
          </button>
          <button class="btn-del btn-del-gallery" data-id="${this.esc(item.id)}" title="Delete photo">ðŸ—‘ï¸</button>
        </div>
      </div>`).join('');

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
  }

  bindGalleryUpload() {
    const input = document.getElementById('gallery-file-input');
    if (!input) return;

    input.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
      const MAX_SIZE_MB   = 10;

      const invalid = files.filter(f => !ALLOWED_TYPES.has(f.type) || f.size > MAX_SIZE_MB * 1024 * 1024);
      if (invalid.length > 0) {
        this.toast(`${invalid.length} file(s) rejected. Only JPEG, PNG, WebP, AVIF up to 10MB.`, 'error');
      }

      const valid = files.filter(f => ALLOWED_TYPES.has(f.type) && f.size <= MAX_SIZE_MB * 1024 * 1024);
      if (!valid.length) return;

      const progressDiv  = document.getElementById('upload-progress');
      const progressFill = document.getElementById('upload-fill');
      const statusText   = document.getElementById('upload-status-text');

      progressDiv.style.display = '';
      progressFill.style.width  = '0%';

      for (let i = 0; i < valid.length; i++) {
        const file    = valid[i];
        const ext     = file.name.split('.').pop().toLowerCase();
        const safeName = `${crypto.randomUUID()}.${ext}`;
        const path    = `public/${safeName}`;

        statusText.textContent = `Uploading ${i + 1} of ${valid.length}: ${file.name}`;

        const { error: uploadErr } = await this.db.storage
          .from('gallery')
          .upload(path, file, { contentType: file.type, upsert: false });

        if (uploadErr) {
          this.toast(`Upload failed for ${file.name}: ${uploadErr.message}`, 'error');
          continue;
        }

        const { data: urlData } = this.db.storage.from('gallery').getPublicUrl(path);

        const { error: dbErr } = await this.db.from('gallery').insert({
          storage_path: path,
          public_url:   urlData.publicUrl,
          alt_text:     'Nail art by Floralyn',
          visible:      true,
          sort_order:   Date.now(),
          file_size:    file.size,
        });

        if (dbErr) {
          this.toast(`Database error for ${file.name}.`, 'error');
          continue;
        }

        await this.audit('GALLERY_UPLOAD', 'gallery', safeName, { filename: file.name, size: file.size });

        progressFill.style.width = `${Math.round(((i + 1) / valid.length) * 100)}%`;
      }

      statusText.textContent = `Done! ${valid.length} photo(s) uploaded.`;
      input.value = '';

      setTimeout(() => { progressDiv.style.display = 'none'; }, 2500);

      await this.loadGallery();
      this.toast(`${valid.length} photo(s) uploaded successfully.`, 'success');
    });
  }

  openGalleryEditModal(item) {
    document.getElementById('gallery-edit-id').value    = item.id;
    document.getElementById('gallery-edit-preview').src = item.public_url;
    document.getElementById('gallery-edit-alt').value   = item.alt_text || '';
    document.getElementById('gallery-edit-title').value = item.title || '';
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
      `Delete this photo permanently? It will be removed from the website.`,
      'Delete Photo',
      true
    );
    if (!confirmed) return;

    // Delete from Storage
    if (item.storage_path) {
      await this.db.storage.from('gallery').remove([item.storage_path]);
    }

    // Delete from database
    await this.db.from('gallery').delete().eq('id', id);
    await this.audit('GALLERY_DELETE', 'gallery', id, { path: item.storage_path });
    this.toast('Photo deleted.', 'success');
    await this.loadGallery();
  }

  // â”€â”€ Services â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async loadServices() {
    const { data, error } = await this.db
      .from('services')
      .select('*')
      .order('sort_order', { ascending: true });

    const container = document.getElementById('services-list');
    if (!container) return;

    if (error) {
      container.innerHTML = `<p style="color:var(--danger)">Failed to load services.</p>`;
      return;
    }

    if (!data || data.length === 0) {
      container.innerHTML = this.emptyState('ðŸ’…', 'No services yet. Click "+ Add Service" to create one.');
      return;
    }

    container.innerHTML = data.map(s => `
      <div class="service-card ${s.enabled ? '' : 'disabled'}" data-id="${this.esc(s.id)}">
        <label class="toggle-switch" title="${s.enabled ? 'Disable service' : 'Enable service'}">
          <input type="checkbox" class="service-toggle" data-id="${this.esc(s.id)}" ${s.enabled ? 'checked' : ''} aria-label="Enable ${this.esc(s.name)}" />
          <span class="toggle-slider"></span>
        </label>
        <div class="service-info">
          <div class="service-name">${this.esc(s.name)}</div>
          ${s.description ? `<div class="service-desc">${this.esc(s.description)}</div>` : ''}
        </div>
        <div class="service-actions">
          <button class="btn-secondary btn-edit-service" data-id="${this.esc(s.id)}" style="font-size:12px;padding:6px 12px;">âœï¸ Edit</button>
          <button class="btn-secondary btn-del-service" data-id="${this.esc(s.id)}" style="font-size:12px;padding:6px 12px;color:var(--danger);border-color:var(--danger)">ðŸ—‘ï¸</button>
        </div>
      </div>`).join('');

    container.querySelectorAll('.service-toggle').forEach(toggle => {
      toggle.addEventListener('change', async () => {
        await this.db.from('services').update({ enabled: toggle.checked }).eq('id', toggle.dataset.id);
        await this.audit('SERVICE_TOGGLE', 'service', toggle.dataset.id, { enabled: toggle.checked });
        this.toast(`Service ${toggle.checked ? 'enabled' : 'disabled'}.`, 'success');
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

    document.getElementById('add-service-btn')?.addEventListener('click', () => {
      this.openServiceModal(null);
    });
  }

  openServiceModal(service) {
    document.getElementById('service-edit-id').value   = service?.id || '';
    document.getElementById('service-edit-name').value = service?.name || '';
    document.getElementById('service-edit-desc').value = service?.description || '';
    document.getElementById('service-modal-title').textContent = service ? 'Edit Service' : 'Add Service';
    this.openModal('service-modal-overlay');
  }

  async deleteService(s) {
    const confirmed = await this.confirm(
      `Delete "${s.name}"? This will remove it from the booking form.`,
      'Delete Service',
      true
    );
    if (!confirmed) return;
    await this.db.from('services').delete().eq('id', s.id);
    await this.audit('DELETE_SERVICE', 'service', s.id, { name: s.name });
    this.toast('Service deleted.', 'success');
    await this.loadServices();
  }

  // â”€â”€ Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async loadSettings() {
    const { data } = await this.db.from('settings').select('*');
    if (!data) return;

    const biz     = data.find(r => r.key === 'business')?.value || {};
    const booking = data.find(r => r.key === 'booking')?.value  || {};

    this.setVal('s-name',      biz.name      || '');
    this.setVal('s-email',     biz.email     || '');
    this.setVal('s-instagram', biz.instagram || '');
    this.setVal('s-whatsapp',  biz.whatsapp  || '');
    this.setVal('s-min-days',  booking.advance_days_min     ?? 1);
    this.setVal('s-max-days',  booking.advance_days_max     ?? 90);
    this.setVal('s-open',      booking.business_hours_start || '10:00');
    this.setVal('s-close',     booking.business_hours_end   || '19:00');
  }

  bindSettingsForm() {
    const form = document.getElementById('settings-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const bizData = {
        name:      this.getVal('s-name'),
        email:     this.getVal('s-email'),
        instagram: this.getVal('s-instagram'),
        whatsapp:  this.getVal('s-whatsapp'),
      };

      const bookingData = {
        advance_days_min:     parseInt(this.getVal('s-min-days'), 10)  || 1,
        advance_days_max:     parseInt(this.getVal('s-max-days'), 10)  || 90,
        business_hours_start: this.getVal('s-open'),
        business_hours_end:   this.getVal('s-close'),
      };

      await Promise.all([
        this.db.from('settings').upsert({ key: 'business', value: bizData }),
        this.db.from('settings').upsert({ key: 'booking',  value: bookingData }),
      ]);

      await this.audit('UPDATE_SETTINGS', 'settings', null, {});

      const statusEl = document.getElementById('settings-status');
      if (statusEl) {
        statusEl.textContent = 'âœ… Settings saved!';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
      }

      this.toast('Settings saved.', 'success');
    });
  }

  // â”€â”€ Audit Log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async loadAuditLog() {
    const { data, error } = await this.db
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    const container = document.getElementById('audit-list');
    if (!container) return;

    if (error) {
      container.innerHTML = `<p style="color:var(--danger)">Failed to load audit log.</p>`;
      return;
    }

    if (!data || data.length === 0) {
      container.innerHTML = this.emptyState('ðŸ“', 'No audit entries yet.');
      return;
    }

    container.innerHTML = data.map(entry => `
      <div class="audit-entry">
        <div class="audit-time">${new Date(entry.created_at).toLocaleString('en-IN')}</div>
        <div>
          <div class="audit-action">${this.esc(entry.action)}</div>
          <div class="audit-details">${entry.entity_type ? `${this.esc(entry.entity_type)} Â· ` : ''}${entry.entity_id ? `${this.esc(entry.entity_id.slice(0, 8))}` : ''}</div>
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
      // Non-fatal â€” audit failure should never block the operation
    }
  }

  // â”€â”€ Modal infrastructure â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  bindModals() {
    // Appointment modal close
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

    // Close modals on Escape
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
      // Focus first interactive element for keyboard accessibility
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

    if (!name) { this.toast('Service name is required.', 'error'); return; }

    if (id) {
      await this.db.from('services').update({ name, description: desc || null }).eq('id', id);
      await this.audit('UPDATE_SERVICE', 'service', id, { name });
      this.toast('Service updated.', 'success');
    } else {
      const { data } = await this.db.from('services').insert({ name, description: desc || null, enabled: true, sort_order: Date.now() }).select('id').single();
      await this.audit('CREATE_SERVICE', 'service', data?.id, { name });
      this.toast('Service created.', 'success');
    }

    this.closeModal('service-modal-overlay');
    await this.loadServices();
  }

  async saveGalleryEdit() {
    const id    = document.getElementById('gallery-edit-id').value;
    const alt   = document.getElementById('gallery-edit-alt').value.trim().slice(0, 200);
    const title = document.getElementById('gallery-edit-title').value.trim().slice(0, 100);

    if (!alt) { this.toast('Alt text is required for accessibility.', 'error'); return; }

    await this.db.from('gallery').update({ alt_text: alt, title: title || null }).eq('id', id);
    await this.audit('UPDATE_GALLERY', 'gallery', id, { alt_text: alt });
    this.toast('Photo updated.', 'success');
    this.closeModal('gallery-modal-overlay');
    await this.loadGallery();
  }

  // Confirm dialog â€” returns Promise<boolean>
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

  // â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  toast(message, type = 'info') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.className   = `toast ${type} show`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.className = 'toast'; }, 3500);
  }

  // â”€â”€ Utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }
}

// â”€â”€ Boot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Only run on dashboard.html, not on index.html
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('app')) {
    const admin = new FloralynAdmin();
    admin.init().catch(err => console.error('[FloralynAdmin] Init error:', err));
  }
});
