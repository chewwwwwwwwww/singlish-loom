/** Production atlas, generated from the existing woven artwork references.
 * Its objects are individually cropped by SVG viewBox, retaining PNG alpha.
 * Use these measured rectangles, not an assumed equal-cell background grid.
 */
export const SCENE_SPRITE_ATLAS = {
  url: "/scene/kopitiam-motifs-v1.png",
  width: 1536,
  height: 1024,
} as const;

/** Row-major order matching the 27 corpus phrases. Each rectangle is isolated
 * from every neighboring motif and includes a small transparent edge margin.
 */
export const SCENE_SPRITE_RECTS = [
  { x: 78, y: 42, width: 122, height: 183 },
  { x: 276, y: 36, width: 224, height: 189 },
  { x: 563, y: 44, width: 157, height: 172 },
  { x: 802, y: 45, width: 192, height: 180 },
  { x: 1063, y: 76, width: 188, height: 134 },
  { x: 1345, y: 47, width: 113, height: 176 },
  { x: 45, y: 274, width: 197, height: 154 },
  { x: 303, y: 270, width: 187, height: 153 },
  { x: 547, y: 270, width: 201, height: 140 },
  { x: 797, y: 300, width: 205, height: 118 },
  { x: 1079, y: 276, width: 171, height: 149 },
  { x: 1324, y: 262, width: 153, height: 163 },
  { x: 45, y: 478, width: 198, height: 119 },
  { x: 293, y: 461, width: 202, height: 151 },
  { x: 555, y: 446, width: 175, height: 172 },
  { x: 799, y: 462, width: 213, height: 148 },
  { x: 1063, y: 469, width: 198, height: 150 },
  { x: 1325, y: 462, width: 169, height: 140 },
  { x: 40, y: 631, width: 215, height: 159 },
  { x: 306, y: 651, width: 190, height: 132 },
  { x: 547, y: 637, width: 200, height: 153 },
  { x: 801, y: 653, width: 195, height: 144 },
  { x: 1073, y: 653, width: 191, height: 152 },
  { x: 1331, y: 647, width: 160, height: 147 },
  { x: 51, y: 847, width: 177, height: 133 },
  { x: 305, y: 849, width: 187, height: 131 },
  { x: 552, y: 820, width: 179, height: 167 },
] as const;
