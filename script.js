'use strict';

/* ═══════════════════════════════════════════════════════════════
   FLORALYN — script.js (v5.0 Atelier Interactive & Full CMS Sync)
   ═══════════════════════════════════════════════════════════════ */

const LOAD_AT     = Date.now();
const MIN_FILL_MS = 1500;

let _updateBookingSchedule = null;
let _selectNailVerseShade  = null;

document.addEventListener('DOMContentLoaded', () => {
  initIntro();
  initTheme();
  initHeader();
  initDrawer();
  initHeroStage();
  initNailVerse();
  initFloatBtn();
  initServices();
  initReveal();
  initCustomPickers();
  initGallery();
  initForm();
  initSiteSettings();
});

function storageGet(store, key) {
  try { return store.getItem(key); } catch (_) { return null; }
}
function storageSet(store, key, val) {
  try { store.setItem(key, val); } catch (_) {}
}

function hexShadeTriad(hex) {
  const clean = /^#[0-9a-f]{6}$/i.test(hex || '') ? hex : '#F4BFD3';
  const r = parseInt(clean.slice(1, 3), 16);
  const g = parseInt(clean.slice(3, 5), 16);
  const b = parseInt(clean.slice(5, 7), 16);
  const mix = (tr, tg, tb, t) => {
    const nr = Math.round(r + (tr - r) * t);
    const ng = Math.round(g + (tg - g) * t);
    const nb = Math.round(b + (tb - b) * t);
    return `#${[nr, ng, nb].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
  };
  return { c1: mix(255, 255, 255, 0.45), c2: clean, c3: mix(30, 8, 28, 0.36) };
}

/* ── Helper: Attach chosen studio mood/look to Booking Form ───── */
function applyMoodToBooking({ service, noteLine, label }, shouldScroll = true) {
  const booking   = document.getElementById('booking');
  const msgEl     = document.getElementById('msg');
  const badge     = document.getElementById('booking-mood-badge');
  const bText     = document.getElementById('booking-mood-text');
  const formChip  = document.getElementById('form-mood-chip');
  const formCText = document.getElementById('form-mood-text');

  if (service) {
    const radios = Array.from(document.querySelectorAll('input[name="service"]'));
    const match  = radios.find(r => r.value.toLowerCase() === String(service).toLowerCase())
                || radios.find(r => r.value.toLowerCase().includes(String(service).toLowerCase()));
    if (match) match.checked = true;
  }

  if (msgEl && noteLine) {
    const existing = msgEl.value.trim();
    const cleaned  = existing
      .split('\n')
      .filter(l => !l.startsWith('Studio Mood:') && !l.startsWith('Lookbook Inspo:'))
      .join('\n')
      .trim();
    const nextVal = cleaned ? `${noteLine}\n${cleaned}` : noteLine;
    msgEl.value = nextVal;
    msgEl.textContent = nextVal;
  }

  if (badge && bText && label) {
    bText.textContent = label;
    badge.removeAttribute('hidden');
  }
  if (formChip && formCText && label) {
    formCText.textContent = label;
    formChip.removeAttribute('hidden');
  }

  if (shouldScroll && booking) {
    booking.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ── Theme (Sunlit Atelier default / Candlelit Parlour toggle) ── */
function initTheme() {
  const cb = document.getElementById('dm');
  if (!cb) return;
  const stored = storageGet(localStorage, 'flTheme');
  const dark   = stored === 'dark';
  if (dark) { document.body.classList.add('dark'); cb.checked = true; }
  cb.addEventListener('change', () => {
    document.body.classList.toggle('dark', cb.checked);
    storageSet(localStorage, 'flTheme', cb.checked ? 'dark' : 'light');
  });
}

/* ── Sticky header ────────────────────────────────────────────── */
function initHeader() {
  const h = document.getElementById('hdr');
  if (!h) return;
  const fn = () => h.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', fn, { passive: true });
  fn();
}

/* ── Mobile drawer ────────────────────────────────────────────── */
function initDrawer() {
  const burger   = document.getElementById('burger');
  const drawer   = document.getElementById('drawer');
  const drover   = document.getElementById('drover');
  const closeBtn = document.getElementById('drawer-close');
  if (!burger || !drawer || !drover) return;

  const open = () => {
    drawer.classList.add('open');
    drover.classList.add('on');
    drawer.removeAttribute('aria-hidden');
    burger.setAttribute('aria-expanded', 'true');
    burger.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  const shut = () => {
    drawer.classList.remove('open');
    drover.classList.remove('on');
    drawer.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    burger.classList.remove('open');
    document.body.style.overflow = '';
  };

  burger.addEventListener('click', () => drawer.classList.contains('open') ? shut() : open());
  drover.addEventListener('click', shut);
  closeBtn?.addEventListener('click', shut);
  drawer.querySelectorAll('.d-link').forEach(l => l.addEventListener('click', shut));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) shut();
  });
}

/* ── 3D Hero Stage + Interactive Nail Swatch Dock ─────────────── */
function initHeroStage() {
  const hero    = document.getElementById('home');
  const stage   = document.getElementById('hero-stage');
  const rig     = document.getElementById('hero-3d-rig');
  const mainImg = document.getElementById('hero-showcase-img');
  const titleEl = document.getElementById('hero-look-title');
  const subEl   = document.getElementById('hero-look-sub');
  const tips    = Array.from(document.querySelectorAll('.nail-tip[data-look-img]'));

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover       = window.matchMedia('(hover: hover)').matches;
  if (stage && rig && !prefersReduced && canHover) {
    let raf = 0;
    stage.addEventListener('mousemove', e => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r  = stage.getBoundingClientRect();
        const nx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
        const ny = ((e.clientY - r.top)  / r.height - 0.5) * 2;
        rig.style.setProperty('--rx', `${(nx * 6).toFixed(2)}deg`);
        rig.style.setProperty('--ry', `${(-ny * 5).toFixed(2)}deg`);
        rig.style.setProperty('--gx', `${(50 + nx * 28).toFixed(1)}%`);
        rig.style.setProperty('--gy', `${(35 + ny * 26).toFixed(1)}%`);
      });
    });
    stage.addEventListener('mouseleave', () => {
      rig.style.setProperty('--rx', '0deg');
      rig.style.setProperty('--ry', '0deg');
    });
  }

  if (!mainImg || !tips.length) return;
  tips.forEach(btn => {
    btn.addEventListener('click', () => {
      const nextSrc   = btn.dataset.lookImg;
      const nextTitle = btn.dataset.lookTitle || '';
      const nextSub   = btn.dataset.lookSub   || '';
      const nextMood  = btn.dataset.lookMood  || 'rose';

      tips.forEach(t => {
        const isMe = t === btn;
        t.classList.toggle('active', isMe);
        t.setAttribute('aria-pressed', isMe ? 'true' : 'false');
      });

      if (hero) hero.dataset.mood = nextMood;
      if (titleEl) titleEl.textContent = nextTitle;
      if (subEl)   subEl.textContent   = nextSub;

      if (mainImg.getAttribute('src') !== nextSrc) {
        mainImg.classList.add('swapping');
        const pre = new Image();
        pre.onload = pre.onerror = () => {
          mainImg.src = nextSrc;
          mainImg.alt = `${nextTitle} — ${nextSub}`;
          requestAnimationFrame(() => mainImg.classList.remove('swapping'));
        };
        pre.src = nextSrc;
      }

      applyMoodToBooking({
        service: btn.dataset.lookService || 'Custom Design',
        noteLine: `Studio Mood: ${nextTitle} (${nextSub})`,
        label: `Selected Mood: ${nextTitle}`,
      }, false);
    });
  });
}

/* ── Interactive Nail Verse Studio Polish Bar ─────────────────── */
function initNailVerse() {
  const mirror    = document.getElementById('nv-mirror');
  const readoutEl = document.getElementById('nv-readout');
  const confirmEl = document.getElementById('nv-confirm');
  const applyBtn  = document.getElementById('nv-apply-btn');
  if (!mirror) return;

  const shapeBtns  = Array.from(document.querySelectorAll('[data-nv-shape]'));
  const finishBtns = Array.from(document.querySelectorAll('[data-nv-finish]'));
  const potsWrap   = document.querySelector('.vc-pots');

  const state = {
    shapeLabel:  'Almond',
    finishLabel: 'Glazed Pearl',
    shadeLabel:  'Blush Silk',
    service:     'Gel Nails',
  };

  function syncReadout() {
    if (readoutEl) {
      readoutEl.textContent = `${state.shapeLabel} · ${state.finishLabel} · ${state.shadeLabel}`;
    }
  }

  function applyShadeTriad(hex) {
    if (!hex) return;
    const { c1, c2, c3 } = hexShadeTriad(hex);
    mirror.style.setProperty('--nv-c1', c1);
    mirror.style.setProperty('--nv-c2', c2);
    mirror.style.setProperty('--nv-c3', c3);
  }

  function bindShadeButtons() {
    const shadeBtns = Array.from(document.querySelectorAll('.vc-pot'));
    shadeBtns.forEach(btn => btn.addEventListener('click', () => {
      shadeBtns.forEach(b => b.classList.toggle('act', b === btn));
      if (btn.dataset.nvShade) {
        mirror.dataset.shade = btn.dataset.nvShade;
        mirror.style.removeProperty('--nv-c1');
        mirror.style.removeProperty('--nv-c2');
        mirror.style.removeProperty('--nv-c3');
      } else if (btn.dataset.nvHex) {
        mirror.removeAttribute('data-shade');
        applyShadeTriad(btn.dataset.nvHex);
      }
      state.shadeLabel = btn.dataset.shadeName || btn.textContent.trim();
      syncReadout();
    }));
  }

  _selectNailVerseShade = (shades) => {
    if (!potsWrap || !Array.isArray(shades) || !shades.length) return;
    potsWrap.innerHTML = '';
    shades.forEach((s, idx) => {
      if (!s || !s.name) return;
      const hex = /^#[0-9a-f]{6}$/i.test(s.hex || '') ? s.hex : '#F4BFD3';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vc-pot' + (idx === 0 ? ' act' : '');
      btn.dataset.nvHex = hex;
      btn.dataset.shadeName = String(s.name).slice(0, 40);
      btn.setAttribute('aria-label', btn.dataset.shadeName);

      const gem = document.createElement('span');
      gem.className = 'pot-gem';
      gem.style.setProperty('--pot', hex);

      const copy = document.createElement('span');
      copy.className = 'pot-copy';
      const lbl = document.createElement('span');
      lbl.textContent = btn.dataset.shadeName;
      copy.appendChild(lbl);
      if (s.note) {
        const noteEl = document.createElement('span');
        noteEl.className = 'pot-note';
        noteEl.textContent = String(s.note).slice(0, 40);
        copy.appendChild(noteEl);
      }

      btn.append(gem, copy);
      potsWrap.appendChild(btn);

      if (idx === 0) {
        mirror.removeAttribute('data-shade');
        applyShadeTriad(hex);
        state.shadeLabel = btn.dataset.shadeName;
        syncReadout();
      }
    });
    bindShadeButtons();
  };

  shapeBtns.forEach(btn => btn.addEventListener('click', () => {
    shapeBtns.forEach(b => b.classList.toggle('act', b === btn));
    mirror.dataset.shape = btn.dataset.nvShape || 'almond';
    state.shapeLabel = btn.textContent.trim();
    syncReadout();
  }));

  finishBtns.forEach(btn => btn.addEventListener('click', () => {
    finishBtns.forEach(b => b.classList.toggle('act', b === btn));
    mirror.dataset.finish = btn.dataset.nvFinish || 'pearl';
    state.finishLabel = btn.textContent.trim();
    state.service     = btn.dataset.nvSvc || 'Custom Design';
    syncReadout();
  }));

  bindShadeButtons();

  applyBtn?.addEventListener('click', () => {
    const combo = `${state.shapeLabel} · ${state.finishLabel} · ${state.shadeLabel}`;
    applyMoodToBooking({
      service: state.service,
      noteLine: `Studio Mood: ${combo}`,
      label: `Polish Bar: ${combo}`,
    }, true);
    if (confirmEl) {
      confirmEl.textContent = `Saved "${combo}" into your reservation notes below ✓`;
      setTimeout(() => { confirmEl.textContent = ''; }, 4500);
    }
  });
}

/* ── Floating CTA visibility (hide in hero, polish bar & booking) */
function initFloatBtn() {
  const btn     = document.getElementById('fbtn');
  const hero    = document.querySelector('.hero');
  const bar     = document.getElementById('studio-bar');
  const booking = document.getElementById('booking');
  if (!btn || !hero) return;

  let heroVis = true, barVis = false, bookVis = false;
  const sync = () => btn.classList.toggle('on', !heroVis && !barVis && !bookVis);

  new IntersectionObserver(([e]) => { heroVis = e.isIntersecting; sync(); }, { threshold: 0.1 }).observe(hero);
  if (bar) {
    new IntersectionObserver(([e]) => { barVis = e.isIntersecting; sync(); }, { threshold: 0.25 }).observe(bar);
  }
  if (booking) {
    new IntersectionObserver(([e]) => { bookVis = e.isIntersecting; sync(); }, { threshold: 0.08 }).observe(booking);
  }
}

/* ── Services click-to-book binding ───────────────────────────── */
function bindServiceRows() {
  const rows = document.querySelectorAll('.svc-row[data-service]');
  rows.forEach(row => {
    if (row.dataset.bound) return;
    row.dataset.bound = '1';
    const choose = () => {
      const svc = row.dataset.service;
      applyMoodToBooking({ service: svc, label: `Service: ${svc}` }, true);
    };
    row.addEventListener('click', choose);
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); }
    });
  });
}

function initServices() {
  bindServiceRows();
}

/* ── Scroll reveal ────────────────────────────────────────────── */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); }
    }),
    { threshold: 0.06, rootMargin: '0px 0px -30px 0px' }
  );
  els.forEach(el => io.observe(el));
}

/* ── Custom date + time pickers (Admin CMS configurable) ──────── */
function initCustomPickers() {
  const grid   = document.getElementById('cdp-grid');
  const label  = document.getElementById('cdp-month');
  const prev   = document.getElementById('cdp-prev');
  const next   = document.getElementById('cdp-next');
  const fdate  = document.getElementById('fdate');
  const ftime  = document.getElementById('ftime');
  const subEl  = document.getElementById('booking-window-sub');
  if (!grid || !fdate) return;

  const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAY_NAMES = ['Sundays','Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays'];

  let minDays    = 1;
  let maxDays    = 90;
  let closedDays = new Set([0]);
  let selDate    = null;

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const getBounds = () => {
    const minDt = new Date(now); minDt.setDate(minDt.getDate() + minDays);
    const maxDt = new Date(now); maxDt.setDate(maxDt.getDate() + maxDays);
    return { minDt, maxDt };
  };
  let view = new Date(now.getFullYear(), now.getMonth(), 1);

  function fmt(d) {
    const dy = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${dy[d.getDay()]}, ${d.getDate()} ${mo[d.getMonth()]} ${d.getFullYear()}`;
  }

  function renderCalendar() {
    const { minDt, maxDt } = getBounds();
    if (view < new Date(minDt.getFullYear(), minDt.getMonth(), 1)) {
      view = new Date(minDt.getFullYear(), minDt.getMonth(), 1);
    }

    const y = view.getFullYear(), m = view.getMonth();
    label.textContent = `${MONTHS[m]} ${y}`;

    if (prev) prev.disabled = y === minDt.getFullYear() && m <= minDt.getMonth();
    if (next) next.disabled = y > maxDt.getFullYear() || (y === maxDt.getFullYear() && m >= maxDt.getMonth());

    if (selDate && (closedDays.has(selDate.getDay()) || selDate < minDt || selDate > maxDt)) {
      selDate = null;
      fdate.value = '';
    }

    grid.innerHTML = '';
    const first = new Date(y, m, 1).getDay();
    const days  = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < first; i++) {
      const s = document.createElement('span');
      s.className = 'cdp-day cdp-other'; s.setAttribute('aria-hidden', 'true');
      grid.appendChild(s);
    }
    for (let d = 1; d <= days; d++) {
      const dt  = new Date(y, m, d);
      const btn = document.createElement('button');
      btn.type  = 'button';
      btn.className = 'cdp-day'
        + (dt.getTime() === now.getTime() ? ' cdp-today' : '')
        + (selDate && dt.getTime() === selDate.getTime() ? ' cdp-sel' : '');
      btn.textContent = String(d);
      btn.setAttribute('aria-label', fmt(dt));
      if (closedDays.has(dt.getDay()) || dt < minDt || dt > maxDt) {
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => {
          selDate = dt; fdate.value = fmt(dt); renderCalendar();
        });
      }
      grid.appendChild(btn);
    }
  }

  prev?.addEventListener('click', () => { view.setMonth(view.getMonth() - 1); renderCalendar(); });
  next?.addEventListener('click', () => { view.setMonth(view.getMonth() + 1); renderCalendar(); });
  renderCalendar();

  const DEFAULT_GROUPS = [
    { id: 'ctp-am',  group: 'Morning',   slots: ['10:00 AM','10:30 AM','11:00 AM','11:30 AM'] },
    { id: 'ctp-pm',  group: 'Afternoon', slots: ['12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM'] },
    { id: 'ctp-eve', group: 'Evening',   slots: ['4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM','6:30 PM'] },
  ];

  function format24To12(t24) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(t24 || '').trim());
    if (!m) return t24;
    let h = parseInt(m[1], 10);
    const min = m[2];
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${min} ${ap}`;
  }

  function renderSlots(groupsList) {
    if (!ftime) return;
    const allSlots = [];
    groupsList.forEach(({ id, slots }) => {
      const c = document.getElementById(id);
      if (!c) return;
      c.innerHTML = '';
      const groupWrap = c.closest('.ctp-group');
      if (groupWrap) groupWrap.style.display = slots.length ? '' : 'none';
      slots.forEach(t => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'ctp-slot'; b.textContent = t;
        if (ftime.value === t) b.classList.add('ctp-sel');
        b.addEventListener('click', () => {
          allSlots.forEach(s => s.classList.remove('ctp-sel'));
          b.classList.add('ctp-sel');
          ftime.value = t;
        });
        c.appendChild(b);
        allSlots.push(b);
      });
    });
    if (ftime.value && !allSlots.some(s => s.textContent === ftime.value)) ftime.value = '';
  }

  renderSlots(DEFAULT_GROUPS);

  _updateBookingSchedule = (bookingCfg, timeslotsCfg) => {
    if (bookingCfg && typeof bookingCfg === 'object') {
      const m1 = Number(bookingCfg.advance_days_min);
      const m2 = Number(bookingCfg.advance_days_max);
      if (Number.isFinite(m1) && m1 >= 0 && m1 <= 30) minDays = Math.floor(m1);
      if (Number.isFinite(m2) && m2 >= 1 && m2 <= 365) maxDays = Math.floor(m2);
      if (Array.isArray(bookingCfg.closed_days)) {
        closedDays = new Set(bookingCfg.closed_days.map(n => parseInt(n, 10)).filter(n => n >= 0 && n <= 6));
      }
      if (subEl) {
        const closedText = closedDays.size
          ? `Closed ${[...closedDays].sort().map(d => DAY_NAMES[d]).join(', ')}`
          : 'Open all week';
        const noticeText = minDays === 0 ? 'Same-day ok' : minDays === 1 ? 'Advance notice 24h+' : `${minDays}+ days notice`;
        subEl.textContent = `${closedText} · ${noticeText}`;
      }
      renderCalendar();
    }

    if (Array.isArray(timeslotsCfg) && timeslotsCfg.length > 0) {
      const grouped = [
        { id: 'ctp-am',  group: 'Morning',   slots: [] },
        { id: 'ctp-pm',  group: 'Afternoon', slots: [] },
        { id: 'ctp-eve', group: 'Evening',   slots: [] },
      ];
      timeslotsCfg.forEach(slot => {
        if (!slot || (!slot.label && !slot.time)) return;
        const lbl = (slot.label || format24To12(slot.time)).trim().slice(0, 30);
        const bucket = grouped.find(g => g.group.toLowerCase() === String(slot.group || '').toLowerCase()) || grouped[0];
        bucket.slots.push(lbl);
      });
      if (grouped.some(g => g.slots.length > 0)) renderSlots(grouped);
    }
  };
}

/* ── Lookbook Gallery + Filter + Lightbox ─────────────────────── */
function initGallery() {
  const gal    = document.getElementById('gal');
  const lbox   = document.getElementById('lbox');
  const limg   = document.getElementById('lb-img');
  const lp     = document.getElementById('lb-p');
  const ln     = document.getElementById('lb-n');
  const lx     = document.getElementById('lb-x');
  const dotsEl = document.getElementById('lb-dots');
  if (!gal || !lbox || !limg) return;

  _tryLoadDynamicGallery(gal).finally(() => {
    _bindGalleryFilters(gal);
    _bindLightbox(gal, lbox, limg, lp, ln, lx, dotsEl);
  });
}

let _siteSettingsPromise = null;
function fetchSiteData() {
  if (!_siteSettingsPromise) {
    _siteSettingsPromise = fetch('/api/site-settings', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return _siteSettingsPromise;
}

async function _tryLoadDynamicGallery(gal) {
  try {
    const data = await fetchSiteData();
    if (!data || !data.ok || !Array.isArray(data.gallery) || data.gallery.length === 0) return;

    const driveCard = gal.querySelector('a.g-drive');
    gal.querySelectorAll('button.g-item').forEach(btn => btn.remove());

    data.gallery.forEach((item, idx) => {
      if (typeof item.public_url !== 'string' || !item.public_url.startsWith('https://')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'g-item' + (idx === 0 ? ' g-tall' : idx === 3 ? ' g-wide' : '');
      btn.setAttribute('aria-label', `View ${item.title || 'nail art photo ' + (idx + 1)}`);
      btn.dataset.i     = String(idx);
      btn.dataset.cat   = item.category || 'studio';
      btn.dataset.title = item.title || 'Floralyn Studio Set';

      const img = document.createElement('img');
      img.src = item.public_url;
      img.alt = item.alt_text || 'Nail art by Floralyn';
      img.loading = idx === 0 ? 'eager' : 'lazy';

      const cap = document.createElement('div');
      cap.className = 'g-cap';
      const capT = document.createElement('strong');
      capT.textContent = item.title || 'Studio Look';
      cap.appendChild(capT);
      if (item.tech) {
        const capS = document.createElement('span');
        capS.textContent = item.tech;
        cap.appendChild(capS);
      }

      const over = document.createElement('div');
      over.className = 'g-over';
      over.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>';

      btn.append(img, cap, over);
      if (driveCard) gal.insertBefore(btn, driveCard);
      else gal.appendChild(btn);
    });
  } catch (_) { /* static lookbook fallback */ }
}

function _bindGalleryFilters(gal) {
  const tabs  = Array.from(document.querySelectorAll('.gf-tab[data-filter]'));
  const items = Array.from(gal.querySelectorAll('button.g-item[data-cat]'));
  if (!tabs.length || !items.length) return;

  // Hide empty category tabs automatically if admin hasn't tagged photos under them
  tabs.forEach(tab => {
    const f = tab.dataset.filter;
    if (f !== 'all') {
      const hasAny = items.some(card => card.dataset.cat === f);
      tab.style.display = hasAny ? '' : 'none';
    }
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        const on = t === tab;
        t.classList.toggle('act', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      items.forEach(card => {
        const match = f === 'all' || card.dataset.cat === f;
        card.classList.toggle('is-hidden', !match);
      });
    });
  });
}

function _bindLightbox(gal, lbox, limg, lp, ln, lx, dotsEl) {
  const items = Array.from(gal.querySelectorAll('button.g-item[data-i]'));
  const srcs  = items.map(el => ({
    src:   el.querySelector('img')?.src || '',
    alt:   el.querySelector('img')?.alt || '',
    title: el.dataset.title || el.querySelector('.g-cap strong')?.textContent || '',
    cat:   el.dataset.cat || '',
  }));
  if (!srcs.length) return;

  const capEl = document.getElementById('lb-cap');
  const reqEl = document.getElementById('lb-req');
  let cur = 0, tx = 0, lastFocus = null;

  if (dotsEl) {
    dotsEl.innerHTML = '';
    srcs.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'lb-dot' + (i === 0 ? ' act' : '');
      d.setAttribute('aria-hidden', 'true');
      dotsEl.appendChild(d);
    });
  }

  function dots() {
    dotsEl?.querySelectorAll('.lb-dot').forEach((d, i) => d.classList.toggle('act', i === cur));
  }
  function show(i) {
    if (lbox.hasAttribute('hidden')) lastFocus = document.activeElement;
    cur = ((i % srcs.length) + srcs.length) % srcs.length;
    limg.src = srcs[cur].src; limg.alt = srcs[cur].alt;
    if (capEl) {
      const label = srcs[cur].title || srcs[cur].alt;
      capEl.textContent = `${cur + 1} / ${srcs.length}${label ? ' · ' + label : ''}`;
    }
    dots();
    lbox.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    lx?.focus();
  }
  function hide() {
    lbox.setAttribute('hidden', '');
    document.body.style.overflow = '';
    lastFocus?.focus?.();
  }

  items.forEach(el => el.addEventListener('click', () => show(+el.dataset.i)));
  lx?.addEventListener('click', hide);
  lp?.addEventListener('click', () => show(cur - 1));
  ln?.addEventListener('click', () => show(cur + 1));
  lbox.addEventListener('click', e => { if (e.target === lbox) hide(); });

  reqEl?.addEventListener('click', () => {
    const item = srcs[cur];
    hide();
    const svc = item.title.toLowerCase().includes('bridal')
      ? 'Bridal / Special Occasion'
      : 'Custom Design';
    applyMoodToBooking({
      service: svc,
      noteLine: `Lookbook Inspo: ${item.title || item.alt}`,
      label: `Inspo: ${item.title || 'Studio Look #' + (cur + 1)}`,
    }, true);
  });

  document.addEventListener('keydown', e => {
    if (lbox.hasAttribute('hidden')) return;
    if (e.key === 'Escape')     { e.preventDefault(); hide(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); show(cur - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
  });

  lbox.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  lbox.addEventListener('touchend', e => {
    const dx = tx - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 45) show(cur + (dx > 0 ? 1 : -1));
  }, { passive: true });
}

/* ── Booking form (multi-step) ────────────────────────────────── */
function initForm() {
  const form      = document.getElementById('bform');
  const statusEl  = document.getElementById('fstatus');
  const sbtn      = document.getElementById('sbtn');
  const successEl = document.getElementById('fsuccess');
  const summaryEl = document.getElementById('fsc-summary');
  const againBtn  = document.getElementById('fsc-again');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.f-step'));
  const sdots = Array.from(document.querySelectorAll('.step-dot'));
  let   cur   = 0;

  const val = id => (form.querySelector('#' + id)?.value || '').trim();

  function setStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = { ok: '#22863a', err: '#c0392b', info: 'var(--muted)' }[type] || 'var(--muted)';
    if (type === 'ok' || type === 'err') statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function clrStatus() { if (statusEl) { statusEl.textContent = ''; statusEl.style.color = ''; } }

  function shake(el) {
    if (!el) return;
    el.classList.remove('shake-field'); void el.offsetWidth;
    el.classList.add('shake-field');
    el.addEventListener('animationend', () => el.classList.remove('shake-field'), { once: true });
  }
  function setLoading(on) {
    if (!sbtn) return;
    sbtn.disabled = on;
    sbtn.textContent = on ? 'Sending Request… 🌸' : 'Send Request ✦';
  }

  function goTo(n, back = false) {
    if (n < 0 || n >= steps.length) return;
    steps[cur].classList.remove('act', 'back-anim');
    sdots[cur]?.classList.remove('act');
    cur = n;
    steps[cur].classList.add('act');
    if (back) steps[cur].classList.add('back-anim');
    sdots[cur]?.classList.add('act');
    clrStatus();
    form.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function validateStep(i) {
    if (i === 0) {
      const n = val('from_name'), p = val('phone');
      if (!n || n.length < 2) { shake(form.querySelector('#from_name')); setStatus('Please enter your full name 💕', 'err'); return false; }
      if (!p || !/^[\d\s\+\-\(\)]{7,20}$/.test(p)) { shake(form.querySelector('#phone')); setStatus('Please enter a valid phone number 💕', 'err'); return false; }
    }
    if (i === 1) {
      if (!val('fdate')) { shake(document.getElementById('cdp')); setStatus('Please choose an available date 📅', 'err'); return false; }
      if (!val('ftime')) { shake(document.getElementById('ctp')); setStatus('Please choose an appointment time ⏰', 'err'); return false; }
    }
    return true;
  }

  form.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(cur)) goTo(+(btn.dataset.next ?? cur + 1));
    });
  });
  form.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => goTo(+(btn.dataset.back ?? cur - 1), true));
  });

  function showSuccess(data) {
    form.style.display = 'none';
    if (successEl) {
      successEl.removeAttribute('hidden');
      if (summaryEl) {
        summaryEl.innerHTML = '';
        [
          ['👤', data.name],
          ['📅', data.date],
          ['⏰', data.time],
          ['💎', data.service],
        ].forEach(([icon, txt]) => {
          const row   = document.createElement('div');
          row.className = 'fsc-row';
          const ico   = document.createElement('span');
          ico.textContent = icon;
          const valEl = document.createElement('span');
          valEl.textContent = txt;
          row.append(ico, valEl);
          summaryEl.appendChild(row);
        });
      }
    }
  }

  function resetForm() {
    form.reset();
    form.style.display = '';
    steps.forEach((s, i) => { s.classList.toggle('act', i === 0); s.classList.remove('back-anim'); });
    sdots.forEach((d, i) => d.classList.toggle('act', i === 0));
    cur = 0;
    document.querySelectorAll('.ctp-slot').forEach(s => s.classList.remove('ctp-sel'));
    document.querySelectorAll('.cdp-sel').forEach(s => s.classList.remove('cdp-sel'));
    if (successEl) successEl.setAttribute('hidden', '');
    clrStatus();
  }

  againBtn?.addEventListener('click', resetForm);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if ((form.querySelector('input[name="_h"]')?.value || '').trim()) return;

    if (Date.now() - LOAD_AT < MIN_FILL_MS) {
      setStatus('Please take a moment to review your details 🌸', 'info'); return;
    }

    const name  = val('from_name');
    const phone = val('phone');
    const date  = val('fdate');
    const time  = val('ftime');
    const svc   = form.querySelector('input[name="service"]:checked')?.value
                || form.querySelector('input[name="service"]')?.value
                || 'Custom Design';
    const msg   = val('msg');

    if (!name || !phone) { goTo(0); setStatus('Please enter your name and phone 💕', 'err'); return; }
    if (!date || !time)  { goTo(1); setStatus('Please pick a date and time 📅', 'err'); return; }

    setLoading(true);
    setStatus('Sending your chair request… 🌷', 'info');

    let ok = false;
    try {
      const r = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_name: name, phone, date, time, service: svc, message: msg }),
      });
      if (r.ok) {
        const d = await r.json().catch(() => ({}));
        if (d.ok) ok = true;
      }
    } catch (err) { console.error('[fetch]', err); }

    setLoading(false);

    if (ok) {
      clrStatus();
      showSuccess({ name, date, time, service: svc });
    } else {
      setStatus('Could not send — please email floralyyn7@gmail.com 🌸', 'err');
    }
  });
}

/* ── Intro Curtain Preloader ──────────────────────────────────── */
function initIntro() {
  const el = document.getElementById('intro');
  if (!el) return;

  if (storageGet(sessionStorage, 'flIntro')) {
    el.style.display = 'none';
    el.remove();
    return;
  }

  document.body.style.overflow = 'hidden';

  const SHOW_MS = 1800;
  const EXIT_MS = 720;
  let closed = false;

  const dismiss = () => {
    if (closed) return;
    closed = true;
    el.classList.add('intro-out');
    setTimeout(() => {
      el.remove();
      document.body.style.overflow = '';
      storageSet(sessionStorage, 'flIntro', '1');
    }, EXIT_MS);
  };

  const timer = setTimeout(dismiss, SHOW_MS);
  document.getElementById('intro-skip')?.addEventListener('click', () => {
    clearTimeout(timer);
    dismiss();
  });
}

/* ── Dynamic Storefront Hydration from Admin CMS ──────────────── */
function renderDynamicServices(services) {
  const listEl   = document.querySelector('#services .svc-list');
  const pickerEl = document.querySelector('#bform .svc-picker');
  if (!listEl || !Array.isArray(services) || services.length === 0) return;

  listEl.innerHTML = '';
  services.forEach((s, idx) => {
    const row = document.createElement('div');
    row.className = 'svc-row reveal vis' + (s.featured ? ' svc-featured' : '');
    row.setAttribute('role', 'listitem');
    row.setAttribute('tabindex', '0');
    row.dataset.service = s.name;

    const num = document.createElement('div');
    num.className = 'svc-num';
    num.setAttribute('aria-hidden', 'true');
    num.textContent = String(idx + 1).padStart(2, '0');

    const body = document.createElement('div');
    body.className = 'svc-body';

    const title = document.createElement('h3');
    title.className = 'svc-name';
    title.appendChild(document.createTextNode(s.name));
    if (s.tag) {
      title.appendChild(document.createTextNode(' '));
      const tagEl = document.createElement('span');
      tagEl.className = 'svc-tag';
      tagEl.textContent = s.tag;
      title.appendChild(tagEl);
    }
    body.appendChild(title);

    if (s.description) {
      const desc = document.createElement('p');
      desc.className = 'svc-desc';
      desc.textContent = s.description;
      body.appendChild(desc);
    }

    if (Array.isArray(s.includes) && s.includes.length > 0) {
      const inc = document.createElement('div');
      inc.className = 'svc-includes';
      s.includes.forEach(item => {
        const chip = document.createElement('span');
        chip.textContent = item;
        inc.appendChild(chip);
      });
      body.appendChild(inc);
    }

    const info = document.createElement('div');
    info.className = 'svc-info';
    if (s.duration) {
      const dur = document.createElement('span');
      dur.className = 'svc-dur';
      dur.textContent = s.duration;
      info.appendChild(dur);
    }
    if (s.price) {
      const price = document.createElement('span');
      price.className = 'svc-price';
      price.textContent = s.price;
      info.appendChild(price);
    }
    const cta = document.createElement('span');
    cta.className = 'svc-cta';
    cta.setAttribute('aria-hidden', 'true');
    cta.textContent = 'Reserve →';
    info.appendChild(cta);

    row.append(num, body, info);
    listEl.appendChild(row);
  });

  if (pickerEl) {
    const prevChecked = pickerEl.querySelector('input[name="service"]:checked')?.value;
    pickerEl.innerHTML = '';
    const defaultIdx = services.findIndex(s => s.featured);
    services.forEach((s, idx) => {
      const lbl = document.createElement('label');
      lbl.className = 'sp-opt';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'service';
      radio.value = s.name;
      if (prevChecked ? s.name === prevChecked : idx === (defaultIdx >= 0 ? defaultIdx : 0)) {
        radio.checked = true;
      }

      const card = document.createElement('div');
      card.className = 'sp-card';
      const ico = document.createElement('span');
      ico.className = 'sp-ico';
      ico.textContent = s.icon || '💅';
      const nameEl = document.createElement('strong');
      nameEl.textContent = s.name;
      card.append(ico, nameEl);

      lbl.append(radio, card);
      pickerEl.appendChild(lbl);
    });
  }

  bindServiceRows();
}

function renderDynamicFaq(faq) {
  const faqRhs = document.querySelector('#faq .faq-rhs');
  if (!faqRhs || !Array.isArray(faq) || faq.length === 0) return;

  faqRhs.innerHTML = '';
  faq.forEach(item => {
    if (!item || !item.q || !item.a) return;
    const det = document.createElement('details');
    det.className = 'faq-item';

    const sum = document.createElement('summary');
    sum.className = 'faq-q';
    sum.appendChild(document.createTextNode(String(item.q)));
    sum.insertAdjacentHTML(
      'beforeend',
      '<svg class="faq-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>'
    );

    const ansWrap = document.createElement('div');
    ansWrap.className = 'faq-a';
    const ansP = document.createElement('p');
    ansP.textContent = String(item.a);
    ansWrap.appendChild(ansP);

    det.append(sum, ansWrap);
    faqRhs.appendChild(det);
  });
}

function applyBusinessInfo(biz) {
  if (!biz || typeof biz !== 'object') return;
  if (biz.name) {
    document.querySelectorAll('.logo-name').forEach(el => { el.textContent = biz.name; });
  }
  if (biz.location) {
    const loc = document.getElementById('bc-location');
    if (loc) loc.textContent = biz.location;
    document.querySelectorAll('.ftr-location').forEach(el => {
      el.textContent = `${biz.location} · Private Chair`;
    });
  }
  if (biz.hours_text) {
    const bh = document.getElementById('bc-hours');
    const fh = document.getElementById('ftr-hours');
    const dh = document.querySelector('.drawer-hours');
    if (bh) bh.textContent = biz.hours_text;
    if (fh) fh.textContent = biz.hours_text;
    if (dh) dh.textContent = `By Appointment · ${biz.hours_text}`;
  }
  if (biz.closed_note) {
    const fc = document.getElementById('ftr-closed');
    if (fc) fc.textContent = biz.closed_note;
  }
  if (biz.email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(biz.email.trim())) {
    const cleanEmail = biz.email.trim();
    document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
      a.href = `mailto:${cleanEmail}`;
      const span = a.querySelector('span');
      if (span) span.textContent = cleanEmail;
      else if (!a.querySelector('svg')) a.textContent = cleanEmail;
    });
  }
  if (biz.instagram && /^https:\/\//i.test(biz.instagram)) {
    let handle = '';
    try {
      const seg = new URL(biz.instagram).pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
      if (seg) handle = '@' + seg;
    } catch (_) {}
    document.querySelectorAll('a[href*="instagram.com"]').forEach(a => {
      a.href = biz.instagram;
      if (handle) {
        const span = a.querySelector('span');
        if (span) span.textContent = handle;
        else if (!a.querySelector('svg') && a.textContent.trim().startsWith('@')) a.textContent = handle;
      }
    });
  }
  if (biz.show_phone && biz.phone) {
    const cleanTel = String(biz.phone).replace(/[^\d+]/g, '');
    if (cleanTel.length >= 7) {
      const bc = document.querySelector('.booking-contact');
      if (bc && !document.getElementById('bc-phone')) {
        const link = document.createElement('a');
        link.id = 'bc-phone';
        link.href = `tel:${cleanTel}`;
        link.textContent = `📞 ${biz.phone}`;
        bc.appendChild(link);
      }
    }
  }
}

async function initSiteSettings() {
  try {
    const data = await fetchSiteData();
    if (!data || !data.ok) return;
    const { settings = {}, services = [] } = data;

    // 1. Offer Banner
    const b = settings.banner;
    if (b && b.enabled && b.text) {
      const wrap = document.getElementById('offer-banner');
      const txt  = String(b.text).slice(0, 200);
      ['ob-text-1', 'ob-text-2', 'ob-text-3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
      });
      if (wrap) {
        if (/^#[0-9a-f]{3,8}$/i.test(String(b.bg || ''))) wrap.style.background = String(b.bg);
        if (/^#[0-9a-f]{3,8}$/i.test(String(b.textColor || ''))) wrap.style.color = String(b.textColor);
        wrap.style.display = '';
        document.body.classList.add('has-banner');
      }
    }

    // 2. Dynamic Services & Prices (falls back gracefully if table empty)
    if (Array.isArray(services) && services.length > 0) {
      renderDynamicServices(services);
    } else if (settings.services_display && typeof settings.services_display === 'object') {
      const sd = settings.services_display;
      document.querySelectorAll('[data-service]').forEach(row => {
        const info = sd[row.dataset.service];
        if (!info) return;
        const priceEl = row.querySelector('.svc-price');
        const durEl   = row.querySelector('.svc-dur');
        const tagEl   = row.querySelector('.svc-tag');
        const descEl  = row.querySelector('.svc-desc');
        if (priceEl && info.price) priceEl.textContent = String(info.price).slice(0, 40);
        if (durEl   && info.duration) durEl.textContent = String(info.duration).slice(0, 24);
        if (tagEl   && info.tag !== undefined) {
          tagEl.textContent = String(info.tag).slice(0, 32);
          tagEl.style.display = info.tag ? '' : 'none';
        }
        if (descEl  && info.description) descEl.textContent = String(info.description).slice(0, 500);
      });
    }

    // 3. Booking Rules (Closed Days / Window) & Custom Time Slots
    if (_updateBookingSchedule) {
      _updateBookingSchedule(settings.booking, settings.timeslots);
    }

    // 4. Business Contact Info & Hours
    applyBusinessInfo(settings.business);

    // 5. Hero & Booking Copy
    const h = settings.hero;
    if (h && typeof h === 'object') {
      const subEl    = document.querySelector('.hero-sub');
      const kickerEl = document.querySelector('.hero-kicker');
      const l1El     = document.querySelector('.hl-line1');
      const emEl     = document.querySelector('.hl-em em');
      const l3El     = document.querySelector('.hl-subline');
      const bNoteEl  = document.querySelector('.booking-note');
      if (subEl && h.subtext) subEl.textContent = String(h.subtext).slice(0, 260);
      if (bNoteEl && h.booking_note) bNoteEl.textContent = String(h.booking_note).slice(0, 200);
      if (l1El && h.line1) l1El.textContent = String(h.line1).slice(0, 40);
      if (emEl && h.accent) emEl.textContent = String(h.accent).slice(0, 40);
      if (l3El && h.line3) l3El.textContent = String(h.line3).slice(0, 40);
      if (kickerEl && h.kicker) {
        const dot = kickerEl.querySelector('.kicker-dot');
        kickerEl.textContent = ' ' + String(h.kicker).slice(0, 100);
        if (dot) kickerEl.prepend(dot);
      }
    }

    // 6. Interactive Polish Bar Pigments
    if (_selectNailVerseShade && Array.isArray(settings.polish_bar?.shades) && settings.polish_bar.shades.length > 0) {
      _selectNailVerseShade(settings.polish_bar.shades);
    }

    // 7. FAQs
    if (Array.isArray(settings.faq) && settings.faq.length > 0) {
      renderDynamicFaq(settings.faq);
    }
  } catch (_) { /* fail gracefully — static HTML remains */ }
}
