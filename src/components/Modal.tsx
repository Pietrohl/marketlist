import { Show, createEffect, onCleanup, onMount, type JSX } from 'solid-js';
import { X } from 'lucide-solid';

/** Small native-dialog wrapper: built-in focus containment, Escape and backdrop dismissal. */
export default function Modal(props: { open: boolean; title: string; subtitle?: string; closeLabel?: string; onClose: () => void; children: JSX.Element }) {
  let dialog!: HTMLDialogElement;

  onMount(() => {
    const onCancel = (event: Event) => { event.preventDefault(); props.onClose(); };
    dialog.addEventListener('cancel', onCancel);
    onCleanup(() => dialog.removeEventListener('cancel', onCancel));
  });

  createEffect(() => {
    if (props.open && !dialog.open) dialog.showModal();
    else if (!props.open && dialog.open) dialog.close();
  });

  return <dialog ref={dialog} class="modal-panel w-[min(92vw,430px)] rounded-3xl border border-[#e2e8df] bg-white p-0 text-[#1d2e27] shadow-[0_24px_100px_rgba(23,49,37,.2)] backdrop:bg-[#18392e]/40" onClick={(event) => {
    if (event.target === dialog) props.onClose();
  }}>
    <div class="p-6 sm:p-7">
      <div class="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 class="text-[22px] font-bold tracking-tight">{props.title}</h2>
          <Show when={props.subtitle}><p class="mt-1 text-sm leading-relaxed text-[#819087]">{props.subtitle}</p></Show>
        </div>
        <button type="button" onClick={props.onClose} class="icon-button -mt-1 -mr-1" aria-label={props.closeLabel ?? 'Close dialog'}><X size={19}/></button>
      </div>
      {props.children}
    </div>
  </dialog>;
}
