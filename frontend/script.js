/* =====================================================
   TWITTER ANALYTICS — script.js
   ===================================================== */

const API = 'http://localhost:8000';

// ── App State ──────────────────────────────────────────
const S = {
  view: 'summary',
  start: '',
  end: '',
  charts: {},
  influencers: [],
  inflSort: { col: 'followers', dir: -1 },
  feedOffset: 0,
  feedLimit: 100,
  feedTotal: 0,
  feedData: [],
};

// ── Boot ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setDefaultDates();
  await checkHealth();
  loadView('summary');
});

async function checkHealth() {
  try {
    const h = await api('/health');
    document.getElementById('sidebarPostCount').textContent = fmt(h.total_posts);
  } catch (e) {
    toast('API offline — make sure FastAPI is running on :8000', 'err');
  }
}

// ── View Switching ─────────────────────────────────────
function switchView(name, el) {
  S.view = name;
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
  loadView(name);
}

function loadView(name) {
  const q = buildQ();
  switch (name) {
    case 'summary':     loadSummary(q); break;
    case 'influencers': loadInfluencers(q); break;
    case 'hashtags':    loadHashtags(q); break;
    case 'geography':   loadGeography(q); break;
    case 'feed':        loadFeed(); break;
  }
}

// ── Controls ───────────────────────────────────────────
function setDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  document.getElementById('startDate').value = fmtDate(start);
  document.getElementById('endDate').value = fmtDate(end);
  S.start = document.getElementById('startDate').value;
  S.end = document.getElementById('endDate').value;
}

function applyFilter() {
  S.start = document.getElementById('startDate').value;
  S.end = document.getElementById('endDate').value;
  loadView(S.view);
  toast('Filter applied', 'inf');
}

function clearFilter() {
  S.start = ''; S.end = '';
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  loadView(S.view);
  toast('Filter cleared', 'inf');
}

function refreshAll() {
  const btn = document.querySelector('.btn-refresh');
  btn.classList.add('spin');
  loadView(S.view);
  setTimeout(() => btn.classList.remove('spin'), 800);
}

function activateSeg(btn, view) {
  document.querySelectorAll('.seg').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  if (view === 'influencers') {
    const navLink = document.querySelector('[data-view="influencers"]');
    switchView('influencers', navLink);
  }
}

function quickSearch() {
  const q = document.getElementById('globalSearch').value.trim();
  if (!q) return;
  document.getElementById('feedKw').value = q;
  const navLink = document.querySelector('[data-view="feed"]');
  switchView('feed', navLink);
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (window.innerWidth <= 720) sb.classList.toggle('mobile-show');
  else sb.classList.toggle('collapsed');
}

function buildQ(extra = {}) {
  const p = {};
  if (S.start) p.start = S.start;
  if (S.end) p.end = S.end;
  return { ...p, ...extra };
}

// ── API ────────────────────────────────────────────────
async function api(path, params = {}) {
  const qs = Object.entries(params).filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const url = API + path + (qs ? '?' + qs : '');
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ══════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════
async function loadSummary(q = {}) {
  loadKPIs(q);
  loadTimeline(q);
  loadSentimentPie(q);
  loadSentimentTimeline(q);
  loadTagMini(q);
}

async function loadKPIs(q) {
  try {
    const d = await api('/analytics/summary', q);
    set('kv-posts', fmt(d.total_posts));
    set('kv-likes', fmt(d.total_likes));
    set('kv-boosts', fmt(d.total_boosts));
    set('kv-sentiment', d.sentiment_score + '%');

    const s = d.sentiment;
    const tot = s.positive + s.neutral + s.negative;
    const pct = v => tot ? Math.round(v / tot * 100) : 0;
    set('km-posts', `${fmt(d.total_posts)} total posts in range`);
    set('km-likes', `Avg ${Math.round(d.total_likes / Math.max(d.total_posts, 1))} likes/post`);
    set('km-boosts', `Avg ${Math.round(d.total_boosts / Math.max(d.total_posts, 1))} boosts/post`);
    set('km-sentiment', `${pct(s.positive)}% pos · ${pct(s.neutral)}% neu · ${pct(s.negative)}% neg`);
  } catch (e) { console.error('KPI:', e); }
}

async function loadTimeline(q) {
  show('ov-timeline');
  try {
    const data = await api('/analytics/timeline', q);
    const labels = data.map(d => {
      const dt = new Date(d.date);
      return dt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    });
    mkChart('timelineChart', {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Posts', data: data.map(d => d.posts), borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,.06)', fill: true, tension: .45, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2 },
          { label: 'Likes', data: data.map(d => d.likes), borderColor: '#ff4f81', backgroundColor: 'transparent', tension: .45, pointRadius: 1, borderDash: [5, 3], borderWidth: 1.5 },
          { label: 'Boosts', data: data.map(d => d.boosts), borderColor: '#00e5a0', backgroundColor: 'transparent', tension: .45, pointRadius: 1, borderDash: [2, 4], borderWidth: 1.5 },
        ],
      },
      options: {
        ...baseOpts(),
        scales: {
          x: xAxis(),
          y: yAxis(),
        },
        plugins: { ...legendOpts('top'), tooltip: tooltipOpts() },
      },
    });
    if (!data.length) showEmpty('timelineChart', 'No data in selected range');
  } catch (e) { showEmpty('timelineChart', 'Failed to load timeline'); }
  finally { hide('ov-timeline'); }
}

