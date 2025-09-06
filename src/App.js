import React, { useState } from "react";
import Tesseract from "tesseract.js";
import * as XLSX from "xlsx";

function App() {
  const [images, setImages] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Subir imágenes
  const handleUpload = (e) => {
    setImages(Array.from(e.target.files));
    setResults([]);
  };

  // Redimensionar imagen para acelerar OCR
  const resizeImage = (file, maxWidth = 800, maxHeight = 600) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob));
      };
    });
  };

  // Procesar imágenes con OCR en paralelo
  const processImages = async () => {
    if (images.length === 0) return;
    setLoading(true);

    const ocrPromises = images.map(async (file) => {
      const resizedBlob = await resizeImage(file);
      const { data: { text } } = await Tesseract.recognize(resizedBlob, "spa", {
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:.- "
      });
      return { archivo: file.name, texto: text.trim() };
    });

    const extracted = await Promise.all(ocrPromises);
    setResults(extracted);
    setLoading(false);
  };

  // Descargar Excel
  const downloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultados OCR");
    XLSX.writeFile(wb, "ocr_resultados.xlsx");
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>📸 OCR rápido - Coltex</h1>

      <input type="file" multiple accept="image/*" onChange={handleUpload} />

      <button
        onClick={processImages}
        disabled={images.length === 0 || loading}
        style={{
          marginTop: "10px",
          padding: "10px 15px",
          background: "#1976d2",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: loading ? "default" : "pointer"
        }}
      >
        {loading ? "Procesando..." : "Procesar imágenes"}
      </button>

      {results.length > 0 && (
        <>
          <h2>Resultados:</h2>
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
                  <td>{r.archivo}</td>
                  <td>{r.texto}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={downloadExcel}
            style={{
              marginTop: "10px",
              padding: "10px",
              background: "green",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            📥 Descargar Excel
          </button>
        </>
      )}
    </div>
  );
}

export default App;
