# Voice takes

`npm run dev`, open http://localhost:5173/booth.html, record, name, Save & push. The dev server
writes `<name>.wav` here and commits and pushes it. `art/audio/gen_sfx.py` turns these into
chip-crushed cues (8 kHz, 4-bit) next to the synthesized ones.
