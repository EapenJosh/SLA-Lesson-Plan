/**
 * SLA class sync. Holds which card the class is on, whether answers are showing,
 * and a temporary copy of each student's work so the facilitator can see it live.
 *
 * Deploy as a web app: Execute as "Me", Who has access "Anyone".
 * Set the facilitator passcode under Project Settings > Script properties: ADMIN_PASSCODE.
 *
 * Student work lives in CacheService only. Google erases it automatically after 6 hours,
 * and the facilitator view has a button to erase it sooner. It is never written to a sheet.
 */
var PROP = PropertiesService.getScriptProperties();
var CACHE = CacheService.getScriptCache();
var WORK_TTL = 21600;      // 6 hours, the maximum CacheService allows
var MAX_STUDENTS = 60;

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function readState_() {
  var s = PROP.getProperty('STATE');
  return s ? JSON.parse(s) : { card: 0, ans: false, rev: 0 };
}

// Returns 'ok', 'bad', 'locked', or 'noconfig'. Five wrong tries lock sign in for 10 minutes.
function auth_(pass) {
  if (CACHE.get('lock')) return 'locked';
  var real = PROP.getProperty('ADMIN_PASSCODE');
  if (!real) return 'noconfig';
  if (String(pass) === String(real)) { CACHE.remove('fails'); return 'ok'; }
  var fails = Number(CACHE.get('fails') || 0) + 1;
  CACHE.put('fails', String(fails), 600);
  if (fails >= 5) CACHE.put('lock', '1', 600);
  return 'bad';
}

function readRoster_() {
  try { return JSON.parse(CACHE.get('ROSTER') || '[]') || []; } catch (e) { return []; }
}

function saveWork_(b) {
  var id = String(b.id || '');
  if (!/^[a-z0-9]{6,24}$/.test(id)) return { ok: false, error: 'bad id' };
  var name = String(b.name || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
  if (!name) return { ok: false, error: 'no name' };
  var v = {}, count = 0, src = b.v || {};
  for (var k in src) {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(k)) continue;
    if (++count > 80) break;
    v[k] = String(src[k]).slice(0, 2000);
  }
  var rec = JSON.stringify({ name: name, v: v, t: Date.now() });
  if (rec.length > 60000) return { ok: false, error: 'too big' };

  var roster = readRoster_();
  if (roster.indexOf(id) === -1) {
    var lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      roster = readRoster_();
      if (roster.indexOf(id) === -1) {
        if (roster.length >= MAX_STUDENTS) return { ok: false, error: 'full' };
        roster.push(id);
        CACHE.put('ROSTER', JSON.stringify(roster), WORK_TTL);
      }
    } finally {
      lock.releaseLock();
    }
  }
  CACHE.put('W_' + id, rec, WORK_TTL);
  return { ok: true };
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || 'get';

  if (action === 'get') {
    var s = readState_();
    s.ok = true;
    return out_(s);
  }

  var a = auth_(p.pass);
  if (a !== 'ok') return out_({ ok: false, error: a });
  if (action === 'login') return out_({ ok: true });

  if (action === 'work_get') {
    var ids = readRoster_();
    var keys = ids.map(function (i) { return 'W_' + i; });
    var got = keys.length ? CACHE.getAll(keys) : {};
    var students = [];
    ids.forEach(function (i) {
      var raw = got['W_' + i];
      if (!raw) return;
      try { var r = JSON.parse(raw); students.push({ id: i, name: r.name, v: r.v, t: r.t }); } catch (err) {}
    });
    return out_({ ok: true, students: students, now: Date.now() });
  }

  if (action === 'work_clear') {
    var all = readRoster_();
    if (all.length) CACHE.removeAll(all.map(function (i) { return 'W_' + i; }));
    CACHE.remove('ROSTER');
    return out_({ ok: true });
  }

  if (action === 'set') {
    var lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      var st = readState_();
      if (p.card !== undefined && p.card !== '') st.card = Math.max(0, Math.min(99, parseInt(p.card, 10) || 0));
      if (p.ans !== undefined && p.ans !== '') st.ans = (p.ans === '1');
      st.rev = (st.rev || 0) + 1;
      PROP.setProperty('STATE', JSON.stringify(st));
      st.ok = true;
      return out_(st);
    } finally {
      lock.releaseLock();
    }
  }
  return out_({ ok: false, error: 'unknown' });
}

// Students post their work here. No passcode, so it only accepts the fields saveWork_ validates.
function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'bad json' }); }
  if (body && body.action === 'work') return out_(saveWork_(body));
  return out_({ ok: false, error: 'unknown' });
}
