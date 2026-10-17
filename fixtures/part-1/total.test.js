import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTotal } from './total.js';

test('includes the quantity of each item', () => {
  const items = [
    { price: 3, quantity: 2 },
    { price: 6, quantity: 1 },
  ];
  assert.equal(calculateTotal(items), 12);
});

test('an empty basket totals zero', () => {
  assert.equal(calculateTotal([]), 0);
});
