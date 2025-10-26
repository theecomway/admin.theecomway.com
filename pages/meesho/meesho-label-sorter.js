import { useState } from "react";
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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
  Checkbox,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import { Upload, Description, Clear, Download } from '@mui/icons-material';

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
  const [modifiedPdfBytes, setModifiedPdfBytes] = useState(null);
  const [includeFields, setIncludeFields] = useState({
    SKU: true,
    quantity: true,
    size: true,
    color: true,
  });

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
   * Formats extracted text by inserting newlines before each product identifier
   * Splits on the pattern: long_number_underscore_short_number (e.g., 214043021636828864_4)
   * @param {string} text - Extracted text to format
   * @returns {string} Formatted text with newlines inserted
   */
  const formatOrderInfo = (text) => {
    if (!text) return text;
    
    // Pattern to match: Many digits_underscore_one or two digits (e.g., 214043021636828864_4)
    // This pattern matches long order IDs with underscore and short suffix
    const productPattern = /\b\d{18}_\d\b/g;
    
    // First, replace all order IDs with "NEW ORDER"
    let replacedText = text.replace(productPattern, 'NEW ORDER');
    
    // Then split on "NEW ORDER" and join with newlines to put each segment on a new line
    const segments = replacedText.split('NEW ORDER');
    
    // Rebuild by inserting newline to separate each segment
    const result = [segments[0].trim()]; // First segment (before first NEW ORDER)
    
    for (let i = 1; i < segments.length; i++) {
      result.push('\n'); // Add newline to separate segments
      if (segments[i].trim()) {
        result.push(segments[i].trim()); // Add the segment text
      }
    }
    
    return result.join('');
  };

  /**
   * Parses formatted order info text into an array of order objects
   * Splits on "   " (three spaces) to extract SKU, quantity, size, and color
   * Creates a new object for every line, even if empty or incomplete
   * @param {string} text - Formatted text with product information
   * @returns {Array} Array of order objects
   */
  const parseOrderInfo = (text) => {
    if (!text) return [];
    
    // Split by newline to get each product line (keep empty lines)
    const lines = text.split('\n');
    
    const orders = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Create order object for every line (even if empty)
      const order = {
        SKU: '',
        quantity: '',
        size: '',
        color: ''
      };
      
      // If line has content, try to parse it
      if (trimmedLine.length > 0) {
        // Split by "   " (three spaces) - this is the delimiter in the data
        const parts = trimmedLine.split('   ').map(part => part.trim()).filter(part => part.length > 0);
        
        if (parts.length > 0) {
          order.SKU = parts[0] || '';
        }
        
        if (parts.length > 1) {
          // Second part could be size or quantity
          if (/^\d+$/.test(parts[1])) {
            order.quantity = parseInt(parts[1], 10);
          } else {
            order.size = parts[1];
          }
        }
        
        if (parts.length > 2) {
          // Third part
          if (/^\d+$/.test(parts[2])) {
            order.quantity = parseInt(parts[2], 10);
          } else if (!order.size) {
            order.size = parts[2];
          } else {
            order.color = parts[2];
          }
        }
        
        if (parts.length > 3) {
          order.color = parts[3];
        }
      }
      
      orders.push(order);
    }
    
    return orders;
  };

  /**
   * Formats parsed orders into aligned label format
   * @param {Array} orders - Array of parsed order objects
   * @returns {string} Formatted label string with aligned columns
   */
  const formatLabelString = (orders) => {
    if (!orders || orders.length === 0) return '';
    
    const lines = [];
    
    for (const order of orders) {
      // Handle SKU - truncate if longer than 35 characters
      let sku = order.SKU || '';
      if (sku.length > 35) {
        sku = sku.substring(0, 32) + '...';
      }
      
      // Get other fields
      const size = order.size || '';
      const quantity = String(order.quantity || '');
      const color = order.color || '';
      
      // Use tab characters for consistent alignment
      // First column: SKU (35 chars), Second: Size (20 chars), Third: Quantity (8 chars), Fourth: Color
      const paddedSku = sku.padEnd(35, ' ');
      const paddedSize = size.padEnd(20, ' ');
      const paddedQuantity = quantity.padEnd(8, ' ');
      
      // Construct the line with tabs and proper spacing
      const line = `${paddedSku}\t${paddedSize}\t${paddedQuantity}\t${color}`;
      lines.push(line);
    }
    
    return lines.join('\n');
  };

  /**
   * Extracts text between "Order No." and "TAX INVOICE" markers
   * @param {string} text - Full page text
   * @returns {string|null} Extracted text between markers, or null if not found
   */
  const extractOrderInfo = (text) => {
    const startMarker = "Order No.";
    const endMarker = "TAX INVOICE";
    
    const startIndex = text.indexOf(startMarker);
    const endIndex = text.indexOf(endMarker);
    
    if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
      return null;
    }
    
    // Extract text after "Order No." and before "TAX INVOICE"
    const extractedText = text.substring(startIndex + startMarker.length, endIndex).trim();
    
    // Format the text to add newlines before each product identifier
    const formattedText = formatOrderInfo(extractedText);
    
    return formattedText;
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

        // Extract text between "Order No." and "TAX INVOICE"
        const orderInfo = extractOrderInfo(pageText);
        let parsedOrders = [];
        let formattedLabel = '';
        
        if (orderInfo) {
          console.log(`\n📦 [Page ${pageNum}] Text between "Order No." and "TAX INVOICE":`);
          console.log(orderInfo);
          
          // Parse the order info into objects
          parsedOrders = parseOrderInfo(orderInfo);
          console.log(`\n🛒 [Page ${pageNum}] Parsed Orders:`, parsedOrders);
          
          // Format into aligned label string
          formattedLabel = formatLabelString(parsedOrders);
          console.log(`\n🏷️  [Page ${pageNum}] Formatted Label:`);
          console.log(formattedLabel);
          
          console.log("\n" + "-".repeat(80));
        } else {
          console.log(`\n⚠️  [Page ${pageNum}] No text found between "Order No." and "TAX INVOICE"`);
        }

        pages.push({
          pageNum,
          text: pageText,
          textLength: pageText.length,
          preview: pageText.substring(0, 100) + (pageText.length > 100 ? '...' : ''),
          orderInfo: orderInfo,
          parsedOrders: parsedOrders,
          formattedLabel: formattedLabel
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
    setModifiedPdfBytes(null);
  };

  /**
   * Handles checkbox change for field selection
   */
  const handleFieldToggle = (field) => {
    setIncludeFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  /**
   * Creates formatted label text based on selected fields
   */
  const createFormattedLabel = (parsedOrders) => {
    if (!parsedOrders || parsedOrders.length === 0) return '';
    
    const lines = [];
    
    for (const order of orders) {
      const parts = [];
      
      if (includeFields.SKU) {
        let sku = order.SKU || '';
        if (sku.length > 25) {
          sku = sku.substring(0, 22) + '...';
        }
        parts.push(sku.padEnd(25));
      }
      
      if (includeFields.size) {
        parts.push((order.size || '').padEnd(15));
      }
      
      if (includeFields.quantity) {
        parts.push(String(order.quantity || '').padEnd(3));
      }
      
      if (includeFields.color) {
        parts.push(order.color || '');
      }
      
      lines.push(parts.join(''));
    }
    
    return lines.join('\n');
  };

  /**
   * Generates a PDF with extracted text printed on each page
   */
  const handleGeneratePDF = async () => {
    if (!file || extractedPages.length === 0) {
      setError("Please process the PDF first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Load the original PDF
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Get the font
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Add text to each page
      for (let i = 0; i < extractedPages.length; i++) {
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();
        
        // Get the parsed orders for this page
        const parsedOrders = extractedPages[i].parsedOrders;
        
        if (parsedOrders && parsedOrders.length > 0) {
          // Create formatted label based on selected fields
          const lines = [];
          
          for (const order of parsedOrders) {
            const parts = [];
            
            if (includeFields.SKU) {
              let sku = order.SKU || '';
              if (sku.length > 35) {
                sku = sku.substring(0, 32) + '...';
              }
              parts.push(sku.padEnd(35, ' '));
            }
            
            if (includeFields.size) {
              parts.push((order.size || '').padEnd(20, ' '));
            }
            
            if (includeFields.quantity) {
              parts.push(String(order.quantity || '').padEnd(8, ' '));
            }
            
            if (includeFields.color) {
              parts.push(order.color || '');
            }
            
            if (parts.length > 0) {
              // Join with tabs for proper spacing
              lines.push(parts.join('\t'));
            }
          }
          
          if (lines.length > 0) {
            // Calculate the dimensions of the white background
            const lineHeight = 20;
            const padding = 30;
            const startY = 150;
            const textWidth = width - 100; // Width for text area
            const textHeight = lines.length * lineHeight;
            
            // Draw white background rectangle
            page.drawRectangle({
              x: 50 - padding,
              y: startY - padding,
              width: textWidth + (padding * 2),
              height: textHeight + (padding * 2),
              color: rgb(1, 1, 1), // White background
            });
            
            // Start drawing from the very bottom of the page (y starts from bottom)
            let yPosition = 150; // Start from 150 pixels from the bottom
            
            // Draw each line of extracted text, moving upward from bottom
            for (const line of lines) {
              page.drawText(line, {
                x: 20,
                y: yPosition,
                size: 24,
                font: helveticaFont,
                color: rgb(0, 0, 0),
              });
              
              yPosition += lineHeight; // Move to next line upward (closer to top)
            }
          }
        }
      }

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      setModifiedPdfBytes(pdfBytes);
      
      console.log("PDF generated successfully with text annotations");
    } catch (error) {
      console.error("Error generating PDF:", error);
      setError(`Failed to generate PDF: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Downloads the modified PDF
   */
  const handleDownloadPDF = () => {
    if (!modifiedPdfBytes) {
      setError("No modified PDF to download.");
      return;
    }

    const blob = new Blob([modifiedPdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file ? file.name.replace('.pdf', '_with_text.pdf') : 'modified.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

          {/* Field Selection Checkboxes */}
          {extractedPages.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Select Fields to Include in PDF:
              </Typography>
              <FormGroup>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={includeFields.SKU}
                        onChange={() => handleFieldToggle('SKU')}
                        color="primary"
                      />
                    }
                    label="SKU"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={includeFields.size}
                        onChange={() => handleFieldToggle('size')}
                        color="primary"
                      />
                    }
                    label="Size"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={includeFields.quantity}
                        onChange={() => handleFieldToggle('quantity')}
                        color="primary"
                      />
                    }
                    label="Quantity"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={includeFields.color}
                        onChange={() => handleFieldToggle('color')}
                        color="primary"
                      />
                    }
                    label="Color"
                  />
                </Box>
              </FormGroup>
            </Paper>
          )}

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={handleProcessPDF}
              disabled={!file || loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Description />}
            >
              {loading ? "Processing..." : "Extract Text & Console Log"}
            </Button>
            
            {extractedPages.length > 0 && (
              <>
                <Button
                  variant="contained"
                  onClick={handleGeneratePDF}
                  disabled={loading}
                  color="secondary"
                  startIcon={loading ? <CircularProgress size={20} /> : <Description />}
                >
                  {loading ? "Generating..." : "Generate PDF with Text"}
                </Button>
                
                {modifiedPdfBytes && (
                  <Button
                    variant="contained"
                    onClick={handleDownloadPDF}
                    disabled={loading}
                    color="success"
                    startIcon={<Download />}
                  >
                    Download Modified PDF
                  </Button>
                )}
              </>
            )}
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
                      
                      {page.orderInfo && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                            📦 Extracted Order Info (Between "Order No." and "TAX INVOICE"):
                          </Typography>
                          <Box
                            sx={{
                              backgroundColor: '#e3f2fd',
                              p: 2,
                              borderRadius: 1,
                              border: '1px solid #90caf9',
                              fontFamily: 'monospace',
                              fontSize: '0.9rem',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {page.orderInfo}
                          </Box>
                        </Box>
                      )}
                      
                      {page.formattedLabel && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="success.main" fontWeight="bold" gutterBottom>
                            🏷️ Formatted Label (Aligned):
                          </Typography>
                          <Box
                            sx={{
                              backgroundColor: '#e8f5e9',
                              p: 2,
                              borderRadius: 1,
                              border: '1px solid #81c784',
                              fontFamily: 'monospace',
                              fontSize: '0.95rem',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {page.formattedLabel}
                          </Box>
                        </Box>
                      )}
                      
                      {page.parsedOrders && page.parsedOrders.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="secondary" fontWeight="bold" gutterBottom>
                            🛒 Parsed Orders (JSON):
                          </Typography>
                          <Box
                            sx={{
                              backgroundColor: '#fff3e0',
                              p: 2,
                              borderRadius: 1,
                              border: '1px solid #ffb74d',
                              fontFamily: 'monospace',
                              fontSize: '0.85rem',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              maxHeight: 300,
                              overflow: 'auto',
                            }}
                          >
                            {JSON.stringify(page.parsedOrders, null, 2)}
                          </Box>
                        </Box>
                      )}
                      
                      <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                        Full Page Text:
                      </Typography>
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

