# Historical stage

The editable Blender sources are `history-scroll.blend` and `history-books.blend`.
`history-reference.png` is the user-approved generated concept, used as texture
source. The scroll is a camera-mapped 2.5D relief, not a complete reconstruction of
the buildings in the concept. The bookshelf contains separate book bodies, page
blocks, bindings and textured covers. The generated image's second title is
replaced with Chinese font geometry. The historical routes use canonical names
(`旧唐书`, for example) independently of decorative cover art.

Regenerate from the repository root on Windows:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/blender/build_history_stage.py
npm run build
```

The script writes self-contained `.blend` scenes here and GLB models, rendered
posters and texture files to `public/site/models/history`. Only public assets are
bundled; Blender is not required on the web server. Reference textures are packed
into each scene/model. Rendered posters preserve navigation on mobile devices,
data-saving connections and devices without WebGL. The browser uses a fixed
camera and renders on resize or short book-hover transitions, not continuously.

This implementation approximates the concept's composition; lighting, font
metrics and the reconstructed book geometry differ from the concept. It should
not be described as a pixel-identical or fully volumetric reconstruction.

## Reading and archive still lifes

`reading-desk.blend`, `archive-books.blend`, and `modern-archive.blend` are
original, fully volumetric scenes. Their books, bowed paper sheets, bindings,
calligraphy equipment, scrolls, document clips, seals, and wooden display trays
are actual geometry. They do not use the homepage painting or camera-projected
image planes. Chinese titles use the native KaiTi font and are exported as
meshes; page rules are intentional ruled layouts rather than invented text.

Regenerate all three scenes with:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/blender/build_reading_models.py
```

To rebuild just one scene, append `-- reading-desk`, `-- archive-books`, or
`-- modern-archive`. Outputs in `public/site/models/reading` include a GLB with
its fixed orthographic camera and a 1200 × 800 RGBA poster per scene. The alpha
channel outside the objects is transparent. `manifest.json` records the exact
camera, ambient fill, softbox positions, material-compatible color settings, and
render exposure. Constant Principled materials keep the GLBs independent of
procedural textures. The posters use the full Cycles studio lighting and are
the authoritative visual appearance; a realtime viewer's shadow and tone
mapping may differ. Blender is only needed to regenerate these source assets.
