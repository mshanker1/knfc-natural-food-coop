/* KNFC Special Orders — PRICING RULES
   ─────────────────────────────────────────────────────────────────
   Encodes the rules confirmed by the buyers. Read this file to audit
   the math; it is deliberately free of UI so it can be ported as-is.

   THE RULE TREE
   1. Not a case or bulk order?  → NO special-order markup at all.
        Price = the item's normal department retail markup.
        Member  → may use their regular discount at checkout.
        Nonmember → no discount.
   2. Case or bulk order?        → special-order pricing applies.
        Member    → markup comes from the SHIPPING TIER table below.
                    Member discount does NOT apply on top.
        Nonmember → markup = that item's DEPARTMENT markup minus 10 pts.
   3. Staff order → 10% over wholesale, plus shipping when applicable.
   ───────────────────────────────────────────────────────────────── */
(function () {

  /* Member case/bulk markup — depends on distributor / shipping, NOT department.
     "calc" means the buyer works the shipping out for that specific order. */
  const SHIPPING_TIERS = [
    { vendor: 'No shipping factored', pct: 25,   confirmed: true },
    { vendor: 'Kehe',                 pct: 27,   confirmed: true },
    { vendor: 'UNFI',                 pct: 30,   confirmed: true },
    { vendor: 'Frankferd Farms',      pct: 30,   confirmed: true },
    { vendor: 'Other distributor',    pct: null, confirmed: true }   /* calculated per order */
  ];

  /* Department retail markup — the store's normal markup for that department.
     Used for (a) all single-item orders, (b) nonmember case/bulk minus 10.
     Only the three Elizabeth named are confirmed; the rest are placeholders
     and are flagged in the UI until someone confirms them. */
  const DEPARTMENTS = [
    { dept: 'Bulk_Herbs',   label: 'Bulk herbs',            pct: 100, confirmed: true },
    { dept: 'Packaged_Dry', label: 'Packaged goods',        pct: 55,  confirmed: true },
    { dept: 'Packaged_HB',  label: 'Packaged health/beauty',pct: 75,  confirmed: true },
    { dept: 'Bulk_Dry',     label: 'Bulk dry goods',        pct: 55,  confirmed: false },
    { dept: 'Vitamins',     label: 'Vitamins',              pct: 75,  confirmed: false },
    { dept: 'Beverage',     label: 'Beverage',              pct: 55,  confirmed: false },
    { dept: 'Frozen',       label: 'Frozen',                pct: 55,  confirmed: false },
    { dept: 'Milk',         label: 'Dairy / milk',          pct: 40,  confirmed: false }
  ];

  const NONMEMBER_REDUCTION = 10;  /* points off the department markup */
  const STAFF_PCT = 10;            /* over wholesale, plus shipping */

  function dept(code) { return DEPARTMENTS.find(d => d.dept === code) || null; }
  function tier(vendor) {
    return SHIPPING_TIERS.find(t => t.vendor.toLowerCase() === (vendor || '').toLowerCase()) || null;
  }

  /* Returns every markup option that legitimately applies to an order,
     so the buyer picks from a list instead of recalling a number. */
  function optionsFor(order) {
    const c = order.customer || {};
    const d = dept(order.item && order.item.department);
    const isCaseOrBulk = order.orderType === 'case' || order.orderType === 'bulk';
    const out = [];

    if (c.isStaff) {
      out.push({ id:'staff', pct: STAFF_PCT, label: 'Staff special order (10% + shipping)',
                 note: 'Add shipping on top when applicable.', confirmed: true });
      return out;
    }

    if (!isCaseOrBulk) {
      /* Single item: normal department price. No SO markup. */
      if (d) out.push({
        id: 'dept:' + d.dept,
        pct: d.pct,
        label: `${d.label} — normal retail markup (${d.pct}%)`,
        note: c.isMember
          ? 'Single item: no special-order price. Member discount applies at checkout.'
          : 'Single item: no special-order price, and no discount for nonmembers.',
        confirmed: d.confirmed, isRetail: true
      });
      return out;
    }

    /* Case or bulk */
    if (c.isMember) {
      SHIPPING_TIERS.forEach(t => {
        out.push({
          id: 'tier:' + t.vendor,
          pct: t.pct,
          label: t.pct === null ? `${t.vendor} — shipping calculated for this order` : `${t.vendor} (${t.pct}%)`,
          note: 'Member case/bulk price. Member discount does NOT apply on top.',
          confirmed: true, needsManual: t.pct === null,
          suggested: tier(order.item && order.item.vendor) === t
        });
      });
    } else {
      if (d) out.push({
        id: 'dept-less10:' + d.dept,
        pct: d.pct - NONMEMBER_REDUCTION,
        label: `${d.label} — ${d.pct}% less ${NONMEMBER_REDUCTION} pts = ${d.pct - NONMEMBER_REDUCTION}%`,
        note: 'Nonmember case/bulk: 10 points off this department\'s normal markup.',
        confirmed: d.confirmed, suggested: true
      });
      out.push({ id:'manual', pct: null, label: 'Enter manually', note: 'Use when the department markup differs.', confirmed: true, needsManual: true });
    }
    return out;
  }

  function priceFrom(cost, markupPct) {
    if (cost == null || markupPct == null) return null;
    return Math.round(cost * (1 + markupPct / 100) * 100) / 100;
  }

  /* Plain-language explanation of what the customer actually pays,
     including whether the POS member discount is allowed on top. */
  function explain(order) {
    const c = order.customer || {};
    const isCaseOrBulk = order.orderType === 'case' || order.orderType === 'bulk';
    const price = priceFrom(order.actualCost, order.markupPct);
    if (price == null) return { price: null, discountAllowed: false, text: 'Waiting on wholesale cost from the invoice.' };

    if (c.isStaff) return { price, discountAllowed: false, text: 'Staff order — 10% over wholesale plus shipping.' };

    if (!isCaseOrBulk) {
      return c.isMember
        ? { price, discountAllowed: true,
            text: 'Normal department price. Member uses their regular discount at the register.' }
        : { price, discountAllowed: false,
            text: 'Normal department price. Nonmember gets no discount.' };
    }
    return c.isMember
      ? { price, discountAllowed: false,
          text: 'Member case/bulk special-order price. No member discount on top of this.' }
      : { price, discountAllowed: false,
          text: 'Nonmember case/bulk price — 10 points off the department markup. No further discount.' };
  }

  function balance(order) {
    const price = priceFrom(order.actualCost, order.markupPct);
    if (price == null) return null;
    return Math.round((price - (order.amountPaid || 0)) * 100) / 100;
  }

  window.SO_PRICING = {
    SHIPPING_TIERS, DEPARTMENTS, NONMEMBER_REDUCTION, STAFF_PCT,
    dept, tier, optionsFor, priceFrom, explain, balance
  };
})();
