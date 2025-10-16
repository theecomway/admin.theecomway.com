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
} from "@mui/material";
// Simple date input components to avoid ES module issues
import {
  Upload,
  X,
  FilterList,
  Clear,
  Download,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";

/**
 * OrdersBreakdown Component
 * 
 * Features:
 * - File upload (Excel/CSV)
 * - Dynamic header detection
 * - Multi-column selection with dropdown
 * - Individual column filters with unique values
 * - Sortable data table
 * - Export functionality
 * 
 * @pure - Component uses only props and state, no side effects
 */
const OrdersBreakdown = () => {
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
      } else {
        throw new Error("Unsupported file format. Please upload TXT or Excel files.");
      }
    } catch (err) {
      setError(err.message);
      return { headers: [], data: [] };
    } finally {
      setLoading(false);
    }
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
          
          if (lines.length === 0) {
            reject(new Error("TXT file is empty"));
            return;
          }

          // First row as headers (split by tabs)
          const headerRow = lines[0].split('\t');
          const headers = headerRow.map((header, index) => ({
            id: `col_${index}`,
            label: header?.toString().trim() || `Column ${index + 1}`,
            field: `col_${index}`,
            index,
          }));

          // Rest as data (split by tabs)
          const txtData = lines.slice(1).map((line, rowIndex) => {
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

          if (jsonData.length === 0) {
            reject(new Error("Excel sheet has no data"));
            return;
          }

          // First row as headers
          const headers = jsonData[0].map((header, index) => ({
            id: `col_${index}`,
            label: header?.toString().trim() || `Column ${index + 1}`,
            field: `col_${index}`,
            index,
          }));

          // Rest as data
          const excelData = jsonData.slice(1).map((row, rowIndex) => {
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
      
      // Auto-select order-id and order-status columns if they exist
      const orderIdColumn = parsedHeaders.find(h => 
        h.label.toLowerCase().includes('order-id') || 
        h.label.toLowerCase().includes('amazon-order-id') ||
        h.label.toLowerCase().includes('merchant-order-id')
      );
      const orderStatusColumn = parsedHeaders.find(h => 
        h.label.toLowerCase().includes('order-status') ||
        h.label.toLowerCase().includes('status')
      );
      
      const defaultColumns = [];
      if (orderIdColumn) defaultColumns.push(orderIdColumn.id);
      if (orderStatusColumn) defaultColumns.push(orderStatusColumn.id);
      
      setSelectedColumns(defaultColumns);
      setColumnFilters({});
      setSearchQuery("");
      setPage(0);
      setShowFilters(true);
    }
  }, [parseFile]);

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
    const values = rawData
      .map(row => row[columnField])
      .filter(value => value !== "" && value != null)
      .map(value => String(value).trim());

    return [...new Set(values)].sort();
  }, [rawData]);

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
   * Filter data based on selected columns and filters
   * @returns {Array} Filtered and processed data
   * @pure - No side effects, returns filtered data
   */
  const filteredData = useMemo(() => {
    let filtered = rawData;

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
        const purchaseDateColumn = selectedColumnDetails.find(col => 
          col.label.toLowerCase().includes('purchase-date') ||
          col.label.toLowerCase().includes('purchase_date')
        );
        
        if (purchaseDateColumn) {
          filtered = filtered.filter(row => 
            isDateInRange(row[purchaseDateColumn.field], dateRange.start, dateRange.end)
          );
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
  }, [rawData, columnFilters, searchQuery, selectedColumns, headers, dateRange, selectedColumnDetails, isDateInRange]);

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
    link.download = `filtered_orders_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredData, headers, selectedColumns]);

  /**
   * Get row color based on order status
   * @param {Object} row - Table row data
   * @returns {Object} Background color styles
   * @pure - No side effects, returns color styles
   */
  const getRowColor = useCallback((row) => {
    // Find order status column
    const statusColumn = selectedColumnDetails.find(col => 
      col.label.toLowerCase().includes('status') ||
      col.label.toLowerCase().includes('order-status')
    );
    
    if (!statusColumn) {
      return { backgroundColor: 'transparent' };
    }
    
    const status = String(row[statusColumn.field] || "").toLowerCase().trim();
    
    // Color coding based on order status
    if (status.includes('shipped') && status.includes('delivered')) {
      return { 
        backgroundColor: '#e8f5e8', 
        '&:hover': { backgroundColor: '#d4edda' }
      };
    } else if (status.includes('shipped')) {
      return { 
        backgroundColor: '#e3f2fd', 
        '&:hover': { backgroundColor: '#bbdefb' }
      };
    } else if (status.includes('cancelled') || status.includes('canceled')) {
      return { 
        backgroundColor: '#ffebee', 
        '&:hover': { backgroundColor: '#ffcdd2' }
      };
    } else if (status.includes('returned')) {
      return { 
        backgroundColor: '#fff3e0', 
        '&:hover': { backgroundColor: '#ffe0b2' }
      };
    } else if (status.includes('pending')) {
      return { 
        backgroundColor: '#f3e5f5', 
        '&:hover': { backgroundColor: '#e1bee7' }
      };
    } else {
      return { 
        backgroundColor: 'transparent',
        '&:hover': { backgroundColor: '#f5f5f5' }
      };
    }
  }, [selectedColumnDetails]);

  return (
    <Box sx={{ p: 3, maxWidth: "100%" }}>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
        Orders Breakdown
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.1rem' }}>
        Upload your order file (Excel/TXT) to analyze and filter data by columns and values. 
        By default, all rows are shown with Order ID and Order Status columns selected.
      </Typography>

      {/* File Upload Section */}
      <Card sx={{ mb: 4, boxShadow: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            📁 File Upload
          </Typography>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 3 }}>
            <input
              accept=".txt,.xlsx,.xls"
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
                Export Filtered Data
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
              ✅ Loaded {rawData.length} rows with {headers.length} columns
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
                {/* Filters Section - Right above table */}
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
                    {selectedColumnDetails.some(col => 
                      col.label.toLowerCase().includes('purchase-date') ||
                      col.label.toLowerCase().includes('purchase_date')
                    ) && (
                      <Box sx={{ mb: 3, p: 2, backgroundColor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'grey.300' }}>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                          📅 Purchase Date Range
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
                    📋 Data Table ({filteredData.length} rows)
                    {Object.keys(columnFilters).length === 0 && !searchQuery && (
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 2, fontSize: '0.9rem' }}>
                        (All rows shown)
                      </Typography>
                    )}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                    Showing {paginatedData.length} of {filteredData.length} rows
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
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedData.map((row, index) => (
                        <TableRow 
                          key={row.id} 
                          hover
                          sx={getRowColor(row)}
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
                              {(column.label.toLowerCase().includes('purchase-date') || 
                                column.label.toLowerCase().includes('purchase_date')) 
                                ? formatDate(row[column.field]) 
                                : (row[column.field] || "")
                              }
                            </TableCell>
                          ))}
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

export default OrdersBreakdown;
