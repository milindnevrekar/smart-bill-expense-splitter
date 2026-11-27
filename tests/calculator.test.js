const assert = require('node:assert/strict');
const { allocateCents, calculateBill, parseRupeesToPaise } = require('../js/calculator.js');

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

// Equal splits preserve every paise, even when the amount is not divisible evenly.
{
  const result = allocateCents(101, [
    { id: 'a', weight: 1 },
    { id: 'b', weight: 1 },
    { id: 'c', weight: 1 }
  ]);
  assert.deepEqual(result.map((share) => share.cents), [34, 34, 33]);
  assert.equal(sum(result.map((share) => share.cents)), 101);
}

// Large safe-integer totals are allocated with BigInt arithmetic without losing paise.
{
  const largeTotal = Number.MAX_SAFE_INTEGER;
  const result = allocateCents(largeTotal, [
    { id: 'a', weight: 1 },
    { id: 'b', weight: 1 },
    { id: 'c', weight: 1 }
  ]);
  assert.equal(sum(result.map((share) => share.cents)), largeTotal);
}

// A shared item plus GST and tip is distributed with no lost or extra paise.
{
  const people = [{ id: 'a', name: 'Aarav' }, { id: 'b', name: 'Diya' }];
  const items = [{ id: 'i1', name: 'Dinner', amountCents: 10000, personIds: ['a', 'b'] }];
  const result = calculateBill(people, items, 5, 10);
  assert.equal(result.subtotalCents, 10000);
  assert.equal(result.taxCents, 500);
  assert.equal(result.tipCents, 1000);
  assert.equal(result.totalCents, 11500);
  assert.deepEqual(result.people.map((person) => person.totalCents), [5750, 5750]);
  assert.equal(sum(result.people.map((person) => person.totalCents)), result.totalCents);
}

// Different item assignments produce proportional tax/tip allocations.
{
  const people = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }];
  const items = [
    { id: 'i1', name: 'A only', amountCents: 1001, personIds: ['a'] },
    { id: 'i2', name: 'B and C', amountCents: 1000, personIds: ['b', 'c'] }
  ];
  const result = calculateBill(people, items, 5, 10);
  assert.equal(result.subtotalCents, 2001);
  assert.equal(sum(result.people.map((person) => person.subtotalCents)), 2001);
  assert.equal(sum(result.people.map((person) => person.taxCents)), result.taxCents);
  assert.equal(sum(result.people.map((person) => person.tipCents)), result.tipCents);
  assert.equal(sum(result.people.map((person) => person.totalCents)), result.totalCents);
}

// Items with no current assignee are visible to the caller but excluded from the bill.
{
  const people = [{ id: 'a', name: 'A' }];
  const items = [
    { id: 'i1', name: 'Assigned', amountCents: 500, personIds: ['a'] },
    { id: 'i2', name: 'Unassigned', amountCents: 250, personIds: ['missing-person'] }
  ];
  const result = calculateBill(people, items, 0, 0);
  assert.equal(result.subtotalCents, 500);
  assert.equal(result.unassignedCents, 250);
  assert.equal(result.unassignedItems.length, 1);
  assert.equal(result.totalCents, 500);
}

console.log('All SplitMate calculator tests passed.');

// Rupee input parsing preserves decimal paise without floating-point rounding errors.
{
  assert.equal(parseRupeesToPaise('1.05'), 105);
  assert.equal(parseRupeesToPaise('1.5'), 150);
  assert.equal(parseRupeesToPaise('1.00'), 100);
  assert.equal(parseRupeesToPaise('1.005'), null);
  assert.equal(parseRupeesToPaise('-1.00'), null);
  assert.equal(parseRupeesToPaise('1e2'), null);
  assert.equal(parseRupeesToPaise(''), null);
}
