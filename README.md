# AI Vision Inspection & Measurement

A smartphone-browser prototype for AI-assisted mechanical component inspection, dimensional measurement, calibration and engineering reporting.

## Assignment coverage

This prototype demonstrates:

- Smartphone camera input and image upload
- Photo/live/video-frame workflow
- Component selection/classification layer for hex bolt, washer and mounting bracket
- Reference-based pixel-to-mm calibration
- Dimensional measurement overlay
- Engineering PASS/FAIL evaluation
- Fastener/engineering database concept
- Explicit uncertainty communication
- PDF inspection report generation
- Mobile responsive interface

## Engineering approach

### AI vs classical computer vision

AI should answer **what is the object?** and provide a confidence estimate. Classical computer vision is preferable for deterministic geometric operations such as edge extraction, contours, circles, distances and dimensional overlays.

The current submission is intentionally structured with a replaceable inference layer. The prototype uses engineering rules and calibrated geometry for the demonstrator so that the measurement logic is transparent. OpenCV.js is loaded and can be extended with ArUco/reference detection or a trained detector.

### Calibration

The scale is:

`scale_mm_per_pixel = reference_length_mm / reference_length_pixels`

Then:

`measured_dimension_mm = measured_dimension_pixels × scale_mm_per_pixel`

The UI exposes the calibration inputs and reports an uncertainty estimate rather than claiming metrology-grade accuracy.

### Error and uncertainty

Important error sources:

- perspective / camera pose
- lens distortion
- blur and focus
- glare and shadows
- reference placement
- inaccurate reference detection
- object edge ambiguity

The prototype uses a conservative percentage-based uncertainty estimate. For production use this should be replaced by experimentally validated error propagation and device-specific calibration.

### What can be measured reliably

Under controlled capture and a suitable planar reference:

- 2D length and width
- hole diameter
- outer diameter
- hole-to-hole distance
- edge distance
- approximate angles

### What cannot be trusted from one ordinary image

- hidden geometry
- true 3D depth
- internal thread geometry
- precise thread pitch from a normal camera
- critical production tolerances without metrology verification

## Components demonstrated

1. Hex bolt — required standard fastener
2. Washer
3. Mounting bracket

## Run locally

Requires a current Node.js installation.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. Camera access requires localhost or HTTPS.

Production build:

```bash
npm run build
npm run preview
```

## Deploy

Vercel is the easiest option: push the repository to GitHub, import it into Vercel, and use the standard Vite build. GitHub Pages is also supported through a Vite GitHub Actions workflow.

## Suggested demonstration

Capture or upload three controlled images:

- Hex bolt next to a 50 mm ruler/reference
- Washer next to the same reference
- Mounting bracket next to the same reference

Show:

camera → identification → calibration → measurement → inspection → PASS/FAIL → PDF.

## Important prototype note

This is an engineering prototype, not a certified measurement instrument. Critical dimensions should always be verified using calibrated physical measurement equipment.
