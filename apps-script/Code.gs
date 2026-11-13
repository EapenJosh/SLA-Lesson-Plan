/**
 * SLA class sync. Holds which card the class is on and whether answers are showing.
 * Deploy as a web app: Execute as "Me", Who has access "Anyone".
 * Set the facilitator passcode under Project Settings > Script properties: ADMIN_PASSCODE.
 */
var PROP = PropertiesService.getScriptProperties();

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function readState_() {
  var s = PROP.getProperty('STATE');
  return s ? JSON.parse(s) : { card: 0, ans: false, rev: 0 };
}

// Returns 'ok', 'bad', 'locked', or 'noconfig'. Five wrong tries lock sign in for 10 minutes.
function auth_(pass) {
  var cache = CacheService.getScriptCache();
  if (cache.get('lock')) return 'locked';
  var real = PROP.getProperty('ADMIN_PASSCODE');
  if (!real) return 'noconfig';
  if (String(pass) === String(real)) { cache.remove('fails'); return 'ok'; }
  var fails = Number(cache.get('fails') || 0) + 1;
  cache.put('fails', String(fails), 600);
  if (fails >= 5) cache.put('lock', '1', 600);
  return 'bad';
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
