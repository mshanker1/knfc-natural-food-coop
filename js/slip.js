/* Digital Special Order Slip — the page.
   Still the paper card, typed. What the Sheet added: everyone sees the same
   slips, the buyer half asks who you are before you write in it, a slip can
   be marked picked up, and a past slip can be ordered again.
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
    { k:'ordered',  label:'date(s) ordered:', sec:'buyer' },
    { k:'received', label:"date rcv'd:",      sec:'buyer', w:'md', type:'date' },
    { k:'notified', label:'when notified:',   sec:'buyer', w:'md' },
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
  const today = () => new Date().toISOString().slice(0,10);
  const groupOf = k => GROUPS.find(g => g.includes(k));
  const bare = html => html.replace(/^<div class="ln">/,'').replace(/<\/div>$/,'');

  function blank(){
    const s = { id:'', ledger:[], pickedUp:false };
    FIELDS.forEach(f => s[f.k] = '');
    s.date = today();
    for (let i=0;i<LEDGER_ROWS;i++) s.ledger.push({date:'',deposit:'',initial:'',price:'',amount:''});
    return s;
  }

  /* Status is read off the card, not chosen — same as glancing at a paper
     slip to see how far along it is. */
  function status(s){
    if (s.pickedUp) return 'picked up';
    if (s.received) return "rcv'd";
    if (s.ordered) return 'ordered';
    return 'not yet ordered';
  }
  function daysSince(d){
    const t = Date.parse(d);
    return isNaN(t) ? 0 : Math.floor((Date.now() - t) / 86400000);
  }
  /* Tucked away, never deleted: picked up and gone cold, by the age the
     Sheet decides. */
  function archived(s, days){
    if (!s.pickedUp) return false;
    return daysSince(s.pickedUpAt || s.updated || s.created) >= (days || 90);
  }

  let st = {
    tab:'new', openId:null, q:'', draft:blank(), note:'',
    slips:[], staff:[], archiveAfterDays:90,
    loading:true, gate:false, gateError:'', unlockBuyer:false, saving:''
  };
  const root = document.getElementById('slip-root');
  /* On the website the page-header and site chrome already say what this is,
     so the tool skips its own masthead and just shows the staff bar. */
  const EMBEDDED = root.dataset.embedded === '1';
  let saveTimer = null, pending = {};

  /* ── boot ─────────────────────────────────────────────────────────── */
  async function load(){
    st.loading = true; render();
    const r = await API.list();
    if (r && r.error === 'passcode'){ st.gate = true; st.loading = false; render(); return; }
    if (r && r.ok){
      st.slips = r.slips || [];
      st.staff = r.staff || [];
      st.archiveAfterDays = r.archiveAfterDays || 90;
      st.gate = false;
    }
    st.loading = false; render();
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
        <label><input type="checkbox" data-pick="1" ${s.pickedUp?'checked':''} /> Picked up${s.pickedUpAt?` <span class="qt">on ${esc(s.pickedUpAt)}</span>`:''}</label>
      </div>`}
      <div class="back">
        <h3>Back of card</h3>
        <p class="hint">The running record on the reverse, for repeat orders and part payments.</p>
        <table class="led"><thead><tr>${LEDGER_COLS.map(c=>`<th>${esc(c.label)}</th>`).join('')}</tr></thead>
        <tbody>${(s.ledger||[]).map((r,i)=>`<tr>${LEDGER_COLS.map(c=>`<td><input data-l="${i}" data-lk="${c.k}" type="text" value="${esc(r[c.k]||'')}" autocomplete="off" aria-label="${esc(c.label)} row ${i+1}" /></td>`).join('')}</tr>`).join('')}</tbody></table>
      </div>
      ${isNew || !s.updated ? '' : `<p class="stamp">Last change ${esc(s.updated)}${s.updatedBy?` by ${esc(s.updatedBy)}`:''}${s.createdBy?` &middot; taken by ${esc(s.createdBy)}`:''}${s.reorderOf?` &middot; re-ordered from #${esc(s.reorderOf)}`:''}</p>`}
    </div>
    <div class="bar">
      ${isNew
        ? `<button class="btn" data-act="create"${off?' disabled':''}>Save slip</button><button class="btn ghost" data-act="clear">Clear</button>`
        : `<button class="btn ghost" data-act="reorder">Order this again</button>
           <button class="btn ghost" data-act="print">Print</button>
           <span class="saved">Slip #${esc(s.id)} &middot; ${off ? 'not saving \u2014 see the warning above' : st.saving || 'saves as you type'}</span>`}
      ${st.note ? `<span class="saved">${esc(st.note)}</span>` : ''}
    </div>`;
  }

  /* ── lists ────────────────────────────────────────────────────────── */
  function rowsHTML(list){
    if (!list.length) return `<div class="empty">${st.q ? 'No slips match that.' : 'Nothing here yet.'}</div>`;
    return `<div class="rows">${list.map(s=>`
      <button class="row" data-open="${esc(s.id)}">
        <span><span class="who">${esc(s.name||'(no name)')}</span><span class="meta">${esc(s.phone||'no phone')} &middot; #${esc(s.id)}</span></span>
        <span><span class="what">${esc(s.product||'(no product)')}</span><span class="sub">${[s.brand,s.size,s.quantity&&('qty '+s.quantity)].filter(Boolean).map(esc).join(' &middot; ')||'&mdash;'}</span></span>
        <span class="stat">${esc(status(s))}</span>
      </button>`).join('')}</div>`;
  }
  function filtered(inArchive){
    const q = st.q.toLowerCase();
    return st.slips
      .filter(s => archived(s, st.archiveAfterDays) === inArchive)
      .filter(s => !q || [s.name,s.phone,s.product,s.brand,s.vendor,s.catalog,s.id].join(' ').toLowerCase().includes(q));
  }
  function listHTML(inArchive){
    return `
    <div class="searchrow">
      <div class="f"><label for="q">${inArchive?'Search the archive':'Find a slip'}</label><input id="q" type="text" value="${esc(st.q)}" placeholder="name, phone, product, vendor, slip #" autocomplete="off" /></div>
      ${inArchive?'':`<button class="btn" data-act="goNew">New slip</button>`}
    </div>
    ${inArchive ? `<p class="note" style="margin-top:0">Picked up more than ${st.archiveAfterDays} days ago. Nothing is ever deleted &mdash; open any slip to order it again.</p>` : ''}
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
      </div>`}
      ${body}
    </div>`;
  }

  /* ── saving ───────────────────────────────────────────────────────── */
  function queueSave(id, changes){
    Object.assign(pending, changes);
    st.saving = 'saving\u2026';
    const bar = root.querySelector('.bar .saved');
    if (bar) bar.textContent = `Slip #${id} \u00b7 saving\u2026`;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const changes = pending; pending = {};
      const r = await API.update(id, changes);
      if (r && r.ok){
        st.saving = 'saved';
        const s = st.slips.find(x => x.id === id);
        if (s) Object.assign(s, changes);
      } else {
        st.saving = '';
      }
      const b = root.querySelector('.bar .saved');
      if (b && API.state !== 'offline') b.textContent = `Slip #${id} \u00b7 ${st.saving || 'not saved'}`;
      if (API.state === 'offline') render();
    }, 700);
  }

  /* ── events ───────────────────────────────────────────────────────── */
  root.addEventListener('click', async e => {
    const t = e.target;
    const tab = t.closest('[data-tab]');
    if (tab){ st.tab = tab.dataset.tab; st.openId = null; st.note=''; st.q=''; render(); return; }
    const open = t.closest('[data-open]');
    if (open){ st.openId = open.dataset.open; st.note=''; render(); window.scrollTo(0,0); return; }
    const act = t.closest('[data-act]');
    if (!act) return;
    const a = act.dataset.act;

    if (a==='goNew'){ st.tab='new'; st.openId=null; render(); return; }
    if (a==='back'){ st.openId=null; st.tab='list'; st.note=''; render(); return; }
    if (a==='clear'){ st.draft = blank(); st.note=''; render(); return; }
    if (a==='print'){ window.print(); return; }
    if (a==='retry'){ st.note=''; await load(); return; }
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
      if (!r || !r.ok){ st.note = 'Could not save — check the warning above.'; render(); return; }
      st.slips.unshift(r.slip || d);
      st.openId = (r.slip || d).id;
      st.draft = blank(); st.note = 'Saved.';
      render(); window.scrollTo(0,0); return;
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
    if (el.id === 'whoSel' || el.id === 'whoPick'){
      API.who = el.value; render(); return;
    }
    if (el.dataset.pick){
      const s = st.slips.find(x => x.id === st.openId);
      if (!s) return;
      s.pickedUp = el.checked;
      if (el.checked && !s.pickedUpAt) s.pickedUpAt = today();
      const r = await API.update(s.id, { pickedUp: el.checked });
      if (r && r.ok && r.slip) Object.assign(s, r.slip);
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

  load();
})();
