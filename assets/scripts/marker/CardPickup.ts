import { _decorator, Component } from "cc";

const { ccclass } = _decorator;

/** Marker on card pickup root (or parent of its BoxCollider2D). Required for collision handling. */
@ccclass("CardPickup")
export class CardPickup extends Component {}
