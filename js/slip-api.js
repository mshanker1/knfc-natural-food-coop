/* Talking to the Sheet.
   One job: move slips between the page and Apps Script, and be loudly honest
   when it can't. Staff were clear they'd rather reach for paper than wonder
   whether something saved. */
/**
 * KNFC Website — Special Order Slip, data layer
 *
 * CONFIGURATION — paste the deployed SlipHandler.gs web app URL here.
 * Leave it blank and the page works on its own, saving slips in that browser
 * only (useful for demos, no good for the counter).
 * Setup instructions: google-apps-script/SlipHandler.gs, top of file.
 */
const SLIP_API_URL = 'https://script.google.com/macros/s/AKfycbzbUHkNN-QEDeHoYDyhxb942QQpK6WkooEicCjMKVp0D8PWlpShnVHiyUXT_YhsBPKy/exec';
const SLIP_STORE_NAME = 'Kent Natural Foods Co-op';

(function(){
  const CFG = { apiUrl: SLIP_API_URL, storeName: SLIP_STORE_NAME };
  window.SLIP_CONFIG = CFG;
  const PASS_KEY = 'knfc.slip.pass';
  const WHO_KEY  = 'knfc.slip.who';
  const LOCAL_KEY = 'knfc.slips.v1';

  const API = {
    /* No URL configured → the page works exactly as it did in testing,
       saving to this browser. Useful for demos and for a laptop at home. */
    get standalone(){ return !CFG.apiUrl; },
    state: 'unknown',           // unknown | ok | offline | passcode
    listeners: [],

    onStateChange(fn){ this.listeners.push(fn); },
    setState(s){
      if (this.state === s) return;
      this.state = s;
      this.listeners.forEach(fn => { try { fn(s); } catch(e){} });
    },

    get passcode(){ try { return localStorage.getItem(PASS_KEY) || ''; } catch(e){ return ''; } },
    set passcode(v){ try { v ? localStorage.setItem(PASS_KEY, v) : localStorage.removeItem(PASS_KEY); } catch(e){} },
    get who(){ try { return localStorage.getItem(WHO_KEY) || ''; } catch(e){ return ''; } },
    set who(v){ try { v ? localStorage.setItem(WHO_KEY, v) : localStorage.removeItem(WHO_KEY); } catch(e){} },

    /* text/plain dodges the CORS preflight that Apps Script won't answer. */
    async call(action, payload){
      if (this.standalone) return { ok:true, standalone:true };
      const body = Object.assign({ action, passcode: this.passcode, who: this.who }, payload || {});
      let res, json;
      try {
        res = await fetch(CFG.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(body)
        });
        json = await res.json();
      } catch(err){
        this.setState('offline');
        return { ok:false, error:'offline' };
      }
      if (json && json.error === 'passcode'){ this.setState('passcode'); return json; }
      this.setState('ok');
      return json;
    },

    async checkPasscode(code){
      const saved = this.passcode;
      this.passcode = code;
      const r = await this.call('list');
      if (r && r.ok) return true;
      this.passcode = saved;
      return false;
    },

    /* ── slips ────────────────────────────────────────────────── */
    async list(){
      if (this.standalone) return { ok:true, slips: localList(), staff: [], archiveAfterDays: 90 };
      return this.call('list');
    },
    async create(slip){
      if (this.standalone){
        const list = localList();
        let max = 0;
        list.forEach(s => { const n = parseInt(String(s.id).replace(/\D/g,''),10); if (n>max) max=n; });
        slip.id = String(max+1).padStart(4,'0');
        slip.created = new Date().toISOString().slice(0,10);
        list.unshift(slip);
        localSave(list);
        return { ok:true, slip };
      }
      return this.call('create', { slip });
    },
    async update(id, changes){
      if (this.standalone){
        const list = localList(), i = list.findIndex(s => s.id === id);
        if (i < 0) return { ok:false, error:'not found' };
        Object.assign(list[i], changes);
        localSave(list);
        return { ok:true, slip: list[i] };
      }
      return this.call('update', { id, changes });
    }
  };

  function localList(){
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch(e){ return []; }
  }
  function localSave(list){
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch(e){}
  }

  window.addEventListener('offline', () => API.setState('offline'));
  window.addEventListener('online',  () => API.call('list'));

  window.SlipAPI = API;
})();
