// واجهة العرض: تطبيق العميل، ولوحة مراقبة تعرض كل خطوة للوكيل لحظة حدوثها.
const $ = (id) => document.getElementById(id);
const S = { id: null, otp: '', busy: false, pending: null, steps: 0, tools: 0, tokens: 0, cached: 0, turns: 0, t0: 0, open: {} };

const SUGGESTIONS = [
  'ليش انخصم مني 45 ريال أمس؟',
  'كم رسوم التحويل الدولي؟',
  'أعطني آخر عمليات حساب أخوي',
  'ضاعت بطاقتي اللي تنتهي 4821',
  'كم صرفت على المطاعم هذا الشهر؟',
  'أبغى أكلم موظف',
];
const TOOL_AR = {
  search_knowledge: 'البحث في وثائق البنك',
  get_accounts: 'الحسابات والأرصدة',
  list_transactions: 'آخر العمليات',
  spending_summary: 'ملخص المصروفات',
  freeze_card: 'طلب إيقاف بطاقة',
  handoff_to_human: 'التحويل لموظف',
};

// ─── أدوات صغيرة ───
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = text;
  return e;
}
function icon(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('class', 'ic');
  const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  u.setAttribute('href', '#i-' + name);
  s.appendChild(u);
  return s;
}
const nowTime = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmt = (n) => Number(n).toLocaleString('en-US');
function pretty(text, max = 1400) {
  let out = typeof text === 'string' ? text : JSON.stringify(text);
  try { out = JSON.stringify(JSON.parse(out), null, 2); } catch (e) { /* نص عادي */ }
  return out.length > max ? out.slice(0, max) + '\n…' : out;
}
const since = () => '+' + ((performance.now() - S.t0) / 1000).toFixed(1) + ' ث';

// ─── المحادثة ───
function scrollChat() { $('chat').scrollTop = $('chat').scrollHeight; }
function msg(kind, text) {
  const m = el('div', 'msg ' + kind);
  m.appendChild(el('div', 'bubble', text));
  m.appendChild(el('div', 'meta', (kind === 'bot' ? 'سند · ' : '') + nowTime()));
  $('chat').appendChild(m);
  scrollChat();
}
function notice(kind, iconName, text, sub) {
  const n = el('div', 'notice ' + kind);
  n.appendChild(icon(iconName));
  const t = el('div', '', text);
  if (sub) t.appendChild(el('small', '', sub));
  n.appendChild(t);
  $('chat').appendChild(n);
  scrollChat();
}
function typing() {
  const t = el('div', 'typing');
  t.append(el('i'), el('i'), el('i'));
  $('chat').appendChild(t);
  scrollChat();
  return t;
}
function setBusy(on) {
  S.busy = on;
  $('send').disabled = on;
  $('input').disabled = on;
  document.querySelectorAll('.chip-q').forEach((c) => { c.disabled = on; });
  $('presence').lastChild.textContent = on ? 'المساعد الذكي · يكتب…' : 'المساعد الذكي · متصل';
}

