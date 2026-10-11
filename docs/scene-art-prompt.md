# Kopitiam scene motifs v1

Generated using the built-in image generation tool. Existing `woven-editorial-v1` artworks serve as style and motif references. The atlas deliberately removes their square backing cloth so the scene can place individual objects on shared tables, shelves and floor.

Requested atlas convention: 6 columns × 5 rows, 30 equal cells, row-major corpus order. Cells 28–30 are empty. PNG alpha is retained. Target output after geometric correction: 1536×1024, cells 256×204.8.

Actual selected output: `public/scene/kopitiam-motifs-v1.png`, 1536×1024 RGBA. All 27 motifs exist in the correct row-major order; the generator did not obey equal row spacing precisely. Production rendering therefore uses the isolated measured source rectangles in `lib/scene-sprites.ts`, not equal grid cells. This uses normal SVG image cropping and preserves the original PNG pixels and alpha without raster editing. The selected correction has genuine transparent pixels outside the motifs; RGB-only previews may show hidden background colors which the alpha channel removes.

Measured row isolation bands: y=0–245, 245–441, 441–623, 623–815, 815–1024. Each source rectangle uses its individual motif bounds (alpha ≥64) plus four pixels of padding, with no neighboring artwork inside the crop.

## Generation prompt

+ Use case: compositing / illustration-story.
 Asset type: PRODUCTION TRANSPARENT SPRITE ATLAS for an interactive living kopitiam mural.
 Primary request: Create ONE alpha-transparent PNG atlas with EXACTLY 6 equal columns and 5 equal rows (30 equally sized cells). Desired overall dimensions 1536x1280, or 1200x1000 if supported. The grid is invisible: NO dividers, NO frames, NO cell backgrounds. Row-major sequence is mandatory and precise. Each motif is a separate cutout centered in its own equally sized cell, with about 10–15% empty transparent margin around all edges. Nothing crosses a cell boundary. Last three cells, row 5 columns 4–6, are completely empty transparency.
 
 Input images: Images 1–4 are style and core-motif references. Derive isolated objects in the same elegant stitched felt / fabric cut-paper editorial style. Remove all original square cream backgrounds, architecture and tables. Image 1 supplies gentle squid with map. Image 2 supplies friendly multi-arm kopi cup, NOT an animal spider. Image 3 supplies tissue packet style. Image 4 supplies steady balanced cup and trays. This is a newly composed atlas, not a collage of the four original framed pictures.
 
 Style/medium: sophisticated small handcrafted felt appliqué objects with subtle textile grain, neatly stitched hems, slight natural soft edge shadows only. Broad clean shapes remain readable at 100px. Consistent slight front-three-quarter perspective. Friendly and witty for adults and children, NOT baby cartoon, NOT scary. Palette: deep teal #174e45, warm terracotta orange #dd6040, cream, muted lavender, soft blue, occasional green. No typography or numerals anywhere.
 
 EXACT ROW 1, cells left to right:
 1. Gentle orange squid holding a folded blue/cream/green map, small lavender rear fins, NO table, NO buildings.
 2. Orange coffee cup with eight curling fabric arms balancing a small clock, keys, spoon and toast; no animal spider, no table.
 3. Surprised green bok choy with a small open-mouth friendly expression.
 4. Badminton racket with fluttering orange/lavender ribbons and one shuttlecock.
 5. One floral patterned running shoe, warm orange with lavender flowers.
 6. One small orange bentwood kopitiam chair, no floor.
 
 EXACT ROW 2, cells left to right:
 7. Balanced deep teal kopi cup on a purple saucer and three tidy teal/orange/lavender serving trays.
 8. Two magnifying glasses side by side joined by a small tissue-paper bow.
 9. Orange rubber stamp beside a cream sealed letter.
 10. Hurrying orange curry puff on a small teal serving tray, tiny cloth motion ribbons.
 11. Small lavender/blue tissue packet with two protruding white tissues, no table or chair.
 12. Small blue/teal hand trolley, orange wheels, no other scene.
 EXACT ROW 3, cells left to right:
 13. Small simple orange footbridge, no water or landscape.
 14. Large muted purple coffee cup and a slumped cream napkin.
 15. Orange and blue kite with small lavender tail bows.
 16. Teal alarm clock beside one warmly glowing orange light bulb; no halo background.
 17. One carefully folded blue napkin threaded with a single orange sewing thread.
 18. Two cream and lavender speech ribbons, completely blank, no lettering.
 EXACT ROW 4, cells left to right:
 19. Three small blank cream/lavender/orange speech bubbles joined by a thread knot beside a magnifying glass; blank with no punctuation.
 20. One sturdy orange walking boot, teal sole.
 21. Small teal coffee cup beside orange curry puff with elegant stitched rising steam.
 22. One tipped orange coffee cup and a small dark-brown coffee spill cutout.
 23. Cream/lavender fabric mitten holding a small teal serving tray.
 24. Intricate folded blue/cream paper puzzle, compact and elegant.
 EXACT ROW 5, cells left to right:
 25. Ornate purple teacup with a teal floral motif and saucer.
 26. One small orange biscuit revealed underneath a lifted cream napkin.
 27. A lavender/cream teacup with a slumped cloth napkin and one long curving stitched steam trail.
 28. EMPTY.
 29. EMPTY.
 30. EMPTY.
 
