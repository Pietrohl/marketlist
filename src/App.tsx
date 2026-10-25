import { createEffect, createMemo, createSignal, For, Show, onCleanup, onMount } from 'solid-js';
import {
  ArrowRight, Check, CheckCheck, CheckCircle2, ChevronDown,
  CircleHelp, CloudOff, Download, Ellipsis, Leaf, ListChecks,
  Pencil, Plus, RotateCcw, Search, ShoppingBasket, Sparkles, Trash2, X,
} from 'lucide-solid';
import Modal from './components/Modal';
import { ListIcon } from './components/ListIcon';
import { dateAgo, fold, formatAddedAt, LIST_ICONS, newId, remainingCount, sortItems } from './lib/lists';
import { findSimilarItems } from './lib/search';
import type { AppState, ShoppingItem, ShoppingList } from './lib/types';
import type { Locale } from './lib/i18n';
import { saveState } from './lib/storage';

type DialogMode = 'new-list' | 'rename-list' | 'delete-list' | null;
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type NavigatorWithInstalledApps = Navigator & {
  getInstalledRelatedApps?: () => Promise<Array<{ platform: string }>>;
  standalone?: boolean;
};
const INSTALLED_APP_KEY = 'gather-pwa-installed-v1';

type AppProps = {
  initialState: AppState;
  storageCorrupt: boolean;
  storageUnavailable: boolean;
  locale: () => Locale;
  t: (key: string, values?: Record<string, string | number>) => string;
  onToggleLocale: () => void;
  onReset: () => void;
};

