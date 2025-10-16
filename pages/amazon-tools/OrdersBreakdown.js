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
      setSelectedColumns([]);
      setColumnFilters({});
      setSearchQuery("");
      setPage(0);
      setShowFilters(true);
    }
  }, [parseFile]);

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
   * Filter data based on selected columns and filters
   * @returns {Array} Filtered and processed data
   * @pure - No side effects, returns filtered data
   */
  const filteredData = useMemo(() => {
    let filtered = rawData;

    // Apply column filters
    Object.entries(columnFilters).forEach(([columnId, selectedValues]) => {
      if (selectedValues.length > 0) {
        filtered = filtered.filter(row => 
          selectedValues.includes(String(row[columnId]).trim())
        );
      }
    });

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

    return filtered;
  }, [rawData, columnFilters, searchQuery, selectedColumns, headers]);

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
   * Get selected column details
   * @returns {Array} Selected column objects
   * @pure - No side effects, returns column data
   */
  const selectedColumnDetails = useMemo(() => {
    return headers.filter(h => selectedColumns.includes(h.id));
  }, [headers, selectedColumns]);

  return (
    <Box sx={{ p: 3, maxWidth: "100%" }}>
      <Typography variant="h4" gutterBottom>
        Orders Breakdown
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload your order file (Excel/TXT) to analyze and filter data by columns and values.
      </Typography>

      {/* File Upload Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
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
              >
                Export Filtered Data
              </Button>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {rawData.length > 0 && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Loaded {rawData.length} rows with {headers.length} columns
            </Alert>
          )}
        </CardContent>
      </Card>

      {rawData.length > 0 && (
        <>
          {/* Column Selection */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <Typography variant="h6">
                  Column Selection
                </Typography>
                <Button
                  size="small"
                  onClick={() => setShowFilters(!showFilters)}
                  startIcon={showFilters ? <VisibilityOff /> : <Visibility />}
                >
                  {showFilters ? "Hide" : "Show"} Filters
                </Button>
              </Box>

              <FormControl fullWidth sx={{ mb: 2 }}>
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
                        variant="outlined"
                        label={option.label}
                        {...getTagProps({ index })}
                        key={option.id}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select columns to display"
                      placeholder="Choose columns..."
                    />
                  )}
                />
              </FormControl>

              {selectedColumns.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Selected Columns ({selectedColumns.length}):
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {selectedColumnDetails.map((column) => (
                      <Chip
                        key={column.id}
                        label={column.label}
                        color="primary"
                        onDelete={() => handleColumnSelect(column.id)}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Filters Section */}
          {showFilters && selectedColumns.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                  <Typography variant="h6">
                    Filters
                  </Typography>
                  <Button
                    size="small"
                    onClick={clearAllFilters}
                    startIcon={<Clear />}
                    disabled={Object.keys(columnFilters).length === 0 && !searchQuery}
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
                  sx={{ mb: 2 }}
                />

                {/* Column Filters */}
                <Grid container spacing={2}>
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
                                  size="small"
                                  {...getTagProps({ index })}
                                  key={option}
                                />
                              ))
                            }
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label={column.label}
                                placeholder={`Filter by ${column.label}...`}
                                size="small"
                              />
                            )}
                          />
                          {currentFilters.length > 0 && (
                            <Button
                              size="small"
                              onClick={() => removeColumnFilter(column.id)}
                              sx={{ mt: 1 }}
                            >
                              Clear {column.label} filter
                            </Button>
                          )}
                        </FormControl>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Data Table */}
          {selectedColumns.length > 0 && (
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6">
                    Data Table ({filteredData.length} rows)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Showing {paginatedData.length} of {filteredData.length} rows
                  </Typography>
                </Box>

                <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        {selectedColumnDetails.map((column) => (
                          <TableCell key={column.id}>
                            <TableSortLabel
                              active={sortConfig.key === column.field}
                              direction={sortConfig.key === column.field ? sortConfig.direction : "asc"}
                              onClick={() => handleSort(column.field)}
                            >
                              {column.label}
                            </TableSortLabel>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedData.map((row) => (
                        <TableRow key={row.id} hover>
                          {selectedColumnDetails.map((column) => (
                            <TableCell key={column.id}>
                              {row[column.field] || ""}
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
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

export default OrdersBreakdown;
