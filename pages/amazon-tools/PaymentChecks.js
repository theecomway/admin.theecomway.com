"use client";
import React, { useState, useMemo, useCallback } from "react";
import Papa from "papaparse";

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
            isConsolidated: true
          };
          result.push(group);
        }
        
        group.total += parseFloat(row.total) || 0;
        group.count += 1;
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Payment Consolidator</h2>
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded">
        <strong>Note:</strong> This tool automatically skips the first 11 rows and uses row 12 as the header row, then processes data starting from row 13.
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <input
          type="file"
          accept=".csv"
          onChange={handleCSVUpload}
          disabled={loading}
          className="border p-2 rounded disabled:opacity-50"
        />
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => handleMonthFilter(e.target.value)}
          className="border p-2 rounded"
        />
        {data.length > 0 && (
          <button
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
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            disabled={loading}
          >
            Clear Data
          </button>
        )}
        {loading && (
          <div className="text-blue-600 font-medium">Processing...</div>
        )}
      </div>

      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-gray-900">
              ₹{(grandTotal || 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">
              Total of filtered payments
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              {consolidated.length} payment{consolidated.length !== 1 ? 's' : ''}
            </div>
            {data.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                {data.length} total entries
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      {data.length > 0 && (
        <div className="mb-6">
          {/* Main Category Tabs */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Categories</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === "all"
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📊 All ({(groupedConsolidated.all || []).length})
              </button>
              <button
                onClick={() => setActiveTab("consolidated")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === "consolidated"
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                🔄 Consolidated Orders ({(groupedConsolidated.consolidated || []).length})
              </button>
              <button
                onClick={() => setActiveTab("other")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === "other"
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📋 Other ({(groupedConsolidated.other || []).length})
              </button>
            </div>
          </div>

          {/* Type+Description Tabs */}
          {Object.keys(groupedConsolidated)
            .filter(key => !['all', 'consolidated', 'other'].includes(key))
            .sort()
            .length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Types</h3>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {Object.keys(groupedConsolidated)
                  .filter(key => !['all', 'consolidated', 'other'].includes(key))
                  .sort()
                  .map(typeDescKey => {
                    const count = (groupedConsolidated[typeDescKey] || []).length;
                    if (count === 0) return null;
                    
                    // Truncate long Type+Description for display
                    const displayName = typeDescKey.length > 25 
                      ? typeDescKey.substring(0, 25) + '...' 
                      : typeDescKey;
                    
                    return (
                      <button
                        key={typeDescKey}
                        onClick={() => setActiveTab(typeDescKey)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                          activeTab === typeDescKey
                            ? "bg-green-500 text-white shadow-md"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                        }`}
                        title={typeDescKey} // Show full name on hover
                      >
                        {displayName} ({count})
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
        <table className="w-full border-collapse">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none transition-colors"
                onClick={() => handleSort('orderId')}
              >
                <div className="flex items-center gap-1">
                  Order ID / Key
                  {sortBy === 'orderId' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none transition-colors"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center gap-1">
                  Type
                  {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none transition-colors"
                onClick={() => handleSort('description')}
              >
                <div className="flex items-center gap-1">
                  Description
                  {sortBy === 'description' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none transition-colors"
                onClick={() => handleSort('count')}
              >
                <div className="flex items-center justify-center gap-1">
                  # Payments
                  {sortBy === 'count' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none transition-colors"
                onClick={() => handleSort('total')}
              >
                <div className="flex items-center justify-end gap-1">
                  Total (₹)
                  {sortBy === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
            </tr>
          </thead>
        <tbody className="divide-y divide-gray-200">
          {consolidated.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-6 py-12 text-center">
                <div className="flex flex-col items-center">
                  <div className="text-gray-400 text-4xl mb-2">📊</div>
                  <p className="text-gray-500 text-lg font-medium">
                    {data.length === 0 ? "Upload a CSV file to get started" : "No payments found for the selected criteria"}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            consolidated.map((r, i) => (
              <tr key={`${r.key}-${i}`} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-mono text-gray-900">
                  {r.orderId || r.key}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {r.type}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={r.description}>
                  {r.description && r.description.length > 50 
                    ? r.description.substring(0, 50) + '...' 
                    : r.description}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {r.count}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    r.isConsolidated 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {r.isConsolidated ? '✅ Consolidated' : '📄 Individual'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    ₹{(parseFloat(r.total) || 0).toFixed(2)}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConsolidatePayments;
