import test from 'node:test';
import assert from 'node:assert/strict';
import { initialCalculatorState, pressCalculatorKey } from '../src/lib/calculator.ts';

const calculate = (keys, state = initialCalculatorState) => [...keys].reduce(pressCalculatorKey, state);

test('basic arithmetic executes in entry order, including negative and fractional results', () => {
  for (const [keys, result] of [['12+3=', '15'], ['2-5=', '-3'], ['6*7=', '42'], ['3/4=', '0.75'], ['2+3*4=', '20'], ['0.1+0.2=', '0.3']]) {
    assert.equal(calculate(keys).display, result, keys);
  }
});

test('decimal entry keeps trailing zeros, ignores duplicate separators and limits digits', () => {
  assert.equal(calculate('.5').display, '0.5');
  assert.equal(calculate('1.20.').display, '1.20');
  assert.equal(calculate('0002').display, '2');
  assert.equal(calculate('1234567890123').display, '123456789012');
  assert.equal(calculate('5+.2=').display, '5.2');
});

test('an operator can be replaced before entering the next number', () => {
  assert.equal(calculate('8+*2=').display, '16');
  assert.equal(calculate('8+==2=').display, '10');
});

test('results support another operation or a fresh calculation', () => {
  assert.equal(calculate('2+3=*4=').display, '20');
  assert.equal(calculate('2+3=7').display, '7');
  assert.equal(calculate('2+3==').display, '5');
});

test('backspace edits the current operand and clear resets the whole calculation', () => {
  const state = calculate('10+23');
  assert.equal(calculate('=', pressCalculatorKey(state, 'backspace')).display, '12');
  assert.equal(pressCalculatorKey(calculate('1'), 'backspace').display, '0');
  assert.deepEqual(pressCalculatorKey(state, 'clear'), initialCalculatorState);
  assert.deepEqual(pressCalculatorKey(calculate('2+'), 'backspace'), calculate('2+'));
});

test('division by zero has a recoverable error and never shows Infinity or NaN', () => {
  const state = calculate('5/0=');
  assert.equal(state.error, 'calculatorDivideByZero');
  assert.equal(calculate('2+3=', state).display, '5');
  assert.deepEqual(pressCalculatorKey(state, 'clear'), initialCalculatorState);
  assert.deepEqual(pressCalculatorKey(state, '+'), state);
});

test('overflow has a recoverable error', () => {
  let state = calculate('999999999999');
  for (let i = 0; i < 30 && !state.error; i++) state = calculate('*999999999999=', state);
  assert.equal(state.error, 'calculatorOverflow');
  assert.equal(calculate('4', state).display, '4');
  assert.equal(calculate('4', state).error, null);
});