Constraints: Real transparent alpha outside objects; never draw checkerboard pattern as pixels. Exactly six columns and five rows, equal cells across entire canvas. First 27 motifs only. 6,6,6,6,3 objects per row. NO text labels, numbers, border, UI, cards, frames, backing squares, cream rectangular canvas, wall, furniture beyond the explicitly requested chair, scene background or cell grid. Place only each named motif in its named cell. All visual elements stay inside their respective cell. The transparent empty cell backgrounds allow the client to place cutouts inside one shared kopitiam scene.

## Geometry correction prompt

+ Use case: precise-object-edit. Edit the supplied sprite atlas only to correct geometry. Preserve all 27 exact motifs, their order, textile material, friendly expressions and colors.
 The output must be an actual transparent PNG, 1536×1024 landscape, with 6 equal columns and 5 equal rows, so each cell is 256 pixels wide and 204.8 pixels tall. All 27 sprites need to be SMALLER than the source and precisely centered into these equal cell rectangles. NO object or thread crosses any cell boundary. Do not add anything.
 The existing source has some objects too tall in the first rows. Shrink each isolated sprite to fit a maximum bounding box 205 wide × 153 tall, including all steam, hands and ribbons. Transparent margins around each cell are essential for clipping into a scene. Use these exact center coordinates for row-major sprites:
 ROW 1 center y=102.4: x=128 squid;384 multi-arm cup;640 bokchoy;896 racket;1152 floral shoe;1408 chair.
 ROW 2 center y=307.2: x=128 steady cup/trays;384 two magnifiers;640 stamp/letter;896 curry puff/tray;1152 tissue packet;1408 trolley.
 ROW 3 center y=512: x=128 bridge;384 purple cup/napkin;640 kite;896 clock/bulb;1152 folded blue napkin/thread;1408 two blank ribbons.
 ROW 4 center y=716.8: x=128 three blank speech bubbles/knot/glass;384 boot;640 kopi/currypuff;896 tipped cup/spill;1152 mitten/tray;1408 folded puzzle.
 ROW 5 center y=921.6: x=128 ornate teacup;384 biscuit/lifted napkin;640 teacup/slumped napkin/steam. The cells at x=896,1152,1408 in row5 remain empty.
 Critical: Exactly equal 6-column ×5-row geometry. Preserve exactly 27 sprites, not 30. Completely remove every background pixel outside the named motifs. Retain real alpha transparency, no rendered gradients, backing squares, gridlines, cards, cell borders, text, numbers or labels. Every motif centered within its cell with ample empty space.
