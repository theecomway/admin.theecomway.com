import { useState } from "react";
import * as pdfjsLib from 'pdfjs-dist';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import { Upload, Description, Clear } from '@mui/icons-material';

// Set up the worker for pdfjs
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export default function MeeshoLabelSorter() {
  const [file, setFile] = useState(null);
  const [extractedPages, setExtractedPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalPages, setTotalPages] = useState(0);

  /**
   * Handles file selection
   * @param {Event} event - File input change event
   */
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    
    if (!selectedFile) {
      return;
    }

    if (selectedFile.type !== 'application/pdf') {
      setError("Please select a PDF file.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setExtractedPages([]);
    setError("");
  };

  /**
   * Extracts text from a PDF page
   * @param {Object} pdfDocument - PDF document object
   * @param {number} pageNum - Page number (1-indexed)
   * @returns {Promise<string>} Extracted text content
   */
  const extractTextFromPage = async (pdfDocument, pageNum) => {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Combine all text items into a single string
    const pageText = textContent.items
      .map(item => item.str)
      .join(' ')
      .trim();

    return pageText;
  };

  /**
   * Extracts text between "Order No." and order ID pattern
   * @param {string} text - Full page text
   * @returns {string|null} Extracted text between markers, or null if not found
   */
  const extractOrderInfo = (text) => {
    // Look for "Order No." (case sensitive)
    const startMarker = "Order No.";
    const startIndex = text.indexOf(startMarker);
    
    if (startIndex === -1) {
      return null;
    }

    // Find the starting position after "Order No."
    const searchStart = startIndex + startMarker.length;
    
    // Pattern to match: digits_underscore_digits (e.g., 213713174461084992_1)
    const orderIdPattern = /\d+_\d+/;
    const match = text.substring(searchStart).match(orderIdPattern);
    
    if (!match) {
      return null;
    }

    // Find the position of the order ID
    const orderIdIndex = searchStart + text.substring(searchStart).indexOf(match[0]);
    
    // Extract text between "Order No." and the order ID
    const extractedText = text.substring(searchStart, orderIdIndex).trim();
    
    return extractedText;
  };

  /**
   * Processes the PDF file and extracts text from each page
   */
  const handleProcessPDF = async () => {
    if (!file) {
      setError("Please upload a PDF file.");
      return;
    }

    setLoading(true);
    setError("");
    setExtractedPages([]);

    try {
      // Read the file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDocument = await loadingTask.promise;
      
      const numPages = pdfDocument.numPages;
      setTotalPages(numPages);

      console.log(`PDF loaded with ${numPages} pages\n`);
      console.log("=" .repeat(80));

      const pages = [];

      // Extract text from each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const pageText = await extractTextFromPage(pdfDocument, pageNum);
        
        console.log(`\n--- Page ${pageNum} ---`);
        console.log(pageText);
        console.log("\n" + "=".repeat(80));

        pages.push({
          pageNum,
          text: pageText,
          textLength: pageText.length,
          preview: pageText.substring(0, 100) + (pageText.length > 100 ? '...' : '')
        });
      }

      setExtractedPages(pages);
      console.log(`\n✓ Successfully processed ${numPages} pages`);
    } catch (error) {
      console.error("Error processing PDF:", error);
      setError(`Failed to process PDF: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resets the form and clears all data
   */
  const handleClear = () => {
    setFile(null);
    setExtractedPages([]);
    setError("");
    setTotalPages(0);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Stack spacing={3}>
          {/* Header */}
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Meesho Label Sorter
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Upload a PDF file to extract and view text from each page in the console
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {/* File Upload Section */}
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <input
                accept="application/pdf"
                style={{ display: 'none' }}
                id="pdf-upload"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="pdf-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<Upload />}
                  fullWidth
                  disabled={loading}
                >
                  {file ? file.name : "Select PDF File"}
                </Button>
              </label>

              {file && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Clear />}
                    onClick={handleClear}
                    disabled={loading}
                  >
                    Clear
                  </Button>
                </Box>
              )}
            </Stack>
          </Paper>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleProcessPDF}
              disabled={!file || loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Description />}
            >
              {loading ? "Processing..." : "Extract Text & Console Log"}
            </Button>
          </Box>

          {/* Results Summary */}
          {totalPages > 0 && (
            <Alert severity="success">
              Successfully processed {totalPages} page{totalPages !== 1 ? 's' : ''}. 
              Check the console for text output from each page.
            </Alert>
          )}

          {/* Extracted Pages Display */}
          {extractedPages.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Extracted Pages ({extractedPages.length})
              </Typography>
              <Stack spacing={2}>
                {extractedPages.map((page) => (
                  <Card key={page.pageNum} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Page {page.pageNum}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {page.textLength} characters
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          backgroundColor: '#f5f5f5',
                          p: 2,
                          borderRadius: 1,
                          maxHeight: 200,
                          overflow: 'auto',
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                        }}
                      >
                        {page.text || <Typography color="text.secondary">No text content</Typography>}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}

