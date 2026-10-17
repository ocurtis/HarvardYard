// Pure data. Everything here must survive JSON.stringify / JSON.parse unchanged.

export interface Vec {
  x: number;
  y: number;
}

export type TileKind = 'grass' | 'path' | 'tree' | 'building' | 'stone' | 'statue' | 'foot' | 'gate' | 'exit' | 'guide';

export interface BuildingData {
  name: string;
  short: string;
  box: { x0: number; y0: number; x1: number; y1: number };
  spot: Vec | null; // the lane tile where a group poses for photos; null = not a destination
}

export interface MapData {
  w: number;
  h: number;
  tiles: TileKind[]; // row-major, length w*h
  gates: Vec[]; // tile coords; bros and tourists spawn here
  exits: Vec[]; // tile coords; tourists may leave here (gates also count as exits)
  statue: Vec; // top-left tile of the 2x2
  foot: Vec; // tile coord
  guide: Vec | null; // tile coord
  buildings: BuildingData[];
}

export interface PlayerState {
  id: number;
  pos: Vec; // pixel coords, center of the player
  facing: Vec; // unit-ish direction, last non-zero move
  moving: boolean;
  shouting: boolean; // true on ticks a shout command was applied (for render)
  upgrades: { shout: number; range: number; speed: number }; // levels 0-3
}

export interface TowerState {
  id: number;
  kind: 'dig' | 'sprinkler';
  tile: Vec;
  level: number; // index into TowerDef.levels
  cooldown: number; // dig: ticks until next bone
}

export interface BoneState {
  id: number;
  pos: Vec;
  target: { kind: 'bro' | 'tourist'; id: number };
  sober: number;
}

// A thrown solo cup in flight from a chucker to the statue. Straight line on
// the ground; the renderer draws the arc. The player catches it at its shadow.
export interface CupState {
  id: number;
  from: Vec;
  to: Vec;
  pos: Vec; // ground position (the shadow)
  progress: number; // 0..1 along from->to
}

export type BroPhase = 'walking' | 'windup' | 'pissing' | 'stagger' | 'leaving';

export type BroKind = 'bro' | 'longshot' | 'chucker' | 'finals';

export interface BroState {
  id: number;
  kind: BroKind;
  pos: Vec; // pixel center
  tile: Vec; // the tile he is walking toward (or standing on when arrived)
  drunk: number; // health bar; 0 = sober = removed
  maxDrunk: number; // what he spawned with (wave-scaled), for the bar
  phase: BroPhase;
  timer: number; // ticks left in windup/stagger
  slow: number; // ticks of slow remaining (shout on a walker)
  facing: Vec;
  variant: number; // which look; the renderer maps it to a sprite variant
}

// Guides run the state machine; followers trail their guide's path.
export type TouristPhase = 'entering' | 'confused' | 'pamphleted' | 'posing' | 'leaving' | 'following';

export interface TouristState {
  id: number;
  group: number; // group id; the guide and its followers share it
  guide: boolean;
  pos: Vec;
  tile: Vec; // tile being walked toward
  phase: TouristPhase;
  stepsLeft: number; // guide: tiles still to walk while entering
  rank: number; // follower: position in line, 1 = right behind the guide
  pathIndex: number; // follower: position along the group's path, in half-tiles
  facing: Vec;
  variant: number; // head * colors + group color
  photo: number; // ticks left in the photo pose (followers)
  wet: number; // ticks of sprinkler slow remaining
}

export interface GroupState {
  path: Vec[]; // tiles the guide has stood on, in order; followers replay it
  guideGone: boolean;
  color: number; // shirt color index shared by the group
  value: number; // dollars the group is currently worth; ticks down while the guide is confused
  maxValue: number;
  locked: boolean; // true once a brochure is handed over: value stops moving
  dest: number; // -1 = the statue's foot; otherwise an index into map.buildings
  poseTimer: number; // ticks left posing at the destination
}

// Short-lived floating text for the renderer: "+$40", "-$10". Pure data; pruned by the sim.
export interface Popup {
  id: number;
  text: string;
  pos: Vec;
  tick: number;
  kind: 'gain' | 'loss' | 'info';
}

export interface WaveState {
  index: number; // 0-based; -1 before the first wave is called
  toSpawn: number; // bros still to spawn in this wave
  longshotsToSpawn: number; // of those, how many are longshots (spawned interleaved)
  chuckersToSpawn: number; // and how many are chuckers
  finalsToSpawn: number; // and finals club members
  nextSpawnTick: number;
  groupsToSpawn: number;
  nextTouristTick: number;
  active: boolean; // true from call until every bro of the wave is gone
}

// One-shot things that happened this tick, for the audio layer (and tests). Plain
// data; the sim prunes anything older than EVENT_KEEP_TICKS. Render reads, never clears.
export type SimEventType =
  | 'confused' // a guide stopped, lost
  | 'photo' // a tourist took a picture
  | 'brochure' // player handed a guide a brochure
  | 'paid' // a group paid at its destination
  | 'stormOut' // a group gave up and left
  | 'bounty' // a bro sobered out (any kind)
  | 'spawn' // a bro entered the map (kind in `kind`)
  | 'windup' // a bro started winding up
  | 'stagger' // a bro was interrupted (by shout or bone); `by` says which
  | 'boneThrow' // a dig fired
  | 'boneHit' // a bone landed
  | 'cupThrow'
  | 'cupCaught'
  | 'cupLanded'
  | 'waveStart'
  | 'statueLow' // crossed below the low-HP line
  | 'won'
  | 'lost';

export interface SimEvent {
  type: SimEventType;
  tick: number;
  pos?: Vec;
  kind?: BroKind;
  by?: 'shout' | 'bone' | 'sprinkler';
  amount?: number;
}

export type GamePhase = 'playing' | 'lost' | 'won';

export interface GameState {
  tick: number;
  seed: number;
  rng: number; // mulberry32 internal state; lives in GameState so snapshots are exact
  playerCount: number;
  phase: GamePhase;
  map: MapData;
  // Distance (in tiles) from every tile to the nearest statue-adjacent
  // walkable tile, over walkable tiles only; -1 = unreachable. Derived from
  // the map at creation; kept on state so snapshots are self-contained.
  distToStatue: number[];
  distToFoot: number[]; // same idea, target = the foot tile
  distToSpot: number[][]; // one field per building (empty for non-destinations)
  distToExit: number[]; // same idea, targets = every gate and exit
  players: PlayerState[];
  bros: BroState[];
  tourists: TouristState[];
  groups: Record<number, GroupState>;
  towers: TowerState[];
  bones: BoneState[];
  cups: CupState[];
  nextGroupId: number;
  nextEntityId: number;
  statueHp: number;
  money: number;
  notice: { text: string; tick: number } | null; // last shop result, for the HUD
  popups: Popup[];
  events: SimEvent[];
  wave: WaveState;
}

// Input enters the sim only as commands. Keyboard produces these locally;
// a relay will produce them later for online play.
export type Command =
  | { playerId: number; tick: number; type: 'move'; dx: -1 | 0 | 1; dy: -1 | 0 | 1 }
  | { playerId: number; tick: number; type: 'startWave' }
  | { playerId: number; tick: number; type: 'shout' }
  | { playerId: number; tick: number; type: 'build'; kind: 'dig' | 'sprinkler' } // at the player's tile
  | { playerId: number; tick: number; type: 'upgradeTower' } // the tower at the player's tile
  | { playerId: number; tick: number; type: 'upgradeSelf'; stat: 'shout' | 'range' | 'speed' };

export interface SimConfig {
  playerCount: number;
  seed: number;
}
