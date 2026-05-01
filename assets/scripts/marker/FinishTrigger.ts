import { _decorator, CCFloat, CCInteger, Component, Mat4, Node, Sprite, UITransform, Vec3 } from "cc";

const { ccclass, property } = _decorator;

@ccclass("FinishTrigger")
export class FinishTrigger extends Component {
  @property
  ropeLeftChildName: string = "rope_left";

  @property
  ropeRightChildName: string = "rope_right";

  /** Number of rigid pieces each rope is split into (more = smoother bend). */
  @property(CCInteger)
  ropeSegmentCount: number = 10;

  /** UI-space gravity (negative Y = downward in typical canvas coordinates). */
  @property(CCFloat)
  ropeGravity: number = -3200;

  @property(CCFloat)
  ropeAirDamping: number = 0.995;

  /** PBD distance iterations per frame (3–6 is stable). */
  @property(CCInteger)
  verletIterations: number = 4;

  /** Initial downward speed boost along −Y (pixels/s) right after the rip. */
  @property(CCFloat)
  ripKickDown: number = 420;

  @property(CCFloat)
  maxSimDuration: number = 6;

  /**
   * Multiplies each rope’s `UITransform.width` for physics and segments (1 = match scene art).
   * Values below 1 shorten both halves; does not resize the original sprites before rip.
   */
  @property({ type: CCFloat, min: 0.15, max: 1.5, step: 0.05 })
  ropeLengthScale: number = 1;

  /**
   * Extra length per segment (pixels) so slices overlap slightly at joints.
   * The rope art uses a 9-sliced sprite; without overlap, anti-alias can read as gaps.
   */
  @property(CCFloat)
  segmentOverlapPx: number = 2;

  private _ripped = false;
  private _simulating = false;
  private _simTime = 0;

  private _ropeLeft: Node | null = null;
  private _ropeRight: Node | null = null;

  private _anchorL = new Vec3();
  private _anchorR = new Vec3();
  /** Bar attachment points in `Finish` root local space (ropes stay glued while the line scrolls). */
  private _anchorLLocal = new Vec3();
  private _anchorRLocal = new Vec3();
  private _restLenL = 0;
  private _restLenR = 0;
  private _segH = 8;

  private _leftPts: Vec3[] = [];
  private _leftPrev: Vec3[] = [];
  private _rightPts: Vec3[] = [];
  private _rightPrev: Vec3[] = [];

  private _leftSegNodes: Node[] = [];
  private _rightSegNodes: Node[] = [];

  private readonly _tip = new Vec3();
  private readonly _d = new Vec3();

  onLoad() {
    this._ropeLeft = this.node.getChildByName(this.ropeLeftChildName);
    this._ropeRight = this.node.getChildByName(this.ropeRightChildName);
  }

  onDisable() {
    this._simulating = false;
    this._clearSegmentNodes(true);
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

    Vec3.transformMat4(this._anchorL, this._anchorLLocal, this.node.worldMatrix as Mat4);
    Vec3.transformMat4(this._anchorR, this._anchorRLocal, this.node.worldMatrix as Mat4);

    this._verletIntegrate(
      this._leftPts,
      this._leftPrev,
      this._anchorL,
      this._restLenL,
      dt,
    );
    this._verletIntegrate(
      this._rightPts,
      this._rightPrev,
      this._anchorR,
      this._restLenR,
      dt,
    );

    this._applySegments(this._leftPts, this._leftSegNodes, this._segH);
    this._applySegments(this._rightPts, this._rightSegNodes, this._segH);

    if (this._simTime >= this.maxSimDuration) {
      this._simulating = false;
    }
  }

  playRip(): void {
    if (this._ripped) return;
    const L = this._ropeLeft;
    const R = this._ropeRight;
    if (!L?.isValid || !R?.isValid) return;

    this._ripped = true;
    this._simulating = true;
    this._simTime = 0;

    const nSeg = Math.max(2, this.ropeSegmentCount | 0);
    const nPts = nSeg + 1;

    this._anchorLLocal.set(L.position);
    this._anchorRLocal.set(R.position);

    this._anchorL.set(L.worldPosition);
    this._anchorR.set(R.worldPosition);

    const spL = L.getComponent(Sprite);
    const spR = R.getComponent(Sprite);
    const utL = L.getComponent(UITransform);
    const utR = R.getComponent(UITransform);
    if (!spL?.spriteFrame || !spR?.spriteFrame || !utL || !utR) {
      this._ripped = false;
      this._simulating = false;
      return;
    }

    const scale = Math.min(1.5, Math.max(0.1, this.ropeLengthScale));
    const lenL = utL.width * scale;
    const lenR = utR.width * scale;
    this._restLenL = lenL / nSeg;
    this._restLenR = lenR / nSeg;
    this._segH = Math.max(utL.height, utR.height, 4);

    this._resizePts(this._leftPts, nPts);
    this._resizePts(this._leftPrev, nPts);
    this._resizePts(this._rightPts, nPts);
    this._resizePts(this._rightPrev, nPts);

    this._initChainWorld(this._leftPts, this._anchorL, L.worldMatrix as Mat4, lenL);
    this._initChainWorld(this._rightPts, this._anchorR, R.worldMatrix as Mat4, lenR);

    const dt0 = 1 / 60;
    const kickStep = Math.max(0, this.ripKickDown) * dt0;
    for (let i = 1; i < nPts; i++) {
      this._leftPrev[i].set(
        this._leftPts[i].x,
        this._leftPts[i].y + kickStep,
        this._leftPts[i].z,
      );
      this._rightPrev[i].set(
        this._rightPts[i].x,
        this._rightPts[i].y + kickStep,
        this._rightPts[i].z,
      );
    }
    this._leftPrev[0].set(this._leftPts[0]);
    this._rightPrev[0].set(this._rightPts[0]);

    this._clearSegmentNodes(false);
    this._leftSegNodes = this._buildSegments("ropeL_seg_", spL, L.layer, nSeg);
    this._rightSegNodes = this._buildSegments("ropeR_seg_", spR, R.layer, nSeg);

    L.active = false;
    R.active = false;

    this._applySegments(this._leftPts, this._leftSegNodes, this._segH);
    this._applySegments(this._rightPts, this._rightSegNodes, this._segH);
  }

