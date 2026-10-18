# Voice takes

`npm run dev`, open http://localhost:5173/booth.html?game=yard (served from tools/booth.html, dev only), record, name, Save & push. The dev server
writes `<name>.wav` here and commits and pushes it. `shared/art/audio/crush.py yard` turns these into
chip-crushed cues (8 kHz, 4-bit) next to the synthesized ones.