async function loadSentimentPie(q) {
  show('ov-sentiment');
  try {
    const d = await api('/analytics/summary', q);
    const s = d.sentiment;
    mkChart('sentimentChart', {
      type: 'doughnut',
      data: {
        labels: ['Positive', 'Neutral', 'Negative'],
        datasets: [{ data: [s.positive, s.neutral, s.negative], backgroundColor: ['#00e5a0', '#4a5978', '#ff4f81'], borderWidth: 0, hoverOffset: 8 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#8897b3', usePointStyle: true, font: { size: 11 }, padding: 14 } },
          tooltip: tooltipOpts(),
        },
      },
    });
  } catch { } finally { hide('ov-sentiment'); }
}

async function loadSentimentTimeline(q) {
  show('ov-stc');
  try {
    const data = await api('/analytics/sentiment-timeline', q);
    const labels = data.map(d => {
      const dt = new Date(d.date);
      return dt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    });
    mkChart('sentimentTimeChart', {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Positive', data: data.map(d => d.positive), backgroundColor: 'rgba(0,229,160,.7)', borderRadius: 3 },
          { label: 'Neutral', data: data.map(d => d.neutral), backgroundColor: 'rgba(74,89,120,.7)', borderRadius: 3 },
          { label: 'Negative', data: data.map(d => d.negative), backgroundColor: 'rgba(255,79,129,.7)', borderRadius: 3 },
        ],
      },
      options: {
        ...baseOpts(),
        scales: { x: { ...xAxis(), stacked: true }, y: { ...yAxis(), stacked: true } },
        plugins: { ...legendOpts('top'), tooltip: tooltipOpts() },
      },
    });
  } catch { } finally { hide('ov-stc'); }
}

async function loadTagMini(q) {
  show('ov-tagmini');
  try {
    const data = await api('/analytics/hashtags', { ...q, limit: 8 });
    mkChart('tagMiniChart', {
      type: 'bar',
      data: {
        labels: data.map(d => '#' + d.tag),
        datasets: [{ label: 'Posts', data: data.map(d => d.count), backgroundColor: data.map((_, i) => `hsla(${190 + i * 14},80%,${55 + i * 2}%,.8)`), borderRadius: 5 }],
      },
      options: {
        ...baseOpts(),
        scales: { x: xAxis(), y: yAxis() },
        plugins: { legend: { display: false }, tooltip: tooltipOpts() },
      },
    });
  } catch { } finally { hide('ov-tagmini'); }
}

