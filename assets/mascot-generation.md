# README mascot

Release 1.3.2 (September 15, 2026) retains this artwork and its existing exports. No artwork was regenerated for this release.

The README uses `assets/mascot.png`. The built-in image generation tool removed the baked-in checkerboard on September 10, 2026. The output was visually inspected and its PNG alpha channel verified to contain fully transparent background pixels.

The current project name is **ルンルンKARAOKE**. This image is the repository README illustration; runtime icons are documented in [addon-icon-generation.md](addon-icon-generation.md). The source image and this provenance document are excluded from the extension ZIP.

The prompts below record the original generation process; their historical wording is retained.

## Background extraction prompt

Use case: background-extraction. Edit target: supplied README mascot. Remove the baked-in gray and white checkerboard from the exterior background and replace it with actual transparent PNG alpha (zero alpha outside subject). Preserve the exact turquoise cat, pose, smooth head, face, cream muzzle, navy outlines, white speech bubble and music note, colors and composition. Keep white inside the speech bubble opaque. No checkerboard drawing, no solid background, no shadow. Output a genuinely transparent cutout.

## Prompt

Use case: precise-object-edit. Edit the supplied Runrun Karaoke mascot image. Change ONLY this: remove the curled turquoise hair tuft on top of the head completely, replacing its base with a smooth rounded head contour between the two ears. No hair, curl, tuft, or spike. Preserve the exact original character, ears, face, expression, colors, navy outlines, singing mouth, body, arms, feet, musical-note speech balloon, placement, scale and framing. Preserve genuinely transparent background and square PNG format. This is a minimal localized edit, not a redesign.