  private _resizePts(arr: Vec3[], n: number): void {
    while (arr.length < n) arr.push(new Vec3());
    arr.length = n;
  }

  private _initChainWorld(out: Vec3[], anchorW: Vec3, worldMat: Mat4, length: number): void {
    this._tip.set(length, 0, 0);
    Vec3.transformMat4(this._tip, this._tip, worldMat);
    const n = out.length;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      Vec3.lerp(out[i], anchorW, this._tip, t);
    }
  }

  private _verletIntegrate(
    pts: Vec3[],
    prev: Vec3[],
    anchorW: Vec3,
    restLen: number,
    dt: number,
  ): void {
    const n = pts.length;
    const damp = this.ropeAirDamping;
    const g = this.ropeGravity * dt * dt;
    const iters = Math.max(1, this.verletIterations | 0);

    for (let i = 1; i < n; i++) {
      const cur = pts[i]!;
      const pr = prev[i]!;
      const vx = (cur.x - pr.x) * damp;
      const vy = (cur.y - pr.y) * damp;
      const vz = (cur.z - pr.z) * damp;
      pr.set(cur);
      cur.set(cur.x + vx, cur.y + vy + g, cur.z + vz);
    }

    pts[0]!.set(anchorW);

    for (let k = 0; k < iters; k++) {
      for (let i = 0; i < n - 1; i++) {
        this._constrainEdge(pts[i]!, pts[i + 1]!, restLen, i === 0);
      }
      pts[0]!.set(anchorW);
    }
  }

  private _constrainEdge(a: Vec3, b: Vec3, rest: number, fixA: boolean): void {
    this._d.set(b.x - a.x, b.y - a.y, b.z - a.z);
    const len = Math.hypot(this._d.x, this._d.y, this._d.z);
    if (len < 1e-5) return;
    if (fixA) {
      const s = rest / len;
      b.set(a.x + this._d.x * s, a.y + this._d.y * s, a.z + this._d.z * s);
      return;
    }
    const slip = (len - rest) / len;
    const hx = this._d.x * slip * 0.5;
    const hy = this._d.y * slip * 0.5;
    const hz = this._d.z * slip * 0.5;
    a.x += hx;
    a.y += hy;
    a.z += hz;
    b.x -= hx;
    b.y -= hy;
    b.z -= hz;
  }

  private _buildSegments(baseName: string, template: Sprite, layer: number, nSeg: number): Node[] {
    const out: Node[] = [];
    const parent = this.node;
    const frame = template.spriteFrame;
    if (!frame) return out;

    for (let i = 0; i < nSeg; i++) {
      const n = new Node(`${baseName}${i}`);
      n.layer = layer;
      const ui = n.addComponent(UITransform);
      ui.setAnchorPoint(0.5, 0.5);
      ui.setContentSize(1, this._segH);
      const sp = n.addComponent(Sprite);
      sp.spriteFrame = frame;
      sp.type = template.type;
      sp.sizeMode = Sprite.SizeMode.CUSTOM;
      sp.color = template.color.clone();

      if (template.type === Sprite.Type.FILLED) {
        sp.fillType = template.fillType;
        sp.fillCenter = template.fillCenter.clone();
        sp.fillStart = template.fillStart;
        sp.fillRange = template.fillRange;
      }

      parent.addChild(n);
      out.push(n);
    }
    return out;
  }

  private _applySegments(pts: Vec3[], segNodes: Node[], height: number): void {
    const n = segNodes.length;
    const overlap = Math.max(0, this.segmentOverlapPx);
    for (let i = 0; i < n; i++) {
      const p0 = pts[i]!;
      const p1 = pts[i + 1]!;
      const node = segNodes[i]!;
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const len = Math.hypot(dx, dy);
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      const mx = (p0.x + p1.x) * 0.5;
      const my = (p0.y + p1.y) * 0.5;
      const mz = (p0.z + p1.z) * 0.5;
      node.setWorldPosition(mx, my, mz);
      node.setRotationFromEuler(0, 0, ang);
      const ui = node.getComponent(UITransform)!;
      ui.setContentSize(Math.max(1, len + overlap), height);
    }
  }

  /** @param restoreRopes show original `rope_left` / `rope_right` again after removing runtime segments */
  private _clearSegmentNodes(restoreRopes: boolean): void {
    for (const n of this._leftSegNodes) {
      if (n.isValid) n.destroy();
    }
    for (const n of this._rightSegNodes) {
      if (n.isValid) n.destroy();
    }
    this._leftSegNodes.length = 0;
    this._rightSegNodes.length = 0;

    if (restoreRopes) {
      const L = this._ropeLeft;
      const R = this._ropeRight;
      if (L?.isValid) L.active = true;
      if (R?.isValid) R.active = true;
    }
  }
}