// ─── لوحة المراقبة ───
function kpis() {
  $('kSteps').textContent = fmt(S.steps);
  $('kTools').textContent = fmt(S.tools);
  $('kTokens').textContent = S.tokens ? fmt(S.tokens) : '—';
  $('kTokensSub').textContent = S.tokens ? `منها ${fmt(S.cached)} من الذاكرة المؤقتة` : 'لا يُحتسب في وضع المحاكاة';
  $('turnCount').textContent = S.turns ? `${S.turns} ${S.turns === 1 ? 'رسالة' : 'رسائل'}` : '';
}
function markLast() {
  const steps = $('timeline').querySelectorAll('.step');
  steps.forEach((s) => s.classList.remove('last'));
  if (steps.length) steps[steps.length - 1].classList.add('last');
}
function step({ kind = '', iconName, title, tag, pill, desc, details, busy }) {
  const li = el('li', 'step ' + kind + (busy ? ' busy' : ''));
  const node = el('span', 'node');
  node.appendChild(icon(iconName));
  const body = el('div', 's-body');
  const row = el('div', 's-row');
  row.appendChild(el('span', 's-title', title));
  if (tag) row.appendChild(el('span', 'tag', tag));
  if (pill) row.appendChild(el('span', 'pill ' + pill[0], pill[1]));
  row.appendChild(el('span', 's-time', since()));
  body.appendChild(row);
  const d = el('div', 's-desc');
  if (desc) d.textContent = desc;
  body.appendChild(d);
  (details || []).forEach(([label, text]) => addDetails(body, label, text));
  li.append(node, body);
  $('timeline').querySelector('.empty')?.remove();
  $('timeline').appendChild(li);
  markLast();
  $('timeline').scrollTop = $('timeline').scrollHeight;
  return li;
}
function addDetails(body, label, text) {
  const det = el('details');
  det.appendChild(el('summary', '', label));
  det.appendChild(el('pre', 'code', pretty(text)));
  body.appendChild(det);
}
function update(li, { kind, title, pill, desc, details }) {
  li.classList.remove('busy', 'ok', 'warn', 'bad', 'neutral');
  if (kind) li.classList.add(kind);
  if (title) li.querySelector('.s-title').textContent = title;
  if (pill) {
    li.querySelector('.pill')?.remove();
    li.querySelector('.s-time').before(el('span', 'pill ' + pill[0], pill[1]));
  }
  if (desc !== undefined) li.querySelector('.s-desc').textContent = desc;
  li.querySelector('.s-time').textContent = since();
  (details || []).forEach(([label, text]) => addDetails(li.querySelector('.s-body'), label, text));
}
function turnHead(text) {
  const li = el('li', 'turn');
  const ava = el('span', 'ava');
  ava.appendChild(icon('user'));
  li.append(ava, el('span', 'q', '«' + text + '»'), el('time', '', nowTime()));
  $('timeline').querySelector('.empty')?.remove();
  $('timeline').appendChild(li);
}

function onEvent(ev) {
  switch (ev.type) {
    case 'guard_input':
      step(ev.masked
        ? { kind: 'warn', iconName: 'shield', title: 'حاجز الإدخال', pill: ['warn', 'أُخفيت بيانات'], desc: 'رقم طويل (بطاقة أو هوية) أُخفي قبل وصول الرسالة إلى النموذج.', details: [['ما وصل للنموذج', ev.text]] }
        : { kind: 'ok', iconName: 'shield-check', title: 'حاجز الإدخال', pill: ['ok', 'سليم'], desc: 'لا توجد بيانات حساسة في الرسالة.' });
      break;
    case 'system_note':
      step({ kind: 'neutral', iconName: 'info', title: 'ملاحظة من النظام للنموذج', desc: ev.text });
      break;
    case 'model_call':
      S.steps += 1;
      S.open.model = step({ iconName: 'cpu', title: 'النموذج يحلّل الطلب', tag: ev.provider, desc: `الخطوة ${ev.step}`, busy: true });
      break;
    case 'model_result': {
      const u = ev.usage || {};
      const tokens = (u.input_tokens || 0) + (u.output_tokens || 0) + (u.cached_tokens || 0);
      S.tokens += tokens;
      S.cached += u.cached_tokens || 0;
      const decision = ev.stop === 'tool_use' ? 'قرّر استخدام: ' + ev.tools.map((t) => TOOL_AR[t] || t).join('، ')
        : ev.stop === 'end' ? 'قرّر الرد على العميل' : ev.stop === 'refusal' ? 'رفض الطلب لأسباب أمنية' : 'انقطع الرد';
      const usage = tokens ? ` · ${fmt(u.input_tokens + (u.cached_tokens || 0))} رمز دخل (${fmt(u.cached_tokens || 0)} من الذاكرة المؤقتة) · ${fmt(u.output_tokens)} رمز خرج` : '';
      update(S.open.model, { kind: ev.stop === 'refusal' ? 'bad' : '', title: 'قرار النموذج', desc: decision + usage });
      kpis();
      break;
    }
    case 'tool_call':
      S.tools += 1;
      S.open.tool = step({ kind: 'neutral', iconName: 'plug', title: TOOL_AR[ev.name] || ev.name, tag: ev.name, desc: 'جارٍ التنفيذ على أنظمة البنك…', details: [['المدخلات التي طلبها النموذج', JSON.stringify(ev.input)]], busy: true });
      kpis();
      break;
    case 'tool_result':
      update(S.open.tool, ev.is_error
        ? { kind: 'bad', pill: ['bad', 'خطأ'], desc: `رفضت الأداة الطلب خلال ${ev.ms} ملّي ثانية، وأُبلغ النموذج بالسبب.`, details: [['رسالة الأداة', ev.output]] }
        : { kind: 'ok', pill: ['ok', 'نجح'], desc: `نُفّذت خلال ${ev.ms} ملّي ثانية، على بيانات هذا العميل فقط.`, details: [['النتيجة التي رآها النموذج', ev.output]] });
      break;
    case 'pending_action':
      step({ kind: 'warn', iconName: 'lock', title: 'إجراء بانتظار تأكيد العميل', pill: ['warn', 'معلّق'], desc: `${ev.summary}. لم يُنفَّذ شيء بعد، والتنفيذ يحتاج رمز التحقق.` });
      break;
    case 'handoff':
      step({ kind: 'warn', iconName: 'headset', title: 'تحويل إلى موظف', tag: ev.ticket, desc: ev.summary });
      break;
    case 'guard_output':
      step(ev.ok
        ? { kind: 'ok', iconName: 'shield-check', title: 'حاجز الإخراج', pill: ['ok', 'سليم'], desc: ev.detail }
        : { kind: 'bad', iconName: 'alert', title: 'حاجز الإخراج أوقف الرد', pill: ['bad', 'حُجب'], desc: ev.detail });
      break;
    case 'reply':
      step({ kind: 'ok', iconName: 'send', title: 'الرد وصل للعميل', desc: `خلال ${(ev.ms / 1000).toFixed(1)} ثانية من استلام الرسالة.` });
      $('kLatency').textContent = (ev.ms / 1000).toFixed(1);
      $('kLatencySub').textContent = 'ثانية، من الرسالة إلى الرد';
      break;
    case 'error':
      step({ kind: 'bad', iconName: 'alert', title: 'خطأ في الاتصال بالنموذج', desc: ev.message });
      break;
    default:
      break;
  }
}

