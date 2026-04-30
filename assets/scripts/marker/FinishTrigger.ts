import { _decorator, CCFloat, Component, Node, Vec3 } from "cc";

const { ccclass, property } = _decorator;

const DEG = Math.PI / 180;

@ccclass("FinishTrigger")
export class FinishTrigger extends Component {
  @property
  ropeLeftChildName: string = "rope_left";

  @property
  ropeRightChildName: string = "rope_right";

  /**
   * Pendulum equilibrium depth (deg) from taut rest: left settles at restZ − depth;
   * right uses the same depth then +`rightFinalZOffsetDeg` on Z (default 180) for the sprite facing.
   */
  @property(CCFloat)
  swingDepthDeg: number = 54;

  /** If greater than 0, overrides `swingDepthDeg` for the left rope only. */
  @property(CCFloat)
  leftSwingDepthOverride: number = 0;

  /** If greater than 0, overrides `swingDepthDeg` for the right rope only. */
  @property(CCFloat)
  rightSwingDepthOverride: number = 0;

  /** Added to right rope equilibrium Z after depth (typically 180 so the hang reads correctly). */
  @property(CCFloat)
  rightFinalZOffsetDeg: number = 180;

  @property(CCFloat)
  pendulumStrength: number = 620;

  @property(CCFloat)
  angularDrag: number = 3.8;

  @property(CCFloat)
  ripImpulseDegPerSec: number = 520;

  @property(CCFloat)
  settlePull: number = 22;

  @property(CCFloat)
  flexWobbleDeg: number = 4;

  @property(CCFloat)
  flexWobbleHz: number = 10;

  @property(CCFloat)
  flexWobbleDecay: number = 2.2;

  @property(CCFloat)
  maxSimDuration: number = 4.5;

  @property(CCFloat)
  settleVelThreshold: number = 4;

  @property(CCFloat)
  settleAngleThreshold: number = 1.2;

  @property(CCFloat)
  settleHoldSec: number = 0.35;

  private _ripped = false;
  private _simulating = false;
  private _simTime = 0;
  private _settleHold = 0;

  private _ropeLeft: Node | null = null;
  private _ropeRight: Node | null = null;

  private _restLeftZ = 0;
  private _restRightZ = 0;
  private _eqLeftZ = 0;
  private _eqRightZ = 0;

  private _leftZ = 0;
  private _rightZ = 0;
  private _leftVel = 0;
  private _rightVel = 0;

  private _eulerLX = 0;
  private _eulerLY = 0;
  private _eulerRX = 0;
  private _eulerRY = 0;

  onLoad() {
    this._ropeLeft = this.node.getChildByName(this.ropeLeftChildName);
    this._ropeRight = this.node.getChildByName(this.ropeRightChildName);
  }

  onDisable() {
    this._simulating = false;
  }

  update(dt: number): void {
    if (!this._simulating) return;
    const L = this._ropeLeft;
    const R = this._ropeRight;
    if (!L?.isValid || !R?.isValid) {
      this._simulating = false;
      return;
    }

    dt = Math.min(Math.max(0, dt), 0.05);
    this._simTime += dt;

    const G = this.pendulumStrength;
    const drag = this.angularDrag;
    const pull = this.settlePull;

    const accL =
      G * Math.sin((this._eqLeftZ - this._leftZ) * DEG) - drag * this._leftVel + pull * (this._eqLeftZ - this._leftZ);
    const accR =
      G * Math.sin((this._eqRightZ - this._rightZ) * DEG) - drag * this._rightVel + pull * (this._eqRightZ - this._rightZ);

    this._leftVel += accL * dt;
    this._rightVel += accR * dt;
    this._leftZ += this._leftVel * dt;
    this._rightZ += this._rightVel * dt;

    const wobble = this.flexWobbleDeg * Math.exp(-this.flexWobbleDecay * this._simTime);
    const phase = this._simTime * this.flexWobbleHz * 2 * Math.PI;
    const wL = wobble * Math.sin(phase);
    const wR = wobble * Math.sin(phase * 1.09 + 0.5);

    L.setRotationFromEuler(this._eulerLX, this._eulerLY, this._leftZ + wL);
    R.setRotationFromEuler(this._eulerRX, this._eulerRY, this._rightZ + wR);

    const vOk = Math.abs(this._leftVel) < this.settleVelThreshold && Math.abs(this._rightVel) < this.settleVelThreshold;
    const aOk =
      Math.abs(this._eqLeftZ - this._leftZ) < this.settleAngleThreshold &&
      Math.abs(this._eqRightZ - this._rightZ) < this.settleAngleThreshold;

    if (vOk && aOk && this._simTime > 0.12) {
      this._settleHold += dt;
      if (this._settleHold >= this.settleHoldSec) {
        this._finishSim(L, R);
      }
    } else {
      this._settleHold = 0;
    }

    if (this._simTime >= this.maxSimDuration) {
      this._finishSim(L, R);
    }
  }

  private _finishSim(L: Node, R: Node): void {
    this._simulating = false;
    L.eulerAngles = new Vec3(this._eulerLX, this._eulerLY, this._eqLeftZ);
    R.eulerAngles = new Vec3(this._eulerRX, this._eulerRY, this._eqRightZ);
    this._leftZ = this._eqLeftZ;
    this._rightZ = this._eqRightZ;
    this._leftVel = 0;
    this._rightVel = 0;
  }

  playRip(): void {
    if (this._ripped) return;
    const L = this._ropeLeft;
    const R = this._ropeRight;
    if (!L?.isValid || !R?.isValid) return;

    this._ripped = true;
    this._simulating = true;
    this._simTime = 0;
    this._settleHold = 0;

    const el = L.eulerAngles;
    const er = R.eulerAngles;
    this._eulerLX = el.x;
    this._eulerLY = el.y;
    this._eulerRX = er.x;
    this._eulerRY = er.y;

    this._restLeftZ = el.z;
    this._restRightZ = er.z;

    const leftDepth = this.leftSwingDepthOverride > 0 ? this.leftSwingDepthOverride : this.swingDepthDeg;
    const rightDepth = this.rightSwingDepthOverride > 0 ? this.rightSwingDepthOverride : this.swingDepthDeg;

    this._eqLeftZ = this._restLeftZ - Math.abs(leftDepth);
    this._eqRightZ = this._restRightZ - Math.abs(rightDepth) + this.rightFinalZOffsetDeg;

    this._leftZ = this._restLeftZ;
    this._rightZ = this._restRightZ;
    const imp = Math.abs(this.ripImpulseDegPerSec);
    const dL = this._eqLeftZ - this._restLeftZ;
    this._leftVel = dL === 0 ? 0 : Math.sign(dL) * imp;
    const dR = this._eqRightZ - this._restRightZ;
    this._rightVel = dR === 0 ? 0 : Math.sign(dR) * imp;
  }
}
