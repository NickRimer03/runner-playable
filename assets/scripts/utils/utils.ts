import { Node, Tween, tween, UIOpacity } from "cc";

export function promiseTween<T = any>(tween: Tween<any>) {
  return new Promise<T>((resolve) => tween.call(resolve).start());
}

export function opacityTo(node: Node | null | undefined, to: number, duration: number = 0.25, easing: string = "linear") {
  if (!node) return;
  const o = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
  return tween(o).to(duration, { opacity: to }, { easing }).start();
}

export function opacityToPromise(
  node: Node | null | undefined,
  to: number,
  duration: number = 0.25,
  easing: string = "linear",
): Promise<void> {
  if (!node) return Promise.resolve();
  const o = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
  return promiseTween(tween(o).to(duration, { opacity: to }, { easing }));
}
