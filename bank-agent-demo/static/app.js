// واجهة العرض: محادثة العميل على اليمين، وكل خطوة للوكيل في لوحة «خلف الكواليس».
const $ = (id) => document.getElementById(id);
const S = { id: null, otp: '', busy: false, pending: null, steps: 0, tokens: 0 };

const MOMENTS = [
  'ليش انخصم مني 45 ريال أمس؟',
  'كم رسوم التحويل الدولي؟',
  'أعطني آخر عمليات حساب أخوي',
  'ضاعت بطاقتي اللي تنتهي 4821',
  'كم صرفت على المطاعم هذا الشهر؟',
  'أبغى أكلم موظف',
];

const TOOL_NAMES = {
  search_knowledge: 'البحث في وثائق البنك',
  get_accounts: 'الحسابات والأرصدة',
  list_transactions: 'آخر العمليات',
  spending_summary: 'ملخص المصروفات',
  freeze_card: 'طلب إيقاف بطاقة',
  handoff_to_human: 'التحويل لموظف',
};

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// ─── المحادثة ───
function bubble(kind, text, note) {
  const b = el('div', 'bubble ' + kind, text);
  if (note) b.appendChild(el('small', '', note));
  $('chat').appendChild(b);
  $('chat').scrollTop = $('chat').scrollHeight;
  return b;
}
function typing() {
  const t = el('div', 'typing');
  t.append(el('i'), el('i'), el('i'));
  $('chat').appendChild(t);
  $('chat').scrollTop = $('chat').scrollHeight;
  return t;
}
function setBusy(on) {
  S.busy = on;
  $('send').disabled = on;
  $('input').disabled = on;
  document.querySelectorAll('.moment').forEach((m) => { m.disabled = on; });
  $('live').classList.toggle('busy', on);
  $('live').textContent = on ? 'يفكّر…' : 'متصل';
}

// ─── لوحة «خلف الكواليس» ───
function pretty(text, max = 700) {
  let out = text;
  try { out = JSON.stringify(JSON.parse(text), null, 1); } catch (e) { /* نص عادي */ }
  return out.length > max ? out.slice(0, max) + ' …' : out;
}
function row(label, bodyText, opts = {}) {
  const li = el('li', opts.cls || '');
  li.appendChild(el('div', 'lab', label));
  const body = el('div', 'body');
  if (opts.strong) body.appendChild(el('b', '', opts.strong + ' '));
  if (bodyText) body.appendChild(document.createTextNode(bodyText));
  if (opts.code) body.appendChild(el('pre', '', opts.code));
  li.appendChild(body);
  const tr = $('trace');
  tr.querySelector('.empty-state')?.remove();
  tr.appendChild(li);
  tr.scrollTop = tr.scrollHeight;
}
function turnHead(text) {
  const li = el('li', 'turn');
  const body = el('div', 'body');
  body.append(el('span', '', 'رسالة العميل'), document.createTextNode('«' + text + '»'));
  li.appendChild(body);
  $('trace').querySelector('.empty-state')?.remove();
  $('trace').appendChild(li);
}

function trace(ev) {
  switch (ev.type) {
    case 'guard_input':
      row('حاجز الإدخال', ev.masked ? 'أُخفي رقم طويل قبل وصوله للنموذج:' : 'لا بيانات حساسة في الرسالة.',
        { cls: ev.masked ? 'hot' : 'ok', code: ev.masked ? ev.text : '' });
      break;
    case 'system_note':
      row('رسالة من النظام', ev.text, { cls: 'ok' });
      break;
    case 'model_call':
      S.steps += 1;
      row('النموذج', ev.provider, { strong: 'الخطوة ' + ev.step });
      break;
    case 'model_result': {
      const u = ev.usage || {};
      const tokens = (u.input_tokens || 0) + (u.output_tokens || 0);
      S.tokens += tokens;
      const usage = tokens ? ` · دخل ${u.input_tokens} (منها ${u.cached_tokens || 0} مخزّنة) · خرج ${u.output_tokens} رمزاً` : '';
      const what = ev.stop === 'tool_use' ? 'يطلب: ' + ev.tools.map((t) => TOOL_NAMES[t] || t).join('، ')
        : ev.stop === 'end' ? 'رد نهائي' : ev.stop === 'refusal' ? 'رفض أمني' : 'رد مقطوع';
      row('القرار', what + usage);
      break;
    }
    case 'tool_call':
      row('استدعاء أداة', '', { strong: ev.name, code: JSON.stringify(ev.input, null, 1) });
      break;
    case 'tool_result':
      row(ev.is_error ? 'خطأ من الأداة' : 'نتيجة الأداة', `استغرقت ${ev.ms} ملّي ثانية`, { cls: ev.is_error ? 'hot' : '', code: pretty(ev.output) });
      break;
    case 'pending_action':
      row('إجراء معلّق', 'بانتظار تأكيد العميل برمز التحقق. لم يُنفَّذ شيء بعد.', { cls: 'hot', strong: ev.summary });
      break;
    case 'handoff':
      row('تذكرة للموظف', ev.summary, { cls: 'hot', strong: ev.ticket });
      break;
    case 'guard_output':
      row('حاجز الإخراج', ev.detail, { cls: ev.ok ? 'ok' : 'hot' });
      break;
    case 'reply':
      row('الرد للعميل', `بعد ${(ev.ms / 1000).toFixed(1)} ثانية`, { cls: 'ok' });
      $('stats').textContent = `${S.steps} خطوات للنموذج` + (S.tokens ? ` · ${S.tokens.toLocaleString('en-US')} رمزاً` : '') + ` · آخر رد في ${(ev.ms / 1000).toFixed(1)} ث`;
      break;
    case 'error':
      row('خطأ', ev.message, { cls: 'hot' });
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
  bubble('me', text);
  $('input').value = '';
  turnHead(text);
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
        trace(ev);
        if (ev.type === 'reply') { dots?.remove(); dots = null; bubble('bot', ev.text); }
        if (ev.type === 'pending_action') S.pending = ev;
      }
    }
  } catch (e) {
    row('خطأ', String(e.message || e), { cls: 'hot' });
    bubble('app', 'انقطع الاتصال بالخادم. أعد المحاولة.');
  } finally {
    dots?.remove();
    setBusy(false);
    refreshState();
    if (S.pending) openSheet(S.pending);
    else $('input').focus();
  }
}

