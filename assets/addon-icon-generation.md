# Add-on icon

Generated with the built-in image generation tool using `assets/mascot.png` as the identity reference, followed by a background-extraction edit. Master image: `assets/addon-icon.png`. Runtime exports: `src/mascot-icon-transparent-{16,32,48,64,96,128}.png`, resized with ImageMagick. The background is transparent (PNG alpha).

These six transparent PNG exports are the icons referenced by the current manifest for **ルンルンKARAOKE**. The extension ZIP includes the runtime exports and `src/microphone.png`; the master artwork and this provenance document remain in the repository. See [mascot-generation.md](mascot-generation.md) for the README mascot and [../readme.md](../readme.md) for current packaging instructions.

The prompts below record the original generation process; their historical wording is retained.

## Transparency edit prompt

Use case: background-extraction. Edit target: supplied Runrun Karaoke add-on icon. Change ONLY the exterior white background to genuine fully transparent alpha. Preserve exactly the cat head, navy outline, all interior colors including cream ears and muzzle, expression, framing and dimensions. Clean antialiased edges without white fringe. Output transparent PNG. No checkerboard drawing, no solid background, no shadow. All pixels outside the head must be alpha zero.

## Prompt

Use case: logo-brand. Asset type: square Firefox add-on icon for Runrun Karaoke. Input image 1 is the mascot identity reference. Create a simplified head-only icon of this exact cheerful turquoise cat mascot: two triangular ears with cream interiors, smooth rounded head with NO curl or hair tuft, dark navy bold outline, closed happy singing eyes, small navy nose, cream muzzle, wide open burgundy singing mouth with pink tongue, coral cheeks. Center the face and ears, filling 90% of a square canvas, symmetric and highly legible at 16–48 pixels. Flat clean shapes, minimal details. Remove body, arms, feet, speech balloon and music notes. No text or watermark. Use a solid plain white background; absolutely no checkerboard pattern. Preserve the mascot identity and palette.
