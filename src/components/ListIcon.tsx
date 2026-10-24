import { ShoppingBasket, Home, Pill, PawPrint, Leaf, PartyPopper, Croissant, Apple } from 'lucide-solid';
import { Match, Switch } from 'solid-js';

export function ListIcon(props: { icon: string; size?: number }) {
  const size = () => props.size ?? 20;
  return <Switch fallback={<ShoppingBasket size={size()} strokeWidth={1.9} />}>
    <Match when={props.icon === '🥑'}><Apple size={size()} strokeWidth={1.9} /></Match>
    <Match when={props.icon === '🥐'}><Croissant size={size()} strokeWidth={1.9} /></Match>
    <Match when={props.icon === '🏠'}><Home size={size()} strokeWidth={1.9} /></Match>
    <Match when={props.icon === '🎉'}><PartyPopper size={size()} strokeWidth={1.9} /></Match>
    <Match when={props.icon === '💊'}><Pill size={size()} strokeWidth={1.9} /></Match>
    <Match when={props.icon === '🐾'}><PawPrint size={size()} strokeWidth={1.9} /></Match>
    <Match when={props.icon === '🌿'}><Leaf size={size()} strokeWidth={1.9} /></Match>
  </Switch>;
}
