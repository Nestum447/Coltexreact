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

  // Filtrar solo zonas amarillas con canvas
  const filterYellow = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Detectar colores amarillos (rango de RGB)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Condición de "amarillo": mucho rojo + verde, poco azul
          if (!(r > 180 && g > 180 && b < 120)) {
            // Si no es amarillo → píxel en blanco
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => resolve(blob));
      };
    });
  };

  // Procesar imágenes con OCR
  const processImages = async () => {
    setLoading(true);
    let extracted = [];

    for (const file of images) {
      const yellowBlob = await filterYellow(file);

      const { data: { text } } = await Tesseract.recognize(yellowBlob, "spa");

      extracted.push({ archivo: file.name, texto: text.trim() });
    }

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
    <div style={{ padding: "20px" }}>
      <h1>📸 OCR en fondo amarillo - Coltex</h1>

      <input type="file" multiple accept="image/*" onChange={handleUpload} />

      <button onClick={processImages} disabled={images.length === 0 || loading}>
        {loading ? "Procesando..." : "Procesar imágenes"}
      </button>

      {results.length > 0 && (
        <>
          <h2>Resultados:</h2>
          <table border="1" cellPadding="5">
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
