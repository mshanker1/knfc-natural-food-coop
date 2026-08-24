/* KNFC Special Orders — DATA LAYER (mock)
   ─────────────────────────────────────────────────────────────────
   THIS IS THE ONLY FILE THAT TOUCHES STORAGE. Everything else in the
   prototype calls SO_DATA.* and never knows where data lives.

   To go live, replace the bodies of the SO_DATA methods with fetch()
   calls to the Apps Script web app. Signatures must not change.
   Orders currently persist to localStorage; members and inventory are
   read from the mock tables below (live: Drive CSV exports / POS API).
   ───────────────────────────────────────────────────────────────── */
(function () {
  const LS_KEY = 'knfc-so-proto-v2';

  /* ── Mock member table (stands in for the Lightspeed customer export)
     Note memberKey is deliberately null on some rows — that is the real
     data problem: not every customer has the custom field filled in. */
  const MEMBERS = [
    { memberKey: 'M-1043', name: 'Maureen Rourke',   phone: '330-555-0148', email: 'mrourke@example.com', discount: 10 },
    { memberKey: 'M-0876', name: 'David Ahn',        phone: '330-555-0912', email: '',                    discount: 10 },
    { memberKey: null,     name: 'Patrice Boyle',    phone: '330-555-0455', email: 'pboyle@example.com',  discount: 10 },
    { memberKey: 'M-1190', name: 'Samuel Ortega',    phone: '234-555-7781', email: '',                    discount: 10 },
    { memberKey: null,     name: 'Ellen Kwan',       phone: '330-555-3320', email: '',                    discount: 10 },
    { memberKey: 'M-0311', name: 'Theodore Mbeki',   phone: '330-555-6604', email: 'tmbeki@example.com',  discount: 10 },
    { memberKey: null,     name: 'Joan Petrakis',    phone: '',             email: 'jpet@example.com',    discount: 10 }
  ];

  /* ── Mock inventory (stands in for inventory.csv from the POS export) */
  const INVENTORY = [
    { upc: '0001', name: 'Bulk chamomile flower',   department: 'Bulk_Herbs',   cost: 8.40,  shelf: 16.80 },
    { upc: '0002', name: 'Olive oil, 500ml',        department: 'Packaged_Dry', cost: 6.20,  shelf: 9.61 },
    { upc: '0003', name: 'Almond butter, 16oz',     department: 'Packaged_Dry', cost: 7.10,  shelf: 11.01 },
    { upc: '0004', name: 'Magnesium glycinate',     department: 'Vitamins',     cost: 12.00, shelf: 21.00 },
    { upc: '0005', name: 'Castile soap, 32oz',      department: 'Packaged_HB',  cost: 9.50,  shelf: 16.63 },
    { upc: '0006', name: 'Rolled oats, bulk lb',    department: 'Bulk_Dry',     cost: 1.10,  shelf: 2.09 }
  ];

  /* ── Seed orders so every screen has something in it on first load */
  function seed() {
    const today = new Date();
    const d = (back) => new Date(today.getTime() - back * 864e5).toISOString().slice(0, 10);
    return [
      { id: 10482, created: d(9), status: 'received',
        customer: { name: 'Maureen Rourke', phone: '330-555-0148', email: '', memberKey: 'M-1043', matchedBy: 'memberKey', isMember: true, isStaff: false },
        item: { product: 'Bulk chamomile flower', brand: 'Frontier', size: '1 lb', qty: 1, department: 'Bulk_Herbs', vendor: 'Frankferd Farms', catalog: 'FF-2210' },
        orderType: 'bulk', deposit: 16.80, staffInitials: 'JR', comments: '',
        dateOrdered: d(6), dateReceived: d(1), actualCost: 8.40,
        markupPct: 30, markupBasisId: 'tier:Frankferd Farms', markupBasis: 'Frankferd Farms (30%)', markupOverride: false,
        buyerNote: '', dateNotified: '', datePickedUp: '', amountPaid: 16.80, tagNumber: '10482' },

      { id: 10517, created: d(5), status: 'ordered',
        customer: { name: 'David Ahn', phone: '330-555-0912', email: '', memberKey: 'M-0876', matchedBy: 'memberKey', isMember: true, isStaff: false },
        item: { product: 'Olive oil, 500ml', brand: 'Bragg', size: 'case of 12', qty: 1, department: 'Packaged_Dry', vendor: 'UNFI', catalog: 'UN-88431' },
        orderType: 'case', deposit: 96.00, staffInitials: 'BK', comments: 'Wants it before the 30th if possible.',
        dateOrdered: d(3), dateReceived: '', actualCost: null,
        markupPct: null, markupBasis: '', markupOverride: false,
        buyerNote: '', dateNotified: '', datePickedUp: '', amountPaid: 96.00, tagNumber: '' },

      { id: 10520, created: d(2), status: 'requested',
        customer: { name: 'Greg Salter', phone: '330-555-7719', email: '', memberKey: null, matchedBy: 'none', isMember: false, isStaff: false },
        item: { product: 'Castile soap, 32oz', brand: "Dr. Bronner's", size: 'case of 6', qty: 1, department: 'Packaged_HB', vendor: 'Kehe', catalog: 'KE-55120' },
        orderType: 'case', deposit: 84.00, staffInitials: 'JR', comments: 'Non-member — paid in full up front.',
        dateOrdered: '', dateReceived: '', actualCost: null,
        markupPct: null, markupBasis: '', markupOverride: false,
        buyerNote: '', dateNotified: '', datePickedUp: '', amountPaid: 84.00, tagNumber: '' },

      { id: 10521, created: d(2), status: 'requested',
        customer: { name: 'Patrice Boyle', phone: '330-555-0455', email: 'pboyle@example.com', memberKey: null, matchedBy: 'phone', isMember: true, isStaff: false },
        item: { product: 'Magnesium glycinate', brand: 'Pure Encapsulations', size: '1 bottle', qty: 1, department: 'Vitamins', vendor: 'Kehe', catalog: 'KE-71002' },
        orderType: 'single', deposit: 21.00, staffInitials: 'MT', comments: '',
        dateOrdered: '', dateReceived: '', actualCost: null,
        markupPct: null, markupBasis: '', markupOverride: false,
        buyerNote: '', dateNotified: '', datePickedUp: '', amountPaid: 0, tagNumber: '' },

      { id: 10466, created: d(16), status: 'notified',
        customer: { name: 'Theodore Mbeki', phone: '330-555-6604', email: 'tmbeki@example.com', memberKey: 'M-0311', matchedBy: 'memberKey', isMember: true, isStaff: false },
        item: { product: 'Rolled oats, bulk lb', brand: 'Grain Place', size: '25 lb bag', qty: 1, department: 'Bulk_Dry', vendor: 'Frankferd Farms', catalog: 'FF-1104' },
        orderType: 'bulk', deposit: 30.00, staffInitials: 'BK', comments: '',
        dateOrdered: d(12), dateReceived: d(4), actualCost: 27.50,
        markupPct: 30, markupBasisId: 'tier:Frankferd Farms', markupBasis: 'Frankferd Farms (30%)', markupOverride: false,
        buyerNote: 'Came in one bag short of the pallet — this is the last one.', dateNotified: d(3), datePickedUp: '', amountPaid: 30.00, tagNumber: '10466' }
    ];
  }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through to seed */ }
    const s = { orders: seed(), nextId: 10600 };
    save(s);
    return s;
  }
  let state = load();
  function save(s) { try { localStorage.setItem(LS_KEY, JSON.stringify(s || state)); } catch (e) {} }

  window.SO_DATA = {
    /* ── Members ──────────────────────────────────────────────────
       Fallback match chain: memberKey → phone → name.
       Always reports HOW it matched so the UI can be honest about it. */
    findCustomer(query) {
      const q = (query || '').trim().toLowerCase();
      if (!q) return [];
      const digits = q.replace(/\D/g, '');
      return MEMBERS.map(m => {
        let matchedBy = null;
        if (m.memberKey && m.memberKey.toLowerCase() === q) matchedBy = 'memberKey';
        else if (digits.length >= 4 && m.phone.replace(/\D/g, '').includes(digits)) matchedBy = 'phone';
        else if (m.name.toLowerCase().includes(q)) matchedBy = 'name';
        return matchedBy ? Object.assign({ matchedBy }, m) : null;
      }).filter(Boolean);
    },
    membersMissingKey() { return MEMBERS.filter(m => !m.memberKey).length; },
    memberCount() { return MEMBERS.length; },

    /* ── Inventory ──────────────────────────────────────────────── */
    findItem(query) {
      const q = (query || '').trim().toLowerCase();
      if (!q) return [];
      return INVENTORY.filter(i => i.name.toLowerCase().includes(q) || i.upc === q);
    },
    allItems() { return INVENTORY.slice(); },

    /* ── Orders ─────────────────────────────────────────────────── */
    allOrders() { return state.orders.slice().sort((a, b) => b.id - a.id); },
    byStatus(s) { return this.allOrders().filter(o => o.status === s); },
    get(id) { return state.orders.find(o => o.id === Number(id)) || null; },

    create(order) {
      const id = state.nextId++;
      const rec = Object.assign({
        id, created: new Date().toISOString().slice(0, 10), status: 'requested',
        dateOrdered: '', dateReceived: '', actualCost: null, markupPct: null,
        markupBasisId: '', markupBasis: '', markupOverride: false, buyerNote: '', dateNotified: '',
        datePickedUp: '', tagNumber: ''
      }, order);
      state.orders.push(rec);
      save();
      return rec;
    },

    update(id, patch) {
      const o = this.get(id);
      if (!o) return null;
      Object.assign(o, patch);
      save();
      return o;
    },

    /* Search used by the pickup screen: order #, name, or phone */
    searchOpen(query) {
      const q = (query || '').trim().toLowerCase();
      if (!q) return [];
      const digits = q.replace(/\D/g, '');
      return this.allOrders().filter(o => {
        if (o.status === 'pickedup') return false;
        if (String(o.id).includes(digits) && digits.length >= 3) return true;
        if (o.customer.name.toLowerCase().includes(q)) return true;
        if (digits.length >= 4 && o.customer.phone.replace(/\D/g, '').includes(digits)) return true;
        return false;
      });
    },

    resetDemo() { state = { orders: seed(), nextId: 10600 }; save(); }
  };
})();