// ─── الإرسال والبث ───
async function send(text) {
  text = text.trim();
  if (!text || S.busy || !S.id) return;
  setBusy(true);
  S.t0 = performance.now();
  S.turns += 1;
  msg('me', text);
  $('input').value = '';
  turnHead(text);
  kpis();
  let dots = typing();
  try {
    const res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: S.id, text }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (!chunk.startsWith('data: ')) continue;
        const ev = JSON.parse(chunk.slice(6));
        onEvent(ev);
        if (ev.type === 'reply') { dots?.remove(); dots = null; msg('bot', ev.text); }
        if (ev.type === 'pending_action') S.pending = ev;
      }
    }
  } catch (e) {
    step({ kind: 'bad', iconName: 'alert', title: 'انقطع الاتصال بالخادم', desc: String(e.message || e) });
    notice('bad', 'alert', 'تعذّر الاتصال. أعد المحاولة.');
  } finally {
    dots?.remove();
    setBusy(false);
    refreshState();
    if (S.pending) setTimeout(() => openSheet(S.pending), 450);
    else $('input').focus();
  }
}

// ─── شاشة التأكيد ───
const otpBoxes = [...$('otp').querySelectorAll('input')];
function otpValue() { return otpBoxes.map((b) => b.value).join(''); }
otpBoxes.forEach((box, i) => {
  box.addEventListener('input', () => {
    box.value = box.value.replace(/\D/g, '').slice(-1);
    $('otp').classList.remove('error');
    if (box.value && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
    if (otpValue().length === 6) $('confirmBtn').focus();
  });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !box.value && i > 0) otpBoxes[i - 1].focus();
    if (e.key === 'Enter') $('confirmBtn').click();
  });
  box.addEventListener('paste', (e) => {
    const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    digits.split('').forEach((d, k) => { if (otpBoxes[k]) otpBoxes[k].value = d; });
    otpBoxes[Math.min(digits.length, 5)].focus();
  });
});
function openSheet(ev) {
  $('sheetTitle').textContent = ev.summary;
  $('bcNum').textContent = '•••• •••• •••• ' + (ev.card_last4 || '');
  $('bcKind').textContent = ev.card_kind || 'بطاقة';
  $('bcReason').textContent = ev.reason ? 'السبب: ' + ev.reason : '';
  $('otpHint').textContent = S.otp;
  otpBoxes.forEach((b) => { b.value = ''; });
  $('otp').classList.remove('error');
  $('sheetErr').hidden = true;
  $('sheet').hidden = false;
  otpBoxes[0].focus();
}
function closeSheet() { $('sheet').hidden = true; S.pending = null; $('input').focus(); }
async function actionCall(path, extra = {}) {
  const res = await fetch(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: S.id, action_id: S.pending.action_id, ...extra }),
  });
  return res.json();
}
$('confirmBtn').addEventListener('click', async () => {
  if (!S.pending) return;
  $('confirmBtn').disabled = true;
  const r = await actionCall('/api/confirm', { otp: otpValue() });
  $('confirmBtn').disabled = false;
  if (!r.ok) {
    $('sheetErr').textContent = r.message;
    $('sheetErr').hidden = false;
    $('otp').classList.add('error');
    return;
  }
  S.t0 = performance.now();
  step({ kind: 'ok', iconName: 'lock', title: 'العميل أكّد برمز التحقق', pill: ['ok', 'نُفّذ'], desc: r.message + ' نُفّذ مرة واحدة فقط بمفتاح منع التكرار، وسُجّل في سجل التدقيق.' });
  notice('ok', 'check', r.message, 'من تطبيق البنك بعد التحقق من الرمز');
  closeSheet();
  refreshState();
});
$('cancelBtn').addEventListener('click', async () => {
  if (!S.pending) return;
  const r = await actionCall('/api/cancel');
  S.t0 = performance.now();
  step({ kind: 'neutral', iconName: 'info', title: 'العميل ألغى الطلب', desc: r.message });
  notice('warn', 'info', r.message);
  closeSheet();
  refreshState();
});

