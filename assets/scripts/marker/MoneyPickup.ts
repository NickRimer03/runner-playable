import { _decorator, Component } from "cc";

const { ccclass } = _decorator;

/** Marker on money pickup root (or parent of its BoxCollider2D). Optional if the root node is named `money`. */
@ccclass("MoneyPickup")
export class MoneyPickup extends Component {}
