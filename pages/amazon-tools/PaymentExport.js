"use client";
import React, { useState, useMemo, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Stack,
  Chip,
  Grid,
  LinearProgress
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  Assessment as AssessmentIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingUpIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';

const PaymentExport = () => {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [orderData, setOrderData] = useState([]);
  const [monthFilter, setMonthFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Helper function to parse comma-separated numbers
  const parseNumber = useCallback((value) => {
    if (!value) return 0;
    const cleanValue = value.toString().replace(/,/g, '');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  const parseCSVWithFallback = useCallback(async (file, delimiter) => {
    return new Promise((resolve, reject) => {
      // First attempt with specified delimiter
      Papa.parse(file, {
        header: false, // Don't use first row as header
        skipEmptyLines: true,
        delimiter: delimiter || "",
        newline: "",
        quoteChar: '"',
        escapeChar: '"',
        dynamicTyping: false,
        transform: (value) => {
          // Clean up values
          if (typeof value === 'string') {
            return value.trim().replace(/^["']|["']$/g, '');
          }
          return value;
        },
        complete: (result) => {
          const rows = result.data || [];
          if (rows.length < 12) {
            reject(new Error("CSV file must have at least 12 rows"));
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
          
          const processedResult = { data: processedData, errors: result.errors, meta: result.meta };
          resolve(processedResult);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }, []);

  const parseOrderFile = useCallback(async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            reject(new Error("Order file is empty"));
            return;
          }

          // Check if first line contains amazon-order-id header
          const firstLine = lines[0].toLowerCase();
          if (!firstLine.includes('amazon-order-id')) {
            reject(new Error("Order file must contain 'amazon-order-id' header"));
            return;
          }

          // Find the header row and extract order IDs
          let headerIndex = -1;
          let orderIdColumnIndex = -1;
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            if (line.includes('amazon-order-id')) {
              headerIndex = i;
              const headers = lines[i].split('\t').map(h => h.trim().toLowerCase());
              orderIdColumnIndex = headers.findIndex(h => h.includes('amazon-order-id'));
              break;
            }
          }

          if (headerIndex === -1 || orderIdColumnIndex === -1) {
            reject(new Error("Could not find 'amazon-order-id' column in order file"));
            return;
          }

          // Extract order IDs from data rows
          const orderIds = [];
          for (let i = headerIndex + 1; i < lines.length; i++) {
            const columns = lines[i].split('\t');
            if (columns[orderIdColumnIndex] && columns[orderIdColumnIndex].trim()) {
              orderIds.push(columns[orderIdColumnIndex].trim());
            }
          }

          if (orderIds.length === 0) {
            reject(new Error("No order IDs found in the file"));
            return;
          }

          resolve(orderIds);
        } catch (error) {
          reject(new Error(`Error parsing order file: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error("Error reading file"));
      reader.readAsText(file);
    });
  }, []);

  const handleCSVUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const result = await parseCSVWithFallback(file, ",");
      
      if (result.errors && result.errors.length > 0) {
        const fieldMismatchErrors = result.errors.filter(error => 
          error.type === 'FieldMismatch' || error.type === 'TooManyFields'
        );
        
        if (fieldMismatchErrors.length > 0) {
          console.warn("Field mismatch errors detected:", fieldMismatchErrors);
          setError(`CSV parsing issues detected. Error details: ${fieldMismatchErrors.map(e => `Row ${e.row}: ${e.message}`).join(', ')}`);
        }
      }

      const processedData = result.data || [];
      setData(processedData);
      setFiltered(processedData);
    } catch (err) {
      setError(`Error parsing CSV: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [parseCSVWithFallback]);

  const handleOrderFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setOrderLoading(true);
    setError("");

    try {
      const orderIds = await parseOrderFile(file);
      setOrderData(orderIds);
    } catch (err) {
      setError(`Error parsing order file: ${err.message}`);
    } finally {
      setOrderLoading(false);
    }
  }, [parseOrderFile]);

  const handleMonthFilter = useCallback((month) => {
    setMonthFilter(month);
    if (!month) {
      setFiltered(data);
      return;
    }

    const filteredData = data.filter(row => {
      const dateStr = row.date || row['date/time'] || row['Date/Time'] || '';
      if (!dateStr) return false;
      
      try {
        const date = new Date(dateStr);
        const rowMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return rowMonth === month;
      } catch {
        return false;
      }
    });

    setFiltered(filteredData);
  }, [data]);

  // Process data for export
  const processedData = useMemo(() => {
    if (!filtered.length) return { 
      consolidatedOrders: [], 
      otherPayments: [], 
      transferPayments: [], 
      nilPaymentOrders: [],
      unfilteredOrders: []
    };

    const consolidatedOrders = [];
    const otherPayments = [];
    const consolidatedMap = new Map();
    const allPaymentOrderIds = new Set();

    // First pass: collect all payment data
    filtered.forEach(row => {
      const orderId = row.orderId || row['order id'] || row['Order ID'] || '';
      const total = parseNumber(row.total);
      const type = row.type || 'Unknown';
      const description = row.description || 'Unknown';
      const date = row.date || row['date/time'] || row['Date/Time'] || '';
      
      // Check if orderId matches the pattern xxx-xxxxxxx-xxxxxxx
      if (orderId && orderId.match(/^\d{3}-\d{7}-\d{7}$/)) {
        allPaymentOrderIds.add(orderId);
        
        // Consolidated order
        if (consolidatedMap.has(orderId)) {
          consolidatedMap.get(orderId).total += total;
        } else {
          consolidatedMap.set(orderId, { orderId, total });
        }
      } else {
        // Other payment record
        const month = date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'Unknown';
        const keyDescription = `${type}+${description}`;
        
        otherPayments.push({
          month,
          keyDescription,
          total,
          type,
          originalData: row // Keep original data for reference
        });
      }
    });

    // Convert consolidated map to array
    const allConsolidatedOrders = Array.from(consolidatedMap.values());

    // Filter consolidated orders based on order file if available
    if (orderData.length > 0) {
      const orderSet = new Set(orderData);
      
      // Only include consolidated orders that are in the order file
      consolidatedOrders.push(...allConsolidatedOrders.filter(order => orderSet.has(order.orderId)));
      
      // Find orders in order file but not in payments (nil payment orders)
      const nilPaymentOrders = orderData.filter(orderId => !allPaymentOrderIds.has(orderId));
      
      // Find payment orders not in order file (unfiltered orders)
      const unfilteredOrders = allConsolidatedOrders.filter(order => !orderSet.has(order.orderId));
      
      return {
        consolidatedOrders,
        otherPayments: otherPayments.filter(item => (item.type || '').toLowerCase() !== 'transfer'),
        transferPayments: otherPayments.filter(item => (item.type || '').toLowerCase() === 'transfer'),
        nilPaymentOrders: nilPaymentOrders.map(orderId => ({ orderId, total: 0 })),
        unfilteredOrders
      };
    } else {
      // No order file uploaded, use all consolidated orders
      consolidatedOrders.push(...allConsolidatedOrders);
      
      return {
        consolidatedOrders,
        otherPayments: otherPayments.filter(item => (item.type || '').toLowerCase() !== 'transfer'),
        transferPayments: otherPayments.filter(item => (item.type || '').toLowerCase() === 'transfer'),
        nilPaymentOrders: [],
        unfilteredOrders: []
      };
    }
  }, [filtered, orderData, parseNumber]);

  const handleExport = useCallback(async () => {
    if (!processedData.consolidatedOrders.length && !processedData.otherPayments.length && !processedData.nilPaymentOrders.length && !processedData.unfilteredOrders.length) {
      setError("No data to export");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Tab 1: Consolidated Orders (filtered by order file if available)
      if (processedData.consolidatedOrders.length > 0) {
        const consolidatedData = processedData.consolidatedOrders.map(item => ({
          'Order ID': item.orderId,
          'Total (₹)': item.total.toFixed(2)
        }));

        const consolidatedSheet = XLSX.utils.json_to_sheet(consolidatedData);
        XLSX.utils.book_append_sheet(workbook, consolidatedSheet, 'Consolidated Orders');
      }

      // Tab 2: Other Payment Records
      if (processedData.otherPayments.length > 0) {
        const otherData = processedData.otherPayments.map(item => ({
          'Month': item.month,
          'Key+Description': item.keyDescription,
          'Total (₹)': item.total.toFixed(2)
        }));

        const otherSheet = XLSX.utils.json_to_sheet(otherData);
        XLSX.utils.book_append_sheet(workbook, otherSheet, 'Other Payments');
      }

      // Tab 3: Transfers (Type = Transfer)
      if (processedData.transferPayments.length > 0) {
        const transferData = processedData.transferPayments.map(item => ({
          'Month': item.month,
          'Key+Description': item.keyDescription,
          'Total (₹)': item.total.toFixed(2)
        }));

        const transfersSheet = XLSX.utils.json_to_sheet(transferData);
        XLSX.utils.book_append_sheet(workbook, transfersSheet, 'Transfers');
      }

      // Tab 4: Nil Payment Orders (orders in order file but not in payments)
      if (processedData.nilPaymentOrders.length > 0) {
        const nilData = processedData.nilPaymentOrders.map(item => ({
          'Order ID': item.orderId,
          'Total (₹)': item.total.toFixed(2),
          'Status': 'No Payment Found'
        }));

        const nilSheet = XLSX.utils.json_to_sheet(nilData);
        XLSX.utils.book_append_sheet(workbook, nilSheet, 'Nil Payment Orders');
      }

      // Tab 5: Unfiltered Orders (payment orders not in order file)
      if (processedData.unfilteredOrders.length > 0) {
        const unfilteredData = processedData.unfilteredOrders.map(item => ({
          'Order ID': item.orderId,
          'Total (₹)': item.total.toFixed(2),
          'Status': 'Not in Order File'
        }));

        const unfilteredSheet = XLSX.utils.json_to_sheet(unfilteredData);
        XLSX.utils.book_append_sheet(workbook, unfilteredSheet, 'Unfiltered Orders');
      }

      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `PaymentExport_${dateStr}.xlsx`;

      // Download the file
      XLSX.writeFile(workbook, filename);

    } catch (err) {
      setError(`Error creating export file: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  }, [processedData]);

  const totalConsolidated = useMemo(() => {
    const total = processedData.consolidatedOrders.reduce((sum, item) => sum + item.total, 0);
    console.log('Consolidated orders total:', total, 'from', processedData.consolidatedOrders.length, 'orders');
    return total;
  }, [processedData.consolidatedOrders]);

  const totalOther = useMemo(() => {
    const total = processedData.otherPayments.reduce((sum, item) => sum + item.total, 0);
    console.log('Other payments total:', total, 'from', processedData.otherPayments.length, 'records');
    return total;
  }, [processedData.otherPayments]);

  const totalNilPayment = useMemo(() => {
    return processedData.nilPaymentOrders.length;
  }, [processedData.nilPaymentOrders]);

  const totalUnfiltered = useMemo(() => {
    const total = processedData.unfilteredOrders.reduce((sum, item) => sum + item.total, 0);
    return total;
  }, [processedData.unfilteredOrders]);

  return (
    <Box sx={{ p: 3, bgcolor: 'grey.50', minHeight: '100vh' }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        Payment Export Tool
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Note:</strong> This tool automatically skips the first 11 rows and uses row 12 as the header row, then processes data starting from row 13. Upload an order file (.txt) with 'amazon-order-id' header to filter consolidated orders.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            File Upload & Filters
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mt: 2 }}>
            <Button
              variant="contained"
              component="label"
              startIcon={<UploadIcon />}
              disabled={loading}
              sx={{ minWidth: 150 }}
            >
              Upload CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                hidden
              />
            </Button>

            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              disabled={orderLoading}
              sx={{ minWidth: 150 }}
            >
              Upload Orders (.txt)
              <input
                type="file"
                accept=".txt"
                onChange={handleOrderFileUpload}
                hidden
              />
            </Button>
            
            <TextField
              type="month"
              label="Filter by Month"
              value={monthFilter}
              onChange={(e) => handleMonthFilter(e.target.value)}
              variant="outlined"
              size="small"
              sx={{ minWidth: 200 }}
            />
            
            {(data.length > 0 || orderData.length > 0) && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  setData([]);
                  setFiltered([]);
                  setOrderData([]);
                  setMonthFilter("");
                  setError("");
                }}
                disabled={loading || orderLoading || processing}
              >
                Clear All
              </Button>
            )}
            
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="primary">
                  Processing CSV...
                </Typography>
              </Box>
            )}

            {orderLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="primary">
                  Processing Orders...
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <PaymentIcon sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                      {processedData.consolidatedOrders.length}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Consolidated Orders
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      ₹{totalConsolidated.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ReceiptIcon sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                      {processedData.otherPayments.length}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Other Payment Records
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      ₹{totalOther.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {orderData.length > 0 && (
            <>
              <Grid item xs={12} md={6} lg={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', color: 'white' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <AssessmentIcon sx={{ fontSize: 40 }} />
                      <Box>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                          {totalNilPayment}
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9 }}>
                          Nil Payment Orders
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                          In order file, no payment
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6} lg={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', color: 'white' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <TrendingUpIcon sx={{ fontSize: 40 }} />
                      <Box>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                          {processedData.unfilteredOrders.length}
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9 }}>
                          Unfiltered Orders
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                          ₹{totalUnfiltered.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}
        </Grid>
      )}

      {/* Export Section */}
      {data.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DownloadIcon />
              Export to Excel
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              The exported Excel file will contain up to five tabs:
              <br />• <strong>Consolidated Orders:</strong> Order IDs matching pattern xxx-xxxxxxx-xxxxxxx with their totals (filtered by order file if uploaded)
              <br />• <strong>Other Payments:</strong> All other payment records with month, key+description, and total
              <br />• <strong>Transfers:</strong> Only records where Type = Transfer, with month, key+description, and total
              {orderData.length > 0 && (
                <>
                  <br />• <strong>Nil Payment Orders:</strong> Orders from order file that have no corresponding payment records
                  <br />• <strong>Unfiltered Orders:</strong> Payment orders that are not present in the order file
                </>
              )}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={processing ? <CircularProgress size={20} /> : <DownloadIcon />}
                onClick={handleExport}
                disabled={processing || (!processedData.consolidatedOrders.length && !processedData.otherPayments.length)}
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

            {processedData.consolidatedOrders.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Consolidated Orders Preview ({processedData.consolidatedOrders.length} orders):
                </Typography>
                <Box sx={{ maxHeight: 200, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  {processedData.consolidatedOrders.slice(0, 10).map((item, index) => (
                    <Box key={index} sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {item.orderId}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        ₹{item.total.toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                  {processedData.consolidatedOrders.length > 10 && (
                    <Typography variant="caption" color="text.secondary" sx={{ p: 1, display: 'block' }}>
                      ... and {processedData.consolidatedOrders.length - 10} more
                    </Typography>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Total: ₹{totalConsolidated.toFixed(2)}
                </Typography>
              </Box>
            )}

            {processedData.otherPayments.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Other Payment Records Preview ({processedData.otherPayments.length} records):
                </Typography>
                <Box sx={{ maxHeight: 200, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  {processedData.otherPayments.slice(0, 10).map((item, index) => (
                    <Box key={index} sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {item.month}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.keyDescription}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        ₹{item.total.toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                  {processedData.otherPayments.length > 10 && (
                    <Typography variant="caption" color="text.secondary" sx={{ p: 1, display: 'block' }}>
                      ... and {processedData.otherPayments.length - 10} more
                    </Typography>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Total: ₹{totalOther.toFixed(2)}
                </Typography>
              </Box>
            )}

            {processedData.nilPaymentOrders.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Nil Payment Orders Preview ({processedData.nilPaymentOrders.length} orders):
                </Typography>
                <Box sx={{ maxHeight: 200, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  {processedData.nilPaymentOrders.slice(0, 10).map((item, index) => (
                    <Box key={index} sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {item.orderId}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                        No Payment Found
                      </Typography>
                    </Box>
                  ))}
                  {processedData.nilPaymentOrders.length > 10 && (
                    <Typography variant="caption" color="text.secondary" sx={{ p: 1, display: 'block' }}>
                      ... and {processedData.nilPaymentOrders.length - 10} more
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {processedData.unfilteredOrders.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Unfiltered Orders Preview ({processedData.unfilteredOrders.length} orders):
                </Typography>
                <Box sx={{ maxHeight: 200, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  {processedData.unfilteredOrders.slice(0, 10).map((item, index) => (
                    <Box key={index} sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {item.orderId}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        ₹{item.total.toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                  {processedData.unfilteredOrders.length > 10 && (
                    <Typography variant="caption" color="text.secondary" sx={{ p: 1, display: 'block' }}>
                      ... and {processedData.unfilteredOrders.length - 10} more
                    </Typography>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Total: ₹{totalUnfiltered.toFixed(2)}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {data.length === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <AssessmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Upload a CSV file to get started
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                The tool will process your payment data and create an Excel export with consolidated orders and other payment records.
                <br />Optionally upload an order file (.txt) with 'amazon-order-id' header to filter and categorize orders.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default PaymentExport;
