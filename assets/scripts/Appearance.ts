import { _decorator, CCFloat, Component } from "cc";

const { ccclass, property } = _decorator;

/**
 * Data-only helper: target uniform local scale when this node is shown after a trigger.
 * Attach to the node that will be revealed; tweens / opacity should read {@link appearScale} elsewhere.
 */
@ccclass("Appearance")
export class Appearance extends Component {
  @property(CCFloat)
  appearScale: number = 1;
}
