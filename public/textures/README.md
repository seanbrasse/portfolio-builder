# Ground textures

Poly Haven's [clean_asphalt](https://polyhaven.com/a/clean_asphalt), diffuse map
only, CC0 — nothing to attribute.

| File | Used by |
|---|---|
| `asphalt.webp` / `.jpg` | dark theme, `soft-light` |
| `asphalt-light.webp` / `.jpg` | light theme, `multiply` |

## Why two files rather than one and two blends

The untreated map is a mid-grey photograph. Multiplied against the light
theme's off-white ground it lands the whole page near 50% grey and took body
copy to **1.6:1** — the audit caught it the moment the texture went in. The
light variant is the same grain with its range shifted into the top of the
scale, so multiplying modulates the surface instead of darkening it.

Regenerate with `sharp`:

```js
sharp(diff).resize(512, 512, { fit: 'cover' })          // dark
sharp(diff).resize(512, 512).greyscale().linear(0.30, 190)  // light
```

## Why 512 and not the 1K source

It tiles at `--texture-size` (520px) regardless, so anything larger is detail
the browser scales away immediately. 684KB became under 4KB each — asphalt is
low-contrast noise, which is close to the best case for an image codec.

## The contrast floor

This sits behind every word on the page and the audit samples the *worst* pixel
behind each glyph, not the average. Raising the grain's contrast lowers the
whole site's floor: the light theme's `--ink-muted` had to darken twice to
carry it. Re-run `npm run test:contrast` after touching either file.
