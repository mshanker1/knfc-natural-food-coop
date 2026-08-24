/* KNFC Special Orders — UI
   Vanilla JS, no framework (matches the site's CLAUDE.md constraint).
   All data access goes through SO_DATA; all math through SO_PRICING. */
(function () {
  const D = window.SO_DATA, P = window.SO_PRICING;
  const app = document.getElementById('app');
  const tabsEl = document.getElementById('tabs');

  const STATUS_LABEL = { requested:'Requested', ordered:'Ordered', received:'Received', notified:'Notified', pickedup:'Picked up' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => n == null ? '—' : '$' + Number(n).toFixed(2);
  const fdate = s => !s ? '' : new Date(s + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const today = () => new Date().toISOString().slice(0,10);

  let view = { tab:'intake', openId:null, draft:null, pickupQuery:'', search:'' };

  /* ── tabs ─────────────────────────────────────────── */
  const TABS = [
    { id:'intake',   label:'Take an order' },
    { id:'buyer',    label:'Buyer queue',  count:()=>D.byStatus('requested').length + D.byStatus('ordered').length },
    { id:'receive',  label:'Receiving',    count:()=>D.byStatus('ordered').length },
    { id:'pickup',   label:'Pickup',       count:()=>D.byStatus('received').length + D.byStatus('notified').length },
    { id:'all',      label:'All orders' },
    { id:'rates',    label:'Rate table' }
  ];
  function renderTabs(){
    tabsEl.innerHTML = TABS.map(t=>{
      const n = t.count ? t.count() : 0;
      return `<button data-tab="${t.id}" class="${view.tab===t.id?'on':''}">${esc(t.label)}${t.count&&n?`<span class="count">${n}</span>`:''}</button>`;
    }).join('');
  }

  /* ── shared bits ──────────────────────────────────── */
  function memberChip(c){
    if (c.isStaff) return `<span class="chip member">Staff</span>`;
    return c.isMember ? `<span class="chip member">Member</span>` : `<span class="chip nonmember">Nonmember</span>`;
  }
  function typeLabel(t){ return t==='case'?'Case':t==='bulk'?'Bulk':'Single item'; }

  function orderRow(o){
    const price = P.priceFrom(o.actualCost, o.markupPct);
    const bal = P.balance(o);
    return `<button class="row s-${o.status}" data-open="${o.id}">
      <div class="rl">
        <div class="t">${esc(o.item.product)}${o.item.brand?` <span style="color:var(--gray);font-weight:400">· ${esc(o.item.brand)}</span>`:''}</div>
        <div class="m">
          <span class="mono">#${o.id}</span>
          <span>${esc(o.customer.name)}</span>
          ${memberChip(o.customer)}
          <span>${typeLabel(o.orderType)}</span>
          ${o.item.vendor?`<span>${esc(o.item.vendor)}</span>`:''}
        </div>
      </div>
      <div class="rr">
        <span class="chip c-${o.status}">${STATUS_LABEL[o.status]}</span>
        ${price!=null
          ? `<span class="price">${money(price)}</span>${bal?`<span style="font-size:11.5px;color:var(--gray)">${bal>0?money(bal)+' due':money(-bal)+' refund'}</span>`:''}`
          : `<span class="price pending">not priced yet</span>`}
      </div>
    </button>`;
  }
  function rowsOr(list, emptyTitle, emptyBody){
    if (!list.length) return `<div class="empty"><b>${esc(emptyTitle)}</b>${esc(emptyBody)}</div>`;
    return `<div class="rows">${list.map(orderRow).join('')}</div>`;
  }

  /* ── SCREEN: intake ───────────────────────────────── */
  function blankDraft(){
    return { custQuery:'', matched:null, manual:{name:'',phone:'',email:''},
      isMember:false, isStaff:false, itemQuery:'',
      item:{product:'',brand:'',size:'',qty:1,department:'',vendor:'',catalog:''},
      orderType:'case', deposit:'', staffInitials:'', comments:'' };
  }
  function screenIntake(){
    const d = view.draft || (view.draft = blankDraft());
    const hits = d.custQuery && !d.matched ? D.findCustomer(d.custQuery) : [];
    const itemHits = d.itemQuery ? D.findItem(d.itemQuery) : [];
    const c = d.matched;
    const name = c ? c.name : d.manual.name;
    const phone = c ? c.phone : d.manual.phone;
    const needsPhone = !d.isMember && !d.isStaff && !phone.trim();
    const canSave = name.trim() && d.item.product.trim() && !needsPhone;

    return `
    <div class="screen-head">
      <div class="eyebrow">Counter staff · step 1</div>
      <h1>Take a special order</h1>
      <p>Everything on the front of the paper slip, in one place. The order number is generated here — it's what goes on the tag and what the register looks up later.</p>
    </div>

    <div class="card">
      <h3>Customer</h3>
      <div class="sub">Search by member number, phone, or name. Nonmembers just get typed in.</div>
      ${c ? `
        <div class="hit on">
          <div>
            <div class="hl">${esc(c.name)}</div>
            <div class="hm">${esc(c.phone||'no phone on file')}${c.email?' · '+esc(c.email):''}${c.memberKey?' · '+esc(c.memberKey):''}</div>
          </div>
          <button class="btn ghost sm" data-clearmatch="1">Change</button>
        </div>
        ${!c.memberKey?`<div class="note warn"><b>No member number on this record</b>Matched by ${esc(c.matchedBy)} instead. The order still works — the store can backfill the member number later.</div>`:''}
      ` : `
        <div class="field">
          <label>Look up customer</label>
          <input id="custQuery" value="${esc(d.custQuery)}" placeholder="M-1043, 330-555-0148, or Rourke" autocomplete="off" />
        </div>
        ${hits.length?`<div class="hits">${hits.map((h,i)=>`
          <button class="hit" data-pickcust="${i}">
            <div><div class="hl">${esc(h.name)}</div><div class="hm">${esc(h.phone||'no phone on file')}${h.memberKey?' · '+esc(h.memberKey):' · no member number'}</div></div>
            <span class="matchby ${h.matchedBy==='memberKey'?'key':h.matchedBy}">${h.matchedBy==='memberKey'?'member #':h.matchedBy} match</span>
          </button>`).join('')}</div>`
          : d.custQuery?`<div class="note info"><b>No member record found</b>That's fine — type their details below and set member status by hand. Staff know their members better than the export does.</div>`:''}
        <div class="grid3" style="margin-top:14px">
          <div class="field"><label>Name <span class="req">*</span></label><input id="mName" value="${esc(d.manual.name)}" /></div>
          <div class="field"><label>Phone</label><input id="mPhone" value="${esc(d.manual.phone)}" /></div>
          <div class="field"><label>Email <span style="color:var(--gray)">(only if requested)</span></label><input id="mEmail" value="${esc(d.manual.email)}" /></div>
        </div>
      `}
      <div class="grid2" style="margin-top:16px">
        <div class="field">
          <label>Member status</label>
          <div class="seg">
            <button data-set="isMember:true">Member</button>
            <button data-set="isMember:false">Nonmember</button>
          </div>
        </div>
        <div class="field">
          <label>Staff order?</label>
          <div class="seg">
            <button data-set="isStaff:false">No</button>
            <button data-set="isStaff:true">Staff</button>
          </div>
        </div>
      </div>
      ${needsPhone?`<div class="note stop"><b>Phone number required</b>A nonmember order without a phone number doesn't get placed. Get a number, or an email if they ask to be contacted that way.</div>`:''}
    </div>

    <div class="card">
      <h3>What they're ordering</h3>
      <div class="sub">Vendor and catalog number are filled in here, at the counter — the buyer shouldn't have to look them up again.</div>
      <div class="field"><label>Search what we already carry</label><input id="itemQuery" value="${esc(d.itemQuery)}" placeholder="chamomile, olive oil, 0004…" autocomplete="off" /></div>
      ${itemHits.length?`<div class="hits">${itemHits.map((h,i)=>`
        <button class="hit" data-pickitem="${i}">
          <div><div class="hl">${esc(h.name)}</div><div class="hm">${esc(h.department)} · wholesale ${money(h.cost)} · shelf ${money(h.shelf)}</div></div>
          <span class="matchby">use</span>
        </button>`).join('')}</div>`:''}
      <div class="grid3" style="margin-top:14px">
        <div class="field"><label>Product <span class="req">*</span></label><input id="iProduct" value="${esc(d.item.product)}" /></div>
        <div class="field"><label>Brand</label><input id="iBrand" value="${esc(d.item.brand)}" /></div>
        <div class="field"><label>Size</label><input id="iSize" value="${esc(d.item.size)}" placeholder="1 lb, case of 12…" /></div>
        <div class="field"><label>Department</label>
          <select id="iDept">
            <option value="">— select —</option>
            ${P.DEPARTMENTS.map(x=>`<option value="${x.dept}" ${d.item.department===x.dept?'selected':''}>${esc(x.label)} (${x.pct}%${x.confirmed?'':' · unconfirmed'})</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Vendor</label>
          <select id="iVendor">
            <option value="">— select —</option>
            ${['Kehe','UNFI','Frankferd Farms','Other distributor'].map(v=>`<option ${d.item.vendor===v?'selected':''}>${esc(v)}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Catalog #</label><input id="iCatalog" value="${esc(d.item.catalog)}" /></div>
      </div>
      <div class="grid2" style="margin-top:16px">
        <div class="field">
          <label>Order type — this decides whether special-order pricing applies</label>
          <div class="seg">
            <button data-set="orderType:case">Case<small>SO price applies</small></button>
            <button data-set="orderType:bulk">Bulk<small>SO price applies</small></button>
            <button data-set="orderType:single">Single item<small>normal retail price</small></button>
          </div>
        </div>
        <div class="field"><label>Quantity</label><input id="iQty" type="number" min="1" value="${esc(d.item.qty)}" /></div>
      </div>
      ${d.orderType==='single'?`<div class="note info"><b>Single item — no special-order markup</b>This gets the normal department price. ${d.isMember?'Member discount applies at the register.':'No discount for a nonmember.'}</div>`:''}
    </div>

    <div class="card">
      <h3>Deposit &amp; handoff</h3>
      <div class="sub">The deposit is an estimate of the full price. Tell the customer it can change — they'll owe more or get a refund once the invoice comes in.</div>
      <div class="grid3">
        <div class="field"><label>Estimated total / deposit</label><input id="dDeposit" value="${esc(d.deposit)}" placeholder="0.00" />
          <div class="hint">${d.isMember?'Members are sometimes let slide; many pay up front anyway.':'Nonmembers pay the full estimate up front.'}</div></div>
        <div class="field"><label>Staff initials</label><input id="dInit" value="${esc(d.staffInitials)}" /></div>
      </div>
      <div class="field span2" style="margin-top:14px"><label>Comments</label><textarea id="dComments" rows="2" placeholder="Anything the buyer or receiving needs to know.">${esc(d.comments)}</textarea></div>
      <div class="actions" style="margin-top:16px">
        <button class="btn go" data-save="1" ${canSave?'':'disabled'}>Save order</button>
        <button class="btn ghost" data-reset="1">Clear form</button>
        ${!canSave?`<span style="font-size:12.5px;color:var(--gray)">Needs a name, a product${needsPhone?', and a phone number':''}.</span>`:''}
      </div>
    </div>`;
  }

  /* ── SCREEN: buyer ────────────────────────────────── */
  function screenBuyer(){
    const req = D.byStatus('requested'), ord = D.byStatus('ordered');
    return `
    <div class="screen-head">
      <div class="eyebrow">Buyer</div>
      <h1>Buyer queue</h1>
      <p>Two touches, same as the paper slip: log the date you placed it, then price it once the invoice arrives. No cost or markup guessing beforehand.</p>
    </div>
    <div class="card">
      <h3>Waiting to be placed <span class="mono" style="font-size:14px;color:var(--gray)">(${req.length})</span></h3>
      <div class="sub">Mark these as ordered when they go out to the distributor.</div>
      ${rowsOr(req,'Nothing waiting','Every requested order has been placed.')}
    </div>
    <div class="card">
      <h3>Placed, waiting to arrive <span class="mono" style="font-size:14px;color:var(--gray)">(${ord.length})</span></h3>
      <div class="sub">Price these from the invoice once they land. Openable from home.</div>
      ${rowsOr(ord,'Nothing outstanding','No orders are out with distributors.')}
    </div>`;
  }

  /* ── SCREEN: receiving ────────────────────────────── */
  function screenReceive(){
    const ord = D.byStatus('ordered'), rec = D.byStatus('received');
    return `
    <div class="screen-head">
      <div class="eyebrow">Receiving</div>
      <h1>Goods received</h1>
      <p>Open an order when the shipment lands, enter the wholesale cost from the invoice, and the price is worked out for you. Write the order number on the tag and attach it to the item.</p>
    </div>
    <div class="card">
      <h3>Arriving <span class="mono" style="font-size:14px;color:var(--gray)">(${ord.length})</span></h3>
      ${rowsOr(ord,'Nothing on the way','No placed orders are outstanding.')}
    </div>
    <div class="card">
      <h3>Received, not yet collected <span class="mono" style="font-size:14px;color:var(--gray)">(${rec.length})</span></h3>
      ${rowsOr(rec,'Nothing sitting','Everything received has been picked up.')}
    </div>`;
  }

  /* ── SCREEN: pickup ───────────────────────────────── */
  function screenPickup(){
    const q = view.pickupQuery;
    const hits = q ? D.searchOpen(q) : D.allOrders().filter(o=>o.status==='received'||o.status==='notified');
    return `
    <div class="screen-head">
      <div class="eyebrow">Counter staff · at the register</div>
      <h1>Pickup</h1>
      <p>Type the number off the tag, or the customer's name or phone. What's owed shows up straight away.</p>
    </div>
    <div class="card">
      <div class="field"><label>Order number, name, or phone</label><input id="pq" value="${esc(q)}" placeholder="10482, Rourke, 0148…" autocomplete="off" /></div>
      <div style="margin-top:14px">
        ${hits.length?`<div class="rows">${hits.map(orderRow).join('')}</div>`:`<div class="empty"><b>Nothing found</b>Try the order number from the tag, or part of the phone number.</div>`}
      </div>
    </div>`;
  }

  /* ── SCREEN: all ──────────────────────────────────── */
  function screenAll(){
    const q = view.search.toLowerCase();
    let list = D.allOrders();
    if (q) list = list.filter(o=>(o.customer.name+' '+o.item.product+' '+o.id+' '+o.item.vendor).toLowerCase().includes(q));
    const byStatus = ['requested','ordered','received','notified','pickedup'].map(s=>({s,n:D.byStatus(s).length}));
    return `
    <div class="screen-head">
      <div class="eyebrow">Everyone</div>
      <h1>All orders</h1>
      <p>One list, visible to counter staff, buyers, and receiving alike — the point of the whole exercise.</p>
    </div>
    <div class="card">
      <div class="searchrow">
        <div class="field"><label>Search</label><input id="sq" value="${esc(view.search)}" placeholder="name, product, order #, vendor" autocomplete="off" /></div>
        <button class="btn ghost sm" data-resetdemo="1">Reset demo data</button>
      </div>
      <div class="actions" style="margin-top:12px">
        ${byStatus.map(b=>`<span class="chip c-${b.s}">${STATUS_LABEL[b.s]} ${b.n}</span>`).join('')}
      </div>
    </div>
    ${rowsOr(list,'No orders match','Try a different search.')}`;
  }

  /* ── SCREEN: rate table ───────────────────────────── */
  function screenRates(){
    const missing = D.membersMissingKey(), total = D.memberCount();
    return `
    <div class="screen-head">
      <div class="eyebrow">Reference</div>
      <h1>Rate table</h1>
      <p>This replaces the sheet on the special order box. Two separate bases: members are priced off the distributor's shipping tier, nonmembers off the item's own department markup.</p>
    </div>
    <div class="card">
      <h3>Member — case or bulk</h3>
      <div class="sub">Markup over wholesale, by distributor. A member on this price does not also take their member discount.</div>
      <table><thead><tr><th>Distributor</th><th>Markup over wholesale</th></tr></thead><tbody>
        ${P.SHIPPING_TIERS.map(t=>`<tr><td>${esc(t.vendor)}</td><td class="num">${t.pct==null?'calculated for that order':t.pct+'%'}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card">
      <h3>Department markups</h3>
      <div class="sub">Used for every single-item order, and as the basis for nonmember case/bulk pricing (minus ${P.NONMEMBER_REDUCTION} points).</div>
      <table><thead><tr><th>Department</th><th>Normal markup</th><th>Nonmember case/bulk</th><th></th></tr></thead><tbody>
        ${P.DEPARTMENTS.map(x=>`<tr>
          <td>${esc(x.label)}</td>
          <td class="num">${x.pct}%</td>
          <td class="num">${x.pct-P.NONMEMBER_REDUCTION}%</td>
          <td>${x.confirmed?'<span class="chip member">confirmed</span>':'<span class="chip warn">needs confirming</span>'}</td>
        </tr>`).join('')}
      </tbody></table>
      <div class="tf-note">Only bulk herbs, packaged goods, and packaged health &amp; beauty were confirmed by name. The rest are placeholders — a buyer needs to fill in the real numbers before go-live.</div>
    </div>
    <div class="card">
      <h3>Staff orders</h3>
      <div class="sub">${P.STAFF_PCT}% over wholesale, plus shipping when applicable.</div>
    </div>
    <div class="card">
      <h3>Member records</h3>
      <div class="note ${missing?'warn':'info'}">
        <b>${missing} of ${total} member records have no member number</b>
        Those customers still match on phone or name, so orders work either way — but this list is also how the store finds which records to backfill.
      </div>
    </div>`;
  }

  /* ── SCREEN: order detail ─────────────────────────── */
  function screenDetail(id){
    const o = D.get(id);
    if (!o) return `<div class="empty"><b>Order not found</b></div>`;
    const opts = P.optionsFor(o);
    const ex = P.explain(o);
    const price = ex.price, bal = P.balance(o);

    return `
    <a class="back" data-back="1" href="#">&larr; back</a>
    <div class="screen-head">
      <div class="eyebrow">Order <span class="mono">#${o.id}</span> · taken ${esc(fdate(o.created))}</div>
      <h1>${esc(o.item.product)}</h1>
      <div class="actions" style="margin-top:9px">
        <span class="chip c-${o.status}">${STATUS_LABEL[o.status]}</span>
        ${memberChip(o.customer)}
        <span class="chip" style="background:var(--paper);color:var(--gray-dark)">${typeLabel(o.orderType)}</span>
      </div>
    </div>

    <div class="card">
      <h3>Order details</h3>
      <div class="detail-grid">
        <div><div class="dl">Customer</div><div class="dv">${esc(o.customer.name)}</div></div>
        <div><div class="dl">Phone</div><div class="dv ${o.customer.phone?'':'blank'}">${esc(o.customer.phone||'none')}</div></div>
        ${o.customer.email?`<div><div class="dl">Email</div><div class="dv">${esc(o.customer.email)}</div></div>`:''}
        <div><div class="dl">Member #</div><div class="dv ${o.customer.memberKey?'':'blank'}">${esc(o.customer.memberKey||'not on record')}</div></div>
        <div><div class="dl">Brand / size</div><div class="dv">${esc([o.item.brand,o.item.size].filter(Boolean).join(' · ')||'—')}</div></div>
        <div><div class="dl">Department</div><div class="dv">${esc((P.dept(o.item.department)||{}).label||o.item.department||'—')}</div></div>
        <div><div class="dl">Vendor</div><div class="dv ${o.item.vendor?'':'blank'}">${esc(o.item.vendor||'—')}</div></div>
        <div><div class="dl">Catalog #</div><div class="dv ${o.item.catalog?'':'blank'}">${esc(o.item.catalog||'—')}</div></div>
        <div><div class="dl">Deposit taken</div><div class="dv">${money(o.amountPaid)}</div></div>
        <div><div class="dl">Taken by</div><div class="dv ${o.staffInitials?'':'blank'}">${esc(o.staffInitials||'—')}</div></div>
      </div>
      ${o.comments?`<div class="note info" style="margin-bottom:0"><b>Comments from the counter</b>${esc(o.comments)}</div>`:''}
    </div>

    <div class="card">
      <h3>Progress</h3>
      <div class="detail-grid">
        <div><div class="dl">Requested</div><div class="dv">${esc(fdate(o.created))}</div></div>
        <div><div class="dl">Ordered</div><div class="dv ${o.dateOrdered?'':'blank'}">${esc(fdate(o.dateOrdered)||'—')}</div></div>
        <div><div class="dl">Received</div><div class="dv ${o.dateReceived?'':'blank'}">${esc(fdate(o.dateReceived)||'—')}</div></div>
        <div><div class="dl">Notified</div><div class="dv ${o.dateNotified?'':'blank'}">${esc(fdate(o.dateNotified)||'—')}</div></div>
        <div><div class="dl">Picked up</div><div class="dv ${o.datePickedUp?'':'blank'}">${esc(fdate(o.datePickedUp)||'—')}</div></div>
      </div>
      <div class="actions" style="margin-top:16px">
        ${o.status==='requested'?`<button class="btn go" data-act="order">Mark placed with distributor</button>`:''}
        ${o.status==='ordered'?`<button class="btn go" data-act="receive">Mark received (${esc(fdate(today()))})</button>`:''}
        ${o.status==='received'&&price!=null?`<button class="btn go" data-act="notify">Customer notified</button>`:''}
        ${o.status==='received'&&price==null?`<span style="font-size:13px;color:var(--gray)">Price it below before notifying the customer.</span>`:''}
        ${o.status==='notified'?`<button class="btn go" data-act="pickup">Picked up &amp; settled</button>`:''}
        ${o.status==='pickedup'?`<span style="font-size:13px;color:var(--gray)">Closed out ${esc(fdate(o.datePickedUp))}.</span>`:''}
      </div>
    </div>

    ${o.status!=='requested'?`
    <div class="card">
      <h3>Pricing</h3>
      <div class="sub">Enter the wholesale cost from the invoice, then pick the markup that applies. The rule tree only offers the options that legitimately apply to this order.</div>
      <div class="grid2">
        <div class="field"><label>Wholesale cost from invoice</label><input id="cost" value="${o.actualCost==null?'':o.actualCost}" placeholder="0.00" /></div>
        <div class="field"><label>Markup applied</label>
          <div class="dv mono" style="padding-top:8px;font-size:17px">${o.markupPct==null?'<span style="color:var(--gray-light)">not set</span>':o.markupPct+'%'}</div>
          ${o.markupBasis?`<div class="hint">${esc(o.markupBasis)}</div>`:''}
        </div>
      </div>
      <div style="margin-top:6px"><div class="dl" style="margin-bottom:2px">Markup options for this order</div>
        <div class="opts">${opts.map((op,i)=>`
          <button class="opt ${o.markupBasisId===op.id&&o.markupPct!=null?'on':''}" data-opt="${i}">
            <span class="dot"></span>
            <span><span class="ol">${esc(op.label)}</span>${op.suggested?' <span class="chip member">suggested</span>':''}${op.confirmed?'':' <span class="chip warn">unconfirmed rate</span>'}<span class="on-note">${esc(op.note)}</span></span>
            <span class="op">${op.pct==null?'enter':op.pct+'%'}</span>
          </button>`).join('')}
        </div>
      </div>
      ${o.actualCost!=null&&o.markupPct!=null?`
      <div class="calcbox">
        <div class="cl">What the customer pays</div>
        <div class="line"><span>Wholesale cost</span><span>${money(o.actualCost)}</span></div>
        <div class="line"><span>Markup ${o.markupPct}%</span><span>+ ${money(price-o.actualCost)}</span></div>
        <div class="line total"><span>Final price</span><span>${money(price)}</span></div>
        <div class="line"><span>Already paid</span><span>− ${money(o.amountPaid)}</span></div>
        <div class="line total"><span>${bal>=0?'Balance due':'Refund owed'}</span><span>${money(Math.abs(bal))}</span></div>
        <div class="exp">${esc(ex.text)}</div>
      </div>`:`<div class="note warn" style="margin-bottom:0"><b>Not priced yet</b>Needs both the wholesale cost and a markup selection.</div>`}
      <div class="field" style="margin-top:16px"><label>Note to whoever handles this next</label><textarea id="bnote" rows="2" placeholder="Out of stock, discontinued, came in short, price changed…">${esc(o.buyerNote)}</textarea>
        <div class="actions" style="margin-top:9px"><button class="btn ghost sm" data-savenote="1">Save note</button></div>
      </div>
      ${o.buyerNote?`<div class="note info" style="margin-bottom:0"><b>Note on this order</b>${esc(o.buyerNote)}</div>`:''}
    </div>`:''}

    ${(o.status==='received'||o.status==='notified')&&price!=null?`
    <div class="card">
      <h3>Tag for the item</h3>
      <div class="sub">Write this number on a reusable card and attach it to the item. Just the number — the price lives in the system, where it stays current even if it changes.</div>
      <div class="tagwrap">
        <div class="tagcard">
          <div class="hole"></div>
          <div class="tl">Special Order</div>
          <div class="tn">${o.id}</div>
          <div class="tf">${esc(o.customer.name)}</div>
        </div>
        <div style="flex:1;min-width:220px">
          <div class="note info" style="margin-top:0"><b>Why only the number</b>One number is far harder to miscopy than five fields, and nothing has to be rewritten if the price changes after receiving.</div>
        </div>
      </div>
    </div>`:''}`;
  }

  /* ── render ───────────────────────────────────────── */
  function render(){
    renderTabs();
    if (view.openId) app.innerHTML = screenDetail(view.openId);
    else if (view.tab==='intake') app.innerHTML = screenIntake();
    else if (view.tab==='buyer') app.innerHTML = screenBuyer();
    else if (view.tab==='receive') app.innerHTML = screenReceive();
    else if (view.tab==='pickup') app.innerHTML = screenPickup();
    else if (view.tab==='all') app.innerHTML = screenAll();
    else if (view.tab==='rates') app.innerHTML = screenRates();
    syncSegs();
  }
  /* segmented controls reflect draft state after each render */
  function syncSegs(){
    const d = view.draft; if (!d) return;
    app.querySelectorAll('[data-set]').forEach(b=>{
      const [k,v] = b.dataset.set.split(':');
      const val = v==='true'?true:v==='false'?false:v;
      if (d[k]===val) b.classList.add('on'); else b.classList.remove('on');
    });
  }

  /* ── events ───────────────────────────────────────── */
  tabsEl.addEventListener('click', e=>{
    const b = e.target.closest('[data-tab]'); if(!b) return;
    view.tab = b.dataset.tab; view.openId = null; render();
  });

  app.addEventListener('click', e=>{
    const t = e.target;
    const open = t.closest('[data-open]');
    if (open){ view.openId = Number(open.dataset.open); render(); window.scrollTo(0,0); return; }
    if (t.closest('[data-back]')){ e.preventDefault(); view.openId = null; render(); return; }

    const seg = t.closest('[data-set]');
    if (seg){
      const [k,v] = seg.dataset.set.split(':');
      view.draft[k] = v==='true'?true:v==='false'?false:v;
      if (k==='isStaff' && view.draft.isStaff) view.draft.isMember = false;
      render(); return;
    }
    const pc = t.closest('[data-pickcust]');
    if (pc){
      const hits = D.findCustomer(view.draft.custQuery);
      const m = hits[Number(pc.dataset.pickcust)];
      view.draft.matched = m; view.draft.isMember = true; render(); return;
    }
    if (t.closest('[data-clearmatch]')){ view.draft.matched=null; view.draft.custQuery=''; render(); return; }
    const pi = t.closest('[data-pickitem]');
    if (pi){
      const hits = D.findItem(view.draft.itemQuery);
      const it = hits[Number(pi.dataset.pickitem)];
      Object.assign(view.draft.item,{product:it.name,department:it.department});
      view.draft.itemQuery=''; render(); return;
    }
    if (t.closest('[data-reset]')){ view.draft = blankDraft(); render(); return; }
    if (t.closest('[data-resetdemo]')){ D.resetDemo(); view.openId=null; render(); return; }
    if (t.closest('[data-save]')){ saveDraft(); return; }

    const opt = t.closest('[data-opt]');
    if (opt){
      const o = D.get(view.openId);
      const op = P.optionsFor(o)[Number(opt.dataset.opt)];
      let pct = op.pct;
      if (pct==null){
        const typed = prompt('Markup percentage over wholesale for this order:', '');
        if (typed==null || typed==='') return;
        pct = parseFloat(typed);
        if (isNaN(pct)) return;
      }
      D.update(o.id,{ markupPct:pct, markupBasisId:op.id, markupBasis:op.label, markupOverride:op.pct==null });
      render(); return;
    }
    if (t.closest('[data-savenote]')){
      const el = app.querySelector('#bnote');
      D.update(view.openId,{ buyerNote: el?el.value:'' }); render(); return;
    }
    const act = t.closest('[data-act]');
    if (act){
      const o = D.get(view.openId);
      const a = act.dataset.act;
      if (a==='order') D.update(o.id,{status:'ordered', dateOrdered:today()});
      if (a==='receive') D.update(o.id,{status:'received', dateReceived:today(), tagNumber:String(o.id)});
      if (a==='notify') D.update(o.id,{status:'notified', dateNotified:today()});
      if (a==='pickup'){
        const price = P.priceFrom(o.actualCost,o.markupPct);
        D.update(o.id,{status:'pickedup', datePickedUp:today(), amountPaid:price});
      }
      render(); return;
    }
  });

  /* live inputs — keep draft/record in sync without re-rendering on every key */
  app.addEventListener('input', e=>{
    const id = e.target.id, v = e.target.value, d = view.draft;
    if (id==='pq'){ view.pickupQuery=v; debouncedRender(); return; }
    if (id==='sq'){ view.search=v; debouncedRender(); return; }
    if (id==='cost'){
      const n = parseFloat(v);
      D.update(view.openId,{ actualCost: isNaN(n)?null:n });
      debouncedRender(); return;
    }
    if (!d) return;
    if (id==='custQuery'){ d.custQuery=v; debouncedRender(); return; }
    if (id==='itemQuery'){ d.itemQuery=v; debouncedRender(); return; }
    const manual = {mName:'name',mPhone:'phone',mEmail:'email'}[id];
    if (manual){ d.manual[manual]=v; if(manual==='phone') debouncedRender(); return; }
    const item = {iProduct:'product',iBrand:'brand',iSize:'size',iQty:'qty',iDept:'department',iVendor:'vendor',iCatalog:'catalog'}[id];
    if (item){ d.item[item]=v; return; }
    if (id==='dDeposit'){ d.deposit=v; return; }
    if (id==='dInit'){ d.staffInitials=v; return; }
    if (id==='dComments'){ d.comments=v; return; }
  });
  app.addEventListener('change', e=>{
    if (['iDept','iVendor'].includes(e.target.id)) render();
  });

  let rt=null, lastFocus=null;
  function debouncedRender(){
    lastFocus = document.activeElement ? {id:document.activeElement.id, pos:document.activeElement.selectionStart} : null;
    clearTimeout(rt);
    rt = setTimeout(()=>{
      render();
      if (lastFocus && lastFocus.id){
        const el = app.querySelector('#'+lastFocus.id);
        if (el){ el.focus(); try{ el.setSelectionRange(lastFocus.pos,lastFocus.pos); }catch(e){} }
      }
    }, 220);
  }

  function saveDraft(){
    const d = view.draft, c = d.matched;
    const cust = {
      name: c?c.name:d.manual.name.trim(),
      phone: c?c.phone:d.manual.phone.trim(),
      email: c?c.email:d.manual.email.trim(),
      memberKey: c?c.memberKey:null,
      matchedBy: c?c.matchedBy:'none',
      isMember: d.isMember, isStaff: d.isStaff
    };
    const dep = parseFloat(d.deposit);
    const rec = D.create({
      customer: cust,
      item: { product:d.item.product.trim(), brand:d.item.brand.trim(), size:d.item.size.trim(),
              qty:Number(d.item.qty)||1, department:d.item.department, vendor:d.item.vendor, catalog:d.item.catalog.trim() },
      orderType: d.orderType,
      deposit: isNaN(dep)?0:dep,
      amountPaid: isNaN(dep)?0:dep,
      staffInitials: d.staffInitials.trim(),
      comments: d.comments.trim()
    });
    view.draft = blankDraft();
    view.openId = rec.id;
    render(); window.scrollTo(0,0);
  }

  render();
})();
