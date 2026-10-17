// Music and sound tuning. Tracks are rendered by art/audio/gen_music.py into
// public/audio; this picks which loop plays and how it changes.

export interface MusicTrack {
  key: string;
  fromWave: number; // 1-based; the track with the highest fromWave <= the current wave plays
}

// Owen, 2026-10-16: chill through wave 4, the bell figure at 145 BPM from wave 5, 160 from wave 10.
export const MUSIC: MusicTrack[] = [
  { key: 'chill', fromWave: 1 },
  { key: 'panic145', fromWave: 5 },
  { key: 'panic160', fromWave: 10 },
];

export const MUSIC_VOLUME = 0.5;
export const MUSIC_CROSSFADE_MS = 1500;
export const MUSIC_FORMATS = ['ogg', 'mp3']; // Phaser picks the first the browser can play

// Sound effects. Keys are files in public/audio/sfx (voice_* are Owen's takes,
// chip-crushed by art/audio/crush.py; the rest are synthesized by gen_sfx.py).
// An event maps to one or more keys; several = pick one at random per play.
export const SFX_VOLUME = 0.8;
export const SFX_FILES = [
  'brochure', 'paid', 'stormout', 'bounty', 'zipper', 'sober', 'cup_catch', 'wave_start', 'statue_low', 'lose', 'win', 'shout', 'shout_b', 'shout_c', 'stream',
  'voice_bone_throw', 'voice_bone_toss', 'voice_bone_hit', 'voice_hit', 'voice_chubby_arival', 'voice_long_range_arrival', 'voice_tuxedo_arrival',
  'voice_cup_toss', 'voice_cup_flying', 'voice_cup_landing', 'voice_hero_hitting_things', 'voice_hero_walk', 'voice_pissing_on_statue',
  'voice_bro_getting_first_hit_by_hero', 'voice_bro_getting_stopped_by_hero', 'voice_hero_hit_stream_2',
  'voice_tourist_asking_for_directions', 'voice_tourist_getting_directions', 'voice_tourist_flash',
];

// One-shots, by sim event. A function gets the event so kinds can pick different sounds.
export const SFX_ONESHOT: Record<string, string[] | ((e: { kind?: string; by?: string }) => string[] | null)> = {
  confused: ['voice_tourist_asking_for_directions'],
  photo: ['voice_tourist_flash'],
  brochure: ['voice_tourist_getting_directions', 'brochure'],
  paid: ['paid'],
  stormOut: ['stormout'],
  bounty: ['sober'],
  spawn: (e) => (e.kind === 'chucker' ? ['voice_chubby_arival'] : e.kind === 'longshot' ? ['voice_long_range_arrival'] : e.kind === 'finals' ? ['voice_tuxedo_arrival'] : null),
  windup: ['zipper'],
  stagger: (e) => (e.by === 'shout' ? ['voice_bro_getting_stopped_by_hero', 'voice_bro_getting_first_hit_by_hero', 'voice_hero_hitting_things', 'voice_hero_hit_stream_2'] : e.by === 'bone' ? ['voice_bone_hit', 'voice_hit'] : null),
  boneThrow: ['voice_bone_throw', 'voice_bone_toss'],
  boneHit: [], // the stagger covers it; keep the bone itself quiet so a Dig line doesn't machine-gun
  cupThrow: ['voice_cup_toss'],
  cupCaught: ['cup_catch'],
  cupLanded: ['voice_cup_landing'],
  waveStart: ['wave_start'],
  statueLow: ['statue_low'],
  won: ['win'],
  lost: ['lose'],
};

// Loops that follow state rather than events: on while the condition holds.
export const SFX_LOOPS = {
  shout: { key: 'shout', volume: 0.35 },
  walk: { key: 'voice_hero_walk', volume: 0.17 },
  stream: { key: 'voice_pissing_on_statue', volume: 0.45 },
  cupFlying: { key: 'voice_cup_flying', volume: 0.4 },
};
// Per-key gain on top of SFX_VOLUME (1 = unchanged).
export const SFX_GAIN: Record<string, number> = {
  voice_tourist_flash: 0.4,
};
// Minimum ms between plays of the same one-shot key, so a crowd doesn't stack it.
export const SFX_MIN_GAP_MS = 70;
