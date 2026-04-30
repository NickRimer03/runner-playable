import { _decorator, Component } from "cc";

const { ccclass } = _decorator;

/**
 * Marker on the tutorial pause trigger root (or parent of its BoxCollider2D).
 * {@link CharacterCollision} sets {@link GameState}.TUTORIAL_PAUSE on contact.
 */
@ccclass("TutorialPauseTrigger")
export class TutorialPauseTrigger extends Component {}
