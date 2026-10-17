# Voice takes

Record with the booth: run `npm run dev`, open http://localhost:5173/booth.html, record a take,
name it, Save. Move the WAV from Downloads into this folder, then `git add art/audio/voice` and push.
`art/audio/gen_sfx.py` turns these into chip-crushed cues (8 kHz, 4-bit) next to the synthesized ones.
