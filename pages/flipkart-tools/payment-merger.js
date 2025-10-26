import React, { useState } from "react";
import * as XLSX from "xlsx";
import { DataGrid } from "@mui/x-data-grid";
import {
  Upload,
  X,
  CheckCircle2,
  FileText,
  AlertCircle,
  Download,
} from "lucide-react";
import styles from "../../styles/orders-report.module.css";

const PaymentSheetsMerger = () => {
  const [files, setFiles] = useState([]);
  const [consolidatedData, setConsolidatedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [statistics, setStatistics] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Utility function to consolidate payments
  const consolidatePayments = (fileBuffers) => {
    console.log("=== CONSOLIDATE PAYMENTS START ===");
    const consolidatedMap = new Map();

    fileBuffers.forEach((buffer, fileIndex) => {
      console.log(`\n--- Processing File ${fileIndex + 1} ---`);
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames.includes("Orders")
        ? "Orders"
        : workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        console.log("No sheet found");
        return;
      }

      const range = XLSX.utils.decode_range(sheet["!ref"]);
      console.log(`Sheet range: ${range.s.r} to ${range.e.r}, columns ${range.s.c} to ${range.e.c}`);

      // Get all headers from rows 2 and 3
      const allHeaders = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cell1 = XLSX.utils.encode_cell({ r: 1, c: col });
        const cell2 = XLSX.utils.encode_cell({ r: 2, c: col });
        const val1 = sheet[cell1] ? String(sheet[cell1].v).trim() : "";
        const val2 = sheet[cell2] ? String(sheet[cell2].v).trim() : "";
        const header = val1 && val2 ? `${val1}_${val2}` : val1 || val2 || `Col_${col}`;
        allHeaders.push(header);
      }

      console.log("All headers:", allHeaders);

      // Process data rows starting from row 4
      for (let row = 3; row <= range.e.r; row++) {
        const rowData = {};

        // Extract all columns
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = sheet[cellAddress];
          const value = cell ? cell.v : null;

          if (value !== null && value !== "") {
            rowData[allHeaders[col - range.s.c]] = value;
          }
        }

        // Get Order ID
        const orderId = rowData["Order ID"] || rowData["Order_ID"] || rowData["OrderID"];
        if (!orderId) continue;

        const normalizedId = String(orderId).trim().toLowerCase();
        console.log(`Row ${row}: Order ID = "${orderId}" (normalized: "${normalizedId}")`);

        // Initialize if new order
        if (!consolidatedMap.has(normalizedId)) {
          consolidatedMap.set(normalizedId, {
            orderId: String(orderId),
            allRecords: [],
            bankSettlementValue: 0,
            columnData: {},
          });
        }

        const entry = consolidatedMap.get(normalizedId);

        // Calculate bank settlement value (sum of numeric values)
        let bankSettlementValue = 0;
        Object.values(rowData).forEach((value) => {
          if (typeof value === 'number' && !isNaN(value)) {
            bankSettlementValue += value;
          }
        });

        entry.bankSettlementValue += bankSettlementValue;
        entry.allRecords.push(rowData);

        // Merge column data
        Object.keys(rowData).forEach((key) => {
          if (key !== "Order ID" && key !== "Order_ID" && key !== "OrderID") {
            const value = rowData[key];
            if (typeof value === 'number') {
              entry.columnData[key] = (entry.columnData[key] || 0) + value;
            }
          }
        });
      }
    });

    const consolidated = Array.from(consolidatedMap.values());
    
    console.log("\n=== CONSOLIDATION COMPLETE ===");
    console.log(`Total unique orders: ${consolidated.length}`);
    consolidated.forEach((entry, index) => {
      console.log(`\n--- Order ${index + 1} ---`);
      console.log(`Order ID: ${entry.orderId}`);
      console.log(`Bank Settlement Value: ${entry.bankSettlementValue}`);
      console.log(`Number of records: ${entry.allRecords.length}`);
      console.log("Column Data:", entry.columnData);
      console.log("All Records:", entry.allRecords);
    });

    return consolidated;
  };

  const handleProcessFiles = async () => {
    if (files.length === 0) {
      setError("Please upload at least one payment sheet");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const buffers = [];
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        buffers.push(buffer);
      }

      const consolidated = consolidatePayments(buffers);

      const totalSettlement = consolidated.reduce(
        (sum, entry) => sum + entry.bankSettlementValue,
        0
      );

      setStatistics({
        uniqueOrderIds: consolidated.length,
        totalBankSettlementValue: totalSettlement,
        totalFiles: files.length,
      });

      setConsolidatedData(consolidated);
      setSuccessMsg(
        `✅ Processed ${files.length} file(s), found ${consolidated.length} unique orders`
      );
    } catch (err) {
      console.error(err);
      setError(`Processing error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

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

    setSuccessMsg(`✅ Exported ${consolidatedData.length} orders to Excel`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

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
      (file) => file.name.endsWith(".xlsx") || file.name.endsWith(".xls")
    );

    if (droppedFiles.length > 0) {
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  const handleFileInputChange = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      (file) => file.name.endsWith(".xlsx") || file.name.endsWith(".xls")
    );

    if (selectedFiles.length > 0) {
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setFiles([]);
    setConsolidatedData([]);
    setStatistics(null);
    setError("");
    setSuccessMsg("");
  };

  const getDataGridColumns = () => {
    if (consolidatedData.length === 0) return [];

    const columns = [
      { field: 'orderId', headerName: 'Order ID', width: 200, flex: 0.5 },
      {
        field: 'bankSettlementValue',
        headerName: 'Bank Settlement Value (₹)',
        width: 200,
        flex: 0.6,
        valueFormatter: (params) =>
          params.value == null
            ? "₹0.00"
            : `₹${parseFloat(params.value).toFixed(2)}`,
      },
    ];

    // Add dynamic columns from first entry's columnData
    const firstEntry = consolidatedData[0];
    if (firstEntry && firstEntry.columnData) {
      Object.keys(firstEntry.columnData).forEach((key, idx) => {
        columns.push({
          field: `col_${idx}`,
          headerName: key,
          width: 150,
          flex: 0.5,
          valueFormatter: (params) => {
            const value = params.value;
            if (value == null) return '-';
            if (typeof value === 'number') {
              return isNaN(value) ? '-' : value.toFixed(2);
            }
            return String(value);
          },
        });
      });
    }

    return columns;
  };

  const getDataGridRows = () => {
    return consolidatedData.map((row, index) => {
      const rowData = {
        id: index,
        orderId: row.orderId,
        bankSettlementValue: row.bankSettlementValue,
      };

      // Add column data
      if (row.columnData) {
        Object.keys(row.columnData).forEach((key, idx) => {
          rowData[`col_${idx}`] = row.columnData[key];
        });
      }

      return rowData;
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.maxWidth}>
        <div className={styles.header}>
          <h1 className={styles.title}>Payment Sheets Merger</h1>
          <p className={styles.subtitle}>
            Upload multiple payment sheets to merge by Order ID
          </p>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <FileText
              style={{ width: "1.25rem", height: "1.25rem", color: "#2563eb" }}
            />
            Upload Payment Sheets
          </h2>

          <div
            className={`${styles.uploadBox} ${
              dragActive
                ? styles.uploadBoxActive
                : files.length > 0
                ? styles.uploadBoxFilled
                : ""
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <label className={styles.uploadLabel} style={{ width: "100%" }}>
              <Upload className={styles.uploadIcon} />
              <span className={styles.uploadTitle}>
                Drop files here or click to select
              </span>
              <span className={styles.uploadHint}>
                You can upload multiple Excel files (.xlsx, .xls)
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInputChange}
                multiple
                style={{ display: "none" }}
              />
            </label>
          </div>

          {files.length > 0 && (
            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                Uploaded Files ({files.length}):
              </p>
              {files.map((file, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem",
                    background: "#f9fafb",
                    borderRadius: "0.375rem",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <CheckCircle2
                      style={{ width: "1rem", height: "1rem", color: "#10b981" }}
                    />
                    <span style={{ fontSize: "0.875rem", color: "#374151" }}>
                      {file.name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className={styles.removeButton}
                  >
                    <X style={{ width: "0.75rem", height: "0.75rem" }} /> Remove
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
                <Upload style={{ width: "1.25rem", height: "1.25rem" }} />
                Process & Merge{" "}
                {files.length > 0 &&
                  `${files.length} File${files.length > 1 ? "s" : ""}`}
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

        {consolidatedData.length > 0 && statistics && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Results Summary</h2>
            <div className={styles.statsGrid}>
              <div
                className={`${styles.statCard} ${styles.statCardBlue}`}
                style={{ marginBottom: "1rem" }}
              >
                <div className={styles.statCardInner}>
                  <p className={styles.statCardLabel}>Unique Orders</p>
                  <p className={styles.statCardValue}>
                    {statistics.uniqueOrderIds.toLocaleString()}
                  </p>
                </div>
              </div>
              <div
                className={`${styles.statCard} ${styles.statCardGreen}`}
                style={{ marginBottom: "1rem" }}
              >
                <div className={styles.statCardInner}>
                  <p className={styles.statCardLabel}>Total Settlement</p>
                  <p className={styles.statCardValue}>
                    ₹
                    {statistics.totalBankSettlementValue.toLocaleString("en-IN", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
              <button onClick={generateExcelFile} className={styles.button}>
                <Download style={{ width: "1.25rem", height: "1.25rem" }} />
                Export to Excel
              </button>

              <button
                onClick={handleReset}
                className={styles.button}
                style={{
                  background: "linear-gradient(to right, #6b7280, #4b5563)",
                  flex: "0 0 auto",
                }}
              >
                <X style={{ width: "1.25rem", height: "1.25rem" }} />
                Reset
              </button>
            </div>
          </div>
        )}

        {consolidatedData.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Consolidated Data</h2>
            <div style={{ height: 600, width: "100%" }}>
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
                  "& .MuiDataGrid-cell": {
                    fontSize: "0.875rem",
                  },
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "#f9fafb",
                    fontWeight: 600,
                    fontSize: "0.875rem",
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
