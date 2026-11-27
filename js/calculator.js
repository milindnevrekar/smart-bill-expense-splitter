/*
 * SplitMate calculation engine.
 * Uses integer paise and largest-remainder allocation so displayed shares
 * always add up exactly to the calculated bill total.
 */
(function (root, factory) {
  const calculator = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = calculator;
  } else {
    root.BillCalculator = calculator;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  function allocateCents(totalCents, recipients) {
    const totalNumber = Math.min(
      Number.MAX_SAFE_INTEGER,
      Math.max(0, Math.round(Number(totalCents) || 0))
    );
    const eligible = (Array.isArray(recipients) ? recipients : [])
      .map((recipient, index) => ({
        id: recipient.id,
        weight: Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(Number(recipient.weight) || 0))),
        index
      }))
      .filter((recipient) => recipient.weight > 0);

    const total = BigInt(totalNumber);
    const weightSum = eligible.reduce((sum, recipient) => sum + BigInt(recipient.weight), 0n);
    if (total === 0n || weightSum === 0n) {
      return eligible.map((recipient) => ({ id: recipient.id, cents: 0 }));
    }

    const allocations = eligible.map((recipient) => {
      const numerator = total * BigInt(recipient.weight);
      const wholeCents = numerator / weightSum;
      return {
        id: recipient.id,
        cents: Number(wholeCents),
        remainder: numerator % weightSum,
        originalIndex: recipient.index
      };
    });

    const allocated = allocations.reduce((sum, share) => sum + BigInt(share.cents), 0n);
    const remainingCents = Number(total - allocated);
    const byRemainder = [...allocations].sort((a, b) => {
      if (a.remainder === b.remainder) return a.originalIndex - b.originalIndex;
      return a.remainder > b.remainder ? -1 : 1;
    });

    for (let index = 0; index < remainingCents; index += 1) {
      byRemainder[index].cents += 1;
    }

    return allocations.map(({ id, cents }) => ({ id, cents }));
  }

  function parseRupeesToPaise(value) {
    const input = String(value ?? '').trim();
    const match = input.match(/^(\d+)(?:\.(\d{1,2}))?$/);
    if (!match) return null;

    const rupees = BigInt(match[1]);
    const paise = BigInt((match[2] || '').padEnd(2, '0') || '0');
    const total = rupees * 100n + paise;
    if (total > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(total);
  }

  function calculateBill(people, items, taxRate, tipRate) {
    const safePeople = Array.isArray(people) ? people : [];
    const safeItems = Array.isArray(items) ? items : [];
    const knownPeople = new Map(safePeople.map((person) => [person.id, person]));
    const personSubtotals = new Map(safePeople.map((person) => [person.id, 0]));
    const unassignedItems = [];
    let unassignedCents = 0;
    let subtotalCents = 0;

    safeItems.forEach((item) => {
      const amountCents = Math.max(0, Math.round(Number(item.amountCents) || 0));
      const assignedIds = [...new Set(Array.isArray(item.personIds) ? item.personIds : [])]
        .filter((id) => knownPeople.has(id));

      if (assignedIds.length === 0) {
        unassignedItems.push({ id: item.id, name: item.name, amountCents });
        unassignedCents += amountCents;
        return;
      }

      const itemShares = allocateCents(
        amountCents,
        assignedIds.map((id) => ({ id, weight: 1 }))
      );

      itemShares.forEach((share) => {
        personSubtotals.set(share.id, personSubtotals.get(share.id) + share.cents);
      });
      subtotalCents += amountCents;
    });

    const safeTaxRate = clampRate(taxRate);
    const safeTipRate = clampRate(tipRate);
    const taxCents = calculatePercentageCents(subtotalCents, safeTaxRate);
    const tipCents = calculatePercentageCents(subtotalCents, safeTipRate);
    const weightedPeople = safePeople.map((person) => ({
      id: person.id,
      weight: personSubtotals.get(person.id) || 0
    }));

    const taxShares = new Map(allocateCents(taxCents, weightedPeople).map((share) => [share.id, share.cents]));
    const tipShares = new Map(allocateCents(tipCents, weightedPeople).map((share) => [share.id, share.cents]));

    const personResults = safePeople.map((person) => {
      const personSubtotal = personSubtotals.get(person.id) || 0;
      const personTax = taxShares.get(person.id) || 0;
      const personTip = tipShares.get(person.id) || 0;
      return {
        id: person.id,
        name: person.name,
        subtotalCents: personSubtotal,
        taxCents: personTax,
        tipCents: personTip,
        totalCents: personSubtotal + personTax + personTip
      };
    });

    return {
      people: personResults,
      subtotalCents,
      taxCents,
      tipCents,
      totalCents: subtotalCents + taxCents + tipCents,
      unassignedItems,
      unassignedCents
    };
  }

  function calculatePercentageCents(amountCents, rate) {
    const basisPoints = BigInt(Math.round(clampRate(rate) * 100));
    const denominator = 10000n;
    const numerator = BigInt(Math.max(0, Math.round(amountCents))) * basisPoints;
    return Number((numerator + denominator / 2n) / denominator);
  }

  function clampRate(value) {
    const rate = Number(value);
    if (!Number.isFinite(rate)) return 0;
    return Math.min(100, Math.max(0, rate));
  }

  return { allocateCents, calculateBill, parseRupeesToPaise };
});
