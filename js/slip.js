/* Digital Special Order Slip — the page.
   Still the paper card, typed. What the Sheet added: everyone sees the same
   slips, the buyer half asks who you are before you write in it, a slip can
   be marked picked up or cancelled, a past slip can be ordered again, and
   every screen quietly keeps itself current with the Sheet.
   No pricing math. That stays out of this. */
(function(){
  const CFG = window.SLIP_CONFIG || {};
  const API = window.SlipAPI;

  /* Field list mirrors the printed card, top to bottom, and is also the
     column list in the Sheet — change both together. */
  const FIELDS = [
    { k:'member',   label:'Memb.',            sec:'front', w:'sm' },
    { k:'name',     label:'name:',            sec:'front' },
    { k:'phone',    label:'home/work phone:', sec:'front', w:'md' },
    { k:'date',     label:'date:',            sec:'front', w:'md', type:'date' },
    { k:'brand',    label:'brand name:',      sec:'front' },
    { k:'product',  label:'product:',         sec:'front' },
    { k:'size',     label:'size:',            sec:'front', w:'sm' },
    { k:'quantity', label:'quantity:',        sec:'front', w:'sm' },
    { k:'deposit',  label:'deposit:',         sec:'front', w:'sm' },
    { k:'initials', label:'your initials:',   sec:'front', w:'sm' },
    { k:'comments', label:'comments:',        sec:'front', area:true },
    { k:'vendor',   label:'vendor:',          sec:'buyer', w:'md' },
    { k:'catalog',  label:'catalog #:',       sec:'buyer', w:'md' },
    { k:'ordered',  label:'date ordered:',    sec:'buyer', w:'md', type:'date' },
    { k:'received', label:"date rcv'd:",      sec:'buyer', w:'md', type:'date' },
    { k:'notified', label:'when notified:',   sec:'buyer', w:'md', type:'date' },
    { k:'price',    label:'price:',           sec:'buyer', w:'md' },
    { k:'amtdue',   label:'amt. due:',        sec:'buyer', w:'md' }
  ];
  /* Lines that sat side by side on the printed card stay side by side here. */
  const GROUPS = [['phone','date'],['size','quantity','deposit'],['initials','comments'],
                  ['vendor','catalog'],['received','notified'],['price','amtdue']];
  /* Carried over when a buyer orders something again. Dates, prices and
     deposits are deliberately left blank — that's the point of a new slip. */
  const REORDER_KEEP = ['member','name','phone','brand','product','size','quantity','comments','vendor','catalog'];
  const LEDGER_COLS = [
    { k:'date', label:'Date' }, { k:'deposit', label:'Deposit' }, { k:'initial', label:'Initial' },
    { k:'price', label:'Price' }, { k:'amount', label:'Amount due' }
  ];
  const LEDGER_ROWS = 6;

  const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  /* A date box only understands YYYY-MM-DD; the Sheet sometimes hands back 11/3/2026. */
  const isoDate = v => {
    const t = String(v || '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0,10);
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
    return m ? `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}` : '';
  };
  const groupOf = k => GROUPS.find(g => g.includes(k));
  const bare = html => html.replace(/^<div class="ln">/,'').replace(/<\/div>$/,'');

  function blank(){
    const s = { id:'', ledger:[], pickedUp:false, cancelled:false };
    FIELDS.forEach(f => s[f.k] = '');
    s.date = today();
    for (let i=0;i<LEDGER_ROWS;i++) s.ledger.push({date:'',deposit:'',initial:'',price:'',amount:''});
    return s;
  }

  /* Status is read off the card, not chosen — same as glancing at a paper
     slip to see how far along it is. */
  function status(s){
    if (s.cancelled) return 'cancelled';
    if (s.pickedUp) return 'picked up';
    if (s.notified) return 'notified';
    if (s.received) return "rcv'd";
    if (s.ordered) return 'ordered';
    return 'not yet ordered';
  }
  /* Parse YYYY-MM-DD as a local date. Date.parse() treats it as UTC, which
     shows every date a day early in Ohio. */
  function parseD(d){
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d||'');
    return m ? new Date(+m[1], +m[2]-1, +m[3]) : null;
  }
  function daysSince(d){
    const x = parseD(d);
    if (!x) return 0;
    const t = new Date(); t.setHours(0,0,0,0);
    return Math.max(0, Math.round((t - x) / 86400000));
  }
  /* Tucked away, never deleted: picked up and gone cold, by the age the
     Sheet decides. */
  function archived(s, days){
    /* Cancelled is finished the moment it's ticked: out of the working list at
       once, still searchable in the Archive, and untick-able if it was a slip. */
    if (s.cancelled) return true;
    if (!s.pickedUp) return false;
    return daysSince(s.pickedUpAt || s.updated || s.created) >= (days || 90);
  }

  let st = {
    tab:'new', openId:null, q:'', statusF:'all', from:'', to:'', draft:blank(), note:'',
    slips:[], staff:[], archiveAfterDays:90,
    loading:true, gate:false, gateError:'', unlockBuyer:false,
    cap:2,            // what the deployed Google script can do (1 = no Cancel yet)
    stamp:'', syncedAt:null
  };
  const root = document.getElementById('slip-root');
  /* On the website the page-header and site chrome already say what this is,
     so the tool skips its own masthead and just shows the staff bar. */
  const EMBEDDED = root.dataset.embedded === '1';
  /* Saving: edits wait here, keyed by slip, until the Sheet confirms them.
     Nothing leaves this object on failure, so a dropped connection can never
     eat what someone typed. saveState drives the one status line. */
  let saveTimer = null, retryTimer = null, pending = {};
  let inflight = false, sendingId = null, saveId = null, saveState = '', warnedFail = false;
  let refreshing = false, needsRender = false, lastRefresh = 0;
  const recent = new Set();     // ids created here, until the Sheet lists them

  /* ── boot ─────────────────────────────────────────────────────────── */
  async function load(){
    st.loading = true; render();
    const r = await API.list();
    if (r && r.error === 'passcode'){ st.gate = true; st.loading = false; render(); return; }
    if (r && r.ok){
      st.slips = r.slips || [];
      st.staff = r.staff || [];
      st.archiveAfterDays = r.archiveAfterDays || 90;
      st.cap = API.standalone ? 2 : (r.version || 1);
      st.stamp = r.stamp || '';
      st.syncedAt = new Date();
      st.gate = false;
    }
    st.loading = false; render();
  }

  /* ── staying current ──────────────────────────────────────────────── */
  const typing = () => {
    const a = document.activeElement;
    return !!(a && root.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'checkbox');
  };
  const clock = d => d ? d.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' }) : '';
  function paintSynced(){
    const el = root.querySelector('#syncedAt');
    if (el) el.textContent = st.syncedAt ? `Up to date as of ${clock(st.syncedAt)}` : '';
  }
  /* Asks the Sheet a one-line question first ("has anything changed?") and only
     fetches the whole list when the answer is yes, so leaving the page open all
     day costs almost nothing. Anything with unsent edits is never overwritten. */
  async function refresh(manual){
    if (refreshing || st.loading || st.gate || API.standalone) return;
    if (!manual && Date.now() - lastRefresh < 5000) return;
    if (needsRender && !typing()){ needsRender = false; render(); }
    refreshing = true; lastRefresh = Date.now();
    try {
      if (!manual){
        const q = await API.call('stamp');
        if (!q || (!q.ok && q.error === 'offline')) return;
        if (q.ok && q.stamp !== undefined && q.stamp === st.stamp){ st.syncedAt = new Date(); paintSynced(); return; }
      }
      const r = await API.list();
      if (!(r && r.ok)){ if (manual) toast('Could not refresh \u2014 check your connection', true); return; }
      const local = new Map(st.slips.map(x => [x.id, x]));
      const keep = id => local.has(id) && (pending[id] || sendingId === id);
      const merged = (r.slips || []).map(x => keep(x.id) ? local.get(x.id) : x);
      const have = new Set(merged.map(x => x.id));
      st.slips.forEach(x => { if (recent.has(x.id) && !have.has(x.id)) merged.push(x); else if (have.has(x.id)) recent.delete(x.id); });
      const changed = JSON.stringify(merged) !== JSON.stringify(st.slips) ||
                      JSON.stringify(r.staff || []) !== JSON.stringify(st.staff);
      st.slips = merged; st.staff = r.staff || st.staff;
      st.archiveAfterDays = r.archiveAfterDays || st.archiveAfterDays;
      st.cap = r.version || 1; st.stamp = r.stamp || '';
      st.syncedAt = new Date();
      if (changed){ if (typing()) needsRender = true; else render(); }
      else paintSynced();
      if (manual) toast('\u2713 Up to date');
    } finally { refreshing = false; }
  }
  API.onStateChange(() => render());

  /* ── the slip ─────────────────────────────────────────────────────── */
  function fieldHTML(f, v, locked){
    const dis = locked ? ' disabled' : '';
    if (f.area) return `<div class="ln"><label for="f_${f.k}">${esc(f.label)}</label><div class="fill"><textarea id="f_${f.k}" data-f="${f.k}" rows="2"${dis}>${esc(v)}</textarea></div></div>`;
    return `<div class="ln"><label for="f_${f.k}">${esc(f.label)}</label><div class="fill ${f.w||''}"><input id="f_${f.k}" data-f="${f.k}" type="${f.type||'text'}" value="${esc(v)}" autocomplete="off"${dis} /></div></div>`;
  }
  function sectionHTML(s, sec, locked){
    const out = [], done = new Set();
    FIELDS.filter(f => f.sec===sec && f.k!=='member').forEach(f => {
      if (done.has(f.k)) return;
      const g = groupOf(f.k);
      if (g && g[0]===f.k){
        g.forEach(k => done.add(k));
        out.push(`<div class="ln">${g.map(k => bare(fieldHTML(FIELDS.find(x=>x.k===k), s[k], locked))).join('')}</div>`);
      } else {
        done.add(f.k);
        out.push(fieldHTML(f, s[f.k], locked));
      }
    });
    return out.join('');
  }

  function buyerLockHTML(){
    if (API.who || API.standalone) return '';
    const opts = st.staff.length
      ? st.staff.map(p => `<option value="${esc(p.name)}">${esc(p.name)}${p.role==='buyer'?' (buyer)':''}</option>`).join('')
      : '';
    return `<div class="lockbar">
      <span>This half is for the buyer. Pick your name to fill it in &mdash; it records who entered what.</span>
      ${st.staff.length
        ? `<select id="whoPick"><option value="">Who are you?</option>${opts}</select>`
        : `<span class="warn-t">No staff list found in the Sheet yet &mdash; add names on the Staff tab.</span>`}
    </div>`;
  }

  /* Every slip in the same chain of "start a new slip from this one", oldest
     first: the record of what a repeat order looked like each time. */
  /* The Sheet turns "0066" into 66 in the re-ordered-from column, so compare
     slip numbers by value, not by how they happen to be written. */
  const nid = v => { const n = parseInt(String(v == null ? '' : v).replace(/\D/g,''), 10); return isNaN(n) ? '' : ('000' + n).slice(-4); };
  function familyOf(s){
    const byId = new Map(st.slips.map(x => [nid(x.id), x]));
    let root = s, seen = new Set([nid(s.id)]);
    while (nid(root.reorderOf) && byId.has(nid(root.reorderOf)) && !seen.has(nid(root.reorderOf))){
      root = byId.get(nid(root.reorderOf)); seen.add(nid(root.id));
    }
    const out = [], queue = [root], got = new Set();
    while (queue.length){
      const cur = queue.shift();
      if (got.has(cur.id)) continue;
      got.add(cur.id); out.push(cur);
      st.slips.filter(x => nid(x.reorderOf) === nid(cur.id)).forEach(x => queue.push(x));
    }
    return out.sort((a,b) => (a.date||a.created||'').localeCompare(b.date||b.created||'') || a.id.localeCompare(b.id));
  }
  function historyHTML(s){
    const fam = familyOf(s);
    if (fam.length < 2) return '';
    return `<div class="history">
      <h3>History of this order</h3>
      <p class="hint">Every time this was ordered, oldest first. Open one to see exactly what was written then.</p>
      <table class="hist"><thead><tr><th>Slip</th><th>Date</th><th>Product</th><th>Qty</th><th>Price</th><th>Amt. due</th><th>Status</th></tr></thead><tbody>
      ${fam.map(x => `<tr class="${x.id===s.id?'here':''}">
        <td>${x.id===s.id ? `#${esc(x.id)} <span class="qt">(this slip)</span>` : `<button class="linkbtn" data-open="${esc(x.id)}">#${esc(x.id)}</button>`}</td>
        <td>${esc(shortDate(x.date)||'\u2014')}</td><td>${esc([x.brand,x.product].filter(Boolean).join(' ')||'\u2014')}${x.size?` <span class="qt">${esc(x.size)}</span>`:''}</td>
        <td>${esc(x.quantity||'\u2014')}</td><td>${esc(x.price||'\u2014')}</td><td>${esc(x.amtdue||'\u2014')}</td><td>${esc(status(x))}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
  }

  function slipHTML(s, isNew){
    const lockBuyer = !API.who && !API.standalone;
    const off = API.state === 'offline';
    return `
    <div class="slip">
      <div class="memb"><label for="f_member">Memb.</label><div style="width:120px"><input id="f_member" data-f="member" type="text" value="${esc(s.member)}" autocomplete="off" /></div></div>
      ${sectionHTML(s,'front',false)}
      <div class="buyerbar">Below for buyer use only</div>
      ${buyerLockHTML()}
      <div class="${lockBuyer?'locked':''}">${sectionHTML(s,'buyer',lockBuyer)}</div>
      ${isNew ? '' : `
      <div class="pickrow">
        <span class="endopt">
          <label><input type="checkbox" data-pick="1" ${s.pickedUp?'checked':''} /> Picked up</label>
          ${s.pickedUp ? `<label class="on-date">on <input type="date" data-flagdate="pickedUp" value="${esc(isoDate(s.pickedUpAt))}" max="${today()}" aria-label="Date picked up" /></label>` : ''}
        </span>
        <span class="endopt">
          <label><input type="checkbox" data-cancel="1" ${s.cancelled?'checked':''}${st.cap<2?' disabled':''} /> Cancelled</label>
          ${s.cancelled ? `<label class="on-date">on <input type="date" data-flagdate="cancelled" value="${esc(isoDate(s.cancelledAt))}" max="${today()}" aria-label="Date cancelled" /></label>` : ''}
        </span>
        <span class="qt hint">${s.pickedUp||s.cancelled ? 'The date starts as today. If it happened earlier, change it here \u2014 it saves by itself.' : (st.cap<2 ? 'Cancel needs the updated Google script (see the setup guide).' : 'Cancelled slips leave the working list and move to the Archive.')}</span>
      </div>`}
      <div class="back">
        <h3>Back of card</h3>
        <p class="hint">The running record on the reverse, for repeat orders and part payments.</p>
        <table class="led"><thead><tr>${LEDGER_COLS.map(c=>`<th>${esc(c.label)}</th>`).join('')}</tr></thead>
        <tbody>${(s.ledger||[]).map((r,i)=>`<tr>${LEDGER_COLS.map(c=>`<td><input data-l="${i}" data-lk="${c.k}" type="text" value="${esc(r[c.k]||'')}" autocomplete="off" aria-label="${esc(c.label)} row ${i+1}" /></td>`).join('')}</tr>`).join('')}</tbody></table>
      </div>
      ${isNew ? '' : historyHTML(s)}
      ${isNew || !s.updated ? '' : `<p class="stamp">Last change ${esc(s.updated)}${s.updatedBy?` by ${esc(s.updatedBy)}`:''}${s.createdBy?` &middot; taken by ${esc(s.createdBy)}`:''}${s.reorderOf?` &middot; re-ordered from #${esc(nid(s.reorderOf))}`:''}</p>`}
    </div>
    <div class="bar">
      ${isNew
        ? `<button class="btn" data-act="create"${off?' disabled':''}>Save slip</button><button class="btn ghost" data-act="clear">Clear</button>`
        : `<button class="btn ghost" data-act="reorder" title="Copies the customer and product onto a fresh slip. This slip stays as it is.">Start a new slip from this one</button>
           <button class="btn ghost" data-act="print">Print</button>
           <span class="saved ${saveClass(s.id)}" id="saveStatus">${esc(statusText(s.id))}</span>
           <button class="btn sm" data-act="retrySave" ${saveShown(s.id)==='failed'?'':'hidden'}>Try saving again</button>`}
      ${st.note ? `<span class="saved">${esc(st.note)}</span>` : ''}
    </div>`;
  }

  /* ── lists ────────────────────────────────────────────────────────── */
  /* When something last happened on this slip — the buyer's "has anyone
     touched it since I looked?" column. */
  const lastAt = s => (s.updated || s.created || s.date || '').slice(0,10);
  const shortDate = d => {
    const x = parseD(d);
    return x ? `${x.getMonth()+1}/${x.getDate()}/${String(x.getFullYear()).slice(2)}` : '';
  };
  const STATUSES = ['not yet ordered','ordered',"rcv'd",'notified','picked up','cancelled'];

  function ageHTML(s){
    if (s.pickedUp || s.received) return `<span class="sub">${esc(shortDate(lastAt(s))||'—')}</span>`;
    const n = daysSince(s.date || s.created);
    const late = !s.ordered && n >= 7;
    return `<span class="sub ${late?'late':''}">${n<=0?'today':n===1?'1 day':n+' days'}${s.ordered?' old':' waiting'}</span>`;
  }
  function rowsHTML(list){
    if (!list.length) return `<div class="empty">${(st.q||st.statusF!=='all'||st.from||st.to) ? 'No slips match that.' : 'Nothing here yet.'}</div>`;
    return `<div class="rows">${list.map(s=>`
      <button class="row" data-open="${esc(s.id)}">
        <span><span class="who">${esc(s.name||'(no name)')}</span><span class="meta">${esc(s.phone||'no phone')} &middot; #${esc(s.id)}</span></span>
        <span><span class="what">${esc(s.product||'(no product)')}</span><span class="sub">${[s.brand,s.size,s.quantity&&('qty '+s.quantity)].filter(Boolean).map(esc).join(' &middot; ')||'&mdash;'}</span></span>
        <span class="when"><span class="d">${esc(shortDate(s.date)||'—')}</span>${ageHTML(s)}</span>
        <span class="stat ${status(s)==='not yet ordered'?'todo':status(s)==='cancelled'?'cancelled':''}">${esc(status(s))}</span>
      </button>`).join('')}</div>`;
  }
  function filtered(inArchive){
    const q = st.q.toLowerCase();
    const inRange = s => {
      const d = (s.date || '').slice(0,10);
      if (st.from && (!d || d < st.from)) return false;
      if (st.to && (!d || d > st.to)) return false;
      return true;
    };
    const list = st.slips
      .filter(s => archived(s, st.archiveAfterDays) === inArchive)
      .filter(s => st.statusF === 'all' || status(s) === st.statusF)
      .filter(inRange)
      .filter(s => !q || [s.name,s.phone,s.product,s.brand,s.vendor,s.catalog,s.id].join(' ').toLowerCase().includes(q));
    /* Waiting to be placed sorts oldest first — that's the work queue.
       Everything else sorts by whatever happened most recently. */
    return st.statusF === 'not yet ordered'
      ? list.sort((a,b) => (a.date||'').localeCompare(b.date||''))
      : list.sort((a,b) => lastAt(b).localeCompare(lastAt(a)));
  }
  function filterHTML(inArchive){
    const pool = st.slips.filter(s => archived(s, st.archiveAfterDays) === inArchive);
    const count = v => v==='all' ? pool.length : pool.filter(s => status(s)===v).length;
    const chip = (v,label) => `<button class="chip ${st.statusF===v?'on':''}" data-status="${esc(v)}">${esc(label)}<span class="n">${count(v)}</span></button>`;
    return `<div class="filters">
      <div class="chips">${chip('all','All')}${chip('not yet ordered','Needs ordering')}${chip('ordered','Ordered')}${chip("rcv'd","Received")}${chip('notified','Notified')}${chip('picked up','Picked up')}${inArchive?chip('cancelled','Cancelled'):''}</div>
      <div class="ranges">
        <label>Taken between<input id="from" type="date" value="${esc(st.from)}" /></label>
        <label>and<input id="to" type="date" value="${esc(st.to)}" /></label>
        ${(st.from||st.to||st.statusF!=='all')?`<button class="btn ghost sm" data-act="clearFilters">Clear</button>`:''}
      </div>
    </div>`;
  }
  function listHTML(inArchive){
    return `
    <div class="searchrow">
      <div class="f"><label for="q">${inArchive?'Search the archive':'Find a slip'}</label><input id="q" type="text" value="${esc(st.q)}" placeholder="name, phone, product, vendor, slip #" autocomplete="off" /></div>
      ${inArchive?'':`<button class="btn" data-act="goNew">New slip</button>`}
    </div>
    ${filterHTML(inArchive)}
    ${inArchive ? `<p class="note" style="margin-top:0">Picked up more than ${st.archiveAfterDays} days ago, or cancelled. Nothing is ever deleted &mdash; open any slip to order it again.</p>` : ''}
    ${rowsHTML(filtered(inArchive))}
    ${API.standalone && !inArchive ? `<p class="note">Running on its own: slips save in this browser only. Once the Sheet is connected, everyone sees the same list.</p>` : ''}`;
  }

  /* ── chrome ───────────────────────────────────────────────────────── */
  function bannerHTML(){
    if (API.state === 'offline'){
      return `<div class="banner bad"><b>No connection &mdash; nothing is saving.</b> Write this order on a paper slip and enter it when the internet is back. <button class="btn ghost sm" data-act="retry">Try again</button></div>`;
    }
    return '';
  }
  function gateHTML(){
    return `<div class="gate">
      <h2>Staff passcode</h2>
      <p>Ask a manager if you don't have it. This computer will remember it.</p>
      <div class="gaterow">
        <input id="pass" type="password" autocomplete="current-password" placeholder="Passcode" />
        <button class="btn" data-act="unlock">Open the slips</button>
      </div>
      ${st.gateError?`<p class="warn-t">${esc(st.gateError)}</p>`:''}
    </div>`;
  }

  function render(){
    const open = st.openId ? st.slips.find(s => s.id === st.openId) : null;
    const activeCount = st.slips.filter(s => !archived(s, st.archiveAfterDays)).length;
    const archCount = st.slips.length - activeCount;
    const body = st.gate ? gateHTML()
      : st.loading ? `<div class="empty">Loading slips&hellip;</div>`
      : open ? `<button class="backlink" data-act="back">&larr; All slips</button>${slipHTML(open,false)}`
      : st.tab==='new' ? slipHTML(st.draft,true)
      : st.tab==='archive' ? listHTML(true)
      : listHTML(false);

    const whoBox = (!st.gate && !API.standalone && st.staff.length) ? `<div class="whobox">
        <label for="whoSel">You are</label>
        <select id="whoSel"><option value="">not signed in</option>${st.staff.map(p=>`<option value="${esc(p.name)}" ${API.who===p.name?'selected':''}>${esc(p.name)}</option>`).join('')}</select>
      </div>` : '';

    root.innerHTML = `
    <div class="wrap">
      ${EMBEDDED
        ? (whoBox ? `<div class="slip-toolbar"><span></span>${whoBox}</div>` : '')
        : `<div class="mast">
        <div>
          <h1>Special Order Slip</h1>
          <p>${esc(CFG.storeName||'')} &mdash; the paper card, typed instead of written, so the counter, the buyer, and receiving are all looking at the same one.</p>
        </div>
        ${whoBox}
      </div>`}
      ${bannerHTML()}
      ${st.gate ? '' : `<div class="tabs">
        <button class="tab ${st.tab==='new'&&!open?'on':''}" data-tab="new">New slip</button>
        <button class="tab ${(st.tab==='list'||open)?'on':''}" data-tab="list">All slips<span class="n">${activeCount}</span></button>
        ${archCount?`<button class="tab ${st.tab==='archive'?'on':''}" data-tab="archive">Archive<span class="n">${archCount}</span></button>`:''}
        ${API.standalone ? '' : `<span class="sync"><span id="syncedAt">${st.syncedAt ? `Up to date as of ${clock(st.syncedAt)}` : ''}</span><button class="btn ghost sm" data-act="refresh">Refresh</button></span>`}
      </div>`}
      ${body}
    </div>`;
  }

  /* ── saving ───────────────────────────────────────────────────────── */
  let toastTimer = null;
  function toast(msg, bad){
    let t = document.querySelector('.slip-toast');
    if (!t){ t = document.createElement('div'); t.className = 'slip-toast'; t.setAttribute('role','status'); t.setAttribute('aria-live','polite'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.toggle('bad', !!bad);
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), bad ? 6000 : 2600);
  }

  /* What the status line says. It only ever describes the slip on screen, and
     only ever one thing: saving, saved, or NOT saved. */
  function saveShown(id){
    if (API.state === 'offline') return 'failed';
    return (saveId === id) ? saveState : '';
  }
  function statusText(id){
    switch (saveShown(id)){
      case 'dirty': case 'saving': return `Slip #${id} \u00b7 saving\u2026`;
      case 'saved':  return `Slip #${id} \u00b7 \u2713 all changes saved`;
      case 'failed': return `Slip #${id} \u00b7 NOT saved yet \u2014 keeping your changes and trying again`;
      default:       return `Slip #${id} \u00b7 saved \u2014 changes save as you type`;
    }
  }
  const saveClass = id => ({ saved:'ok', failed:'bad' }[saveShown(id)] || '');
  function paintStatus(){
    const el = root.querySelector('#saveStatus');
    if (!el || !st.openId) return;
    el.textContent = statusText(st.openId);
    el.className = 'saved ' + saveClass(st.openId);
    const rb = root.querySelector('[data-act="retrySave"]');
    if (rb) rb.hidden = saveShown(st.openId) !== 'failed';
  }

  function queueSave(id, changes){
    pending[id] = Object.assign(pending[id] || {}, changes);
    saveId = id; saveState = 'dirty'; paintStatus();
    clearTimeout(saveTimer); clearTimeout(retryTimer);
    saveTimer = setTimeout(flush, 700);
  }

  /* One request at a time. Whatever is typed while a request is out simply
     waits its turn, so "saved" can never be shown while edits are still unsent. */
  async function flush(){
    clearTimeout(retryTimer);
    if (inflight) return;
    const ids = Object.keys(pending);
    if (!ids.length) return;
    inflight = true; saveState = 'saving'; saveId = ids[0]; paintStatus();
    let failed = false, passcode = false;
    for (const id of ids){
      const changes = pending[id]; delete pending[id];
      sendingId = id; saveId = id;
      const r = await API.update(id, changes);
      sendingId = null;
      if (!(r && r.ok)){
        pending[id] = Object.assign({}, changes, pending[id] || {});   // newer typing wins
        failed = true; passcode = !!(r && r.error === 'passcode'); break;
      }
    }
    inflight = false;
    if (failed){
      saveState = 'failed'; paintStatus();
      if (passcode){ st.gate = true; render(); return; }
      if (!warnedFail){ warnedFail = true; toast(`Slip #${saveId} has NOT saved \u2014 your changes are kept and it will keep trying`, true); }
      retryTimer = setTimeout(flush, 6000);
      return;
    }
    if (Object.keys(pending).length){ flush(); return; }
    saveState = 'saved'; warnedFail = false; paintStatus();
    toast(`\u2713 Slip #${saveId} saved`);
  }

  /* ── events ───────────────────────────────────────────────────────── */
  root.addEventListener('click', async e => {
    const t = e.target;
    const tab = t.closest('[data-tab]');
    if (tab){ st.tab = tab.dataset.tab; st.openId = null; st.note=''; st.q=''; st.statusF='all'; st.from=''; st.to=''; render(); return; }
    const chip = t.closest('[data-status]');
    if (chip){ st.statusF = chip.dataset.status; render(); return; }
    const open = t.closest('[data-open]');
    if (open){ st.openId = open.dataset.open; st.note=''; render(); window.scrollTo(0,0); return; }
    const act = t.closest('[data-act]');
    if (!act) return;
    const a = act.dataset.act;

    if (a==='goNew'){ st.tab='new'; st.openId=null; render(); return; }
    if (a==='back'){ st.openId=null; st.tab='list'; st.note=''; render(); return; }
    if (a==='clear'){ st.draft = blank(); st.note=''; render(); return; }
    if (a==='clearFilters'){ st.statusF='all'; st.from=''; st.to=''; render(); return; }
    if (a==='print'){ window.print(); return; }
    if (a==='retry'){ st.note=''; await load(); return; }
    if (a==='retrySave'){ flush(); return; }
    if (a==='refresh'){ await refresh(true); return; }
    if (a==='unlock'){
      const code = (document.getElementById('pass')||{}).value || '';
      st.gateError = '';
      const good = await API.checkPasscode(code);
      if (good){ st.gate = false; await load(); }
      else { st.gateError = "That passcode didn't work."; render(); }
      return;
    }
    if (a==='create'){
      const d = st.draft;
      if (!d.name.trim() && !d.product.trim()){ st.note = 'Add at least a name or a product first.'; render(); return; }
      const r = await API.create(d);
      if (!r || !r.ok){ st.note = 'Could not save — check the warning above.'; render(); toast('Slip did not save \u2014 check the warning above', true); return; }
      st.slips.unshift(r.slip || d);
      st.openId = (r.slip || d).id;
      recent.add(st.openId);
      saveId = st.openId; saveState = 'saved';
      st.draft = blank();
      st.note = 'This slip is saved. It now saves by itself as you edit \u2014 there is no Save button to press again.';
      render(); window.scrollTo(0,0); toast(`\u2713 Slip #${st.openId} saved`); return;
    }
    if (a==='reorder'){
      const s = st.slips.find(x => x.id === st.openId);
      if (!s) return;
      const d = blank();
      REORDER_KEEP.forEach(k => d[k] = s[k] || '');
      d.date = today();
      d.reorderOf = s.id;
      st.draft = d; st.openId = null; st.tab = 'new';
      st.note = `Started from slip #${s.id}. Check it over, then save.`;
      render(); window.scrollTo(0,0); return;
    }
  });

  root.addEventListener('change', async e => {
    const el = e.target;
    if (el.id === 'from' || el.id === 'to'){ st[el.id] = el.value; render(); return; }
    if (el.id === 'whoSel' || el.id === 'whoPick'){
      API.who = el.value; render(); return;
    }
    /* Changing the date a slip was picked up (or cancelled) after the box was ticked. */
    if (el.dataset.flagdate){
      const s = st.slips.find(x => x.id === st.openId);
      if (!s) return;
      const at = el.dataset.flagdate + 'At';
      s[at] = el.value;
      queueSave(s.id, { [at]: el.value });
      return;
    }
    /* Picked up and Cancelled are the two ways a slip ends, so ticking one
       unticks the other. Shown at once, put back if the Sheet says no. */
    if (el.dataset.pick || el.dataset.cancel){
      const s = st.slips.find(x => x.id === st.openId);
      if (!s) return;
      const key = el.dataset.pick ? 'pickedUp' : 'cancelled', other = key === 'pickedUp' ? 'cancelled' : 'pickedUp';
      const FLAGS = ['pickedUp','pickedUpAt','cancelled','cancelledAt'];
      const prev = {}; FLAGS.forEach(k => prev[k] = s[k]);
      const changes = { [key]: el.checked };
      s[key] = el.checked;
      s[key+'At'] = el.checked ? (s[key+'At'] || today()) : '';
      if (el.checked) changes[key+'At'] = s[key+'At'];   // the date on this computer's clock, which the date box then lets you change
      if (el.checked && s[other]){ s[other] = false; s[other+'At'] = ''; changes[other] = false; }
      render();
      const r = await API.update(s.id, changes);
      if (r && r.ok){
        if (r.slip) FLAGS.concat(['updated','updatedBy']).forEach(k => s[k] = r.slip[k]);   // not the text fields: they may have unsent edits
      } else {
        FLAGS.forEach(k => s[k] = prev[k]);
        toast(`Could not save that — slip #${s.id} is unchanged. Check your connection and try again.`, true);
      }
      render(); return;
    }
  });

  root.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'q'){
      st.q = el.value;
      const p = el.selectionStart; render();
      const n = document.getElementById('q'); if (n){ n.focus(); n.setSelectionRange(p,p); }
      return;
    }
    const isOpen = !!st.openId;
    const target = isOpen ? st.slips.find(s => s.id === st.openId) : st.draft;
    if (!target) return;
    let changes = null;
    if (el.dataset.f){ target[el.dataset.f] = el.value; changes = { [el.dataset.f]: el.value }; }
    else if (el.dataset.l !== undefined){
      target.ledger[+el.dataset.l][el.dataset.lk] = el.value;
      changes = { ledger: target.ledger };
    }
    if (isOpen && changes) queueSave(target.id, changes);
  });

  /* Re-render that was held back while someone was typing happens as soon as
     they leave the field. */
  root.addEventListener('focusout', () => setTimeout(() => {
    if (needsRender && !typing()){ needsRender = false; render(); }
  }, 0));

  /* Keep every computer looking at the same Sheet, and never lose an unsent edit. */
  setInterval(() => { if (!document.hidden) refresh(); }, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('focus', () => refresh());
  window.addEventListener('online', () => flush());
  window.addEventListener('beforeunload', e => {
    if (inflight || Object.keys(pending).length){ e.preventDefault(); e.returnValue = ''; }
  });

  load();
})();
