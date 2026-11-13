(function () {
  'use strict';
  var CFG = window.CLASS_CONFIG || {};
  var CARDS = window.CARDS, BLOCKS = window.BLOCKS;
  var demo = !CFG.API_URL;
  var isProjector = location.hash === '#projector';
  var mode = 'student';
  var pass = '';
  try { pass = sessionStorage.getItem('sla-pass') || ''; } catch (e) {}

  var starts = [], TOTAL = 0;
  BLOCKS.forEach(function (b) { starts.push(TOTAL); TOTAL += b.min; });

  var live = { card: 0, ans: false, rev: -1 };
  var haveState = false, viewIdx = 0, pinned = false, pending = 0;
  var revealed = {};
  var running = false, startedAt = 0, accMs = 0, clipId = 0;
  var me = null, sendTimer = null, workStudents = [], workNow = 0, clearArmed = null, workTimer = null;
  var FIELD = {};
  CARDS.forEach(function (c) { (c.work || []).forEach(function (g) { g.f.forEach(function (f) { FIELD[f.id] = f; }); }); });
  FIELD['cheat-L1'] = FIELD['cheat-L1'] || { k: 'text', id: 'cheat-L1' };
  FIELD['cheat-L2'] = FIELD['cheat-L2'] || { k: 'text', id: 'cheat-L2' };
  FIELD['cheat-L3'] = FIELD['cheat-L3'] || { k: 'text', id: 'cheat-L3' };

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function clamp(n) { n = parseInt(n, 10); if (isNaN(n)) n = 0; return Math.max(0, Math.min(CARDS.length - 1, n)); }

  /* ---------- storage ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function getVal(fid) { return lsGet('sla:f:' + fid) || ''; }
  function setVal(fid, v) { lsSet('sla:f:' + fid, v); }
  try { revealed = JSON.parse(lsGet('sla:revealed') || '{}') || {}; } catch (e) { revealed = {}; }
  try { me = JSON.parse(lsGet('sla:me') || 'null'); } catch (e) { me = null; }
  if (me && (!me.id || !me.name)) me = null;
  function newId() { var c = 'abcdefghijklmnopqrstuvwxyz0123456789', r = ''; for (var i = 0; i < 12; i++) r += c.charAt(Math.floor(Math.random() * c.length)); return r; }

  /* ---------- answer checking ---------- */
  function parseNum(s) {
    s = String(s || '').replace(/[−–—]/g, '-').replace(/[$,\s]/g, '').replace(/[a-zA-Z%]+$/, '');
    if (!/^-?(\d+\.?\d*|\.\d+)(\/-?(\d+\.?\d*|\.\d+))?$/.test(s)) return null;
    if (s.indexOf('/') > -1) { var p = s.split('/'); var d = parseFloat(p[1]); if (d === 0) return null; return parseFloat(p[0]) / d; }
    return parseFloat(s);
  }
  function evalExpr(expr, v, letter) {
    var e = expr.replace(new RegExp(letter, 'gi'), '(' + v + ')');
    e = e.replace(/(\d|\))\s*\(/g, '$1*(');
    if (!/^[0-9+\-*/().\s]*$/.test(e)) return NaN;
    try { return Function('"use strict";return (' + e + ')')(); } catch (err) { return NaN; }
  }
  function parseEq(str) {
    var s = String(str || '').toLowerCase().replace(/[−–—]/g, '-').replace(/[×·]/g, '*').replace(/\s+/g, '');
    if (!s) return null;
    var rhs = s.indexOf('=') > -1 ? s.split('=').slice(1).join('=') : s;
    if (!rhs) return null;
    var letters = rhs.match(/[a-z]/g) || [];
    var uniq = letters.filter(function (l, i) { return letters.indexOf(l) === i; });
    if (uniq.length > 1) return null;
    var L = uniq[0] || 'x';
    // Add * between a number or ) and the variable, and between the variable and ( or a digit group like x(3)
    var expr = rhs.replace(new RegExp('(\\d|\\))(' + L + ')', 'g'), '$1*$2').replace(new RegExp('(' + L + ')(\\()', 'g'), '$1*$2');
    var f0 = evalExpr(expr, 0, L), f1 = evalExpr(expr, 1, L), f2 = evalExpr(expr, 2, L);
    if (!isFinite(f0) || !isFinite(f1) || !isFinite(f2)) return null;
    if (Math.abs((f2 - f0) - 2 * (f1 - f0)) > 1e-6) return null;
    return { m: f1 - f0, b: f0 };
  }
  function close(a, b) { return Math.abs(a - b) < 1e-6; }
  function checkEq(str, exp) {
    var r = parseEq(str);
    if (!r) return { ok: false, msg: 'Write it like y = 4x + 5, with one variable.' };
    var mOk = close(r.m, exp.m), bOk = close(r.b, exp.b);
    if (mOk && bOk) return { ok: true, msg: 'Correct' };
    if (mOk) return { ok: false, msg: 'The slope looks right. Check the y-intercept.' };
    if (bOk) return { ok: false, msg: 'The y-intercept looks right. Check the slope.' };
    return { ok: false, msg: 'Not yet. Check the slope and the y-intercept.' };
  }
  function checkNum(str, exp) {
    var n = parseNum(str);
    if (n === null) return { ok: false, msg: 'Type a number.' };
    return close(n, exp) ? { ok: true, msg: 'Correct' } : { ok: false, msg: 'Not yet. Try the equation again.' };
  }
  function checkGrid(pts, spec) {
    if (pts.length < spec.need) return { ok: false, msg: 'Plot at least ' + spec.need + ' points.' };
    for (var i = 0; i < pts.length; i++) {
      if (!close(spec.m * pts[i][0] + spec.b, pts[i][1])) return { ok: false, msg: 'The point (' + pts[i][0] + ', ' + pts[i][1] + ') is not on the line. Check your slope move.' };
    }
    var hasB = pts.some(function (p) { return p[0] === 0 && close(p[1], spec.b); });
    if (!hasB) return { ok: false, msg: 'Start by plotting where the line crosses the y-axis.' };
    return { ok: true, msg: 'Correct' };
  }
  window.SLA_TEST = { parseEq: parseEq, parseNum: parseNum, checkEq: checkEq, checkNum: checkNum, checkGrid: checkGrid };

  /* ---------- backend ---------- */
  function demoState() { try { return JSON.parse(lsGet('sla:demo') || 'null') || { card: 0, ans: false, rev: 0 }; } catch (e) { return { card: 0, ans: false, rev: 0 }; } }
  function demoWorkAll() { try { return JSON.parse(lsGet('sla:demo-work') || '{}') || {}; } catch (e) { return {}; } }
  function demoApi(p) {
    if (p.action === 'work') {
      var all = demoWorkAll(); all[p.id] = { name: p.name, v: p.v || {}, t: Date.now() };
      lsSet('sla:demo-work', JSON.stringify(all)); return Promise.resolve({ ok: true });
    }
    if (p.action === 'work_get' || p.action === 'work_clear') {
      if (String(p.pass) !== 'demo') return Promise.resolve({ ok: false, error: 'bad' });
      if (p.action === 'work_clear') { lsSet('sla:demo-work', '{}'); return Promise.resolve({ ok: true }); }
      var a2 = demoWorkAll();
      var list = Object.keys(a2).map(function (k) { var r = a2[k]; return { id: k, name: r.name, v: r.v, t: r.t }; });
      return Promise.resolve({ ok: true, students: list, now: Date.now() });
    }
    if (p.action === 'get') { var s = demoState(); s.ok = true; return Promise.resolve(s); }
    if (String(p.pass) !== 'demo') return Promise.resolve({ ok: false, error: 'bad' });
    if (p.action === 'login') return Promise.resolve({ ok: true });
    var st = demoState();
    if (p.card !== undefined) st.card = clamp(p.card);
    if (p.ans !== undefined) st.ans = String(p.ans) === '1';
    st.rev = (st.rev || 0) + 1;
    lsSet('sla:demo', JSON.stringify(st));
    st.ok = true;
    return Promise.resolve(st);
  }
  function api(params) {
    if (demo) return demoApi(params);
    var q = Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    var url = CFG.API_URL + (CFG.API_URL.indexOf('?') > -1 ? '&' : '?') + q + '&_=' + Date.now();
    return fetch(url, { redirect: 'follow' }).then(function (r) { return r.json(); });
  }
  function apiPost(payload) {
    if (demo) return demoApi(payload);
    return fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), redirect: 'follow' }).then(function (r) { return r.json(); });
  }
  function setStatus(s) {
    var el = $('status');
    el.className = 'status ' + s;
    el.textContent = s === 'online' ? 'Live' : s === 'demo' ? 'Demo mode' : 'Offline';
    var el2 = $('status2'); if (el2) { el2.className = 'status ' + s; el2.textContent = el.textContent; }
  }
  function markRevealed() { if (live.ans) { revealed[live.card] = true; lsSet('sla:revealed', JSON.stringify(revealed)); } }

  function applyLive(s) {
    if (!s || !s.ok) return;
    var first = !haveState; haveState = true;
    if (!first && s.rev === live.rev) return;
    var prevCard = live.card, prevAns = live.ans;
    live = { card: clamp(s.card), ans: !!s.ans, rev: s.rev };
    markRevealed();
    var cardChanged = first || live.card !== prevCard;
    if (mode === 'admin' || !pinned || viewIdx > live.card) { if (viewIdx !== live.card || first) { viewIdx = live.card; cardChanged = true; } pinned = false; }
    if (cardChanged) renderCard(); else if (live.ans !== prevAns) renderAns();
    updateChrome();
  }
  function poll() {
    if (document.hidden || pending > 0) return;
    api({ action: 'get' }).then(function (s) { setStatus(demo ? 'demo' : 'online'); applyLive(s); }).catch(function () { setStatus('offline'); });
  }
  function adminSet(card, ans) {
    card = clamp(card);
    var changedCard = card !== live.card;
    live.card = card; live.ans = !!ans; markRevealed();
    viewIdx = card; pinned = false;
    renderCard(); updateChrome();
    pending++;
    api({ action: 'set', pass: pass, card: card, ans: ans ? 1 : 0 }).then(function (res) {
      pending--;
      if (res && res.ok) { live.rev = res.rev; setStatus(demo ? 'demo' : 'online'); }
      else { setStatus('offline'); if (res && (res.error === 'bad' || res.error === 'locked')) logout('The passcode was not accepted. Sign in again.'); }
    }).catch(function () { pending--; setStatus('offline'); });
    return changedCard;
  }

  /* ---------- graphs ---------- */
  var R = 6, S = 26, P = 22, W = 2 * R * S + 2 * P;
  function X(x) { return P + (x + R) * S; }
  function Y(y) { return P + (R - y) * S; }
  function gridSvg(opts) {
    var id = 'clip' + (clipId++);
    var s = '<svg viewBox="0 0 ' + W + ' ' + W + '" role="img" aria-label="' + esc(opts.label || 'Graph grid') + '">';
    s += '<defs><clipPath id="' + id + '"><rect x="' + P + '" y="' + P + '" width="' + (2 * R * S) + '" height="' + (2 * R * S) + '"/></clipPath></defs>';
    for (var k = -R; k <= R; k++) {
      s += '<line class="gl" x1="' + X(k) + '" y1="' + P + '" x2="' + X(k) + '" y2="' + (W - P) + '"/>';
      s += '<line class="gl" x1="' + P + '" y1="' + Y(k) + '" x2="' + (W - P) + '" y2="' + Y(k) + '"/>';
    }
    s += '<line class="ax" x1="' + X(0) + '" y1="' + P + '" x2="' + X(0) + '" y2="' + (W - P) + '"/>';
    s += '<line class="ax" x1="' + P + '" y1="' + Y(0) + '" x2="' + (W - P) + '" y2="' + Y(0) + '"/>';
    [-6, -4, -2, 2, 4, 6].forEach(function (k) {
      s += '<text class="tk" text-anchor="middle" x="' + X(k) + '" y="' + (Y(0) + 13) + '">' + k + '</text>';
      s += '<text class="tk" text-anchor="end" x="' + (X(0) - 5) + '" y="' + (Y(k) + 3) + '">' + k + '</text>';
    });
    if (opts.line) {
      var l = opts.line;
      if (l.vertical) s += '<line class="ln" clip-path="url(#' + id + ')" x1="' + X(l.x) + '" y1="' + Y(-R - 1) + '" x2="' + X(l.x) + '" y2="' + Y(R + 1) + '"/>';
      else { var xa = -R - 1, xb = R + 1; s += '<line class="ln" clip-path="url(#' + id + ')" x1="' + X(xa) + '" y1="' + Y(l.m * xa + l.b) + '" x2="' + X(xb) + '" y2="' + Y(l.m * xb + l.b) + '"/>'; }
    }
    (opts.points || []).forEach(function (c) { s += '<circle class="pt" cx="' + X(c[0]) + '" cy="' + Y(c[1]) + '" r="' + (opts.big ? 6 : 4.5) + '"/>'; });
    return s + '</svg>';
  }
  function renderGraphs(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.graph[data-m]'), function (el) {
      if (el.querySelector('svg')) return;
      var marks = (el.getAttribute('data-marks') || '').split(';').filter(Boolean).map(function (p) { return p.split(',').map(Number); });
      el.insertAdjacentHTML('afterbegin', gridSvg({ label: el.getAttribute('data-label'), line: { m: parseFloat(el.getAttribute('data-m')), b: parseFloat(el.getAttribute('data-b')) }, points: marks }));
    });
  }
  function getPts(fid) { try { var a = JSON.parse(getVal(fid) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function drawPad(box) {
    var fid = box.getAttribute('data-fid'), pts = getPts(fid), line = null;
    if (pts.length >= 2) {
      var a = pts[0], b = pts[1];
      if (a[0] === b[0]) line = { vertical: true, x: a[0] };
      else { var m = (b[1] - a[1]) / (b[0] - a[0]); line = { m: m, b: a[1] - m * a[0] }; }
    }
    box.querySelector('.pad').innerHTML = gridSvg({ label: 'Tap to plot points', line: line, points: pts, big: true });
    box.querySelector('.pts').textContent = pts.length ? 'Points: ' + pts.map(function (p) { return '(' + p[0] + ', ' + String(p[1]).replace('-', '−') + ')'; }).join(', ').replace(/\(-/g, '(−') : 'Tap the grid to plot a point. Tap a point again to remove it.';
  }

  /* ---------- rendering ---------- */
  function fieldHtml(f) {
    var v = getVal(f.id), h = '';
    if (f.k === 'text') {
      return '<label class="f"><span class="fl">' + esc(f.label) + '</span><textarea data-fid="' + f.id + '" rows="' + (f.rows || 2) + '">' + esc(v) + '</textarea></label>';
    }
    if (f.k === 'eq' || f.k === 'num') {
      return '<label class="f"><span class="fl">' + esc(f.label) + '</span><span class="inl"><input type="text" data-fid="' + f.id + '" value="' + esc(v) + '" placeholder="' + esc(f.ph || '') + '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"><span class="mark" data-mark="' + f.id + '" aria-live="polite"></span></span></label>';
    }
    if (f.k === 'yn') {
      h = '<div class="f"><span class="fl">' + esc(f.label) + '</span><span class="inl" role="radiogroup" aria-label="' + esc(f.label) + '">';
      ['yes', 'no'].forEach(function (o) { h += '<button type="button" class="chip" data-yn="' + o + '" data-fid="' + f.id + '" role="radio" aria-checked="' + (v === o) + '">' + (o === 'yes' ? 'Yes' : 'No') + '</button>'; });
      return h + '<span class="mark" data-mark="' + f.id + '" aria-live="polite"></span></span></div>';
    }
    if (f.k === 'grid') {
      return '<div class="f gridf" data-fid="' + f.id + '"><span class="fl">' + esc(f.label) + '</span><div class="pad"></div><div class="padbar"><span class="pts"></span><button type="button" class="btn sm" data-clear="' + f.id + '">Clear</button></div><span class="mark" data-mark="' + f.id + '" aria-live="polite"></span></div>';
    }
    return '';
  }
  function renderWork(c) {
    var h = '<section class="work"><h3 class="wt">Your work</h3>';
    c.work.forEach(function (g, gi) {
      var checkable = g.f.some(function (f) { return f.k !== 'text'; });
      h += '<div class="group" data-g="' + gi + '">';
      if (g.t) h += '<h4>' + g.t + '</h4>';
      g.f.forEach(function (f) { h += fieldHtml(f); });
      if (checkable) h += '<div class="row"><button type="button" class="btn" data-check="' + gi + '">Check my work</button><span class="sum" data-sum="' + gi + '" aria-live="polite"></span></div>';
      h += '</div>';
    });
    return h + '</section>';
  }
  function renderAns() {
    var box = $('ansBox'); if (!box) return;
    var c = CARDS[viewIdx];
    if (c.ans && revealed[viewIdx]) box.innerHTML = '<div class="ans"><b class="t">Worked answers</b>' + c.ans + '</div>';
    else box.innerHTML = '';
  }
  function renderCard() {
    var c = CARDS[viewIdx], blk = BLOCKS[c.blk], stage = $('stage');
    stage.style.setProperty('--c', blk.c);
    var tag = blk.name + (mode === 'admin' ? ' · ' + c.t[0] + ' → ' + c.t[1] + ' min' : '');
    var h = '<header><span class="tag">' + tag + '</span><h2>' + c.title + '</h2></header><div class="body">' + c.body + '</div><div id="ansBox"></div>';
    if (mode === 'student' && !isProjector && c.work) h += renderWork(c);
    stage.innerHTML = h;
    renderGraphs(stage);
    Array.prototype.forEach.call(stage.querySelectorAll('.gridf'), drawPad);
    renderAns();
    if (mode === 'admin') renderNotes();
  }
  function renderNotes() {
    var c = CARDS[viewIdx];
    $('notes').innerHTML = '<section><h3>Ask the room</h3><p class="ask">' + c.ask + '</p></section><section><h3>Facilitator notes</h3>' + c.notes + '</section>' +
      (c.ans ? '<section><h3>Answer key</h3><div class="ans plain">' + c.ans + '</div></section>' : '') +
      '<section><h3>Students see</h3><p>Card ' + (live.card + 1) + ' of ' + CARDS.length + '. Answers are ' + (live.ans ? 'showing.' : 'hidden.') + '</p></section>';
  }
  function updateChrome() {
    $('count').textContent = 'Card ' + (viewIdx + 1) + ' of ' + CARDS.length;
    if (mode === 'student') {
      $('prevBtn').disabled = viewIdx === 0;
      $('nextBtn').disabled = viewIdx >= live.card;
      $('liveBtn').hidden = viewIdx === live.card;
      $('nextBtn').hidden = viewIdx >= live.card;
    } else {
      $('aPrev').disabled = live.card === 0;
      $('aNext').disabled = live.card >= CARDS.length - 1;
      var rb = $('revealBtn'); rb.setAttribute('aria-pressed', live.ans ? 'true' : 'false'); rb.textContent = live.ans ? 'Hide answers from students' : 'Show answers to students';
      rb.style.display = CARDS[live.card].ans ? '' : 'none';
      $('aCount').textContent = 'Card ' + (live.card + 1) + ' of ' + CARDS.length;
      BLOCKS.forEach(function (_, i) { $('seg' + i).classList.toggle('cur', i === CARDS[live.card].blk); });
      CARDS.forEach(function (_, i) { var d = $('dot' + i); if (i === live.card) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
      renderNotes();
      renderWorkPanel();
      tick();
    }
  }

  /* ---------- sharing work with the facilitator ---------- */
  function sharing() { return me && !isProjector && mode === 'student'; }
  function setShare(ok) {
    var el = $('shareNote'); if (!el) return;
    el.className = 'share' + (ok ? '' : ' bad');
    el.textContent = ok ? 'Your facilitator can see your work' : 'Not reaching your facilitator. Your work is saved here.';
  }
  function collectVals() {
    var v = {};
    Object.keys(FIELD).forEach(function (fid) { var val = getVal(fid); if (val && val !== '[]') v[fid] = val.slice(0, 2000); });
    return v;
  }
  function sendWork() {
    if (!sharing()) return;
    clearTimeout(sendTimer); sendTimer = null;
    apiPost({ action: 'work', id: me.id, name: me.name, v: collectVals() }).then(function (r) { setShare(!!(r && r.ok)); }).catch(function () { setShare(false); });
  }
  function queueSend() { if (!sharing()) return; clearTimeout(sendTimer); sendTimer = setTimeout(sendWork, 1200); }

  /* ---------- name gate ---------- */
  function updateMeLink() {
    var el = $('nameLink');
    if (me && mode === 'student' && !isProjector) { el.hidden = false; el.textContent = 'Joined as ' + me.name + '. Change'; $('shareNote').hidden = false; }
    else { el.hidden = true; }
  }
  function showGate(show) {
    $('nameGate').hidden = !show;
    if (show) { $('nameErr').textContent = ''; $('nameIn').value = me ? me.name : ''; setTimeout(function () { $('nameIn').focus(); }, 30); }
  }
  function submitName() {
    var n = $('nameIn').value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
    if (!n) { $('nameErr').textContent = 'Enter your first name.'; return; }
    me = { id: (me && me.id) || newId(), name: n };
    lsSet('sla:me', JSON.stringify(me));
    showGate(false); updateMeLink(); sendWork();
  }

  /* ---------- student events ---------- */
  function showMark(fid, res) {
    var el = document.querySelector('[data-mark="' + fid + '"]');
    if (!el) return;
    el.className = 'mark ' + (res.ok ? 'good' : 'bad');
    el.textContent = res.ok ? '✓ Correct' : res.msg;
  }
  function clearMark(fid) { var el = document.querySelector('[data-mark="' + fid + '"]'); if (el) { el.className = 'mark'; el.textContent = ''; } }
  function runCheck(gi) {
    var g = CARDS[viewIdx].work[gi], total = 0, good = 0;
    g.f.forEach(function (f) {
      var res = null;
      if (f.k === 'eq') res = checkEq(getVal(f.id), f);
      else if (f.k === 'num') res = checkNum(getVal(f.id), f.v);
      else if (f.k === 'yn') { var v = getVal(f.id); res = !v ? { ok: false, msg: 'Pick yes or no.' } : ((v === 'yes') === f.v ? { ok: true } : { ok: false, msg: 'Not yet. Look at how y changes each time x goes up.' }); }
      else if (f.k === 'grid') res = checkGrid(getPts(f.id), f);
      if (res) { total++; if (res.ok) good++; showMark(f.id, res); }
    });
    var sum = document.querySelector('[data-sum="' + gi + '"]');
    if (sum) sum.textContent = good + ' of ' + total + ' correct';
  }
  function onStageClick(e) {
    var t = e.target;
    if (t.closest) {
      var yn = t.closest('[data-yn]');
      if (yn) {
        var fid = yn.getAttribute('data-fid'); setVal(fid, yn.getAttribute('data-yn')); clearMark(fid);
        Array.prototype.forEach.call(document.querySelectorAll('[data-yn][data-fid="' + fid + '"]'), function (b) { b.setAttribute('aria-checked', b === yn ? 'true' : 'false'); });
        queueSend();
        return;
      }
      var ck = t.closest('[data-check]'); if (ck) { runCheck(parseInt(ck.getAttribute('data-check'), 10)); return; }
      var cl = t.closest('[data-clear]');
      if (cl) { var f2 = cl.getAttribute('data-clear'); setVal(f2, '[]'); clearMark(f2); drawPad(document.querySelector('.gridf[data-fid="' + f2 + '"]')); queueSend(); return; }
      var pad = t.closest('.pad');
      if (pad) {
        var box = pad.closest('.gridf'), fid2 = box.getAttribute('data-fid');
        var svg = pad.querySelector('svg'), rect = svg.getBoundingClientRect();
        var vx = (e.clientX - rect.left) / rect.width * W, vy = (e.clientY - rect.top) / rect.height * W;
        var gx = Math.round((vx - P) / S - R), gy = Math.round(R - (vy - P) / S);
        gx = Math.max(-R, Math.min(R, gx)); gy = Math.max(-R, Math.min(R, gy));
        var pts = getPts(fid2), idx = -1;
        pts.forEach(function (p, i) { if (p[0] === gx && p[1] === gy) idx = i; });
        if (idx > -1) pts.splice(idx, 1); else pts.push([gx, gy]);
        setVal(fid2, JSON.stringify(pts)); clearMark(fid2); drawPad(box); queueSend();
      }
    }
  }
  function syncText(fid, val, source) {
    Array.prototype.forEach.call(document.querySelectorAll('textarea[data-fid="' + fid + '"]'), function (ta) { if (ta !== source) ta.value = val; });
  }
  function onStageInput(e) {
    var t = e.target; if (!t.getAttribute) return;
    var fid = t.getAttribute('data-fid'); if (!fid) return;
    setVal(fid, t.value);
    if (t.tagName === 'TEXTAREA') syncText(fid, t.value, t);
    else clearMark(fid);
    queueSend();
  }

  /* ---------- cheat sheet drawer ---------- */
  function openSheet(open) {
    var s = $('sheet'); s.hidden = !open;
    if (open) { ['cheat-L1', 'cheat-L2', 'cheat-L3'].forEach(function (id) { var ta = s.querySelector('textarea[data-fid="' + id + '"]'); if (ta) ta.value = getVal(id); }); }
  }
  function copySheet() {
    var txt = 'L1 Tables\n' + getVal('cheat-L1') + '\n\nL2 Graphs\n' + getVal('cheat-L2') + '\n\nL3 Applications\n' + getVal('cheat-L3') + '\n';
    var msg = $('copyMsg');
    function done(ok) { msg.textContent = ok ? 'Copied.' : 'Copy did not work here. Select the text and copy it yourself.'; }
    try { navigator.clipboard.writeText(txt).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
  }

  /* ---------- admin ---------- */
  function fmt(ms) { var s = Math.max(0, Math.floor(ms / 1000)); var m = Math.floor(s / 60); s = s % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  function elapsed() { return accMs + (running ? Date.now() - startedAt : 0); }
  function tick() {
    if (mode !== 'admin') return;
    var ms = elapsed(), m = ms / 60000;
    $('time').firstChild.nodeValue = fmt(ms);
    $('left').textContent = (running || ms > 0) ? fmt(TOTAL * 60000 - ms) + ' left' : '';
    BLOCKS.forEach(function (b, i) { var p = Math.max(0, Math.min(1, (m - starts[i]) / b.min)); $('seg' + i).style.setProperty('--p', (p * 100) + '%'); });
    var pace = $('pace'), txt = $('paceText'), c = CARDS[live.card];
    pace.className = 'pace';
    if (ms === 0 && !running) { txt.textContent = 'Press Start when class begins.'; return; }
    if (m > TOTAL) { pace.classList.add('late'); txt.textContent = 'Past 50 minutes by ' + fmt(ms - TOTAL * 60000) + '.'; return; }
    if (m < c.t[0]) { pace.classList.add('early'); txt.textContent = 'Ahead of plan. This card is planned for minute ' + c.t[0] + ', you are at ' + fmt(ms) + '.'; }
    else if (m > c.t[1]) { pace.classList.add('late'); txt.textContent = 'Behind plan by ' + fmt(ms - c.t[1] * 60000) + ' on this card. Check the notes for what to cut.'; }
    else { pace.classList.add('ok'); txt.textContent = 'On pace. ' + fmt(c.t[1] * 60000 - ms) + ' left on this card.'; }
  }
  function buildAdminChrome() {
    var bar = $('bar'), dots = $('dots');
    if (bar.children.length) return;
    BLOCKS.forEach(function (b, i) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'seg'; btn.id = 'seg' + i;
      btn.style.setProperty('--m', b.min); btn.style.setProperty('--c', b.c);
      btn.setAttribute('aria-label', 'Send students to ' + b.name);
      btn.innerHTML = '<span class="fill"></span><span class="lab"><b>' + b.min + ' min</b><span>' + b.name + '</span></span>';
      btn.addEventListener('click', function () { for (var k = 0; k < CARDS.length; k++) { if (CARDS[k].blk === i) { adminSet(k, false); break; } } });
      bar.appendChild(btn);
    });
    CARDS.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'dot-btn'; b.textContent = i + 1; b.id = 'dot' + i;
      b.style.setProperty('--c', BLOCKS[c.blk].c);
      b.setAttribute('aria-label', 'Send students to card ' + (i + 1) + ': ' + c.title);
      b.addEventListener('click', function () { adminSet(i, false); });
      dots.appendChild(b);
    });
  }
  function enterAdmin() {
    mode = 'admin';
    document.body.classList.add('admin');
    document.body.classList.remove('projector');
    $('adminTop').hidden = false; $('navAdmin').hidden = false; $('notes').hidden = false;
    $('topStudent').hidden = true; $('navStudent').hidden = true;
    $('loginLink').textContent = 'Sign out';
    $('workPanel').hidden = false; $('nameGate').hidden = true; $('nameLink').hidden = true; $('shareNote').hidden = true;
    buildWorkSelect(); fetchWork();
    if (!workTimer) workTimer = setInterval(fetchWork, 4000);
    buildAdminChrome();
    viewIdx = live.card; pinned = false;
    renderCard(); updateChrome();
  }
  function logout(msg) {
    try { sessionStorage.removeItem('sla-pass'); } catch (e) {}
    if (msg) { try { sessionStorage.setItem('sla-msg', msg); } catch (e) {} }
    pass = ''; location.reload();
  }
  function showLogin(show, err) {
    $('login').hidden = !show;
    $('loginErr').textContent = err || '';
    if (show) { $('passIn').value = ''; setTimeout(function () { $('passIn').focus(); }, 30); }
  }
  function tryLogin() {
    var p = $('passIn').value;
    if (!p) { $('loginErr').textContent = 'Enter the passcode.'; return; }
    $('loginErr').textContent = 'Checking...';
    api({ action: 'login', pass: p }).then(function (res) {
      if (res && res.ok) { pass = p; try { sessionStorage.setItem('sla-pass', p); } catch (e) {} showLogin(false); enterAdmin(); }
      else if (res && res.error === 'locked') $('loginErr').textContent = 'Too many tries. Wait 10 minutes.';
      else if (res && res.error === 'noconfig') $('loginErr').textContent = 'No passcode is set in the Apps Script yet.';
      else $('loginErr').textContent = 'That passcode is not right.';
    }).catch(function () { $('loginErr').textContent = 'Could not reach the sync service. Check your connection.'; });
  }
  function toggleTimer() {
    if (running) { accMs += Date.now() - startedAt; running = false; } else { startedAt = Date.now(); running = true; }
    $('startBtn').textContent = running ? 'Pause' : (accMs > 0 ? 'Resume' : 'Start');
    tick();
  }
  function resetTimer() { running = false; accMs = 0; $('startBtn').textContent = 'Start'; tick(); }

  /* ---------- facilitator: live student work ---------- */
  function displayVal(f, raw) {
    if (!raw) return '';
    if (f.k === 'yn') return raw === 'yes' ? 'Yes' : 'No';
    if (f.k === 'grid') { try { return JSON.parse(raw).map(function (q) { return '(' + q[0] + ', ' + q[1] + ')'; }).join(' ').replace(/-/g, '\u2212'); } catch (e) { return ''; } }
    return raw;
  }
  function statusFor(f, raw) {
    if (!raw) return null;
    if (f.k === 'eq') return checkEq(raw, f).ok;
    if (f.k === 'num') return checkNum(raw, f.v).ok;
    if (f.k === 'yn') return (raw === 'yes') === f.v;
    if (f.k === 'grid') {
      var pts; try { pts = JSON.parse(raw); } catch (e) { return false; }
      var r = checkGrid(pts, f);
      if (r.ok) return true;
      if (pts.length < f.need && pts.every(function (p) { return close(f.m * p[0] + f.b, p[1]); })) return 'wip';
      return false;
    }
    return null;
  }
  function renderWorkPanel() {
    if (mode !== 'admin') return;
    var sel = $('workSel').value, idx = (sel === 'live') ? live.card : clamp(sel);
    var c = CARDS[idx], list = workStudents.slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    var h = '<div class="who">';
    if (!list.length) h += '<span class="small">No students have joined yet. They appear here after they enter a name.</span>';
    list.forEach(function (s) { h += '<span class="pill ' + ((workNow - s.t) < 45000 ? 'on' : '') + '">' + esc(s.name) + '</span>'; });
    h += '</div>';
    if (!c.work) h += '<p class="small">Card ' + (idx + 1) + ' has no student answers.</p>';
    else {
      h += '<div class="wgrid">';
      c.work.forEach(function (g) {
        g.f.forEach(function (f) {
          var answered = 0, correct = 0, rows = '';
          list.forEach(function (s) {
            var raw = (s.v || {})[f.id] || '', st = statusFor(f, raw);
            if (raw) answered++;
            if (st === true) correct++;
            var cls = st === true ? 'good' : st === 'wip' ? 'wip' : st === false ? 'bad' : '';
            var mark = st === true ? '\u2713' : st === 'wip' ? '\u2026' : st === false ? '\u2717' : '';
            rows += '<li class="wrow"><span class="wn">' + esc(s.name) + '</span><span class="wv' + (f.k === 'text' ? ' txt' : '') + '">' + (raw ? esc(displayVal(f, raw)) : '<i>no answer yet</i>') + '</span><span class="wm ' + cls + '">' + mark + '</span></li>';
          });
          var head = f.k === 'text' ? (answered + ' of ' + list.length + ' wrote something') : (correct + ' of ' + list.length + ' correct');
          h += '<div class="wf"><h4>' + (g.t ? esc(g.t) + ' \u00b7 ' : '') + esc(f.label) + '</h4><p class="wsum">' + head + '</p><ul>' + rows + '</ul></div>';
        });
      });
      h += '</div>';
    }
    $('workBody').innerHTML = h;
  }
  function fetchWork() {
    if (mode !== 'admin' || document.hidden) return;
    api({ action: 'work_get', pass: pass }).then(function (r) {
      if (r && r.ok) { workStudents = r.students || []; workNow = r.now || Date.now(); renderWorkPanel(); }
    }).catch(function () {});
  }
  function buildWorkSelect() {
    var sel = $('workSel'); if (sel.options.length) return;
    var o = document.createElement('option'); o.value = 'live'; o.textContent = 'The card students are on'; sel.appendChild(o);
    CARDS.forEach(function (c, i) { var op = document.createElement('option'); op.value = i; op.textContent = 'Card ' + (i + 1) + ': ' + c.title; sel.appendChild(op); });
    sel.addEventListener('change', renderWorkPanel);
  }
  function onClearWork() {
    var b = $('clearWork');
    if (!clearArmed) {
      b.textContent = 'Click again to erase everything';
      clearArmed = setTimeout(function () { clearArmed = null; b.textContent = 'Erase all student work'; }, 5000);
      return;
    }
    clearTimeout(clearArmed); clearArmed = null; b.textContent = 'Erase all student work';
    api({ action: 'work_clear', pass: pass }).then(function () { workStudents = []; renderWorkPanel(); });
  }

  /* ---------- wire up ---------- */
  function init() {
    if (isProjector) document.body.classList.add('projector');
    if (demo) $('demoBanner').hidden = false;
    var stage = $('stage');
    stage.addEventListener('click', onStageClick);
    stage.addEventListener('input', onStageInput);
    $('sheet').addEventListener('input', onStageInput);
    $('sheetBtn').addEventListener('click', function () { openSheet($('sheet').hidden); });
    $('sheetClose').addEventListener('click', function () { openSheet(false); });
    $('copyBtn').addEventListener('click', copySheet);
    $('prevBtn').addEventListener('click', function () { if (viewIdx > 0) { viewIdx--; pinned = true; renderCard(); updateChrome(); window.scrollTo(0, 0); } });
    $('nextBtn').addEventListener('click', function () { if (viewIdx < live.card) { viewIdx++; pinned = viewIdx < live.card; renderCard(); updateChrome(); window.scrollTo(0, 0); } });
    $('liveBtn').addEventListener('click', function () { viewIdx = live.card; pinned = false; renderCard(); updateChrome(); window.scrollTo(0, 0); });
    $('loginLink').addEventListener('click', function () { if (mode === 'admin') logout(); else showLogin(true); });
    $('loginGo').addEventListener('click', tryLogin);
    $('loginCancel').addEventListener('click', function () { showLogin(false); });
    $('passIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') tryLogin(); if (e.key === 'Escape') showLogin(false); });
    $('aPrev').addEventListener('click', function () { adminSet(live.card - 1, false); });
    $('aNext').addEventListener('click', function () { adminSet(live.card + 1, false); });
    $('revealBtn').addEventListener('click', function () { adminSet(live.card, !live.ans); });
    $('nameGo').addEventListener('click', submitName);
    $('nameIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') submitName(); });
    $('nameLink').addEventListener('click', function () { showGate(true); });
    $('gateAdmin').addEventListener('click', function () { showLogin(true); });
    $('clearWork').addEventListener('click', onClearWork);
    $('startBtn').addEventListener('click', toggleTimer);
    $('resetBtn').addEventListener('click', resetTimer);
    document.addEventListener('keydown', function (e) {
      if (mode !== 'admin' || e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') adminSet(live.card + 1, false);
      else if (e.key === 'ArrowLeft') adminSet(live.card - 1, false);
      else if ((e.key === 'a' || e.key === 'A') && CARDS[live.card].ans) adminSet(live.card, !live.ans);
      else if (e.key === ' ' && tag !== 'BUTTON') { e.preventDefault(); toggleTimer(); }
    });
    var m = null; try { m = sessionStorage.getItem('sla-msg'); sessionStorage.removeItem('sla-msg'); } catch (e) {}
    if (m) $('flash').textContent = m;
    setStatus(demo ? 'demo' : 'online');
    if (isProjector) $('shareNote').hidden = true;
    updateMeLink();
    if (!isProjector && !pass && !me) showGate(true);
    renderCard(); updateChrome();
    api({ action: 'get' }).then(function (s) {
      applyLive(s);
      if (pass && !isProjector) {
        api({ action: 'login', pass: pass }).then(function (r) { if (r && r.ok) enterAdmin(); else { try { sessionStorage.removeItem('sla-pass'); } catch (e) {} pass = ''; if (!me) showGate(true); } });
      }
    }).catch(function () { setStatus('offline'); });
    setInterval(poll, demo ? 600 : (CFG.POLL_MS || 2000));
    setInterval(tick, 500);
    setInterval(sendWork, 20000);
    if (me) setTimeout(sendWork, 800);
    document.addEventListener('visibilitychange', poll);
  }
  init();
})();
