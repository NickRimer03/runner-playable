import { _decorator, CCBoolean, CCFloat, Component, Node } from "cc";
import { GameManager } from "./GameManager";
import { ScrollSpeedOverride } from "./ScrollSpeedOverride";
import { GameState, getGameState } from "./state/GameState";

const { ccclass, property, executionOrder } = _decorator;

/**
 * Scrolls all direct children of `this.node` left each frame. Runs before default (0) so recyclers see updated positions in the same frame.
 * A child can use {@link ScrollSpeedOverride} (on the child or under it) to move at its own speed instead of the container’s.
 */
@ccclass("ContainerChildrenScroll")
@executionOrder(-10)
export class ContainerChildrenScroll extends Component {
  @property(CCFloat)
  scrollSpeed: number = 200;

  @property(CCBoolean)
  useGlobalGameScrollSpeed: boolean = false;

  @property(GameManager)
  gameManager: GameManager | null = null;

  update(dt: number): void {
    const s = getGameState();
    if (s !== GameState.GAMEPLAY && s !== GameState.TUTORIAL) return;

    const commonSpeedPxPerSec = this._getScrollSpeedPxPerSec();
    for (const child of this.node.children) {
      const speedPxPerSec = this._speedPxPerSecForChild(child, commonSpeedPxPerSec);
      const dx = speedPxPerSec * dt;
      const p = child.position;
      child.setPosition(p.x - dx, p.y, p.z);
    }
  }

  /** Uses {@link ScrollSpeedOverride} on `child` or its descendants when present; otherwise the container’s shared speed. */
  private _speedPxPerSecForChild(child: Node, commonSpeedPxPerSec: number): number {
    const o = child.getComponent(ScrollSpeedOverride) ?? child.getComponentInChildren(ScrollSpeedOverride);
    if (o) {
      return o.speedPxPerSec;
    }
    return commonSpeedPxPerSec;
  }

  private _getScrollSpeedPxPerSec(): number {
    if (this.useGlobalGameScrollSpeed) {
      if (this.gameManager) {
        return this.gameManager.gameScrollSpeed;
      }
      console.warn("ContainerChildrenScroll: Use Global Game Scroll Speed is on but Game Manager is not assigned.");
    }
    return this.scrollSpeed;
  }
}
