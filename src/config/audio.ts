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
