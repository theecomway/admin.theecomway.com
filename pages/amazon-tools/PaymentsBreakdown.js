import React, { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Box,
  Button,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  TextField,
  Autocomplete,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Upload,
  X,
  FilterList,
  Clear,
  Download,
  Visibility,
  VisibilityOff,
  ExpandMore,
  Payment,
  Receipt,
} from "@mui/icons-material";

/**
 * PaymentsBreakdown Component
 * 
 * Features:
 * - File upload (CSV/Excel) with row 12 as headers
 * - Payment consolidation by order ID
 * - Detail modal for individual order payments
 * - Multi-column filtering including type-description
 * - Date range filtering
 * - Export functionality
 * 
 * @pure - Component uses only props and state, no side effects
 */
const PaymentsBreakdown = () => {
  // Core data state
  const [rawData, setRawData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filter state
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [columnFilters, setColumnFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  /**
   * Parse uploaded file and extract headers and data
   * @param {File} file - The uploaded file
   * @pure - No side effects, returns parsed data
   */
  const parseFile = useCallback(async (file) => {
    try {
      setLoading(true);
      setError("");

      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (fileExtension === 'txt') {
        return await parseTXT(file);
      } else if (['xlsx', 'xls'].includes(fileExtension)) {
        return await parseExcel(file);
      } else if (fileExtension === 'csv') {
        return await parseCSV(file);
      } else {
        throw new Error("Unsupported file format. Please upload TXT, CSV, or Excel files.");
      }
    } catch (err) {
      setError(err.message);
      return { headers: [], data: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Parse CSV file with row 12 as headers
   * @param {File} file - CSV file
   * @returns {Object} Parsed headers and data
   */
  const parseCSV = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.trim().split(/\r?\n/);
          
          if (lines.length < 12) {
            reject(new Error("CSV file must have at least 12 rows"));
            return;
          }

          // Row 12 (index 11) as headers
          const headerRow = lines[11].split(',').map(h => h.replace(/"/g, '').trim());
          const headers = headerRow.map((header, index) => ({
            id: `col_${index}`,
            label: header || `Column ${index + 1}`,
            field: `col_${index}`,
            index,
          }));

          // Rest as data (from row 13 onwards)
          const csvData = lines.slice(12).map((line, rowIndex) => {
            const rowData = { id: rowIndex };
            const values = line.split(',').map(v => v.replace(/"/g, '').trim());
            
            headers.forEach((header, colIndex) => {
              rowData[header.field] = values[colIndex] || "";
            });
            return rowData;
          });

          resolve({ headers, data: csvData });
        } catch (error) {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    });
  }, []);

  /**
   * Parse TXT file (tab-separated values)
   * @param {File} file - TXT file
   * @returns {Object} Parsed headers and data
   */
  const parseTXT = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.trim().split(/\r?\n/);
          
          if (lines.length < 12) {
            reject(new Error("TXT file must have at least 12 rows"));
            return;
          }

          // Row 12 (index 11) as headers
          const headerRow = lines[11].split('\t');
          const headers = headerRow.map((header, index) => ({
            id: `col_${index}`,
            label: header?.toString().trim() || `Column ${index + 1}`,
            field: `col_${index}`,
            index,
          }));

          // Rest as data (from row 13 onwards)
          const txtData = lines.slice(12).map((line, rowIndex) => {
            const rowData = { id: rowIndex };
            const values = line.split('\t');
            
            headers.forEach((header, colIndex) => {
              rowData[header.field] = values[colIndex] || "";
            });
            return rowData;
          });

          resolve({ headers, data: txtData });
        } catch (error) {
          reject(new Error(`Failed to parse TXT: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    });
  }, []);

  /**
   * Parse Excel file using XLSX
   * @param {File} file - Excel file
   * @returns {Object} Parsed headers and data
   */
  const parseExcel = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          
          if (workbook.SheetNames.length === 0) {
            reject(new Error("Excel file has no sheets"));
            return;
          }

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          if (!worksheet) {
            reject(new Error("Excel sheet is empty"));
            return;
          }

          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: "",
            raw: false 
          });

          if (jsonData.length < 12) {
            reject(new Error("Excel file must have at least 12 rows"));
            return;
          }

          // Row 12 (index 11) as headers
          const headers = jsonData[11].map((header, index) => ({
            id: `col_${index}`,
            label: header?.toString().trim() || `Column ${index + 1}`,
            field: `col_${index}`,
            index,
          }));

          // Rest as data (from row 13 onwards)
          const excelData = jsonData.slice(12).map((row, rowIndex) => {
            const rowData = { id: rowIndex };
            headers.forEach((header, colIndex) => {
              rowData[header.field] = row[colIndex] || "";
            });
            return rowData;
          });

          resolve({ headers, data: excelData });
        } catch (error) {
          reject(new Error(`Failed to parse Excel: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsArrayBuffer(file);
    });
  }, []);

  /**
   * Handle file upload
   * @param {Event} event - File input change event
   */
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const { headers: parsedHeaders, data } = await parseFile(file);
    
    if (parsedHeaders.length > 0 && data.length > 0) {
      setHeaders(parsedHeaders);
      setRawData(data);
      
      // Auto-select relevant columns
      const orderIdColumn = parsedHeaders.find(h => 
        h.label.toLowerCase().includes('order id') || 
        h.label.toLowerCase().includes('order-id')
      );
      const totalColumn = parsedHeaders.find(h => 
        h.label.toLowerCase().includes('total')
      );
      const typeColumn = parsedHeaders.find(h => 
        h.label.toLowerCase().includes('type')
      );
      const descriptionColumn = parsedHeaders.find(h => 
        h.label.toLowerCase().includes('description')
      );
      
      const defaultColumns = [];
      if (orderIdColumn) defaultColumns.push(orderIdColumn.id);
      if (totalColumn) defaultColumns.push(totalColumn.id);
      if (typeColumn) defaultColumns.push(typeColumn.id);
      if (descriptionColumn) defaultColumns.push(descriptionColumn.id);
      
      setSelectedColumns(defaultColumns);
      setColumnFilters({});
      setSearchQuery("");
      setPage(0);
      setShowFilters(true);
    }
  }, [parseFile]);

  /**
   * Consolidate payments by order ID
   * @returns {Array} Consolidated payment data
   * @pure - No side effects, returns consolidated data
   */
  const consolidatedPayments = useMemo(() => {
    const orderIdColumn = headers.find(h => 
      h.label.toLowerCase().includes('order id') || 
      h.label.toLowerCase().includes('order-id')
    );
    const totalColumn = headers.find(h => 
      h.label.toLowerCase().includes('total')
    );
    const typeColumn = headers.find(h => 
      h.label.toLowerCase().includes('type')
    );
    const descriptionColumn = headers.find(h => 
      h.label.toLowerCase().includes('description')
    );

    if (!orderIdColumn || !totalColumn) {
      return [];
    }

    const consolidated = {};
    
    rawData.forEach(row => {
      const orderId = row[orderIdColumn.field];
      const total = parseFloat(String(row[totalColumn.field] || "0").replace(/,/g, ""));
      
      if (!orderId || orderId.trim() === "") {
        // Use type + description for non-order payments
        const type = typeColumn ? row[typeColumn.field] : "";
        const description = descriptionColumn ? row[descriptionColumn.field] : "";
        const key = `${type} - ${description}`.trim();
        
        if (!consolidated[key]) {
          consolidated[key] = {
            orderId: key,
            total: 0,
            paymentCount: 0,
            payments: []
          };
        }
        
        consolidated[key].total += total;
        consolidated[key].paymentCount += 1;
        consolidated[key].payments.push(row);
      } else {
        if (!consolidated[orderId]) {
          consolidated[orderId] = {
            orderId,
            total: 0,
            paymentCount: 0,
            payments: []
          };
        }
        
        consolidated[orderId].total += total;
        consolidated[orderId].paymentCount += 1;
        consolidated[orderId].payments.push(row);
      }
    });

    return Object.values(consolidated);
  }, [rawData, headers]);

  /**
   * Get selected column details
   * @returns {Array} Selected column objects
   * @pure - No side effects, returns column data
   */
  const selectedColumnDetails = useMemo(() => {
    return headers.filter(h => selectedColumns.includes(h.id));
  }, [headers, selectedColumns]);

  /**
   * Get unique values for a specific column
   * @param {string} columnField - Column field identifier
   * @returns {Array} Array of unique values
   * @pure - No side effects, returns filtered data
   */
  const getColumnUniqueValues = useCallback((columnField) => {
    const values = consolidatedPayments
      .map(row => row[columnField])
      .filter(value => value !== "" && value != null)
      .map(value => String(value).trim());

    return [...new Set(values)].sort();
  }, [consolidatedPayments]);

  /**
   * Handle column selection
   * @param {string} columnId - Selected column ID
   */
  const handleColumnSelect = useCallback((columnId) => {
    setSelectedColumns(prev => {
      if (prev.includes(columnId)) {
        // Remove column and its filters
        const newFilters = { ...columnFilters };
        delete newFilters[columnId];
        setColumnFilters(newFilters);
        return prev.filter(id => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  }, [columnFilters]);

  /**
   * Handle column filter change
   * @param {string} columnId - Column ID
   * @param {Array} selectedValues - Selected filter values
   */
  const handleColumnFilterChange = useCallback((columnId, selectedValues) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnId]: selectedValues
    }));
    setPage(0); // Reset to first page when filtering
  }, []);

  /**
   * Clear all filters
   */
  const clearAllFilters = useCallback(() => {
    setColumnFilters({});
    setSearchQuery("");
    setDateRange({ start: null, end: null });
    setPage(0);
  }, []);

  /**
   * Remove specific column filter
   * @param {string} columnId - Column ID to remove filter for
   */
  const removeColumnFilter = useCallback((columnId) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[columnId];
      return newFilters;
    });
  }, []);

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string
   * @pure - No side effects, returns formatted string
   */
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return dateString;
    }
  }, []);

  /**
   * Check if date is within range
   * @param {string} dateString - Date string to check
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {boolean} Whether date is in range
   * @pure - No side effects, returns boolean
   */
  const isDateInRange = useCallback((dateString, startDate, endDate) => {
    if (!startDate && !endDate) return true;
    if (!dateString) return false;
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return false;
      
      // Set time to start/end of day for proper comparison
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const startOnly = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) : null;
      const endOnly = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) : null;
      
      if (startOnly && endOnly) {
        return dateOnly >= startOnly && dateOnly <= endOnly;
      } else if (startOnly) {
        return dateOnly >= startOnly;
      } else if (endOnly) {
        return dateOnly <= endOnly;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  /**
   * Filter consolidated payments based on selected columns and filters
   * @returns {Array} Filtered and processed data
   * @pure - No side effects, returns filtered data
   */
  const filteredData = useMemo(() => {
    let filtered = consolidatedPayments;

    // Only apply filters if any are actually set
    const hasFilters = Object.keys(columnFilters).length > 0 || searchQuery.trim() || dateRange.start || dateRange.end;

    if (hasFilters) {
      // Apply column filters
      Object.entries(columnFilters).forEach(([columnId, selectedValues]) => {
        if (selectedValues.length > 0) {
          filtered = filtered.filter(row => 
            selectedValues.includes(String(row[columnId]).trim())
          );
        }
      });

      // Apply date range filter
      if (dateRange.start || dateRange.end) {
        const dateTimeColumn = headers.find(col => 
          col.label.toLowerCase().includes('date/time') ||
          col.label.toLowerCase().includes('date_time')
        );
        
        if (dateTimeColumn) {
          filtered = filtered.filter(row => {
            // Check if any payment in this consolidated row matches date range
            return row.payments.some(payment => 
              isDateInRange(payment[dateTimeColumn.field], dateRange.start, dateRange.end)
            );
          });
        }
      }

      // Apply search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(row => {
          return selectedColumns.some(columnId => {
            const column = headers.find(h => h.id === columnId);
            if (!column) return false;
            const value = String(row[column.field] || "").toLowerCase();
            return value.includes(query);
          });
        });
      }
    }

    return filtered;
  }, [consolidatedPayments, columnFilters, searchQuery, selectedColumns, headers, dateRange, isDateInRange]);

  /**
   * Sort data based on sort configuration
   * @returns {Array} Sorted data
   * @pure - No side effects, returns sorted data
   */
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key] || "";
      const bValue = b[sortConfig.key] || "";
      
      // Special handling for total column (numeric sorting)
      if (sortConfig.key === 'total') {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      const comparison = String(aValue).localeCompare(String(bValue));
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  /**
   * Handle table sort
   * @param {string} field - Field to sort by
   */
  const handleSort = useCallback((field) => {
    setSortConfig(prev => ({
      key: field,
      direction: prev.key === field && prev.direction === "asc" ? "desc" : "asc"
    }));
  }, []);

  /**
   * Get paginated data
   * @returns {Array} Current page data
   * @pure - No side effects, returns paginated data
   */
  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  /**
   * Handle order ID click to show detail modal
   * @param {string} orderId - Order ID to show details for
   */
  const handleOrderIdClick = useCallback((orderId) => {
    setSelectedOrderId(orderId);
    setDetailModalOpen(true);
  }, []);

  /**
   * Get payment details for selected order ID
   * @returns {Object} Payment details
   * @pure - No side effects, returns payment data
   */
  const selectedOrderDetails = useMemo(() => {
    if (!selectedOrderId) return null;
    return consolidatedPayments.find(payment => payment.orderId === selectedOrderId);
  }, [selectedOrderId, consolidatedPayments]);

  /**
   * Export filtered data to CSV
   */
  const exportToCSV = useCallback(() => {
    if (filteredData.length === 0) return;

    const selectedHeaders = headers.filter(h => selectedColumns.includes(h.id));
    
    // Create CSV content
    const csvHeaders = selectedHeaders.map(h => h.label).join(",");
    const csvRows = filteredData.map(row => 
      selectedHeaders.map(h => {
        const value = row[h.field] || "";
        // Escape commas and quotes in CSV
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(",")
    );

    const csvContent = [csvHeaders, ...csvRows].join("\n");
    
    // Download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `consolidated_payments_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredData, headers, selectedColumns]);

  /**
   * Format currency for display
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   * @pure - No side effects, returns formatted string
   */
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: "100%" }}>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
        Payments Breakdown
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.1rem' }}>
        Upload your payment file (CSV/Excel/TXT) to consolidate payments by Order ID. 
        Payments are automatically consolidated and totaled by Order ID. Click on any Order ID to view detailed payment records.
      </Typography>

      {/* File Upload Section */}
      <Card sx={{ mb: 4, boxShadow: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            📁 File Upload
          </Typography>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 3 }}>
            <input
              accept=".txt,.xlsx,.xls,.csv"
              style={{ display: "none" }}
              id="file-upload"
              type="file"
              onChange={handleFileUpload}
            />
            <label htmlFor="file-upload">
              <Button
                variant="contained"
                component="span"
                startIcon={<Upload />}
                disabled={loading}
                size="large"
                sx={{ 
                  py: 1.5, 
                  px: 3, 
                  fontSize: '1rem',
                  minWidth: 160,
                  borderRadius: 2
                }}
              >
                {loading ? "Processing..." : "Upload File"}
              </Button>
            </label>
            
            {rawData.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={exportToCSV}
                disabled={selectedColumns.length === 0}
                size="large"
                sx={{ 
                  py: 1.5, 
                  px: 3, 
                  fontSize: '1rem',
                  minWidth: 180,
                  borderRadius: 2
                }}
              >
                Export Consolidated Data
              </Button>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, fontSize: '1rem', py: 1.5 }}>
              {error}
            </Alert>
          )}

          {rawData.length > 0 && (
            <Alert severity="success" sx={{ mb: 2, fontSize: '1rem', py: 1.5 }}>
              ✅ Loaded {rawData.length} payment records, consolidated into {consolidatedPayments.length} unique orders
            </Alert>
          )}
        </CardContent>
      </Card>

      {rawData.length > 0 && (
        <>
          {/* Column Selection */}
          <Card sx={{ mb: 4, boxShadow: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  📊 Column Selection
                </Typography>
                <Button
                  size="medium"
                  variant="outlined"
                  onClick={() => setShowFilters(!showFilters)}
                  startIcon={showFilters ? <VisibilityOff /> : <Visibility />}
                  sx={{ 
                    py: 1, 
                    px: 2, 
                    fontSize: '0.95rem',
                    borderRadius: 2,
                    fontWeight: 600
                  }}
                >
                  {showFilters ? "Hide Filters" : "Show Filters"}
                </Button>
              </Box>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <Autocomplete
                  multiple
                  options={headers}
                  getOptionLabel={(option) => option.label}
                  value={headers.filter(h => selectedColumns.includes(h.id))}
                  onChange={(event, newValue) => {
                    setSelectedColumns(newValue.map(v => v.id));
                  }}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="filled"
                        label={option.label}
                        {...getTagProps({ index })}
                        key={option.id}
                        sx={{ 
                          fontSize: '0.9rem',
                          py: 1.5,
                          px: 1,
                          height: 'auto',
                          '& .MuiChip-label': { px: 1.5, py: 0.5 },
                          backgroundColor: 'primary.light',
                          color: 'primary.contrastText',
                          fontWeight: 600,
                          '&:hover': {
                            backgroundColor: 'primary.main'
                          }
                        }}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select columns to display"
                      placeholder="Choose columns..."
                      sx={{ 
                        '& .MuiInputBase-root': { 
                          minHeight: 56,
                          fontSize: '1rem'
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '1rem',
                          fontWeight: 600
                        }
                      }}
                    />
                  )}
                />
              </FormControl>

            </CardContent>
          </Card>

          {/* Data Table */}
          {selectedColumns.length > 0 && (
            <Card sx={{ boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                {/* Filters Section */}
                {showFilters && (
                  <Box sx={{ mb: 4, p: 3, backgroundColor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        🔍 Filters
                      </Typography>
                      <Button
                        size="medium"
                        onClick={clearAllFilters}
                        startIcon={<Clear />}
                        disabled={Object.keys(columnFilters).length === 0 && !searchQuery}
                        sx={{ 
                          py: 1, 
                          px: 2, 
                          fontSize: '0.95rem',
                          borderRadius: 2
                        }}
                      >
                        Clear All
                      </Button>
                    </Box>

                    {/* Search */}
                    <TextField
                      fullWidth
                      label="Search in selected columns"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      sx={{ 
                        mb: 3,
                        '& .MuiInputBase-root': { 
                          minHeight: 56,
                          fontSize: '1rem'
                        }
                      }}
                    />

                    {/* Date Range Filter */}
                    {headers.some(col => 
                      col.label.toLowerCase().includes('date/time') ||
                      col.label.toLowerCase().includes('date_time')
                    ) && (
                      <Box sx={{ mb: 3, p: 2, backgroundColor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'grey.300' }}>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                          📅 Date/Time Range
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Start Date"
                              type="date"
                              value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
                              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value ? new Date(e.target.value) : null }))}
                              InputLabelProps={{ shrink: true }}
                              fullWidth
                              sx={{ 
                                '& .MuiInputBase-root': { 
                                  minHeight: 56,
                                  fontSize: '1rem'
                                }
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="End Date"
                              type="date"
                              value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
                              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value ? new Date(e.target.value) : null }))}
                              InputLabelProps={{ shrink: true }}
                              fullWidth
                              sx={{ 
                                '& .MuiInputBase-root': { 
                                  minHeight: 56,
                                  fontSize: '1rem'
                                }
                              }}
                            />
                          </Grid>
                        </Grid>
                        {(dateRange.start || dateRange.end) && (
                          <Button
                            size="small"
                            onClick={() => setDateRange({ start: null, end: null })}
                            sx={{ mt: 2, fontSize: '0.85rem' }}
                          >
                            Clear Date Range
                          </Button>
                        )}
                      </Box>
                    )}

                    {/* Column Filters */}
                    <Grid container spacing={3}>
                      {selectedColumnDetails.map((column) => {
                        const uniqueValues = getColumnUniqueValues(column.field);
                        const currentFilters = columnFilters[column.id] || [];

                        return (
                          <Grid item xs={12} md={6} lg={4} key={column.id}>
                            <FormControl fullWidth>
                              <Autocomplete
                                multiple
                                options={uniqueValues}
                                value={currentFilters}
                                onChange={(event, newValue) => {
                                  handleColumnFilterChange(column.id, newValue);
                                }}
                                renderTags={(value, getTagProps) =>
                                  value.map((option, index) => (
                                    <Chip
                                      variant="outlined"
                                      label={option}
                                      size="medium"
                                      {...getTagProps({ index })}
                                      key={option}
                                      sx={{ 
                                        fontSize: '0.85rem',
                                        py: 1.5,
                                        '& .MuiChip-label': { px: 1 }
                                      }}
                                    />
                                  ))
                                }
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label={column.label}
                                    placeholder={`Filter by ${column.label}...`}
                                    sx={{ 
                                      '& .MuiInputBase-root': { 
                                        minHeight: 56,
                                        fontSize: '1rem'
                                      }
                                    }}
                                  />
                                )}
                              />
                              {currentFilters.length > 0 && (
                                <Button
                                  size="small"
                                  onClick={() => removeColumnFilter(column.id)}
                                  sx={{ 
                                    mt: 2,
                                    fontSize: '0.85rem',
                                    py: 0.5,
                                    px: 1.5
                                  }}
                                >
                                  Clear {column.label} filter
                                </Button>
                              )}
                            </FormControl>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                )}

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    💰 Consolidated Payments ({filteredData.length} orders)
                    {Object.keys(columnFilters).length === 0 && !searchQuery && (
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 2, fontSize: '0.9rem' }}>
                        (All orders shown)
                      </Typography>
                    )}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                    Showing {paginatedData.length} of {filteredData.length} orders
                  </Typography>
                </Box>

                <TableContainer component={Paper} sx={{ maxHeight: 600, borderRadius: 3, boxShadow: 2 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        {selectedColumnDetails.map((column) => (
                          <TableCell 
                            key={column.id}
                            sx={{ 
                              fontSize: '1.1rem',
                              fontWeight: 700,
                              py: 3,
                              px: 2,
                              backgroundColor: 'primary.main',
                              color: 'primary.contrastText',
                              borderBottom: '2px solid',
                              borderBottomColor: 'primary.dark'
                            }}
                          >
                            <TableSortLabel
                              active={sortConfig.key === column.field}
                              direction={sortConfig.key === column.field ? sortConfig.direction : "asc"}
                              onClick={() => handleSort(column.field)}
                              sx={{ 
                                fontSize: '1.1rem', 
                                fontWeight: 700,
                                color: 'primary.contrastText',
                                '&:hover': { color: 'primary.contrastText' },
                                '&.Mui-active': { color: 'primary.contrastText' },
                                '& .MuiTableSortLabel-icon': { color: 'primary.contrastText' }
                              }}
                            >
                              {column.label}
                            </TableSortLabel>
                          </TableCell>
                        ))}
                        <TableCell 
                          sx={{ 
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            py: 3,
                            px: 2,
                            backgroundColor: 'primary.main',
                            color: 'primary.contrastText',
                            borderBottom: '2px solid',
                            borderBottomColor: 'primary.dark'
                          }}
                        >
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedData.map((row, index) => (
                        <TableRow 
                          key={row.orderId} 
                          hover
                          sx={{ 
                            '&:hover': { backgroundColor: '#f5f5f5' }
                          }}
                        >
                          {selectedColumnDetails.map((column) => (
                            <TableCell 
                              key={column.id}
                              sx={{ 
                                fontSize: '1rem',
                                py: 2,
                                px: 2,
                                fontWeight: 500,
                                borderBottom: '1px solid',
                                borderBottomColor: 'grey.200'
                              }}
                            >
                              {column.field === 'total' 
                                ? formatCurrency(row.total)
                                : (row[column.field] || "")
                              }
                            </TableCell>
                          ))}
                          <TableCell sx={{ py: 2, px: 2 }}>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Receipt />}
                              onClick={() => handleOrderIdClick(row.orderId)}
                              sx={{ 
                                fontSize: '0.85rem',
                                py: 0.5,
                                px: 1.5
                              }}
                            >
                              View Details ({row.paymentCount})
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  component="div"
                  count={filteredData.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(event, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(event) => {
                    setRowsPerPage(parseInt(event.target.value, 10));
                    setPage(0);
                  }}
                  sx={{ 
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                      fontSize: '0.95rem'
                    }
                  }}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Payment Details Modal */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '1.2rem', fontWeight: 600 }}>
          <Payment />
          Payment Details for Order: {selectedOrderId}
        </DialogTitle>
        <DialogContent>
          {selectedOrderDetails && (
            <Box>
              <Box sx={{ mb: 3, p: 2, backgroundColor: 'primary.light', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {formatCurrency(selectedOrderDetails.total)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Payment Count</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {selectedOrderDetails.paymentCount}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Individual Payment Records
              </Typography>
              
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableCell 
                          key={header.id}
                          sx={{ 
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            py: 2,
                            px: 1,
                            backgroundColor: 'grey.100'
                          }}
                        >
                          {header.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrderDetails.payments.map((payment, index) => (
                      <TableRow key={index} hover>
                        {headers.map((header) => (
                          <TableCell 
                            key={header.id}
                            sx={{ 
                              fontSize: '0.85rem',
                              py: 1.5,
                              px: 1
                            }}
                          >
                            {(header.label.toLowerCase().includes('date/time') || 
                              header.label.toLowerCase().includes('date_time')) 
                              ? formatDate(payment[header.field]) 
                              : (payment[header.field] || "")
                            }
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailModalOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4, py: 4 }}>
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Processing your file...
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PaymentsBreakdown;