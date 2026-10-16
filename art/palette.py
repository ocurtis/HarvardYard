# The UFO 50 palette (32 colors), from lospec.com/palette-list/ufo-50.
# Every pixel in the game comes from this list. Keep in sync with src/config/palette.ts.
UFO50 = [
    "#ffffff", "#a48080", "#feb854", "#e8ea4a", "#58f5b1", "#64a4a4", "#cc68e4", "#fe626e",
    "#c8c8c8", "#e03c32", "#fe7000", "#63b31d", "#a4f022", "#27badb", "#fe48de", "#d10f4c",
    "#707070", "#991515", "#ca4a00", "#a3a324", "#008456", "#006ab4", "#9600dc", "#861650",
    "#000000", "#4c0000", "#783450", "#8a6042", "#003d10", "#202040", "#340058", "#4430ba",
]

def hex_to_rgb(h: str):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))

RGB = [hex_to_rgb(h) for h in UFO50]