// ══════════════════════════════════════════════════════
// INFLUENCERS
// ══════════════════════════════════════════════════════
async function loadInfluencers(q = {}) {
  show('ov-scatter');
  try {
    const data = await api('/analytics/influencers', { ...q, limit: 25 });
    S.influencers = data;

    // Scatter / bubble chart
    mkChart('scatterChart', {
      type: 'bubble',
      data: {
        datasets: [{
          label: 'Influencers',
          data: data.map(u => ({
            x: u.mentions,
            y: u.followers,
            r: Math.max(5, Math.min(22, Math.sqrt(u.engagement + 1) * 1.4)),
            username: u.username,
            impact: u.impact,
          })),
          backgroundColor: data.map((_, i) => `hsla(${185 + i * 10},70%,55%,.55)`),
          borderColor: data.map((_, i) => `hsla(${185 + i * 10},70%,60%,.9)`),
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipOpts(),
            callbacks: {
              label: ctx => {
                const d = ctx.raw;
                return [`@${d.username}`, `Mentions: ${d.x}`, `Followers: ${fmt(d.y)}`, `Impact: ${d.impact.toFixed(1)}`];
              },
            },
          },
        },
        scales: {
          x: { ...xAxis(), title: { display: true, text: 'Mentions', color: '#8897b3', font: { size: 11 } } },
          y: { ...yAxis(), title: { display: true, text: 'Followers', color: '#8897b3', font: { size: 11 } }, ticks: { ...yAxis().ticks, callback: v => fmt(v) } },
        },
      },
    });

    renderInflTable(data);
  } catch (e) {
    console.error('Influencers:', e);
  } finally { hide('ov-scatter'); }
}

function renderInflTable(data) {
  const tbody = document.getElementById('inflBody');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="tc">No data available</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map((u, i) => `
    <tr>
      <td style="color:var(--text2);font-size:11px">${i + 1}</td>
      <td>
        <div class="ucell">
          <div class="uavatar">${u.username[0].toUpperCase()}</div>
          <div><div class="uname">@${u.username}</div><div class="uloc">${u.location}</div></div>
        </div>
      </td>
      <td style="font-size:11.5px;color:var(--text2)">${u.location}</td>
      <td style="font-weight:600">${fmt(u.mentions)}</td>
      <td style="font-weight:600">${fmt(u.followers)}</td>
      <td style="font-weight:600">${fmt(u.engagement)}</td>
      <td>
        <div class="ibar-wrap">
          <div class="ibar"><div class="ibar-fill" style="width:${Math.min(100, u.impact)}%;background:${impactGrad(u.impact)}"></div></div>
          <span class="ival">${u.impact.toFixed(1)}</span>
        </div>
      </td>
    </tr>
  `).join('');
}

function impactGrad(v) {
  if (v >= 65) return 'var(--green)';
  if (v >= 35) return 'var(--amber)';
  return 'var(--cyan)';
}

function sortInfl(col) {
  const s = S.inflSort;
  s.dir = s.col === col ? s.dir * -1 : -1;
  s.col = col;
  const sorted = [...S.influencers].sort((a, b) => (a[col] - b[col]) * s.dir);
  renderInflTable(sorted);
}

function filterInflTable(q) {
  const lq = q.toLowerCase();
  const filtered = S.influencers.filter(u =>
    u.username.toLowerCase().includes(lq) ||
    (u.location || '').toLowerCase().includes(lq)
  );
  renderInflTable(filtered);
}

// ══════════════════════════════════════════════════════
// HASHTAGS
// ══════════════════════════════════════════════════════
async function loadHashtags(q = {}) {
  show('ov-hash'); show('ov-hashe');
  try {
    const data = await api('/analytics/hashtags', { ...q, limit: 20 });

    mkChart('hashChart', {
      type: 'bar',
      data: {
        labels: data.map(d => '#' + d.tag),
        datasets: [{
          label: 'Posts',
          data: data.map(d => d.count),
          backgroundColor: data.map((_, i) => `hsla(${190 + i * 8},75%,${50 + i}%,.8)`),
          borderRadius: 5,
        }],
      },
      options: {
        ...baseOpts(),
        scales: { x: { ...xAxis(), ticks: { ...xAxis().ticks, maxRotation: 45 } }, y: yAxis() },
        plugins: { legend: { display: false }, tooltip: tooltipOpts() },
      },
    });

    mkChart('hashEngChart', {
      type: 'bar',
      data: {
        labels: data.map(d => '#' + d.tag),
        datasets: [{
          label: 'Engagement',
          data: data.map(d => d.engagement),
          backgroundColor: data.map((_, i) => `hsla(${145 + i * 8},65%,${50 + i}%,.8)`),
          borderRadius: 5,
        }],
      },
      options: {
        indexAxis: 'y',
        ...baseOpts(),
        scales: { x: yAxis(), y: xAxis() },
        plugins: { legend: { display: false }, tooltip: tooltipOpts() },
      },
    });

    // Tag cloud
    const cloud = document.getElementById('tagCloud');
    const max = Math.max(...data.map(d => d.count), 1);
    cloud.innerHTML = data.map(d => {
      const sz = 11 + Math.round((d.count / max) * 13);
      return `<span class="tag-chip" style="font-size:${sz}px" onclick="filterFeedByTag('${d.tag}')">#${d.tag}<span style="margin-left:4px;color:var(--text3);font-size:10px">${d.count}</span></span>`;
    }).join('');

  } catch (e) { console.error('Hashtags:', e); }
  finally { hide('ov-hash'); hide('ov-hashe'); }
}

