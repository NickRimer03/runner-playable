import { _decorator, Component } from "cc";

const { ccclass } = _decorator;

/** Marker on card pickup root (or parent of its BoxCollider2D). Optional if the root node is named `card`. */
@ccclass("CardPickup")
export class CardPickup extends Component {}
