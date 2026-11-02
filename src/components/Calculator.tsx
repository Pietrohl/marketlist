import { createSignal, For, Show } from 'solid-js';
import { Delete } from 'lucide-solid';
import Modal from './Modal';
import { initialCalculatorState, pressCalculatorKey, type CalculatorKey } from '../lib/calculator';
import type { Locale } from '../lib/i18n';

const keys: CalculatorKey[] = ['clear', 'backspace', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='];
const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const labels: Partial<Record<CalculatorKey, string>> = {
  clear: 'calculatorClear', backspace: 'calculatorBackspace', '.': 'calculatorDecimal',
  '+': 'calculatorAdd', '-': 'calculatorSubtract', '*': 'calculatorMultiply', '/': 'calculatorDivide', '=': 'calculatorEquals',
};

export default function Calculator(props: {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  t: (key: string) => string;
}) {
  const [state, setState] = createSignal(initialCalculatorState);
  const press = (key: CalculatorKey) => setState(previous => pressCalculatorKey(previous, key));
  const localize = (value: string) => props.locale === 'pt-BR' ? value.replace('.', ',') : value;
  const keyLabel = (key: CalculatorKey) => key === 'clear' ? 'C' : key === '.' ? localize('.') : symbols[key as keyof typeof symbols] ?? key;

  function onKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key === 'Enter' ? '=' : event.key === ',' ? '.'
      : event.key === 'Backspace' ? 'backspace' : event.key === 'Delete' ? 'clear' : event.key;
    if (!keys.includes(key as CalculatorKey)) return;
    event.preventDefault();
    press(key as CalculatorKey);
  }

  return <Modal open={props.open} onClose={props.onClose} title={props.t('calculator')}
    closeLabel={props.t('closeDialog')} onKeyDown={onKeyDown}>
    <div class="mb-4 rounded-2xl bg-[#edf5e9] px-4 py-3 text-right tabular-nums">
      <div class="min-h-6 text-sm font-medium text-[#52715b]" aria-hidden="true">
        <Show when={state().operator}>{operator => <>{localize(String(state().previous))} {symbols[operator()]}</>}</Show>
      </div>
      <output aria-label={props.t('calculatorResult')} aria-live="polite" aria-atomic="true"
        class={`block min-h-11 wrap-anywhere font-semibold text-[#243a2e] ${state().error ? 'text-base leading-6' : 'text-[32px] leading-11 tracking-tight'}`}>
        {state().error ? props.t(state().error!) : localize(state().display)}
      </output>
    </div>
    <div class="grid grid-cols-4 gap-2">
      <For each={keys}>{key => <button type="button" onClick={() => press(key)}
        aria-label={labels[key] ? props.t(labels[key]!) : key}
        class={`calculator-key ${key === 'clear' || key === '0' ? 'col-span-2' : ''} ${key === '=' ? 'calculator-equals' : labels[key] && key !== '.' ? 'calculator-operation' : ''}`}>
        <Show when={key === 'backspace'} fallback={keyLabel(key)}><Delete size={21}/></Show>
      </button>}</For>
    </div>
    <p class="mt-4 text-center text-xs leading-5 text-[#52715b]">{props.t('calculatorSession')}</p>
  </Modal>;
}
