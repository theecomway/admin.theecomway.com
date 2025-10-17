"use client";
import React, { useState, useMemo, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Stack,
  Grid,
  LinearProgress
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  Assessment as AssessmentIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

/**
 * Order Payment Matcher Tool
 * Matches orders from .txt file with payments from CSV file
 * @pure
 */
const OrderPaymentMatcher = () => {
  const [ordersData, setOrdersData] = useState([]);
  const [paymentsData, setPaymentsData] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  /**
   * Parse comma-separated numbers with proper handling
   * @param {string|number} value - Value to parse
   * @returns {number} Parsed number or 0
   * @pure
   */
  const parseNumber = useCallback((value) => {
    if (!value) return 0;
    const cleanValue = value.toString().replace(/,/g, '');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  /**
   * Parse tab-separated orders file
   * @param {File} file - Orders .txt file
   * @returns {Promise<Array>} Parsed orders data
   */
  const parseOrdersFile = useCallback(async (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        delimiter: '\t',
        skipEmptyLines: true,
        transform: (value) => {
          if (typeof value === 'string') {
            return value.trim().replace(/^["']|["']$/g, '');
          }
          return value;
        },
        complete: (result) => {
          if (result.errors && result.errors.length > 0) {
            reject(new Error(`Orders file parsing error: ${result.errors[0].message}`));
            return;
          }
          
          const data = result.data || [];
          if (data.length === 0) {
            reject(new Error("Orders file is empty"));
            return;
          }

          // Check if amazon-order-id column exists (exact match)
          const firstRow = data[0];
          const orderIdColumn = Object.keys(firstRow).find(key => 
            key === 'amazon-order-id'
          );
          
          if (!orderIdColumn) {
            reject(new Error("Orders file must contain 'amazon-order-id' column"));
            return;
          }

          resolve(data);
        },
        error: (error) => {
          reject(new Error(`Orders file error: ${error.message}`));
        }
      });
    });
  }, []);

  /**
   * Parse payments file (CSV or Excel)
   * @param {File} file - Payments file (CSV or Excel)
   * @returns {Promise<Array>} Parsed payments data
   */
  const parsePaymentsFile = useCallback(async (file) => {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'xlsx') {
      return parseExcelPaymentsFile(file);
    } else {
      return parseCSVPaymentsFile(file);
    }
  }, []);

  /**
   * Parse Excel payments file looking for "Consolidated Orders" tab
   * @param {File} file - Excel file
   * @returns {Promise<Array>} Parsed payments data
   */
  const parseExcelPaymentsFile = useCallback(async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Look for "Consolidated Orders" sheet
          const sheetName = workbook.SheetNames.find(name => 
            name.toLowerCase().includes('consolidated') && name.toLowerCase().includes('order')
          );
          
          if (!sheetName) {
            reject(new Error("Excel file must contain a 'Consolidated Orders' sheet"));
            return;
          }
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            reject(new Error("Consolidated Orders sheet must have at least 2 rows (header + data)"));
            return;
          }
          
          // First row is headers, rest is data
          const headers = jsonData[0].map(header => 
            header ? header.toString().trim() : ''
          );
          const dataRows = jsonData.slice(1);
          
          const processedData = dataRows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              if (header) {
                obj[header] = row[index] || '';
              }
            });
            return obj;
          });
          
          // Check if required columns exist
          const orderIdColumn = headers.find(h => 
            h && h.toLowerCase().includes('order') && h.toLowerCase().includes('id')
          );
          const totalColumn = headers.find(h => 
            h && h.toLowerCase().includes('total')
          );
          
          if (!orderIdColumn || !totalColumn) {
            reject(new Error("Consolidated Orders sheet must contain 'Order ID' and 'Total (₹)' columns"));
            return;
          }

          resolve(processedData);
        } catch (error) {
          reject(new Error(`Excel file error: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error("Error reading Excel file"));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  /**
   * Parse CSV payments file with row skipping
   * @param {File} file - CSV file
   * @returns {Promise<Array>} Parsed payments data
   */
  const parseCSVPaymentsFile = useCallback(async (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        delimiter: ",",
        transform: (value) => {
          if (typeof value === 'string') {
            return value.trim().replace(/^["']|["']$/g, '');
          }
          return value;
        },
        complete: (result) => {
          const rows = result.data || [];
          if (rows.length < 13) {
            reject(new Error("CSV file must have at least 13 rows"));
            return;
          }
          
          // Use row 12 (index 11) as headers, data starts from row 13 (index 12)
          const headers = rows[11].map(header => 
            header ? header.trim().replace(/^["']|["']$/g, '') : ''
          );
          const dataRows = rows.slice(12);
          
          const processedData = dataRows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              if (header) {
                obj[header] = row[index] || '';
              }
            });
            return obj;
          });
          
          // Check if required columns exist
          const orderIdColumn = headers.find(h => 
            h && h.toLowerCase().includes('order') && h.toLowerCase().includes('id')
          );
          const totalColumn = headers.find(h => 
            h && h.toLowerCase().includes('total')
          );
          
          if (!orderIdColumn || !totalColumn) {
            reject(new Error("CSV file must contain 'order id' and 'total' columns"));
            return;
          }

          resolve(processedData);
        },
        error: (error) => {
          reject(new Error(`CSV file error: ${error.message}`));
        }
      });
    });
  }, []);

  /**
   * Handle orders file upload
   * @param {Event} event - File input change event
   */
  const handleOrdersUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const data = await parseOrdersFile(file);
      setOrdersData(data);
    } catch (err) {
      setError(`Orders file error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [parseOrdersFile]);

  /**
   * Handle payments file upload
   * @param {Event} event - File input change event
   */
  const handlePaymentsUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const data = await parsePaymentsFile(file);
      setPaymentsData(data);
    } catch (err) {
      setError(`Payments file error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [parsePaymentsFile]);

  /**
   * Match orders with payments and create result data
   * @returns {Array} Matched orders with totals
   * @pure
   */
  const matchedData = useMemo(() => {
    if (!ordersData.length || !paymentsData.length) return [];

    // Find column names (exact match for amazon-order-id)
    const orderIdColumn = Object.keys(ordersData[0]).find(key => 
      key === 'amazon-order-id'
    );
    
    const paymentOrderIdColumn = Object.keys(paymentsData[0]).find(key => 
      key.toLowerCase().includes('order') && key.toLowerCase().includes('id')
    );
    const paymentTotalColumn = Object.keys(paymentsData[0]).find(key => 
      key.toLowerCase().includes('total')
    );

    if (!orderIdColumn || !paymentOrderIdColumn || !paymentTotalColumn) {
      return [];
    }

    // Build payments map: orderId -> total
    const paymentsMap = new Map();
    paymentsData.forEach(row => {
      const orderId = (row[paymentOrderIdColumn] || '').trim();
      const total = parseNumber(row[paymentTotalColumn]);
      if (orderId) {
        paymentsMap.set(orderId, total);
      }
    });

    // Match orders
    return ordersData.map(row => {
      const orderId = (row[orderIdColumn] || '').trim();
      const total = paymentsMap.get(orderId) || 0;
      return {
        'Order ID': orderId,
        'Total (₹)': total
      };
    });
  }, [ordersData, paymentsData, parseNumber]);

  /**
   * Export matched data to Excel
   */
  const handleExport = useCallback(async () => {
    if (!matchedData.length) {
      setError("No data to export");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Create sheet with matched data
      const sheet = XLSX.utils.json_to_sheet(matchedData);
      XLSX.utils.book_append_sheet(workbook, sheet, 'Matched Orders');

      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `OrderPaymentMatch_${dateStr}.xlsx`;

      // Download the file
      XLSX.writeFile(workbook, filename);

    } catch (err) {
      setError(`Error creating export file: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  }, [matchedData]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!matchedData.length) {
      return { totalOrders: 0, matchedOrders: 0, unmatchedOrders: 0, totalAmount: 0 };
    }

    const totalOrders = matchedData.length;
    const matchedOrders = matchedData.filter(row => row['Total (₹)'] > 0).length;
    const unmatchedOrders = totalOrders - matchedOrders;
    const totalAmount = matchedData.reduce((sum, row) => sum + row['Total (₹)'], 0);

    return { totalOrders, matchedOrders, unmatchedOrders, totalAmount };
  }, [matchedData]);

  const clearData = useCallback(() => {
    setOrdersData([]);
    setPaymentsData([]);
    setError("");
  }, []);

  return (
    <Box sx={{ p: 3, bgcolor: 'grey.50', minHeight: '100vh' }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        Order Payment Matcher
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Instructions:</strong> Upload your orders .txt file and payments file (CSV or Excel with "Consolidated Orders" tab). The tool will match Order IDs and create an Excel file with totals (0 for unmatched orders).
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* File Upload Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UploadIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            File Upload
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'center', p: 2, border: 2, borderColor: 'divider', borderRadius: 2, borderStyle: 'dashed' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Orders File (.txt)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Tab-separated file with amazon-order-id column
                </Typography>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<UploadIcon />}
                  disabled={loading}
                  sx={{ minWidth: 150 }}
                >
                  Upload Orders
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleOrdersUpload}
                    hidden
                  />
                </Button>
                {ordersData.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main">
                      {ordersData.length} orders loaded
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'center', p: 2, border: 2, borderColor: 'divider', borderRadius: 2, borderStyle: 'dashed' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Payments File (.csv/.xlsx)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  CSV file or Excel file with "Consolidated Orders" tab containing Order ID and Total columns
                </Typography>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<UploadIcon />}
                  disabled={loading}
                  sx={{ minWidth: 150 }}
                >
                  Upload Payments
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handlePaymentsUpload}
                    hidden
                  />
                </Button>
                {paymentsData.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main">
                      {paymentsData.length} payments loaded
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>

          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="primary">
                Processing files...
              </Typography>
            </Box>
          )}

          {(ordersData.length > 0 || paymentsData.length > 0) && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                color="error"
                onClick={clearData}
                disabled={loading || processing}
              >
                Clear All Data
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {matchedData.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <AssessmentIcon sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                      {stats.totalOrders}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Total Orders
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckCircleIcon sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                      {stats.matchedOrders}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Matched Orders
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ReceiptIcon sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                      {stats.unmatchedOrders}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Unmatched Orders
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <PaymentIcon sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                      ₹{stats.totalAmount.toFixed(2)}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Total Amount
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Export Section */}
      {matchedData.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DownloadIcon />
              Export to Excel
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Download an Excel file with Order IDs and their corresponding payment totals. Orders without matching payments will show ₹0.00.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={processing ? <CircularProgress size={20} /> : <DownloadIcon />}
                onClick={handleExport}
                disabled={processing}
                sx={{ minWidth: 200 }}
              >
                {processing ? 'Generating...' : 'Download Excel File'}
              </Button>
              
              {processing && (
                <Box sx={{ width: '100%', maxWidth: 300 }}>
                  <LinearProgress />
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {matchedData.length === 0 && ordersData.length === 0 && paymentsData.length === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <AssessmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Upload your files to get started
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Upload both the orders .txt file and payments CSV file to match Order IDs and create an Excel export.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default OrderPaymentMatcher;
