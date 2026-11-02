type Operator = '+' | '-' | '*' | '/';
export type CalculatorKey = Operator | `${number}` | '.' | '=' | 'clear' | 'backspace';
export type CalculatorState = {
  display: string;
  previous: number | null;
  operator: Operator | null;
  replace: boolean;
  error: 'calculatorDivideByZero' | 'calculatorOverflow' | null;
};

export const initialCalculatorState: CalculatorState = {
  display: '0', previous: null, operator: null, replace: false, error: null,
};

export function pressCalculatorKey(state: CalculatorState, key: CalculatorKey): CalculatorState {
  if (key === 'clear') return initialCalculatorState;
  if (/^\d$/.test(key) || key === '.') {
    const current = state.error ? initialCalculatorState : state;
    let display = current.replace ? '0' : current.display;
    if (key === '.') {
      if (!display.includes('.')) display += '.';
    } else {
      if (display.replace(/[-.]/g, '').length >= 12 && display !== '0') return current;
      display = display === '0' ? key : display + key;
    }
    return { ...current, display, replace: false };
  }
  if (state.error) return state;
  if (key === 'backspace') {
    if (state.replace) return state;
    const display = state.display.slice(0, -1);
    return { ...state, display: display && display !== '-' ? display : '0' };
  }

  let value = Number(state.display);
  if (state.operator && state.previous !== null && !state.replace) {
    if (state.operator === '/' && value === 0) {
      return { ...initialCalculatorState, error: 'calculatorDivideByZero' };
    }
    switch (state.operator) {
      case '+': value = state.previous + value; break;
      case '-': value = state.previous - value; break;
      case '*': value = state.previous * value; break;
      case '/': value = state.previous / value; break;
    }
    // Round to the keypad's precision so sums such as 0.1 + 0.2 stay readable.
    value = Number(value.toPrecision(12));
    if (!Number.isFinite(value)) return { ...initialCalculatorState, error: 'calculatorOverflow' };
  }
  if (key === '=') {
    if (state.operator && state.replace) return state;
    return { ...initialCalculatorState, display: String(value), replace: true };
  }
  return { display: String(value), previous: value, operator: key as Operator, replace: true, error: null };
}
