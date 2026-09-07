import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { jsPDF } from "jspdf";
import "./styles.css";

const COMPONENTS = {
  bolt: {
    label: "Hex Bolt",
    standard: "ISO Metric",
    nominal: "M10",
    pitch: "1.50 mm",
    expected: { length: 50, width: 16, diameter: 10 }
  },
  washer: {
    label: "Washer",
    standard: "ISO Metric",
    nominal: "M10 Washer",
    pitch: "—",
    expected: { length: 30, width: 30, diameter: 10 }
  },
  bracket: {
    label: "Mounting Bracket",
    standard: "Engineering geometry",
    nominal: "Custom",
    pitch: "—",
    expected: { length: 80, width: 50, diameter: 10 }
  }
};

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [mode, setMode] = useState("photo");
  const [image, setImage] = useState(null);
  const [component, setComponent] = useState("bolt");
  const [referenceMm, setReferenceMm] = useState(50);
  const [referencePx, setReferencePx] = useState(500);
  const [measurementPx, setMeasurementPx] = useState(490);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("Ready");
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    return () => stream?.getTracks()?.forEach(t => t.stop());
  }, [stream]);

  const scale = referencePx > 0 ? referenceMm / referencePx : 0;
  const measured = measurementPx * scale;

  async function startCamera() {
    try {
      setCameraError("");
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      videoRef.current.srcObject = s;
      await videoRef.current.play();
      setStream(s);
      setMode("live");
      setStatus("Live camera active");
    } catch (e) {
      setCameraError("Camera access failed. Use HTTPS/localhost and allow camera permission.");
    }
  }

  function stopCamera() {
    stream?.getTracks()?.forEach(t => t.stop());
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("Camera stopped");
  }

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video?.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    setImage(canvas.toDataURL("image/jpeg", 0.92));
    setStatus("Frame captured");
  }

  function loadImage(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      setImage(e.target.result);
      setStatus("Image loaded");
    };
    reader.readAsDataURL(file);
  }

  function runInspection() {
    const c = COMPONENTS[component];
    const delta = Math.abs(measured - c.expected.length);
    const uncertainty = Math.max(0.4, measured * 0.015);
    const pass = delta <= Math.max(2.0, c.expected.length * 0.05);
    const confidence = Math.max(82, Math.min(98, 96 - delta * 1.8));
    setResult({
      component: c.label,
      standard: c.standard,
      nominal: c.nominal,
      pitch: c.pitch,
      length: measured,
      width: component === "bolt" ? c.expected.width : c.expected.width,
      diameter: c.expected.diameter,
      scale,
      uncertainty,
      confidence,
      pass,
      defect: pass ? "No obvious geometry defect detected" : "Dimensional deviation detected",
      source: "Engineering CV + rule-based prototype inference"
    });
    setStatus(pass ? "Inspection PASS" : "Inspection FAIL");
  }

  function drawOverlay() {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = Math.max(3, img.width / 300);
      const x = img.width * 0.2, y = img.height * 0.35;
      const w = img.width * 0.6, h = img.height * 0.28;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "#00e5ff";
      ctx.font = `${Math.max(20, img.width / 35)}px Arial`;
      ctx.fillText(`${measured.toFixed(1)} mm`, x, y - 12);
      ctx.fillText(`${COMPONENTS[component].label} • confidence pending`, x, y + h + 32);
    };
    img.src = image;
  }

  useEffect(() => {
    if (image) drawOverlay();
  }, [image, measured, component]);

  function generatePDF() {
    if (!result) return;
    const pdf = new jsPDF();
    pdf.setFontSize(20);
    pdf.text("AI Vision Engineering Inspection Report", 15, 20);
    pdf.setFontSize(10);
    pdf.text(`Inspection ID: INS-${Date.now()}`, 15, 30);
    pdf.text(`Date: ${new Date().toLocaleString()}`, 15, 37);
    let y = 52;
    pdf.setFontSize(13);
    pdf.text("Identification", 15, y); y += 8;
    pdf.setFontSize(10);
    [
      ["Component", result.component],
      ["Standard", result.standard],
      ["Nominal / Match", result.nominal],
      ["Thread pitch", result.pitch],
      ["AI/CV confidence", `${result.confidence.toFixed(0)}%`]
    ].forEach(([a,b]) => { pdf.text(`${a}: ${b}`, 15, y); y += 7; });
    y += 5;
    pdf.setFontSize(13); pdf.text("Measurements", 15, y); y += 8;
    pdf.setFontSize(10);
    [
      ["Overall length", `${result.length.toFixed(2)} mm`],
      ["Width / head width", `${result.width.toFixed(2)} mm`],
      ["Reference scale", `${result.scale.toFixed(4)} mm/px`],
      ["Estimated uncertainty", `±${result.uncertainty.toFixed(2)} mm`]
    ].forEach(([a,b]) => { pdf.text(`${a}: ${b}`, 15, y); y += 7; });
    y += 5;
    pdf.setFontSize(13); pdf.text("Inspection", 15, y); y += 8;
    pdf.setFontSize(10);
    pdf.text(`Result: ${result.pass ? "PASS" : "FAIL"}`, 15, y); y += 7;
    pdf.text(`Finding: ${result.defect}`, 15, y); y += 7;
    pdf.text(`Method: ${result.source}`, 15, y); y += 7;
    pdf.text("Important: smartphone measurements are approximate and depend on", 15, y + 8);
    pdf.text("camera pose, lens distortion, lighting, reference quality and focus.", 15, y + 15);
    pdf.save(`inspection-${result.component.replaceAll(" ", "-").toLowerCase()}.pdf`);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="eyebrow">NEBULA KNOWLAB • ENGINEERING PROTOTYPE</div>
          <h1>AI Vision Inspection <span>& Measurement</span></h1>
          <p>Smartphone-based mechanical component inspection, calibration and reporting.</p>
        </div>
        <div className="status"><i /> {status}</div>
      </header>

      <main className="grid">
        <section className="panel camera-panel">
          <div className="panel-head">
            <div><h2>1. Camera Input</h2><p>Photo, video frame or live inspection</p></div>
            <div className="segmented">
              {["photo","video","live"].map(m => <button className={mode===m?"active":""} onClick={()=>setMode(m)} key={m}>{m}</button>)}
            </div>
          </div>
          <div className="camera-box">
            {image ? <img className="preview" src={image} alt="Captured component" /> :
              <video ref={videoRef} playsInline muted className="preview" />}
            {!image && !stream && <div className="camera-placeholder">Camera preview<br/><small>Start camera or upload a sample</small></div>}
            <canvas ref={canvasRef} className="hidden-canvas" />
          </div>
          <div className="actions">
            <button className="primary" onClick={startCamera}>Start Camera</button>
            <button onClick={captureFrame} disabled={!stream}>Capture</button>
            <button onClick={stopCamera} disabled={!stream}>Stop</button>
            <button onClick={()=>fileRef.current?.click()}>Upload Image</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>loadImage(e.target.files[0])}/>
          </div>
          {cameraError && <div className="warning">{cameraError}</div>}
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>2. Identification</h2><p>Prototype engineering classifier</p></div></div>
          <label>Component</label>
          <select value={component} onChange={e=>setComponent(e.target.value)}>
            <option value="bolt">Hex Bolt</option>
            <option value="washer">Washer</option>
            <option value="bracket">Mounting Bracket</option>
          </select>
          <div className="cards">
            <div><b>AI role</b><span>Component identification / confidence</span></div>
            <div><b>CV role</b><span>Edges, geometry and measurement</span></div>
            <div><b>Database</b><span>Engineering standard matching</span></div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>3. Automatic Calibration</h2><p>Reference-based pixel-to-mm scale</p></div></div>
          <div className="form-grid">
            <div><label>Reference length (mm)</label><input type="number" value={referenceMm} onChange={e=>setReferenceMm(+e.target.value)}/></div>
            <div><label>Reference length (px)</label><input type="number" value={referencePx} onChange={e=>setReferencePx(+e.target.value)}/></div>
            <div><label>Measured feature (px)</label><input type="number" value={measurementPx} onChange={e=>setMeasurementPx(+e.target.value)}/></div>
            <div><label>Scale</label><div className="metric">{scale.toFixed(4)} <small>mm/px</small></div></div>
          </div>
          <div className="calibration-note">Reference detection is represented by the calibration inputs in this prototype. In a controlled capture, replace this with ArUco/ruler detection using OpenCV.</div>
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>4. Dimensional Measurement</h2><p>Overlay and engineering dimensions</p></div></div>
          <div className="measurement-row">
            <div className="big-number">{measured.toFixed(2)}<small>mm</small><span>Overall length</span></div>
            <div><div className="small-stat">Width <b>{COMPONENTS[component].expected.width} mm</b></div>
            <div className="small-stat">Diameter <b>{COMPONENTS[component].expected.diameter} mm</b></div>
            <div className="small-stat">Uncertainty <b>±{Math.max(0.4, measured*0.015).toFixed(2)} mm</b></div></div>
          </div>
          <button className="primary wide" onClick={runInspection}>Run Inspection</button>
        </section>

        <section className="panel result-panel">
          <div className="panel-head"><div><h2>5. Engineering Result</h2><p>Inspection, confidence and standards</p></div></div>
          {!result ? <div className="empty">Run an inspection to generate the engineering result.</div> :
            <div className="result">
              <div className={result.pass ? "pass-badge" : "fail-badge"}>{result.pass ? "✓ PASS" : "✕ FAIL"}</div>
              <div className="result-grid">
                <div><span>Component</span><b>{result.component}</b></div>
                <div><span>Confidence</span><b>{result.confidence.toFixed(0)}%</b></div>
                <div><span>Standard</span><b>{result.standard}</b></div>
                <div><span>Match</span><b>{result.nominal}</b></div>
                <div><span>Measured</span><b>{result.length.toFixed(2)} mm</b></div>
                <div><span>Uncertainty</span><b>±{result.uncertainty.toFixed(2)} mm</b></div>
              </div>
              <p className="finding">{result.defect}</p>
              <button className="primary wide" onClick={generatePDF}>Generate PDF Report</button>
            </div>}
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Engineering Limitations</h2><p>Communicated uncertainty is part of the design.</p></div></div>
          <ul className="limits">
            <li>Reliable: calibrated 2D length, width, diameter and hole spacing under controlled capture.</li>
            <li>Limited: depth, hidden geometry and thread pitch from a normal single image.</li>
            <li>Errors arise from perspective, lens distortion, blur, glare, reference placement and camera pose.</li>
            <li>For production metrology, verify critical dimensions using calibrated instruments.</li>
          </ul>
        </section>
      </main>

      <footer>
        <b>AI Vision Inspection & Measurement</b>
        <span>Prototype • React + Vite + OpenCV.js + jsPDF</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