// ─── حالة البنك الوهمي ───
function listItems(target, items, empty) {
  $(target).replaceChildren(...(items.length ? items : [el('li', 'none', empty)]));
}
async function refreshState() {
  if (!S.id) return;
  const res = await fetch('/api/state?session_id=' + S.id);
  if (!res.ok) return;
  const st = await res.json();
  listItems('cards', st.cards.map((c) => {
    const li = el('li');
    const g = el('div', 'grow', c.kind);
    li.append(icon('card'), g, el('span', 'num', '•••• ' + c.last4));
    li.appendChild(c.status === 'frozen' ? el('span', 'pill warn', 'موقوفة مؤقتاً') : el('span', 'pill ok', 'فعّالة'));
    return li;
  }), 'لا توجد بطاقات');
  listItems('tickets', st.tickets.map((t) => {
    const li = el('li');
    const g = el('div', 'grow');
    g.append(el('span', 'tag', t.id), el('small', '', t.summary));
    li.append(icon('headset'), g, el('span', 'pill warn', `~${t.wait_minutes} د`));
    return li;
  }), 'لا توجد تذاكر بعد');
  listItems('audit', st.audit.slice().reverse().map((a) => {
    const li = el('li');
    const g = el('div', 'grow', a.event);
    g.appendChild(el('small', '', a.detail));
    li.append(el('time', '', a.time), g);
    return li;
  }), 'لا أحداث بعد');
}

// ─── البدء ───
async function start() {
  const r = await (await fetch('/api/session', { method: 'POST' })).json();
  Object.assign(S, { id: r.session_id, otp: r.demo_otp, pending: null, steps: 0, tools: 0, tokens: 0, cached: 0, turns: 0 });
  $('modelLabel').textContent = r.provider === 'scripted' ? 'وضع المحاكاة' : r.provider_label;
  $('model').classList.toggle('sim', r.provider === 'scripted');
  $('model').title = r.provider === 'scripted'
    ? 'محاكاة بدون إنترنت: المسار والأدوات حقيقية، والقرار من قواعد ثابتة تفهم أسئلة العرض وما يشبهها فقط.'
    : 'نموذج حقيقي · تعليمات ' + r.prompt_version;
  $('chat').replaceChildren(el('div', 'day', 'اليوم'));
  msg('bot', `أهلاً ${r.customer_name}، أنا سند، مساعدك الذكي في بنك الأمل. أقدر أساعدك في عملياتك ورصيدك وبطاقاتك ورسوم الخدمات.`);
  $('timeline').replaceChildren(el('li', 'empty', 'اكتب سؤالاً في تطبيق العميل أو اختر أحد الأسئلة المقترحة، وستظهر كل خطوة هنا.'));
  $('kLatency').textContent = '—';
  $('kLatencySub').textContent = 'بالثواني';
  kpis();
  refreshState();
}
$('reset').addEventListener('click', async () => {
  if (S.busy) return;
  await fetch('/api/reset', { method: 'POST' });
  $('sheet').hidden = true;
  start();
});
$('form').addEventListener('submit', (e) => { e.preventDefault(); send($('input').value); });
$('chips').replaceChildren(...SUGGESTIONS.map((q) => {
  const b = el('button', 'chip-q', q);
  b.type = 'button';
  b.addEventListener('click', () => send(q));
  return b;
}));

start();
