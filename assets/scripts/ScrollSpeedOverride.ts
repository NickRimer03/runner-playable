import { _decorator, CCFloat, Component } from "cc";

const { ccclass, property } = _decorator;

/**
 * Place on a node that is a direct child of a {@link ContainerChildrenScroll} host (or on any descendant of that child).
 * That root child moves at `speedPxPerSec` (pixels per second to the left) instead of the container’s shared speed.
 */
@ccclass("ScrollSpeedOverride")
export class ScrollSpeedOverride extends Component {
  @property(CCFloat)
  speedPxPerSec: number = 200;
}
