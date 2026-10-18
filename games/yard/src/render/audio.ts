// The Yard's music and sound-effect wiring on top of the shared layers: which
// track plays for which wave, which event plays which cue, which loops follow
// which state flags. The numbers live in config/audio.ts.

import type { MusicConfig } from '@shared/music';
import type { SfxConfig } from '@shared/sfx';
import { MUSIC, MUSIC_CROSSFADE_MS, MUSIC_VOLUME, SFX_GAIN, SFX_LOOPS, SFX_MIN_GAP_MS, SFX_ONESHOT, SFX_VOLUME } from '../config/audio';
import type { GameState, SimEvent } from '../sim/types';

// Before the first wave the first track plays; after a win or loss, silence (fade out).
export const yardMusic: MusicConfig<GameState> = {
  pick(state) {
    if (state.phase !== 'playing') return null;
    const wave = Math.max(1, state.wave.index + 1);
    let pick: (typeof MUSIC)[number] | undefined;
    for (const t of MUSIC) if (t.fromWave <= wave && (!pick || t.fromWave > pick.fromWave)) pick = t;
    return pick ? pick.key : null;
  },
  volume: MUSIC_VOLUME,
  crossfadeMs: MUSIC_CROSSFADE_MS,
};

export const yardSfx: SfxConfig<GameState, SimEvent> = {
  oneShot(e) {
    const entry = SFX_ONESHOT[e.type];
    if (!entry) return null;
    return typeof entry === 'function' ? entry(e) : entry;
  },
  loops: SFX_LOOPS,
  loopsOn(state) {
    const p = state.players[0];
    const playing = state.phase === 'playing';
    const hasAmp = state.towers.some((t) => t.kind === 'amp');
    const blowing = hasAmp && state.bros.some((b) => b.inWind || b.windTo !== null); // inWind = being blown this tick
    return {
      shout: !!p && p.shouting && playing,
      walk: !!p && p.moving && !p.shouting && playing,
      stream: playing && state.bros.some((b) => b.phase === 'pissing' && b.kind !== 'chucker'),
      cupFlying: playing && state.cups.length > 0,
      ampRiff: playing && blowing,
      ampHum: playing && hasAmp && !blowing,
    };
  },
  volume: SFX_VOLUME,
  gain: SFX_GAIN,
  minGapMs: SFX_MIN_GAP_MS,
};
