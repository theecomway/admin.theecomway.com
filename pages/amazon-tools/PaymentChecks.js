"use client";
import React, { useState, useMemo, useCallback } from "react";
import Papa from "papaparse";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Badge,
  LinearProgress,
  TablePagination,
  InputAdornment,
  Fade,
  Collapse
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Upload as UploadIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingUpIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Assessment as AssessmentIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowRight as ArrowRightIcon
} from '@mui/icons-material';

// Memoized table row component for better performance
const PaymentRow = React.memo(({ r, i, expandedRows, toggleRowExpansion }) => (
  <React.Fragment key={`${r.key}-${i}`}>
    <TableRow 
      hover
      sx={{ 
        cursor: r.isConsolidated ? 'pointer' : 'default',
        '&:hover': { bgcolor: 'action.hover' }
      }}
      onClick={r.isConsolidated ? () => toggleRowExpansion(r.key) : undefined}
    >
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {r.isConsolidated && (
            <IconButton size="small">
              {expandedRows.has(r.key) ? <ArrowDownIcon /> : <ArrowRightIcon />}
            </IconButton>
          )}
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {r.orderId || r.key}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Typography variant="body2">{r.type}</Typography>
      </TableCell>
      <TableCell>
        <Tooltip title={r.description} arrow>
          <Typography 
            variant="body2" 
            sx={{ 
              maxWidth: 200, 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {r.description && r.description.length > 50 
              ? r.description.substring(0, 50) + '...' 
              : r.description}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell align="center">
        <Chip 
          label={r.count} 
          size="small" 
          color="primary" 
          variant="outlined"
        />
      </TableCell>
      <TableCell align="center">
        <Chip
          label={r.isConsolidated ? 'Consolidated' : 'Individual'}
          size="small"
          color={r.isConsolidated ? 'success' : 'warning'}
          variant="filled"
        />
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          ₹{(parseFloat(r.total) || 0).toFixed(2)}
        </Typography>
      </TableCell>
    </TableRow>
    
    {/* Accordion content for consolidated rows */}
    {r.isConsolidated && expandedRows.has(r.key) && r.individualRecords && (
      <TableRow>
        <TableCell colSpan={6} sx={{ p: 0, bgcolor: 'grey.50' }}>
          <Accordion expanded={true} sx={{ boxShadow: 'none', bgcolor: 'transparent' }}>
            <AccordionSummary
              sx={{ 
                bgcolor: 'grey.100', 
                minHeight: 48,
                '&.Mui-expanded': { minHeight: 48 }
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                Individual Payment Records ({r.individualRecords.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date/Time</TableCell>
                      <TableCell>Settlement ID</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="center">Quantity</TableCell>
                      <TableCell>Marketplace</TableCell>
                      <TableCell>Account Type</TableCell>
                      <TableCell>Fulfillment</TableCell>
                      <TableCell>Order City</TableCell>
                      <TableCell>Order State</TableCell>
                      <TableCell>Order Postal</TableCell>
                      <TableCell align="right">Product Sales</TableCell>
                      <TableCell align="right">Shipping Credits</TableCell>
                      <TableCell align="right">Gift Wrap Credits</TableCell>
                      <TableCell align="right">Promotional Rebates</TableCell>
                      <TableCell align="right">Total Sales Tax</TableCell>
                      <TableCell align="right">TCS-CGST</TableCell>
                      <TableCell align="right">TCS-SGST</TableCell>
                      <TableCell align="right">TCS-IGST</TableCell>
                      <TableCell align="right">TDS</TableCell>
                      <TableCell align="right">Selling Fees</TableCell>
                      <TableCell align="right">FBA Fees</TableCell>
                      <TableCell align="right">Other Transaction Fees</TableCell>
                      <TableCell align="right">Other</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.individualRecords.map((record, recordIndex) => (
                      <TableRow key={`${r.key}-record-${recordIndex}`} hover>
                        <TableCell>
                          <Typography variant="caption">
                            {record.date ? new Date(record.date).toLocaleString() : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {record['settlement id'] || record['Settlement ID'] || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{record.type || 'Unknown'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {record['Sku'] || record['SKU'] || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={record.description} arrow>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                maxWidth: 100, 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {record.description && record.description.length > 30 
                                ? record.description.substring(0, 30) + '...' 
                                : record.description || '-'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="caption">{record.quantity || '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{record.marketplace || '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {record['account type'] || record['Account Type'] || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{record.fulfillment || '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {record['order city'] || record['Order City'] || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {record['order state'] || record['Order State'] || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {record['order postal'] || record['Order Postal'] || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            ₹{(parseFloat(record['product sales'] || record['Product Sales'] || 0)).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            ₹{(parseFloat(record['shipping credits'] || record['Shipping Credits'] || 0)).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            ₹{(parseFloat(record['gift wrap credits'] || record['Gift Wrap Credits'] || 0)).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            ₹{(parseFloat(record['promotional rebates'] || record['Promotional Rebates'] || 0)).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            ₹{(parseFloat(record['Total sales tax liable(GST before adjusting TCS)'] || 0)).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            ₹{(parseFloat(record['TCS-CGST'] || 0)).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            ₹{(parseFloat(record['TCS-SGST'] || 0)).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            ₹{(parseFloat(record['TCS-IGST'] || 0)).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            ₹{(parseFloat(record['TDS (Section 194-O)'] || 0)).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            ₹{(parseFloat(record['selling fees'] || record['Selling Fees'] || 0)).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            ₹{(parseFloat(record['fba fees'] || record['FBA Fees'] || 0)).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            ₹{(parseFloat(record['other transaction fees'] || record['Other Transaction Fees'] || 0)).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            ₹{(parseFloat(record.other || 0)).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            ₹{(parseFloat(record.total || 0)).toFixed(2)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </TableCell>
      </TableRow>
    )}
  </React.Fragment>
));

const ConsolidatePayments = () => {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [monthFilter, setMonthFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("total");
  const [sortOrder, setSortOrder] = useState("desc");
  const [delimiter, setDelimiter] = useState(","); // Default to comma
  const [activeTab, setActiveTab] = useState("all");
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

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
          if (typeof value === 'string') {
            return value.trim().replace(/^["']|["']$/g, '');
          }
          return value;
        },
        complete: (result) => {
          // Skip first 11 rows and use row 12 (index 11) as header
          const rows = result.data || [];
          if (rows.length < 12) {
            reject(new Error("CSV file must have at least 12 rows"));
            return;
          }
          
          // Get headers from row 12 (index 11)
          const headers = rows[11].map(header => 
            header ? header.trim().replace(/^["']|["']$/g, '') : ''
          );
          
          // Get data rows starting from row 13 (index 12)
          const dataRows = rows.slice(12);
          
          // Convert to objects with proper headers
          const processedData = dataRows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              if (header) {
                obj[header] = row[index] || '';
              }
            });
            return obj;
          });
          
          // Create a result object similar to Papa Parse's format
          const processedResult = {
            data: processedData,
            errors: result.errors,
            meta: result.meta
          };
          
          // Check for field mismatch errors
          const fieldMismatchErrors = result.errors.filter(error => 
            error.type === 'FieldMismatch' || error.type === 'TooManyFields'
          );
          
          if (fieldMismatchErrors.length > 0 && !delimiter) {
            // If auto-detection failed, try common delimiters
            const delimiters = [',', ';', '\t', '|'];
            let bestResult = null;
            let bestErrorCount = Infinity;
            
            delimiters.forEach(delim => {
              Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                delimiter: delim,
                newline: "",
                quoteChar: '"',
                escapeChar: '"',
                dynamicTyping: false,
                transform: (value) => {
                  if (typeof value === 'string') {
                    return value.trim().replace(/^["']|["']$/g, '');
                  }
                  return value;
                },
                complete: (testResult) => {
                  const testRows = testResult.data || [];
                  if (testRows.length >= 12) {
                    const testHeaders = testRows[11].map(header => 
                      header ? header.trim().replace(/^["']|["']$/g, '') : ''
                    );
                    const testDataRows = testRows.slice(12);
                    const testProcessedData = testDataRows.map(row => {
                      const obj = {};
                      testHeaders.forEach((header, index) => {
                        if (header) {
                          obj[header] = row[index] || '';
                        }
                      });
                      return obj;
                    });
                    
                    const testProcessedResult = {
                      data: testProcessedData,
                      errors: testResult.errors,
                      meta: testResult.meta
                    };
                    
                    const testErrors = testResult.errors.filter(error => 
                      error.type === 'FieldMismatch' || error.type === 'TooManyFields'
                    );
                    
                    if (testErrors.length < bestErrorCount) {
                      bestErrorCount = testErrors.length;
                      bestResult = testProcessedResult;
                    }
                  }
                  
                  // If this is the last delimiter, resolve with best result
                  if (delim === delimiters[delimiters.length - 1]) {
                    resolve(bestResult || processedResult);
                  }
                },
                error: () => {
                  // If this is the last delimiter, resolve with best result
                  if (delim === delimiters[delimiters.length - 1]) {
                    resolve(bestResult || processedResult);
                  }
                }
              });
            });
          } else {
            resolve(processedResult);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }, []);

  const handleCSVUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const result = await parseCSVWithFallback(file, delimiter);
      
      if (result.errors.length > 0) {
        console.warn("CSV parsing warnings:", result.errors);
        
        // Check for critical field mismatch errors
        const fieldMismatchErrors = result.errors.filter(error => 
          error.type === 'FieldMismatch' || error.type === 'TooManyFields'
        );
        
        if (fieldMismatchErrors.length > 0) {
          console.warn("Field mismatch errors detected:", fieldMismatchErrors);
          setError(`CSV parsing issues detected. Please try selecting a different delimiter (comma, semicolon, tab, or pipe) from the dropdown above. Error details: ${fieldMismatchErrors.map(e => `Row ${e.row}: ${e.message}`).join(', ')}`);
        }
        
        // Filter out delimiter detection warnings as they're usually not critical
        const criticalErrors = result.errors.filter(error => 
          error.type !== 'Delimiter' && 
          error.type !== 'UndetectableDelimiter' &&
          error.type !== 'FieldMismatch' &&
          error.type !== 'TooManyFields'
        );
        if (criticalErrors.length > 0) {
          console.warn("Critical CSV parsing errors:", criticalErrors);
        }
        
        // Show user-friendly message for delimiter detection
        const delimiterWarnings = result.errors.filter(error => 
          error.type === 'Delimiter' || error.type === 'UndetectableDelimiter'
        );
        if (delimiterWarnings.length > 0) {
          console.info("Note: CSV delimiter auto-detection had some issues, but parsing should still work correctly.");
        }
      }

      const parsed = result.data || [];
      const cleanData = parsed.map((row) => {
        // Normalize and clean the data
        const orderId = row["order id"] || row["Order ID"] || row["ORDER ID"] || "";
        const type = row["type"] || row["Type"] || "";
        const description = row["description"] || row["Description"] || "";
        const total = parseFloat(row["total"] || row["Total"] || "0") || 0;
        
        // Better date parsing with error handling
        let date = new Date();
        try {
          const dateStr = row["date/time"] || row["date"] || row["Date"];
          if (dateStr) {
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
              date = parsedDate;
            }
          }
        } catch (dateError) {
          console.warn("Date parsing error:", dateError);
        }

        return {
          orderId: orderId.trim(),
          type: type.trim(),
          description: description.trim(),
          total,
          date,
          ...row,
        };
      }).filter(row => row.orderId || row.type); // Filter out completely empty rows

      setData(cleanData);
      setFiltered(cleanData);
    } catch (error) {
      setError("Error processing CSV file: " + error.message);
      console.error("CSV processing error:", error);
    } finally {
      setLoading(false);
    }
  }, [delimiter, parseCSVWithFallback]);

  const consolidatePayments = useCallback((rows) => {
    if (!rows || rows.length === 0) return [];

    const result = [];

    // Use for...of for better performance
    for (const row of rows) {
      if (!row) continue;
      
      if (row.orderId && row.orderId.match(/^\d{3}-\d{7}-\d{7}$/)) {
        // For Order IDs matching xxx-xxxxxxx-xxxxxxx pattern, consolidate them
        const key = `Order:${row.orderId}`;
        
        // Find existing group or create new one
        let group = result.find(item => item.key === key);
        if (!group) {
          group = {
            key,
            orderId: row.orderId,
            type: row.type || "Unknown",
            description: row.description || "No description",
            total: 0,
            count: 0,
            isConsolidated: true,
            individualRecords: [] // Store individual records
          };
          result.push(group);
        }
        
        group.total += parseFloat(row.total) || 0;
        group.count += 1;
        group.individualRecords.push(row); // Add individual record
      } else {
        // For rows without Order ID or with non-matching Order ID, use Type+Description as key but don't consolidate
        const key = `${row.type || 'Unknown'}+${row.description || 'Unknown'}`;
        
        result.push({
          key,
          orderId: row.orderId || "-",
          type: row.type || "Unknown",
          description: row.description || "No description",
          total: parseFloat(row.total) || 0,
          count: 1,
          isConsolidated: false
        });
      }
    }

    return result;
  }, []);

  const handleMonthFilter = useCallback((monthYear) => {
    setMonthFilter(monthYear);
    if (!monthYear) {
      setFiltered(data);
      return;
    }

    try {
      const [year, month] = monthYear.split("-");
      if (!year || !month) {
        setError("Invalid month format");
        return;
      }

      const filteredData = data.filter((row) => {
        if (!row || !row.date) return false;
        
        try {
          const d = new Date(row.date);
          if (isNaN(d.getTime())) return false;
          
          return (
            d.getFullYear() === parseInt(year, 10) &&
            d.getMonth() + 1 === parseInt(month, 10)
          );
        } catch (dateError) {
          console.warn("Date filtering error:", dateError);
          return false;
        }
      });
      setFiltered(filteredData);
    } catch (error) {
      setError("Error filtering by month: " + error.message);
      console.error("Month filter error:", error);
    }
  }, [data]);

  // Group consolidated data by Type+Description
  const groupedConsolidated = useMemo(() => {
    const result = consolidatePayments(filtered);
    
    // Sort the results first
    const sorted = result.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Handle string comparison
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    // Group by Order ID pattern and Type+Description
    const groups = {
      all: sorted, // All items
      consolidated: [], // Orders matching xxx-xxxxxxx-xxxxxxx pattern
      other: []   // everything else
    };

    // Create individual tabs for each Type+Description combination (only for non-Order ID records)
    const typeDescriptionGroups = {};

    sorted.forEach(item => {
      const orderId = item.orderId || item.key || '';
      
      // Categorize for main tabs
      if (orderId.match(/^\d{3}-\d{7}-\d{7}$/)) {
        // Orders matching xxx-xxxxxxx-xxxxxxx pattern (consolidated)
        groups.consolidated.push(item);
      } else {
        groups.other.push(item);
        
        // Only create Type+Description tabs for records WITHOUT Order ID or with non-matching Order ID
        const typeDescKey = `${item.type || 'Unknown'}+${item.description || 'Unknown'}`;
        if (!typeDescriptionGroups[typeDescKey]) {
          typeDescriptionGroups[typeDescKey] = [];
        }
        typeDescriptionGroups[typeDescKey].push(item);
      }
    });

    // Merge main groups with individual Type+Description groups
    return {
      ...groups,
      ...typeDescriptionGroups
    };
  }, [consolidatePayments, filtered, sortBy, sortOrder]);

  // Get current tab data
  const consolidated = useMemo(() => {
    if (activeTab === 'all') return groupedConsolidated.all || [];
    if (activeTab === 'consolidated') return groupedConsolidated.consolidated || [];
    if (activeTab === 'other') return groupedConsolidated.other || [];
    return groupedConsolidated[activeTab] || [];
  }, [groupedConsolidated, activeTab]);

  // Filter data based on debounced search term
  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm) return consolidated;
    
    const searchLower = debouncedSearchTerm.toLowerCase();
    return consolidated.filter(item => 
      (item.orderId && item.orderId.toLowerCase().includes(searchLower)) ||
      (item.type && item.type.toLowerCase().includes(searchLower)) ||
      (item.description && item.description.toLowerCase().includes(searchLower))
    );
  }, [consolidated, debouncedSearchTerm]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  // Handle pagination
  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Debounced search effect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, 300);

    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    }

    return () => clearTimeout(timer);
  }, [searchTerm, debouncedSearchTerm]);

  // Handle search
  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when searching
  }, []);
  
  const grandTotal = useMemo(() => {
    const total = consolidated.reduce((sum, r) => {
      const value = parseFloat(r.total) || 0;
      return sum + value;
    }, 0);
    return isNaN(total) ? 0 : total;
  }, [consolidated]);

  const handleSort = useCallback((column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  }, [sortBy, sortOrder]);

  const toggleRowExpansion = useCallback((rowKey) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowKey)) {
        newSet.delete(rowKey);
      } else {
        newSet.add(rowKey);
      }
      return newSet;
    });
  }, []);

  return (
    <Box sx={{ p: 3, bgcolor: 'grey.50', minHeight: '100vh' }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        Payment Consolidator
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Note:</strong> This tool automatically skips the first 11 rows and uses row 12 as the header row, then processes data starting from row 13.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
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
            
            <TextField
              type="month"
              label="Filter by Month"
              value={monthFilter}
              onChange={(e) => handleMonthFilter(e.target.value)}
              variant="outlined"
              size="small"
              sx={{ minWidth: 200 }}
            />
            
            <TextField
              label="Search payments"
              value={searchTerm}
              onChange={handleSearchChange}
              variant="outlined"
              size="small"
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FilterIcon />
                  </InputAdornment>
                ),
                endAdornment: isSearching && (
                  <InputAdornment position="end">
                    <CircularProgress size={20} />
                  </InputAdornment>
                ),
              }}
              placeholder="Search by Order ID, Type, or Description..."
            />
            
            {data.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<ClearIcon />}
                onClick={() => {
                  setData([]);
                  setFiltered([]);
                  setMonthFilter("");
                  setError("");
                  setSortBy("total");
                  setSortOrder("desc");
                  setDelimiter(",");
                  setActiveTab("all");
                }}
                disabled={loading}
              >
                Clear Data
              </Button>
            )}
            
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="primary">
                  Processing...
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingUpIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
                    ₹{(grandTotal || 0).toFixed(2)}
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    Total of filtered payments
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={3} justifyContent="flex-end">
                <Chip
                  icon={<PaymentIcon />}
                  label={`${consolidated.length} payment${consolidated.length !== 1 ? 's' : ''}`}
                  color="primary"
                  variant="outlined"
                  sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                />
                {data.length > 0 && (
                  <Chip
                    icon={<AssessmentIcon />}
                    label={`${data.length} total entries`}
                    color="secondary"
                    variant="outlined"
                    sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                  />
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Enhanced Tabs */}
      {data.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptIcon />
              Payment Categories
            </Typography>
            
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 2 }}
            >
              <Tab
                label={
                  <Badge badgeContent={(groupedConsolidated.all || []).length} color="primary">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssessmentIcon />
                      All
                    </Box>
                  </Badge>
                }
                value="all"
              />
              <Tab
                label={
                  <Badge badgeContent={(groupedConsolidated.consolidated || []).length} color="primary">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PaymentIcon />
                      Consolidated Orders
                    </Box>
                  </Badge>
                }
                value="consolidated"
              />
              <Tab
                label={
                  <Badge badgeContent={(groupedConsolidated.other || []).length} color="primary">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ReceiptIcon />
                      Other
                    </Box>
                  </Badge>
                }
                value="other"
              />
            </Tabs>

            {/* Type+Description Tabs */}
            {Object.keys(groupedConsolidated)
              .filter(key => !['all', 'consolidated', 'other'].includes(key))
              .sort()
              .length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
                  Payment Types
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 120, overflowY: 'auto' }}>
                  {Object.keys(groupedConsolidated)
                    .filter(key => !['all', 'consolidated', 'other'].includes(key))
                    .sort()
                    .map(typeDescKey => {
                      const count = (groupedConsolidated[typeDescKey] || []).length;
                      if (count === 0) return null;
                      
                      const displayName = typeDescKey.length > 25 
                        ? typeDescKey.substring(0, 25) + '...' 
                        : typeDescKey;
                      
                      return (
                        <Chip
                          key={typeDescKey}
                          label={`${displayName} (${count})`}
                          onClick={() => setActiveTab(typeDescKey)}
                          color={activeTab === typeDescKey ? "primary" : "default"}
                          variant={activeTab === typeDescKey ? "filled" : "outlined"}
                          size="small"
                          sx={{ mb: 1 }}
                          title={typeDescKey}
                        />
                      );
                    })}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'orderId'}
                    direction={sortBy === 'orderId' ? sortOrder : 'asc'}
                    onClick={() => handleSort('orderId')}
                  >
                    Order ID / Key
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'type'}
                    direction={sortBy === 'type' ? sortOrder : 'asc'}
                    onClick={() => handleSort('type')}
                  >
                    Type
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'description'}
                    direction={sortBy === 'description' ? sortOrder : 'asc'}
                    onClick={() => handleSort('description')}
                  >
                    Description
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">
                  <TableSortLabel
                    active={sortBy === 'count'}
                    direction={sortBy === 'count' ? sortOrder : 'asc'}
                    onClick={() => handleSort('count')}
                  >
                    # Payments
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortBy === 'total'}
                    direction={sortBy === 'total' ? sortOrder : 'asc'}
                    onClick={() => handleSort('total')}
                  >
                    Total (₹)
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <AssessmentIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                      <Typography variant="h6" color="text.secondary">
                        {data.length === 0 ? "Upload a CSV file to get started" : 
                         searchTerm ? "No payments found matching your search" : 
                         "No payments found for the selected criteria"}
                      </Typography>
                      {searchTerm && (
                        <Button 
                          variant="outlined" 
                          onClick={() => setSearchTerm("")}
                          sx={{ mt: 1 }}
                        >
                          Clear Search
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((r, i) => (
                  <PaymentRow 
                    key={`${r.key}-${i}`}
                    r={r}
                    i={i}
                    expandedRows={expandedRows}
                    toggleRowExpansion={toggleRowExpansion}
                  />
                ))
          )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination Controls */}
        {filteredData.length > 0 && (
          <TablePagination
            component="div"
            count={filteredData.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Rows per page:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
            }
            sx={{
              borderTop: 1,
              borderColor: 'divider',
              '& .MuiTablePagination-toolbar': {
                paddingLeft: 2,
                paddingRight: 2,
              }
            }}
          />
        )}
      </Card>
    </Box>
  );
};

export default ConsolidatePayments;
