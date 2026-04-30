import { Node, screen, Tween, tween, UIOpacity, view } from "cc";

export type ScreenOrientation = "portrait" | "landscape";

export function getCanvasSize(): { w: number; h: number } {
  const winSize = screen.windowSize;
  const scaleX = view.getScaleX();
  const scaleY = view.getScaleY();
  const w = winSize.width / scaleX;
  const h = winSize.height / scaleY;
  return { w, h };
}

export function getOrientation(size?: { w: number; h: number }): ScreenOrientation {
  const { w, h } = size ?? getCanvasSize();
  return w > h ? "landscape" : "portrait";
}

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