export default function App(props: AppProps) {
  const t = props.t;
  const activeLocale = props.locale;
  const [state, setState] = createSignal<AppState>(props.initialState);
  const [storageWarning, setStorageWarning] = createSignal(props.storageUnavailable);
  const [newItemName, setNewItemName] = createSignal('');
  const [editingItemId, setEditingItemId] = createSignal<string | null>(null);
  const [editingItemName, setEditingItemName] = createSignal('');
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [dialogMode, setDialogMode] = createSignal<DialogMode>(null);
  const [draftListName, setDraftListName] = createSignal('');
  const [draftListIcon, setDraftListIcon] = createSignal('🛒');
  const [dialogError, setDialogError] = createSignal('');
  const [toast, setToast] = createSignal('');
  const [toastAction, setToastAction] = createSignal<{ label: string; onClick: () => void } | null>(null);
  const [inputFocused, setInputFocused] = createSignal(false);
  const [showAllIcons, setShowAllIcons] = createSignal(false);
  const [stickyProgressVisible, setStickyProgressVisible] = createSignal(false);
  const [installPrompt, setInstallPrompt] = createSignal<InstallPromptEvent | null>(null);
  const [appInstalled, setAppInstalled] = createSignal(false);
  const [standaloneMode, setStandaloneMode] = createSignal(false);
  let itemInput!: HTMLInputElement;
  let menuElement!: HTMLDivElement;
  let progressBar!: HTMLDivElement;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  const activeList = createMemo(() => state().lists.find(list => list.id === state().activeListId) ?? state().lists[0]);
  const orderedItems = createMemo(() => sortItems(activeList()?.items ?? [], props.locale()));
  const pendingItems = createMemo(() => orderedItems().filter(item => !item.checked));
  const completedItems = createMemo(() => orderedItems().filter(item => item.checked));
  const completePercent = createMemo(() => {
    const total = activeList()?.items.length ?? 0;
    return total ? Math.round(completedItems().length / total * 100) : 0;
  });
  const similarItems = createMemo(() => findSimilarItems(newItemName(), state().lists));
  const exactOnCurrentList = createMemo(() => activeList()?.items.some(item => fold(item.name) === fold(newItemName())) ?? false);

  function beforeInstallPrompt(event: Event) {
    event.preventDefault();
    setInstallPrompt(event as InstallPromptEvent);
  }

  function installedApp() {
    setAppInstalled(true);
    setInstallPrompt(null);
    try { localStorage.setItem(INSTALLED_APP_KEY, 'true'); } catch { /* Current session still knows the app is installed. */ }
  }

  async function InstallApp() {
    const prompt = installPrompt();
    if (!prompt) return;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch { /* The browser may reject a prompt that is no longer available. */ }
    setInstallPrompt(null);
  }

  createEffect(() => {
    if (!props.storageCorrupt && !saveState(state())) setStorageWarning(true);
  });

  onMount(() => {
    const appNavigator = navigator as NavigatorWithInstalledApps;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || appNavigator.standalone === true;
    setStandaloneMode(isStandalone);
    if (isStandalone) installedApp();
    else {
      try {
        if (localStorage.getItem(INSTALLED_APP_KEY) === 'true') setAppInstalled(true);
      } catch { /* Continue with browser install detection. */ }
      void appNavigator.getInstalledRelatedApps?.().then(apps => {
        if (apps.some(app => app.platform === 'webapp')) installedApp();
      }).catch(() => undefined);
    }
    window.addEventListener('beforeinstallprompt', beforeInstallPrompt);
    window.addEventListener('appinstalled', installedApp);
    const visualViewport = window.visualViewport;
    let focusScrollTimer: ReturnType<typeof setTimeout> | undefined;
    const syncKeyboardViewport = () => {
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const keyboardInset = Math.max(0, window.innerHeight - viewportHeight - (visualViewport?.offsetTop ?? 0));
      document.documentElement.style.setProperty('--app-viewport-height', `${viewportHeight}px`);
      document.documentElement.style.setProperty('--keyboard-inset', `${keyboardInset}px`);

      if (keyboardInset > 100) {
        const focused = document.activeElement;
        if (focused instanceof HTMLElement && focused.matches('input, textarea, select')) {
          const bounds = focused.getBoundingClientRect();
          const visibleBottom = (visualViewport?.offsetTop ?? 0) + viewportHeight;
          if (bounds.bottom > visibleBottom - 16) focused.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };
    const scheduleFocusScroll = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches('input, textarea, select')) return;
      if (focusScrollTimer) clearTimeout(focusScrollTimer);
      focusScrollTimer = setTimeout(() => {
        const bounds = target.getBoundingClientRect();
        const visibleBottom = (visualViewport?.offsetTop ?? 0) + (visualViewport?.height ?? window.innerHeight);
        if (bounds.bottom > visibleBottom - 16) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    };
    const updateStickyProgress = () => {
      const progressBounds = progressBar.getBoundingClientRect();
      const isVisible = stickyProgressVisible();
      const shouldShow = isVisible ? progressBounds.top < 32 : progressBounds.bottom < 0;
      if (shouldShow !== isVisible) setStickyProgressVisible(shouldShow);
    };

    const handlePointer = (event: PointerEvent) => {
      if (menuOpen() && menuElement && !menuElement.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        if (editingItemId()) setEditingItemId(null);
      }
    };
    window.addEventListener('scroll', updateStickyProgress, { passive: true });
    window.addEventListener('resize', updateStickyProgress);
    window.addEventListener('resize', syncKeyboardViewport);
    document.addEventListener('focusin', scheduleFocusScroll);
    visualViewport?.addEventListener('resize', syncKeyboardViewport);
    visualViewport?.addEventListener('scroll', syncKeyboardViewport);
    syncKeyboardViewport();
    updateStickyProgress();
    window.addEventListener('pointerdown', handlePointer);
    window.addEventListener('keydown', handleKey);
    onCleanup(() => {
      window.removeEventListener('scroll', updateStickyProgress);
      window.removeEventListener('resize', updateStickyProgress);
      window.removeEventListener('resize', syncKeyboardViewport);
      document.removeEventListener('focusin', scheduleFocusScroll);
      visualViewport?.removeEventListener('resize', syncKeyboardViewport);
      visualViewport?.removeEventListener('scroll', syncKeyboardViewport);
      if (focusScrollTimer) clearTimeout(focusScrollTimer);
      window.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('beforeinstallprompt', beforeInstallPrompt);
      window.removeEventListener('appinstalled', installedApp);
      if (toastTimer) clearTimeout(toastTimer);
    });
  });

  const notify = (message: string, action: { label: string; onClick: () => void } | null = null) => {
    setToast(message);
    setToastAction(action);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      setToast('');
      setToastAction(null);
    }, 10000);
  };

  function selectList(id: string) {
    setState(previous => ({ ...previous, activeListId: id }));
    setMenuOpen(false);
    setEditingItemId(null);
    setNewItemName('');
  }

  function addItem(event?: SubmitEvent) {
    event?.preventDefault();
    const name = newItemName().trim().replace(/\s+/g, ' ');
    const targetId = activeList()?.id;
    if (!name || !targetId) return;
    addItemToList(targetId, name);
  }

  function addItemToList(targetId: string, rawName: string) {
    const name = rawName.trim().replace(/\s+/g, ' ');
    if (!name) return;
    const item: ShoppingItem = { id: newId(), name, checked: false, addedAt: new Date().toISOString() };
    setState(previous => ({
      ...previous,
      lists: previous.lists.map(list => list.id === targetId ? { ...list, items: [...list.items, item] } : list),
    }));
    setNewItemName('');
    notify(t('itemAdded', { name }));
    itemInput?.focus();
  }

  function toggleItem(itemId: string) {
    const targetId = activeList()?.id;
    setState(previous => ({
      ...previous,
      lists: previous.lists.map(list => list.id === targetId ? {
        ...list,
        items: list.items.map(item => item.id === itemId ? {
          ...item,
          checked: !item.checked,
          ...(item.checked ? { checkedAt: undefined } : { checkedAt: new Date().toISOString() }),
        } : item),
      } : list),
    }));
  }

  function setActiveListItemsChecked(checked: boolean) {
    const targetId = activeList()?.id;
    if (!targetId) return;
    const checkedAt = new Date().toISOString();
    setState(previous => ({
      ...previous,
      lists: previous.lists.map(list => list.id === targetId ? {
        ...list,
        items: list.items.map(item => item.checked === checked ? item : {
          ...item,
          checked,
          checkedAt: checked ? checkedAt : undefined,
        }),
      } : list),
    }));
  }

  function deleteItem(itemId: string) {
    const target = activeList();
    const targetId = target?.id;
    const removedItem = target?.items.find(item => item.id === itemId);
    if (!targetId || !removedItem) return;
    setState(previous => ({
      ...previous,
      lists: previous.lists.map(list => list.id === targetId ? {
        ...list, items: list.items.filter(item => item.id !== itemId),
      } : list),
    }));
    notify(t('itemRemoved'), {
      label: t('undo'),
      onClick: () => {
        setState(previous => ({
          ...previous,
          lists: previous.lists.map(list => list.id === targetId && !list.items.some(item => item.id === removedItem.id)
            ? { ...list, items: [...list.items, removedItem] }
            : list),
        }));
        setToast('');
        setToastAction(null);
        if (toastTimer) clearTimeout(toastTimer);
      },
    });
  }

  function saveItemEdit(itemId: string) {
    const name = editingItemName().trim().replace(/\s+/g, ' ');
    if (!name) { setEditingItemId(null); return; }
    const targetId = activeList()?.id;
    setState(previous => ({
      ...previous,
      lists: previous.lists.map(list => list.id === targetId ? {
        ...list, items: list.items.map(item => item.id === itemId ? { ...item, name } : item),
      } : list),
    }));
    setEditingItemId(null);
  }

  function openDialog(mode: Exclude<DialogMode, null>) {
    setDialogError('');
    setMenuOpen(false);
    setDialogMode(mode);
    setDraftListName(mode === 'rename-list' ? activeList()?.name ?? '' : '');
    setDraftListIcon(mode === 'rename-list' ? activeList()?.icon ?? '🛒' : '🛒');
    setShowAllIcons(false);
  }

  function submitList(event: SubmitEvent) {
    event.preventDefault();
    const name = draftListName().trim().replace(/\s+/g, ' ');
    if (!name) { setDialogError(t('emptyListName')); return; }
    if (name.length > 42) { setDialogError(t('listNameTooLong')); return; }
    const duplicate = state().lists.some(list => fold(list.name) === fold(name) &&
      (dialogMode() === 'new-list' || list.id !== activeList()?.id));
    if (duplicate) { setDialogError(t('duplicateList')); return; }

    if (dialogMode() === 'new-list') {
      const newList: ShoppingList = {
        id: newId(), name, icon: draftListIcon(), createdAt: new Date().toISOString(), items: [],
      };
      setState(previous => ({ ...previous, activeListId: newList.id, lists: [...previous.lists, newList] }));
      notify(t('listCreated'));
    } else if (dialogMode() === 'rename-list') {
      const id = activeList()?.id;
      setState(previous => ({ ...previous, lists: previous.lists.map(list =>
        list.id === id ? { ...list, name, icon: draftListIcon() } : list) }));
      notify(t('listUpdated'));
    }
    setDialogMode(null);
  }

  function deleteCurrentList() {
    if (state().lists.length <= 1) return;
    const id = activeList()?.id;
    setState(previous => {
      const remaining = previous.lists.filter(list => list.id !== id);
      return { ...previous, lists: remaining, activeListId: remaining[0].id };
    });
    setDialogMode(null);
    setNewItemName('');
    notify(t('listDeleted'));
  }

  function focusAdd() {
    itemInput.focus();
    itemInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const ListTile = (props: { list: ShoppingList; mobile?: boolean }) => (
    <button type="button" onClick={() => selectList(props.list.id)}
      aria-current={state().activeListId === props.list.id ? 'page' : undefined}
      class={props.mobile
        ? `flex shrink-0 items-center gap-3 rounded-[17px] border px-3.5 py-3 text-left transition-all ${state().activeListId === props.list.id ? 'border-[#b7d0c0] bg-[#ecf6eb] shadow-sm' : 'border-[#e5eae4] bg-white'}`
        : `group flex w-full items-center gap-3 rounded-[15px] px-3 py-3 text-left transition-all ${state().activeListId === props.list.id ? 'bg-[#e7f1e8] text-[#205845]' : 'text-[#465d50] hover:bg-[#f1f4ef]'}`}>
      <span class={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${state().activeListId === props.list.id ? 'bg-white text-[#205845]' : 'bg-[#f1f4ef] text-[#617566]'}`}>
        <ListIcon icon={props.list.icon} size={19} />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-[13px] font-bold">{props.list.name}</span>
        <span class="mt-0.5 block text-[11px] text-[#91a096]">{t('leftCount', { count: remainingCount(props.list), items: props.list.items.length })}</span>
      </span>
      <Show when={!props.mobile && state().activeListId === props.list.id}><ChevronDown size={15} class="-rotate-90 opacity-75"/></Show>
    </button>
  );

  const ItemRow = (props: { item: ShoppingItem }) => (
      <li class="group/item flex min-h-17.25 items-center gap-2 rounded-[15px] border border-[#e9eee8] bg-white px-3 py-3 shadow-[0_2px_12px_rgba(31,55,42,.025)] transition-all hover:border-[#ccdcd0] hover:shadow-sm sm:gap-3.5 sm:px-5">
      <button type="button" aria-label={props.item.checked ? t('markNeeded', { name: props.item.name }) : t('markPurchased', { name: props.item.name })}
        aria-pressed={props.item.checked}
        onClick={() => toggleItem(props.item.id)}
        class="grid h-11 w-11 -ml-1.5 shrink-0 place-items-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7055]">
        <span class={`grid h-6.5 w-6.5 place-items-center rounded-lg border-2 transition-all ${props.item.checked ? 'border-[#2d7957] bg-[#2d7957] text-white' : 'border-[#b6c7bb] bg-white group-hover/item:border-[#7aa184]'}`}>
          <Show when={props.item.checked}><Check size={16} strokeWidth={3}/></Show>
        </span>
      </button>
      <Show when={editingItemId() === props.item.id} fallback={
        <div class="min-w-0 flex-1">
          <p class={`wrap-break-word text-[14px] font-semibold leading-5 ${props.item.checked ? 'text-[#9aa59d] line-through decoration-[#b8c6ba]' : 'text-[#25382d]'}`}>{props.item.name}</p>
          <p class="mt-0.5 text-[11px] text-[#a3afa6]">{t('added', { date: dateAgo(props.item.addedAt, activeLocale(), Date.now(), { recently: t('recently'), justNow: t('justNow') }) })}</p>
        </div>
      }>
        <form class="flex min-w-0 flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); saveItemEdit(props.item.id); }}>
          <input class="min-w-0 flex-1 rounded-md border border-[#9dbca7] px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#d0e8d3]" value={editingItemName()} onInput={event => setEditingItemName(event.currentTarget.value)} aria-label={t('renameItemLabel')} maxlength={100} autofocus />
          <button class="rounded-lg bg-[#205845] px-3 text-white" type="submit" aria-label={t('saveItemName')}><Check size={17}/></button>
          <button class="rounded-lg px-2 text-[#839487]" type="button" aria-label={t('cancelRename')} onClick={() => setEditingItemId(null)}><X size={17}/></button>
        </form>
      </Show>
      <Show when={editingItemId() !== props.item.id}>
        <div class="flex shrink-0 items-center gap-0.5">
          <button type="button" class="row-action" aria-label={t('renameItem', { name: props.item.name })} onClick={() => { setEditingItemId(props.item.id); setEditingItemName(props.item.name); }}><Pencil size={15}/></button>
          <button type="button" class="row-action hover:bg-[#fff0ee]! hover:text-[#be5d4e]!" aria-label={t('removeItem', { name: props.item.name })} onClick={() => deleteItem(props.item.id)}><Trash2 size={16}/></button>
        </div>
      </Show>
    </li>
  );

  return <Show when={!props.storageCorrupt} fallback={
    <main class="startup-state">
      <h1>{t('corruptTitle')}</h1>
      <p>{t('corruptBody')}</p>
      <button type="button" onClick={props.onReset}>{t('resetData')}</button>
      <LanguageButton locale={props.locale()} t={t} onToggle={props.onToggleLocale}/>
    </main>
  }><div class="min-h-[var(--app-viewport-height,100dvh)] bg-[#f8faf7] text-[#243a2e]">
    <div aria-hidden={!stickyProgressVisible()} class={`fixed inset-x-0 top-0 z-50 transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none lg:left-[17.125rem] xl:left-[18.75rem] ${stickyProgressVisible() ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
        <div class="mx-auto w-full max-w-260 px-5 sm:px-9 lg:px-11 xl:px-16">
          <div class="rounded-b-[18px] bg-[#205845] px-4 pb-3.5 pt-3 shadow-[0_8px_22px_rgba(32,88,69,.1)] sm:px-5 sm:pb-4">
            <div class="h-2 overflow-hidden rounded-full bg-white/17" role="progressbar" aria-label={t('progress')} aria-valuemin="0" aria-valuemax="100" aria-valuenow={completePercent()}>
              <div class="h-full rounded-full bg-[#cce69b] transition-[width] duration-300" style={{ width: `${completePercent()}%` }}/>
            </div>
          </div>
        </div>
    </div>
    <div class="mx-auto flex min-h-[var(--app-viewport-height,100dvh)] max-w-384">
      {/* Desktop navigation */}
      <aside class="hidden w-68.5 shrink-0 flex-col border-r border-[#e8eee7] bg-[#fcfdfa] px-5 pb-7 pt-8 lg:flex xl:w-75 xl:px-6">
        <div class="flex items-center gap-3 px-2">
          <div class="grid h-10.75 w-10.75 place-items-center rounded-[14px] bg-[#205845] text-[#e0ecb6]"><ShoppingBasket size={24} strokeWidth={1.95}/></div>
          <span class="text-[25px] font-extrabold tracking-[-1.5px]">gather<span class="text-[#8bb491]">.</span></span>
        </div>
        <div class="mt-14 px-2">
          <span class="section-eyebrow">{t('workspace')}</span>
          <div class="mt-2 flex items-center justify-between">
            <h2 class="text-[16px] font-bold">{t('myLists')}</h2>
            <span class="grid h-6 min-w-6 place-items-center rounded-full bg-[#edf2ec] px-1.5 text-[11px] font-bold text-[#708572]">{state().lists.length}</span>
          </div>
        </div>
        <nav class="mt-5 flex flex-col gap-1" aria-label={t('shoppingLists')}>
          <For each={state().lists}>{list => <ListTile list={list} />}</For>
        </nav>
        <button type="button" onClick={() => openDialog('new-list')} class="mt-3 flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#b6cbbb] py-3.5 text-[12px] font-bold text-[#316347] transition-colors hover:bg-[#eaf4e9]"><Plus size={17}/> {t('newList')}</button>
        <div class="mt-auto">
          <div class="rounded-[19px] bg-[#eaf3e6] p-5">
            <div class="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#3d7555]"><Leaf size={19}/></div>
            <p class="text-[13px] font-bold leading-5 text-[#305740]">{t('tagline')}</p>
            <p class="mt-1.5 text-[11px] leading-5 text-[#74917b]">{t('onDevice')}</p>
          </div>
          <div class="mt-5 flex items-center gap-2 px-2 text-[11px] font-medium text-[#a1ada4]"><CloudOff size={14}/> {t('storedLocally')}</div>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        {/* Small-screen header */}
        <header class="border-b border-[#eaf0e9] bg-[#fcfdfa] lg:hidden">
          <div class="flex items-center justify-between px-5 py-4 sm:px-8">
            <div class="flex items-center gap-2.5">
              <div class="grid h-9 w-9 place-items-center rounded-xl bg-[#205845] text-[#e0ecb6]"><ShoppingBasket size={20}/></div>
              <span class="text-[23px] font-extrabold tracking-[-1.4px]">gather<span class="text-[#8bb491]">.</span></span>
            </div>
            <div class="flex items-center gap-2"><LanguageButton locale={props.locale()} t={t} onToggle={props.onToggleLocale}/><span class="flex items-center gap-1.5 rounded-full bg-[#f0f5ee] px-3 py-1.5 text-[11px] font-semibold text-[#61836b]"><CloudOff size={13}/> {t('offlineCapability')}</span></div>
          </div>
          <div class="px-5 pb-4 sm:px-8">
            <div class="mb-2.5 flex items-center justify-between">
              <span class="section-eyebrow">{t('yourLists', { count: state().lists.length })}</span>
              <div class="flex items-center gap-2">
                <Show when={appInstalled() && !standaloneMode()}><a href="web+gather://open" class="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-[#337654]"><ArrowRight size={14}/>{t('openApp')}</a></Show>
                <Show when={!appInstalled() && installPrompt()}><button type="button" class="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-[#337654]" onClick={() => void InstallApp()}><Download size={14}/>{t('installApp')}</button></Show>
                <button type="button" class="inline-flex items-center gap-1 text-xs font-bold text-[#296d4d]" onClick={() => openDialog('new-list')}><Plus size={15}/> {t('new')}</button>
              </div>
            </div>
            <nav aria-label={t('shoppingLists')} class="no-scrollbar -mr-5 flex gap-2.5 overflow-x-auto pb-1 pr-5 sm:-mr-8 sm:pr-8">
              <For each={state().lists}>{list => <ListTile list={list} mobile />}</For>
            </nav>
            <Show when={state().lists.length > 2}>
              <p class="mt-1.5 text-right text-[10px] font-medium text-[#87988b]">{t('swipeLists')}</p>
            </Show>
          </div>
        </header>

        <main class="mx-auto w-full max-w-260 px-5 pb-24 pt-7 sm:px-9 sm:pt-10 lg:px-11 lg:pb-16 lg:pt-12 xl:px-16">
          <div class="mb-6 hidden items-center justify-between lg:flex">
            <div class="flex items-center gap-2 text-[12px] font-semibold text-[#9daaa0]"><LanguageButton locale={props.locale()} t={t} onToggle={props.onToggleLocale}/>{t('myListsCrumb')} <ArrowRight size={12}/><span class="text-[#4e735c]">{activeList()?.name}</span></div>
            <div class="flex items-center gap-3 text-[12px] text-[#92a097]"><Show when={appInstalled() && !standaloneMode()}><a href="web+gather://open" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#dce8d9] bg-white px-3 font-semibold text-[#347454] hover:bg-[#f2f7f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7055]"><ArrowRight size={16}/>{t('openApp')}</a></Show><Show when={!appInstalled() && installPrompt()}><button type="button" onClick={() => void InstallApp()} class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#dce8d9] bg-white px-3 font-semibold text-[#347454] hover:bg-[#f2f7f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7055]"><Download size={16}/>{t('installApp')}</button></Show><span class="flex items-center gap-2"><CloudOff size={15}/> {t('savedLocally')}</span></div>
          </div>

          <div class="mb-7 flex items-start justify-between gap-3 sm:mb-8">
            <div class="flex min-w-0 items-start gap-3.5 sm:gap-4">
              <div class="mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e9f2e7] text-[#377356] sm:h-14 sm:w-14"><ListIcon icon={activeList()?.icon ?? '🛒'} size={26}/></div>
              <div class="min-w-0">
                <p class="mb-1 text-[11px] font-bold uppercase tracking-[.15em] text-[#7c9a82]">{t('letsGetItDone')}</p>
                <h1 class="wrap-break-word text-[clamp(25px,3.8vw,38px)] font-extrabold leading-[1.13] tracking-[-1.25px] text-[#1e3829]">{activeList()?.name ?? t('myLists')}</h1>
                <p class="mt-2 text-[12px] text-[#89988d] sm:text-[13px]">{t('oneCheck')}</p>
              </div>
            </div>
            <Show when={activeList()}>
              <div class="relative mt-1 shrink-0" ref={menuElement}>
                <button type="button" aria-label={t('listOptions')} aria-haspopup="menu" aria-expanded={menuOpen()} onClick={() => setMenuOpen(open => !open)} class="grid h-11 w-11 place-items-center rounded-xl border border-[#e2e9e0] bg-white text-[#6c806f] shadow-sm transition-colors hover:bg-[#eef5eb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7055]"><Ellipsis size={23}/></button>
                <Show when={menuOpen()}>
                  <div role="menu" class="absolute right-0 top-12 z-20 w-47.5 rounded-[14px] border border-[#e5ece4] bg-white p-1.5 shadow-[0_14px_50px_rgba(28,53,39,.14)]">
                    <button type="button" role="menuitem" class="menu-item" onClick={() => openDialog('rename-list')}><Pencil size={16}/> {t('editList')}</button>
                    <button type="button" role="menuitem" disabled={state().lists.length <= 1} class="menu-item text-[#af5c52] disabled:cursor-not-allowed disabled:opacity-40" onClick={() => openDialog('delete-list')}><Trash2 size={16}/> {t('deleteList')}</button>
                  </div>
                </Show>
              </div>
            </Show>
          </div>

          {/* Progress card */}
          <section class="relative mb-5 overflow-hidden rounded-[18px] bg-[#205845] px-4 py-3.5 text-white shadow-[0_5px_16px_rgba(32,88,69,.1)] sm:mb-6 sm:px-5 sm:py-4" aria-label={t('progress')}>
            <div class="relative flex items-center justify-between gap-4">
              <div>
                <p class="text-[10px] font-bold tracking-[.06em] text-[#bfdbbc]">{t('shoppingProgress')}</p>
                <h2 class="mt-1 text-[18px] font-bold tracking-[-.3px] sm:text-[20px]">
                  <Show when={activeList()?.items.length} fallback={t('freshStart')}><span>{pendingItems().length}</span> <span class="text-[#b7d6b6]">{t(pendingItems().length === 1 ? 'itemLeft' : 'itemsLeft')}</span></Show>
                </h2>
                <p class="mt-0.5 text-[11px] text-[#c2ddca]">{activeList()?.items.length ? (completePercent() === 100 ? t('allDone') : t('checkedProgress', { done: completedItems().length, total: activeList()?.items.length ?? 0 })) : activeList() ? t('addFirstPrompt') : t('noListsBody')}</p>
              </div>
              <span class="shrink-0 text-[17px] font-extrabold tabular-nums text-[#e4f7c9]">{completePercent()}%</span>
            </div>
            <div  ref={progressBar}  class="relative mt-3 h-2 overflow-hidden rounded-full bg-white/17" role="progressbar" aria-label={t('progress')} aria-valuemin="0" aria-valuemax="100" aria-valuenow={completePercent()}>
              <div class="h-full rounded-full bg-[#cce69b] transition-[width] duration-300" style={{ width: `${completePercent()}%` }}/>
            </div>
          </section>

          {/* Add item and fuzzy suggestion panel */}
          <section class="mb-8 sm:mb-9" aria-labelledby="add-heading">
            <div class="mb-3 flex items-center justify-between">
              <h2 id="add-heading" class="text-[17px] font-extrabold tracking-[-.25px]">{activeList() ? t('addItem') : t('noListsTitle')}</h2>
              <Show when={activeList()}><span class="hidden text-[11px] text-[#a2afa6] sm:inline">{t('typePressEnter')}</span></Show>
            </div>
            <Show when={activeList()} fallback={<div class="rounded-[18px] border border-dashed border-[#cddacf] bg-white px-6 py-8 text-center"><p class="mx-auto max-w-80 text-[13px] leading-6 text-[#89988d]">{t('noListsBody')}</p><button type="button" class="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#235d46] px-4 py-3 text-sm font-bold text-white" onClick={() => openDialog('new-list')}><Plus size={17}/>{t('createFirstList')}</button></div>}>
            <div class="rounded-[18px] border border-[#e4ebe2] bg-white p-2 shadow-[0_3px_15px_rgba(33,59,40,.035)] sm:p-2.5">
              <form class="flex gap-2" onSubmit={addItem}>
                <div class="flex min-w-0 flex-1 items-center gap-2.5 pl-2 sm:pl-3">
                  <Search size={19} class="shrink-0 text-[#a1b3a4]"/>
                  <input ref={itemInput} id="new-item-input" name="item-name" type="text" autocomplete="off" enterkeyhint="done" maxlength={100}
                    placeholder={t('itemPlaceholder')} aria-label={t('newItem')} aria-controls="similar-items" aria-autocomplete="list"
                    value={newItemName()} onInput={event => setNewItemName(event.currentTarget.value)} onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
                    class="h-11 w-full min-w-0 bg-transparent text-[13px] font-medium text-[#2a4332] outline-none placeholder:text-[#a4b0a7] sm:h-12 sm:text-[14px]"/>
                  <Show when={newItemName().length > 0}><button type="button" class="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[#718879] hover:bg-[#f1f5f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7055]" aria-label={t('clearInput')} onClick={() => { setNewItemName(''); itemInput.focus(); }}><X size={16}/></button></Show>
                </div>
                <button type="submit" disabled={!newItemName().trim()} class="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#235d46] px-4 text-[12px] font-bold text-white transition-all hover:bg-[#174632] disabled:cursor-not-allowed disabled:opacity-45 sm:h-12 sm:px-5 sm:text-[13px]"><Plus size={18} strokeWidth={2.5}/><span>{t('addItem')}</span></button>
              </form>

              <Show when={newItemName().trim().length >= 2}>
                <div id="similar-items" class="mt-2 border-t border-[#edf1eb] px-2 pb-1 pt-3 sm:px-3" aria-live="polite">
                  <div class="mb-3 flex items-center gap-2 text-[11px] font-bold text-[#7c907f]">
                    <Sparkles size={15} class="text-[#7caa77]"/>
                    <span>{similarItems().length ? t('similarItems') : t('noSimilar')}</span>
                    <Show when={similarItems().length}><span class="ml-auto rounded-full bg-[#edf4e9] px-2 py-0.5 text-[10px] text-[#558065]">{t('found', { count: similarItems().length })}</span></Show>
                  </div>
                  <Show when={similarItems().length} fallback={<p class="pb-2 text-[12px] text-[#9aa89d]">{t('looksNew')}</p>}>
                    <ul class="max-h-68.75 space-y-1 overflow-y-auto" aria-label={t('similarItems')}>
                      <For each={similarItems()}>{match =>
                        <li class="flex gap-3 rounded-xl bg-[#f6f9f4] px-3 py-2.5 sm:items-center">
                          <span class={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[10px] ${match.item.checked ? 'bg-[#e0eee1] text-[#3e8760]' : 'bg-white text-[#82a088]'}`}>
                            <Show when={match.item.checked} fallback={<ShoppingBasket size={16}/>}><Check size={17}/></Show>
                          </span>
                          <div class="min-w-0 flex-1">
                            <p class="truncate text-[12px] font-bold text-[#314a37]">{match.item.name}</p>
                            <div class="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-[#8b9c8e]">
                              <span class="font-semibold text-[#52765b]">{match.list.name}</span><span>·</span>
                              <time dateTime={match.item.addedAt} title={new Date(match.item.addedAt).toLocaleString(props.locale())}>{t('added', { date: formatAddedAt(match.item.addedAt, props.locale()) })}</time>
                            </div>
                          </div>
                          <div class="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                            <span class={`h-fit rounded-full px-2 py-1 text-[10px] font-bold ${match.item.checked ? 'bg-[#e5f2e7] text-[#367854]' : 'bg-[#fff1de] text-[#a07538]'}`}>{match.item.checked ? t('checked') : t('unchecked')}</span>
                            <Show when={!activeList()?.items.some(item => fold(item.name) === fold(match.item.name))} fallback={<span class="px-1 text-[10px] font-semibold text-[#7f9282]">{t('alreadyOnList')}</span>}>
                              <button type="button" class="min-h-11 rounded-lg bg-[#205845] px-3 text-[11px] font-bold text-white transition-colors hover:bg-[#174633] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7055]" aria-label={t('addSuggestedItem', { name: match.item.name })} onClick={() => { const targetId = activeList()?.id; if (targetId) addItemToList(targetId, match.item.name); }}>{t('addSuggestion')}</button>
                            </Show>
                          </div>
                        </li>
                      }</For>
                    </ul>
                    <Show when={exactOnCurrentList()}>
                      <div class="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[#ac8043]"><CircleHelp size={13}/> {t('alreadyExists')}</div>
                    </Show>
                  </Show>
                </div>
              </Show>
            </div>
            <Show when={!newItemName().trim() && !inputFocused()}>
              <p class="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-[#9aaa9d]"><Sparkles size={13}/> {t('similarHint')}</p>
            </Show>
            </Show>
          </section>

          {/* Checklist, unchecked first then checked. Each group is alphabetically sorted. */}
          <Show when={activeList()}>
          <section aria-label={t('checklist')}>
            <div class="mb-4 flex items-center justify-between">
              <h2 class="flex items-center gap-2 text-[17px] font-extrabold tracking-[-.3px]"><ListChecks size={20} class="text-[#4b8a65]"/> {t('checklist')}</h2>
              <span class="text-[12px] font-medium text-[#9aa89b]">{t('totalItems', { count: activeList()?.items.length ?? 0 })}</span>
            </div>

            <Show when={activeList()?.items.length > 0} fallback={
              <div class="rounded-[20px] border border-dashed border-[#cddacf] bg-white px-6 py-14 text-center">
                <div class="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-[#edf5e9] text-[#57906e]"><ShoppingBasket size={30}/></div>
                <h3 class="mt-5 text-[17px] font-extrabold">{t('emptyTitle')}</h3>
                <p class="mx-auto mt-2 max-w-65 text-[13px] leading-6 text-[#94a197]">{t('emptyBody')}</p>
                <button type="button" class="mt-5 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#337654]" onClick={focusAdd}>{t('addYourFirst')} <ArrowRight size={15}/></button>
              </div>
            }>
              <div>
                <div class="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span class="h-2 w-2 rounded-full bg-[#3c9566]"/>
                  <h3 class="text-[11px] font-extrabold tracking-[.11em] text-[#657c6b]">{t('toPickUp')}</h3>
                  <span class="rounded-full bg-[#e6f0e5] px-2 py-0.5 text-[10px] font-bold text-[#4f775b]">{pendingItems().length}</span>
                  <Show when={pendingItems().length > 0}>
                    <button type="button" class="ml-auto inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[11px] font-bold text-[#337654] transition-colors hover:bg-[#edf5e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7055]" onClick={() => setActiveListItemsChecked(true)}>
                      <CheckCheck size={15}/>{t('checkAll')}
                    </button>
                  </Show>
                  <span aria-hidden="true" class="h-px min-w-3 flex-1 bg-[#e5ece4]"/>
                </div>
                <Show when={pendingItems().length} fallback={<div class="mb-6 rounded-[15px] bg-[#edf5e9] p-5 text-center text-[12px] font-semibold text-[#4d845b]"><CheckCheck size={20} class="mr-1 inline-block align-middle"/> {t('everythingChecked')}</div>}>
                  <ul class="space-y-2"><For each={pendingItems()}>{item => <ItemRow item={item}/>}</For></ul>
                </Show>
              </div>
              <Show when={completedItems().length}>
                <div class="mt-7">
                  <div class="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <CheckCircle2 size={14} class="text-[#7caf8b]"/>
                    <h3 class="text-[11px] font-extrabold tracking-[.11em] text-[#91a397]">{t('inBasket')}</h3>
                    <span class="rounded-full bg-[#eff2ed] px-2 py-0.5 text-[10px] font-bold text-[#89998c]">{completedItems().length}</span>
                    <button type="button" class="ml-auto inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[11px] font-bold text-[#718879] transition-colors hover:bg-[#eff2ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7055]" onClick={() => setActiveListItemsChecked(false)}>
                      <RotateCcw size={14}/>{t('uncheckAll')}
                    </button>
                    <span aria-hidden="true" class="h-px min-w-3 flex-1 bg-[#e5ece4]"/>
                  </div>
                  <ul class="space-y-2"><For each={completedItems()}>{item => <ItemRow item={item}/>}</For></ul>
                </div>
              </Show>
            </Show>
          </section>
          </Show>

          <footer class="mt-8 flex flex-col items-center gap-2 border-t border-[#e8eee7] pt-6 text-center text-[11px] text-[#a4b1a5] sm:flex-row sm:justify-between sm:text-left">
            <span>{t('madeFor')}</span>
            <span class="flex items-center gap-1.5"><CloudOff size={13}/> {t('privateLocal')}</span>
          </footer>
        </main>
      </div>
    </div>

    <button type="button" onClick={focusAdd} aria-label={t('jumpToAdd')} class="fixed bottom-[calc(1.25rem+var(--keyboard-inset,0px))] right-5 z-10 grid h-13.5 w-13.5 place-items-center rounded-[17px] bg-[#205845] text-white shadow-[0_8px_30px_rgba(23,71,47,.3)] transition-transform hover:scale-105 lg:hidden"><Plus size={25}/></button>

    <Show when={toast()}><div role="status" aria-live="polite" class="pointer-events-none fixed bottom-[calc(5rem+var(--keyboard-inset,0px))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#1f4c38] px-4 py-2.5 text-[12px] font-semibold text-white shadow-2xl lg:bottom-8"><span class="flex items-center gap-2 whitespace-nowrap"><CheckCircle2 size={16}/>{toast()}</span><Show when={toastAction()}>{action => <button type="button" class="pointer-events-auto min-h-11 min-w-11 rounded-full px-2 py-1 font-extrabold text-[#d6eea7] underline underline-offset-2 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" onClick={action().onClick}>{action().label}</button>}</Show></div></Show>

    <Show when={storageWarning()}><div role="status" class="fixed bottom-[calc(.75rem+var(--keyboard-inset,0px))] left-3 right-3 z-40 mx-auto max-w-xl rounded-xl border border-[#f1d9a8] bg-[#fff9e9] px-4 py-3 text-sm text-[#775f2c] shadow-lg"><strong class="block">{t('storageIssueTitle')}</strong><span>{t('storageIssueBody')}</span></div></Show>

    <Modal open={dialogMode() !== null} onClose={() => setDialogMode(null)}
      title={dialogMode() === 'new-list' ? t('createListTitle') : dialogMode() === 'rename-list' ? t('editListTitle') : t('deleteListTitle')}
      subtitle={dialogMode() === 'delete-list' ? t('deleteListSubtitle') : t('listSubtitle')} closeLabel={t('closeDialog')}>
      <Show when={dialogMode() !== 'delete-list'} fallback={
        <div>
          <p class="mb-6 rounded-xl bg-[#fff2ec] px-4 py-3 text-[13px] leading-6 text-[#8a5c45]">{t('deleteWarning', { name: activeList()?.name ?? '', count: activeList()?.items.length ?? 0 })}</p>
          <div class="flex gap-3">
            <button type="button" class="modal-secondary flex-1" onClick={() => setDialogMode(null)}>{t('cancel')}</button>
            <button type="button" class="flex-1 rounded-xl bg-[#b94e45] px-4 py-3 text-sm font-bold text-white hover:bg-[#a43f38]" onClick={deleteCurrentList}>{t('deleteList')}</button>
          </div>
        </div>
      }>
        <form onSubmit={submitList}>
          <label for="list-name" class="mb-2 block text-[12px] font-bold text-[#465c4c]">{t('listName')}</label>
          <input id="list-name" class="w-full rounded-xl border border-[#d8e2d8] px-4 py-3 text-sm outline-none focus:border-[#6b9e78] focus:ring-2 focus:ring-[#d8ecdb]" maxlength={42} placeholder={t('listNamePlaceholder')} value={draftListName()} onInput={event => { setDraftListName(event.currentTarget.value); setDialogError(''); }} />
          <p class="mb-3 mt-5 text-[12px] font-bold text-[#465c4c]">{t('chooseIcon')}</p>
          <div id="list-icons" class="grid grid-cols-4 gap-2">
            <For each={showAllIcons() ? LIST_ICONS : LIST_ICONS.slice(0, 4)}>{icon => <button type="button" aria-label={t('useIcon', { icon })} aria-pressed={draftListIcon() === icon}
              class={`grid h-11 w-full place-items-center rounded-lg border text-[19px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7055] ${draftListIcon() === icon ? 'border-[#558b64] bg-[#ebf5e9]' : 'border-[#e6ebe4] bg-white hover:bg-[#f4f8f1]'}`} onClick={() => setDraftListIcon(icon)}>{icon}</button>}</For>
          </div>
          <button type="button" class="mt-2 min-h-11 text-[12px] font-bold text-[#337654] underline underline-offset-2" aria-expanded={showAllIcons()} aria-controls="list-icons" onClick={() => setShowAllIcons(open => !open)}>{showAllIcons() ? t('fewerIcons') : t('moreIcons')}</button>
          <Show when={dialogError()}><p role="alert" class="mt-3 text-[12px] font-semibold text-[#b94e45]">{dialogError()}</p></Show>
          <div class="mt-7 flex gap-3">
            <button type="button" class="modal-secondary flex-1" onClick={() => setDialogMode(null)}>{t('cancel')}</button>
            <button type="submit" class="flex-1 rounded-xl bg-[#205845] px-4 py-3 text-sm font-bold text-white hover:bg-[#174633]">{dialogMode() === 'new-list' ? t('createList') : t('saveChanges')}</button>
          </div>
        </form>
      </Show>
    </Modal>

  </div></Show>;
}

function LanguageButton(props: { locale: Locale; t: AppProps['t']; onToggle: () => void }) {
  return <button type="button" onClick={props.onToggle} aria-label={props.t('switchLanguage')} class="min-h-11 min-w-11 rounded-lg border border-[#e2e9e0] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#55715c] hover:bg-[#f2f7f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7055]">{props.locale === 'en' ? 'PT' : 'EN'}</button>;
}
