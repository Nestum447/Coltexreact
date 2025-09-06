import React, { useState } from "react";
import { createWorker } from "tesseract.js";
import * as XLSX from "xlsx";

export default function App() {
  const [images, setImages] = useState([]);
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);

  // Subir varias imágenes
  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    const urls = files.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      text: "",
      status: "pendiente",
    }));
    setImages(urls);
    setResults([]);
  };

  // Detección de amarillo
  const extractYellowCanvas = (img) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const yellowMask = ctx.createImageData(canvas.width, canvas.height);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r > 180 && g > 180 && b < 150) {
        yellowMask.data[i] = r;
        yellowMask.data[i + 1] = g;
        yellowMask.data[i + 2] = b;
        yellowMask.data[i + 3] = 255;
      } else {
        yellowMask.data[i] = 255;
        yellowMask.data[i + 1] = 255;
        yellowMask.data[i + 2] = 255;
        yellowMask.data[i + 3] = 255;
      }
    }

    ctx.putImageData(yellowMask, 0, 0);
    return canvas;
  };

  // Procesar todas las imágenes
  const runOCR = async () => {
    if (images.length === 0) return;
    setProcessing(true);

    const worker = await createWorker("spa+eng", 1);
    const newResults = [];

    for (const item of images) {
      const img = document.createElement("img");
      img.src = item.url;
      await new Promise((res) => (img.onload = res));

      const yellowCanvas = extractYellowCanvas(img);
      const { data: { text } } = await worker.recognize(yellowCanvas);

      newResults.push({
        nombre: item.file.name,
        texto: text.trim(),
      });
    }

    await worker.terminate();
    setResults(newResults);
    setProcessing(false);
  };

  // Descargar Excel
  const downloadExcel = () => {
    if (results.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultados");
    XLSX.writeFile(wb, "ocr_amarillo.xlsx");
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>📸 OCR en zonas amarillas (múltiples imágenes)</h1>

      <input type="file" accept="image/*" multiple onChange={handleFiles} />

      {images.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <button
            onClick={runOCR}
            disabled={processing}
            style={{
              padding: "10px 14px",
              background: processing ? "#aaa" : "#1976d2",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: processing ? "default" : "pointer",
            }}
          >
            {processing ? "Procesando..." : "▶ Ejecutar OCR"}
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Resultados</h3>
          <table border="1" cellPadding="5" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Texto extraído</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td>{r.nombre}</td>
                  <td>{r.texto}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={downloadExcel}
            style={{
              marginTop: 10,
              padding: "10px 12px",
              background: "#2e7d32",
              color: "white",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
            }}
          >
            📥 Descargar Excel
          </button>
        </div>
      )}
    </div>
  );
}
