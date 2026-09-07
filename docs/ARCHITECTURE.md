# System Architecture

```text
Smartphone Camera
       |
       v
Capture / Live Frame
       |
       +------> AI inference layer (replaceable)
       |              |
       |              v
       |       Component identification
       |
       v
Reference / Calibration
       |
       v
Perspective + geometric CV
       |
       +--> dimensions
       +--> defects
       +--> tolerances
       |
       v
Engineering database
       |
       v
PASS / FAIL + confidence + uncertainty
       |
       v
PDF inspection report
```

## Extension roadmap

- ArUco marker automatic calibration
- Ruler/reference detector
- YOLO/ONNX mechanical-part detector
- Circle/contour measurement using OpenCV.js
- Lens distortion calibration
- Multi-view geometry
- Batch inspection
- Device-specific uncertainty calibration