// ─── شاشة التأكيد: يعرضها التطبيق، والتنفيذ من الخادم بعد رمز التحقق ───
function openSheet(ev) {
  $('sheetTitle').textContent = ev.summary;
  $('otp').value = '';
  $('otpHint').textContent = S.otp;
  $('sheetErr').hidden = true;
  $('sheet').hidden = false;
  $('otp').focus();
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
  const r = await actionCall('/api/confirm', { otp: $('otp').value });
  if (!r.ok) { $('sheetErr').textContent = r.message; $('sheetErr').hidden = false; return; }
  row('تأكيد العميل', r.message + ' نُفّذ مرة واحدة بمفتاح منع التكرار، وسُجّل في سجل التدقيق.', { cls: 'ok' });
  bubble('app', r.message, 'من تطبيق البنك، بعد رمز التحقق');
  closeSheet();
  refreshState();
});
$('cancelBtn').addEventListener('click', async () => {
  const r = await actionCall('/api/cancel');
  row('إلغاء من العميل', r.message);
  bubble('app', r.message, 'من تطبيق البنك');
  closeSheet();
  refreshState();
});
$('otp').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('confirmBtn').click(); });

// ─── حالة البنك الوهمي ───
async function refreshState() {
  if (!S.id) return;
  const res = await fetch('/api/state?session_id=' + S.id);
  if (!res.ok) return;
  const st = await res.json();
  const cards = $('cards');
  cards.replaceChildren(...st.cards.map((c) => {
    const li = el('li', '', `${c.kind} ••••${c.last4} · `);
    li.appendChild(el('span', c.status === 'frozen' ? 'frozen' : '', c.status === 'frozen' ? 'موقوفة' : 'فعّالة'));
    return li;
  }));
  const tickets = $('tickets');
  tickets.replaceChildren(...(st.tickets.length ? st.tickets.map((t) => {
    const li = el('li', '', t.id + ' ');
    li.appendChild(el('small', '', t.summary));
    return li;
  }) : [el('li', 'empty', 'لا توجد تذاكر')]));
  const audit = $('audit');
  audit.replaceChildren(...(st.audit.length ? st.audit.slice().reverse().map((a) => {
    const li = el('li', '', `${a.time} · ${a.event} `);
    li.appendChild(el('small', '', a.detail));
    return li;
  }) : [el('li', 'empty', 'لا أحداث بعد')]));
}

// ─── البدء وإعادة العرض ───
async function start() {
  const r = await (await fetch('/api/session', { method: 'POST' })).json();
  S.id = r.session_id; S.otp = r.demo_otp; S.pending = null; S.steps = 0; S.tokens = 0;
  const mode = $('mode');
  mode.textContent = r.provider_label;
  mode.classList.toggle('sim', r.provider === 'scripted');
  mode.title = r.provider === 'scripted'
    ? 'محاكاة بدون إنترنت: المسار والأدوات حقيقية، لكن القرار من قواعد ثابتة تفهم أسئلة العرض وما يشبهها فقط.'
    : 'نموذج حقيقي · التعليمات ' + r.prompt_version;
  $('chat').replaceChildren();
  $('trace').replaceChildren(el('li', 'empty-state', 'اكتب سؤالاً أو اختر أحد أسئلة العرض بالأسفل، وشاهد كل خطوة هنا.'));
  $('stats').textContent = 'كل خطوة يأخذها الوكيل تظهر هنا لحظة حدوثها';
  bubble('bot', `أهلاً ${r.customer_name}، أنا سند، مساعدك الرقمي. أقدر أساعدك في عملياتك ورصيدك وبطاقاتك ورسوم الخدمات.`);
  refreshState();
}
$('reset').addEventListener('click', async () => {
  if (S.busy) return;
  await fetch('/api/reset', { method: 'POST' });
  $('sheet').hidden = true;
  start();
});
$('form').addEventListener('submit', (e) => { e.preventDefault(); send($('input').value); });

$('moments').replaceChildren(...MOMENTS.map((q, i) => {
  const b = el('button', 'moment');
  b.type = 'button';
  b.append(el('b', '', String(i + 1)), document.createTextNode(q));
  b.addEventListener('click', () => send(q));
  return b;
}));

// شعار بكسلي: درع
(function logo() {
  const rows = ['....oo....', '..oo..oo..', 'oo......oo', 'o........o', 'o...oo...o', 'o...oo...o', '.o......o.', '..o....o..', '...o..o...', '....oo....'];
  const c = $('logo'), px = 3, ctx = c.getContext('2d');
  c.width = c.height = 30;
  rows.forEach((r, y) => [...r].forEach((k, x) => { if (k !== '.') { ctx.fillStyle = '#ff6b1a'; ctx.fillRect(x * px, y * px, px, px); } }));
})();

start();