function filterFeedByTag(tag) {
  document.getElementById('feedTag').value = '#' + tag;
  const link = document.querySelector('[data-view="feed"]');
  switchView('feed', link);
}

// ══════════════════════════════════════════════════════
// GEOGRAPHY
// ══════════════════════════════════════════════════════
async function loadGeography(q = {}) {
  show('ov-geo');
  try {
    const data = await api('/analytics/geography', q);
    const top = data.slice(0, 15);
    const maxC = Math.max(...top.map(d => d.count), 1);

    mkChart('geoChart', {
      type: 'bar',
      data: {
        labels: top.map(d => d.location.split(',')[0]),
        datasets: [{
          label: 'Posts',
          data: top.map(d => d.count),
          backgroundColor: top.map((_, i) => `hsla(${200 + i * 7},70%,${53 + i}%,.8)`),
          borderRadius: 5,
        }],
      },
      options: {
        indexAxis: 'y',
        ...baseOpts(),
        scales: { x: yAxis(), y: { ...xAxis(), ticks: { ...xAxis().ticks, font: { size: 11 } } } },
        plugins: { legend: { display: false }, tooltip: tooltipOpts() },
      },
    });

    const list = document.getElementById('geoList');
    list.innerHTML = top.slice(0, 12).map((d, i) => `
      <div class="geo-item">
        <span class="geo-rank">${i + 1}</span>
        <span class="geo-name">${d.location}</span>
        <div class="geo-bar"><div class="geo-fill" style="width:${Math.round(d.count / maxC * 100)}%"></div></div>
        <span class="geo-n">${d.count}</span>
      </div>
    `).join('');
  } catch (e) { console.error('Geo:', e); }
  finally { hide('ov-geo'); }
}

// ══════════════════════════════════════════════════════
// FEED
// ══════════════════════════════════════════════════════
async function loadFeed() {
  S.feedOffset = 0;
  S.feedData = [];
  await fetchFeed(false);
}

async function loadMoreFeed() {
  S.feedOffset += S.feedLimit;
  await fetchFeed(true);
}

async function fetchFeed(append = false) {
  const kw = document.getElementById('feedKw').value.trim();
  const tag = document.getElementById('feedTag').value.trim().replace('#', '');
  const sent = document.getElementById('feedSentiment').value;

  const params = { limit: S.feedLimit, offset: S.feedOffset };
  if (kw) params.keyword = kw;
  if (tag) params.hashtag = tag;
  if (sent) params.sentiment = sent;
  if (S.start) params.start = S.start;
  if (S.end) params.end = S.end;

  try {
    const r = await api('/analytics/posts', params);
    S.feedTotal = r.total;
    if (!append) S.feedData = r.posts;
    else S.feedData = [...S.feedData, ...r.posts];

    renderFeed(S.feedData, S.feedTotal);
  } catch (e) {
    document.getElementById('feedBody').innerHTML =
      `<tr><td colspan="7" class="tc">Failed to load — is the API running?</td></tr>`;
  }
}

