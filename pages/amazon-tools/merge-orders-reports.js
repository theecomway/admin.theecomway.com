import { Box, Button, LinearProgress, Paper, Typography } from "@mui/material";
import React, { useState } from "react";

const FileMerger = () => {
  const [mergedContent, setMergedContent] = useState("");
  const [header, setHeader] = useState("");
  const [fileCount, setFileCount] = useState(0);
  const [processing, setProcessing] = useState(false);

  const handleDrop = async (e) => {
    e.preventDefault();
    setProcessing(true);

    const file = e.dataTransfer.files[0];
    const text = await file.text();
    const lines = text.trim().split(/\r?\n/);

    if (fileCount === 0) {
      // First file keeps the header
      setHeader(lines[0]);
      setMergedContent(lines.join("\n"));
    } else {
      // Remove header for subsequent files
      setMergedContent((prev) => prev + "\n" + lines.slice(1).join("\n"));
    }

    setFileCount((prev) => prev + 1);
    setProcessing(false);
  };

  const handleDownload = () => {
    const blob = new Blob([mergedContent], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "merged-orders.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box
      sx={{
        p: 4,
        border: "2px dashed #aaa",
        textAlign: "center",
        backgroundColor: "#f9f9f9",
        borderRadius: 2,
      }}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <Typography variant="h6">
        Drag and drop files one by one to merge
      </Typography>
      <Typography variant="body2" color="textSecondary">
        First file keeps the header, others are merged without header.
      </Typography>
      {processing && <LinearProgress sx={{ mt: 2 }} />}

      {fileCount > 0 && (
        <Box sx={{ mt: 3 }}>
          <Button variant="contained" onClick={handleDownload}>
            Download Merged File
          </Button>
          <Typography variant="caption" display="block" mt={1}>
            Files merged: {fileCount}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default FileMerger;
