import { _decorator, Component } from "cc";

const { ccclass } = _decorator;

/**
 * Marker on an enemy root (or any parent of its damage BoxCollider2D).
 * Add this to every enemy prefab / instance so CharacterCollision can detect hits without a fixed node reference.
 */
@ccclass("EnemyHazard")
export class EnemyHazard extends Component {}
