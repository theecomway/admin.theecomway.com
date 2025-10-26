import React, { useState } from "react";
import * as XLSX from "xlsx";
import { DataGrid } from "@mui/x-data-grid";
import {
  Upload,
  X,
  CheckCircle2,
  FileText,
  AlertCircle,
  DollarSign,
  Download,
  Package,
} from "lucide-react";
import styles from "../../styles/orders-report.module.css";

const PaymentSheetsMerger = () => {
  // File state
  const [files, setFiles] = useState([]);
  const [consolidatedData, setConsolidatedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [statistics, setStatistics] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Normalize Order ID
  const normalizeOrderId = (id) => {
    if (!id) return "";
    return String(id).trim().toLowerCase();
  };

  // Parse Payment Sheet
  const parsePaymentSheet = (workbook) => {
    const sheetName = workbook.SheetNames.includes("Orders")
      ? "Orders"
      : workbook.SheetNames[0];
    
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return { headers: [], data: [] };

    const range = XLSX.utils.decode_range(sheet["!ref"]);
    
    // Create headers from row 2 and row 3
    const headers = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell1 = XLSX.utils.encode_cell({ r: 1, c: col });
      const cell2 = XLSX.utils.encode_cell({ r: 2, c: col });
      
      const val1 = sheet[cell1] ? String(sheet[cell1].v).trim() : "";
      const val2 = sheet[cell2] ? String(sheet[cell2].v).trim() : "";
      
      // Merge headers
      let header = val1 && val2 ? `${val1}_${val2}` : val1 || val2 || `Column_${col}`;
      header = header.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
      headers.push(header);
    }

    // Parse data rows starting from row 4
    const data = [];
    for (let row = 3; row <= range.e.r; row++) {
      const rowData = {};
      let hasData = false;
      
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        const value = cell ? cell.v : null;
        
        if (value !== null && value !== "") hasData = true;
        
        const headerIndex = col - range.s.c;
        rowData[headers[headerIndex]] = value;
      }
      
      if (hasData) data.push(rowData);
    }

    return { headers, data };
  };

  // Merge payment datasets by Order ID
  const mergePaymentSheets = (datasets) => {
    const consolidatedMap = new Map();
    let totalRows = 0;

    datasets.forEach(({ headers, data }) => {
      data.forEach((row) => {
        totalRows++;
        
        const orderId = normalizeOrderId(row["Order ID"]);
        if (!orderId) return;

        // Get Bank Settlement Value
        let bankSettlementValue = 0;
        for (const key in row) {
          if (key.toLowerCase().includes("bank settlement")) {
            const value = row[key];
            if (typeof value === 'number') {
              bankSettlementValue = value;
            } else if (typeof value === 'string') {
              bankSettlementValue = parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
            }
            break;
          }
        }

        // Create or update consolidated entry
        if (!consolidatedMap.has(orderId)) {
          consolidatedMap.set(orderId, {
            orderId: row["Order ID"], // Keep original
            bankSettlementValue: 0,
            columnData: { ...row }, // Store all row data
          });
        }

        const entry = consolidatedMap.get(orderId);
        entry.bankSettlementValue += bankSettlementValue;
        
        // Merge other column data (sum numeric values)
        Object.keys(row).forEach((key) => {
          if (key !== "Order ID" && key !== "Bank Settlement Value (Rs.) = SUM(J:R)") {
            const value = row[key];
            const existingValue = entry.columnData[key];
            
            if (typeof value === 'number' && typeof existingValue === 'number') {
              entry.columnData[key] = (existingValue || 0) + (value || 0);
            } else if (typeof value === 'number' && existingValue == null) {
              entry.columnData[key] = value;
            }
          }
        });
      });
    });

    const consolidated = Array.from(consolidatedMap.values());
    return { consolidated, totalRows };
  };

  // Process files
  const handleProcessFiles = async () => {
    if (files.length === 0) {
      setError("Please upload at least one payment sheet");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const datasets = [];
      
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const result = parsePaymentSheet(workbook);
        datasets.push(result);
      }

      const { consolidated, totalRows } = mergePaymentSheets(datasets);
      
      const totalSettlement = consolidated.reduce(
        (sum, entry) => sum + entry.bankSettlementValue,
        0
      );

      setStatistics({
        uniqueOrderIds: consolidated.length,
        totalBankSettlementValue: totalSettlement,
        totalFiles: files.length,
        totalRowsProcessed: totalRows,
      });

      setConsolidatedData(consolidated);
      setSuccessMsg(
        `✅ Successfully merged ${totalRows} rows from ${files.length} file(s) into ${consolidated.length} unique Order IDs`
      );
    } catch (err) {
      console.error(err);
      setError(`Processing error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate Excel file
  const generateExcelFile = () => {
    if (consolidatedData.length === 0) {
      setError("No data to export");
      return;
    }

    const exportData = consolidatedData.map((entry) => ({
      "Order ID": entry.orderId,
      "Bank Settlement Value (Rs.)": entry.bankSettlementValue,
      ...entry.columnData,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Consolidated Payments");
    XLSX.writeFile(wb, `payment-sheets-merged-${Date.now()}.xlsx`);
    
    setSuccessMsg(`✅ Successfully exported ${consolidatedData.length} orders to Excel`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // Drag handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    );
    
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const handleFileInputChange = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      file => file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    );
    
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setFiles([]);
    setConsolidatedData([]);
    setStatistics(null);
    setError("");
    setSuccessMsg("");
  };

  // Get DataGrid columns
  const getDataGridColumns = () => {
    if (consolidatedData.length === 0) return [];

    const baseColumns = [
      {
        field: 'orderId',
        headerName: 'Order ID',
        width: 200,
        flex: 0.5,
      },
      {
        field: 'bankSettlementValue',
        headerName: 'Bank Settlement Value (₹)',
        width: 200,
        flex: 0.6,
        valueFormatter: (params) => {
          if (params.value == null || params.value === undefined) return '₹0.00';
          return `₹${parseFloat(params.value).toFixed(2)}`;
        },
      },
    ];

    // Get all dynamic columns from the first row
    const sampleData = consolidatedData[0];
    if (sampleData && sampleData.columnData) {
      const dynamicColumns = Object.keys(sampleData.columnData)
        .filter(key => key !== "Order ID" && !key.toLowerCase().includes("bank settlement"))
        .map((key, index) => ({
          field: `col_${index}`,
          headerName: key,
          width: 150,
          flex: 0.5,
        }));

      return [...baseColumns, ...dynamicColumns];
    }

    return baseColumns;
  };

  // Get DataGrid rows
  const getDataGridRows = () => {
    if (consolidatedData.length === 0) return [];

    const sampleData = consolidatedData[0];
    const allKeys = sampleData.columnData ? Object.keys(sampleData.columnData) : [];

    return consolidatedData.map((row, index) => {
      const rowData = {
        id: index,
        orderId: row.orderId,
        bankSettlementValue: row.bankSettlementValue,
      };

      // Add dynamic columns
      allKeys.forEach((key, idx) => {
        if (key !== "Order ID" && !key.toLowerCase().includes("bank settlement")) {
          rowData[`col_${idx}`] = row.columnData[key];
        }
      });

      return rowData;
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.maxWidth}>
        <div className={styles.header}>
          <h1 className={styles.title}>Payment Sheets Merger</h1>
          <p className={styles.subtitle}>
            Upload multiple payment sheets to merge by Order ID and export consolidated data
          </p>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <FileText style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
            Upload Payment Sheets
          </h2>
          
          <div
            className={`${styles.uploadBox} ${
              dragActive
                ? styles.uploadBoxActive
                : files.length > 0
                ? styles.uploadBoxFilled
                : ''
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <label className={styles.uploadLabel} style={{ width: '100%' }}>
              <Upload className={styles.uploadIcon} />
              <span className={styles.uploadTitle}>Drop files here or click to select</span>
              <span className={styles.uploadHint}>You can upload multiple Excel files (.xlsx, .xls)</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInputChange}
                multiple
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {files.length > 0 && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                Uploaded Files ({files.length}):
              </p>
              {files.map((file, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: '#f9fafb',
                    borderRadius: '0.375rem',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 style={{ width: '1rem', height: '1rem', color: '#10b981' }} />
                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>{file.name}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className={styles.removeButton}
                  >
                    <X style={{ width: '0.75rem', height: '0.75rem' }} /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleProcessFiles}
            disabled={loading || files.length === 0}
            className={styles.button}
          >
            {loading ? (
              <>
                <div className={styles.spinner}></div>
                Processing...
              </>
            ) : (
              <>
                <Upload style={{ width: '1.25rem', height: '1.25rem' }} />
                Process & Merge {files.length > 0 && `${files.length} File${files.length > 1 ? 's' : ''}`}
              </>
            )}
          </button>

          {error && (
            <div className={`${styles.alert} ${styles.alertError}`}>
              <AlertCircle className={styles.alertIcon} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className={`${styles.alert} ${styles.alertSuccess}`}>
              <CheckCircle2 className={styles.alertIcon} />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {consolidatedData.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateInner}>
              <FileText className={styles.emptyStateIcon} />
              <h3 className={styles.emptyStateTitle}>No Data Yet</h3>
              <p className={styles.emptyStateText}>
                Upload multiple payment sheets above to merge by Order ID.
              </p>
            </div>
          </div>
        )}

        {consolidatedData.length > 0 && statistics && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <Package style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
              Results Summary
            </h2>
            
            <div className={styles.statsGrid} style={{ marginBottom: '1rem' }}>
              <div className={`${styles.statCard} ${styles.statCardBlue}`}>
                <div className={styles.statCardInner}>
                  <div>
                    <p className={styles.statCardLabel}>Unique Order IDs</p>
                    <p className={styles.statCardValue}>{statistics.uniqueOrderIds.toLocaleString()}</p>
                  </div>
                  <Package className={styles.statCardIcon} />
                </div>
              </div>

              <div className={`${styles.statCard} ${styles.statCardGreen}`}>
                <div className={styles.statCardInner}>
                  <div>
                    <p className={styles.statCardLabel}>Total Bank Settlement</p>
                    <p className={styles.statCardValue}>
                      ₹{statistics.totalBankSettlementValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <DollarSign className={styles.statCardIcon} />
                </div>
              </div>

              <div className={`${styles.statCard} ${styles.statCardPurple}`}>
                <div className={styles.statCardInner}>
                  <div>
                    <p className={styles.statCardLabel}>Files Processed</p>
                    <p className={styles.statCardValue}>{statistics.totalFiles}</p>
                  </div>
                  <FileText className={styles.statCardIcon} />
                </div>
              </div>

              <div className={`${styles.statCard} ${styles.statCardOrange}`}>
                <div className={styles.statCardInner}>
                  <div>
                    <p className={styles.statCardLabel}>Total Rows Processed</p>
                    <p className={styles.statCardValue}>{statistics.totalRowsProcessed.toLocaleString()}</p>
                  </div>
                  <Package className={styles.statCardIcon} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                onClick={generateExcelFile}
                className={styles.button}
                style={{ background: 'linear-gradient(to right, #059669, #047857)' }}
              >
                <Download style={{ width: '1.25rem', height: '1.25rem' }} />
                Export to Excel
              </button>
              
              <button
                onClick={handleReset}
                className={styles.button}
                style={{ 
                  background: 'linear-gradient(to right, #6b7280, #4b5563)',
                  flex: '0 0 auto'
                }}
              >
                <X style={{ width: '1.25rem', height: '1.25rem' }} />
                Reset
              </button>
            </div>
          </div>
        )}

        {consolidatedData.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <FileText style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
              Consolidated Data ({consolidatedData.length} rows)
            </h2>
            <div style={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={getDataGridRows()}
                columns={getDataGridColumns()}
                initialState={{
                  pagination: {
                    paginationModel: { page: 0, pageSize: 50 },
                  },
                }}
                pageSizeOptions={[25, 50, 100, 200]}
                checkboxSelection
                disableRowSelectionOnClick
                sx={{
                  '& .MuiDataGrid-cell': {
                    fontSize: '0.875rem',
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: '#f9fafb',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSheetsMerger;
