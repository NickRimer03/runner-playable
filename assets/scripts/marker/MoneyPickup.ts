import { _decorator, Component } from "cc";

const { ccclass } = _decorator;

/** Marker on money pickup root (or parent of its BoxCollider2D). Required for collision handling. */
@ccclass("MoneyPickup")
export class MoneyPickup extends Component {}
