import { PDFDocument } from "pdf-lib";
import { useState } from "react";

export default function ShippingLabelDuplicator() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(100);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleGeneratePDF = async () => {
    if (!file) {
      alert("Please upload a PDF file.");
      return;
    }

    setLoading(true);

    try {
      // Read the uploaded file
      const fileArrayBuffer = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(fileArrayBuffer);
      const numPages = sourcePdf.getPageCount();

      // Create a new PDF document
      const newPdf = await PDFDocument.create();

      // Randomly pick pages from the original and duplicate them
      for (let i = 0; i < pageCount; i++) {
        const randomPageIndex = Math.floor(Math.random() * numPages);
        const [copiedPage] = await newPdf.copyPages(sourcePdf, [
          randomPageIndex,
        ]);
        newPdf.addPage(copiedPage);
      }

      // Save the new PDF
      const pdfBytes = await newPdf.save();

      // Create a download link
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      // Trigger file download
      const a = document.createElement("a");
      a.href = url;
      a.download = "replicated_labels.pdf";
      document.body.appendChild(a);
      a.click();

      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("An error occurred while processing the PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Shipping Label Replicator</h2>

      <input type="file" accept="application/pdf" onChange={handleFileChange} />

      <input
        type="number"
        value={pageCount}
        onChange={(e) => setPageCount(parseInt(e.target.value) || 1)}
        min="1"
        placeholder="Enter number of pages"
      />

      <button onClick={handleGeneratePDF} disabled={loading}>
        {loading ? "Processing..." : "Generate PDF"}
      </button>
    </div>
  );
}
