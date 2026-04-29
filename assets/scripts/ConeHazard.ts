import { _decorator, Component } from "cc";

const { ccclass } = _decorator;

/**
 * Marker on a cone / obstacle root (or any parent of its BoxCollider2D).
 * Character contacts are handled like an enemy hit (hurt + flash) in GameManager.
 */
@ccclass("ConeHazard")
export class ConeHazard extends Component {}
