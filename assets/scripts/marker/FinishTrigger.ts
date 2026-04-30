import { _decorator, Component } from "cc";

const { ccclass } = _decorator;

/** Marker on level finish line root (or parent of its BoxCollider2D). Required for collision handling. */
@ccclass("FinishTrigger")
export class FinishTrigger extends Component {}
