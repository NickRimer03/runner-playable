import { _decorator, AudioClip, AudioSource, Component, Node } from "cc";
import { GameEvents } from "../events/GameEvents";
import { gameEventTarget } from "../events/GameEventTarget";

const { ccclass, property } = _decorator;

@ccclass("AudioClips")
class AudioClips {
  @property({ type: AudioClip }) clip: AudioClip | null = null;

  @property({
    visible() {
      return !!this.clip;
    },
  })
  isLoop: boolean = false;

  @property({
    visible() {
      return !!this.clip;
    },
  })
  volume: number = 1;

  @property({
    visible() {
      return !!this.clip;
    },
  })
  limitNumberSounds: boolean = false;

  @property({
    visible() {
      return this.limitNumberSounds;
    },
  })
  countSound: number = 3;
}

@ccclass("AudioManager")
export class AudioManager extends Component {
  @property({ type: [AudioClips] })
  audioClips: AudioClips[] = [];

  @property
  isMute: boolean = false;

  private _audioSources: Map<string, AudioSource[]> = new Map();

  start() {
    //@ts-ignore
    if (window.super_html_channel?.includes("ironsource")) {
      //@ts-ignore
      if (window.super_html && super_html.is_audio()) {
        this.changeAudioVolume(true);
      } else {
        this.changeAudioVolume(false);
      }
    }
  }

  onEnable() {
    this._subscribeEvents(true);
  }

  onDisable() {
    this._subscribeEvents(false);
  }

  private _subscribeEvents(active: boolean) {
    const func = active ? "on" : "off";

    gameEventTarget[func](GameEvents.TOGGLE_SOUND, this._onToggleAudioVolume, this);
    gameEventTarget[func](GameEvents.SOUND_PLAY, this._onAudioPlay, this);
    gameEventTarget[func](GameEvents.SOUND_STOP, this._onAudioStop, this);
  }

  private _getAudioClipByName(name: string): AudioClips | undefined {
    return this.audioClips.find((clip) => clip.clip?.name === name);
  }

  private _createAudioSource(name: string, clip: AudioClip, volume: number, loop: boolean): AudioSource {
    const sourceNode = new Node(name);

    const audioSource = sourceNode.addComponent(AudioSource);
    audioSource.node.parent = this.node;
    audioSource.clip = clip;
    audioSource.loop = loop;
    audioSource.volume = this.isMute ? 0 : volume;

    const sources = this._audioSources.get(name) || [];
    sources.push(audioSource);
    this._audioSources.set(name, sources);

    return audioSource;
  }

  private _onAudioPlay(name: string, callback?: () => void): void {
    //@ts-ignore
    if (window.super_html_channel?.includes("ironsource")) {
      //@ts-ignore

      if (window.super_html && !super_html.is_audio()) {
        console.warn("Audio is muted ironsource");
        return;
      }
    }

    if (this.isMute) {
      console.warn("Audio is muted");
      return;
    }

    const clipProps = this._getAudioClipByName(name);
    if (!clipProps || !clipProps.clip) {
      console.warn(`Audio clip with name "${name}" not found`);
      return;
    }

    let audioSources = this._audioSources.get(name) || [];
    const activeSources = audioSources.filter((source) => source.playing);

    if (clipProps.limitNumberSounds && activeSources.length >= clipProps.countSound) {
      return;
    }

    let audioSource = audioSources.find((source) => !source.playing);

    if (!audioSource) {
      audioSource = this._createAudioSource(name, clipProps.clip, clipProps.volume, clipProps.isLoop);
      audioSources.push(audioSource);
      this._audioSources.set(name, audioSources);
    }

    audioSource.volume = this.isMute ? 0 : clipProps.volume;
    audioSource.play();

    audioSource.node.once(AudioSource.EventType.ENDED, () => {
      callback?.();
    });
  }

  private _onAudioStop(name: string): void {
    const audioSources = this._audioSources.get(name) || [];
    audioSources.forEach((audioSource) => {
      audioSource.stop();
    });
  }

  private _onToggleAudioVolume(active: boolean): void {
    this.isMute = !active;

    this.audioClips.forEach((clipProps) => {
      if (!clipProps.clip) return;
      const audioSources = this._audioSources.get(clipProps.clip.name) || [];
      audioSources.forEach((audioSource) => {
        audioSource.volume = active ? clipProps.volume : 0;
      });
    });
  }

  changeAudioVolume(isAudio: boolean) {
    this._onToggleAudioVolume(isAudio);
  }
}
