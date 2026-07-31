# Ground textures

Empty on purpose. The page renders its procedural stone until files land here,
and `--texture` in `globals.css` is `none` by default — a missing
`background-image` is ignored rather than failing, so nothing breaks in the gap.

## What to put here

From <https://polyhaven.com/a/clean_asphalt>, the **diffuse** map (`diff`):

| File | Used by |
|---|---|
| `asphalt-dark.jpg` | the dark theme |
| `asphalt-light.jpg` | the light theme |

Point both at the same download if only one map is wanted — the two themes
already blend it differently (`soft-light` at 0.5 on near-black, `multiply` at
0.35 on off-white), which is most of what makes one photograph work on both.

## Take the 1K, not the 4K

The map tiles seamlessly, so resolution buys nothing here: it is repeated at
`--texture-size` (520px) regardless. A 4K JPEG is several megabytes of
background on a page whose entire job is to load instantly. 1K, saved as JPEG
at around 80, is the right trade — and run it through a WebP conversion if it
still comes out over ~150KB.

## Licence

Poly Haven publishes under CC0, so there is no attribution requirement and
nothing to add to the page. Worth knowing rather than assuming: most texture
libraries are not this permissive.

## Wiring them up

In `src/app/globals.css`:

```css
:root      { --texture: url('/textures/asphalt-dark.jpg'); }
[data-theme='light'] { --texture: url('/textures/asphalt-light.jpg'); }
```

That is the whole change. Everything else — the blend modes, the tile size, the
procedural layers underneath — is already in place.