function renderFeed(posts, total) {
  document.getElementById('feedTotal').textContent = `${fmt(total)} posts found`;
  document.getElementById('feedShowing').textContent = `Showing ${posts.length} of ${fmt(total)}`;
  document.getElementById('btnMore').style.display = posts.length >= total ? 'none' : 'inline-block';

  const tbody = document.getElementById('feedBody');
  if (!posts.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="tc">No posts match your filters.</td></tr>`;
    return;
  }
  tbody.innerHTML = posts.map(p => {
    const dt = new Date(p.created_at);
    const dateStr = dt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const text = (p.text || '').slice(0, 90) + (p.text && p.text.length > 90 ? '…' : '');
    const tags = (p.hashtags || []).slice(0, 3).map(t => `<span style="color:var(--cyan);font-size:10.5px">#${t}</span>`).join(' ');
    return `<tr>
      <td style="white-space:nowrap;font-size:11px;color:var(--text2)">${dateStr}</td>
      <td>
        <div class="ucell">
          <div class="uavatar">${(p.username || '?')[0].toUpperCase()}</div>
          <div><div class="uname" style="font-size:12px">@${p.username}</div></div>
        </div>
      </td>
      <td>
        <div class="ptext" title="${escHtml(p.text || '')}">${escHtml(text)}</div>
        <div style="margin-top:3px">${tags}</div>
      </td>
      <td style="font-weight:600;color:var(--pink)">${fmt(p.likes)}</td>
      <td style="font-weight:600;color:var(--green)">${fmt(p.boosts)}</td>
      <td style="font-weight:600">${fmt(p.engagement)}</td>
      <td><span class="badge ${sentBadge(p.sentiment)}">${sentEmoji(p.sentiment)} ${cap(p.sentiment)}</span></td>
    </tr>`;
  }).join('');
}

function searchFeed() { loadFeed(); }
function resetFeed() {
  document.getElementById('feedKw').value = '';
  document.getElementById('feedTag').value = '';
  document.getElementById('feedSentiment').value = '';
  loadFeed();
}

// ══════════════════════════════════════════════════════
// CHART HELPERS
// ══════════════════════════════════════════════════════
function mkChart(id, cfg) {
  if (S.charts[id]) { S.charts[id].destroy(); delete S.charts[id]; }
  const canvas = document.getElementById(id);
  if (!canvas) return;
  S.charts[id] = new Chart(canvas.getContext('2d'), cfg);
}

function baseOpts() {
  return { responsive: true, maintainAspectRatio: false, animation: { duration: 400 } };
}

function xAxis() {
  return {
    grid: { display: false },
    ticks: { color: '#8897b3', font: { size: 10.5 }, maxTicksLimit: 14 },
    border: { color: 'rgba(255,255,255,.06)' },
  };
}

function yAxis() {
  return {
    grid: { color: 'rgba(255,255,255,.04)' },
    ticks: { color: '#8897b3', font: { size: 10.5 } },
    border: { color: 'transparent' },
    beginAtZero: true,
  };
}

function legendOpts(pos = 'top') {
  return {
    legend: {
      position: pos,
      labels: { color: '#8897b3', usePointStyle: true, font: { size: 11 }, padding: 14 },
    },
  };
}

function tooltipOpts() {
  return {
    backgroundColor: '#131d30',
    borderColor: 'rgba(0,212,255,.3)',
    borderWidth: 1,
    titleColor: '#e2e8f5',
    bodyColor: '#8897b3',
    padding: 10,
    cornerRadius: 8,
  };
}

function show(id) { document.getElementById(id)?.classList.remove('hide'); }
function hide(id) { document.getElementById(id)?.classList.add('hide'); }
function set(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

function showEmpty(canvasId, msg) {
  const c = document.getElementById(canvasId);
  if (!c) return;
  const p = c.parentElement;
  const e = document.createElement('div');
  e.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#4a5978;font-size:13px;';
  e.textContent = msg;
  p.appendChild(e);
}

// ══════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════
function toast(msg, type = 'inf') {
  const c = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 320);
  }, 3200);
}

// ══════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════
function fmt(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Number(n).toLocaleString();
}

function fmtDate(d) { return d.toISOString().split('T')[0]; }

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

function escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sentBadge(s) { return { positive: 'b-pos', negative: 'b-neg', neutral: 'b-neu' }[s] || 'b-neu'; }
function sentEmoji(s) { return { positive: '😊', negative: '😞', neutral: '😐' }[s] || '😐'; }
