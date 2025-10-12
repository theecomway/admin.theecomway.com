import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import { 
  Upload, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  Download, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Package,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  FileText
} from "lucide-react";
import styles from "../../styles/orders-report.module.css";

const OrdersPaymentDashboard = () => {
  // File state
  const [orderFile, setOrderFile] = useState(null);
  const [payment1File, setPayment1File] = useState(null);
  const [payment2File, setPayment2File] = useState(null);

  // Data state
  const [orderData, setOrderData] = useState([]);
  const [consolidatedData, setConsolidatedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filter state
  const [statusFilter, setStatusFilter] = useState("");
  const [skuFilter, setSkuFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [returnReasonFilter, setReturnReasonFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Drag and drop state
  const [dragActive, setDragActive] = useState({
    order: false,
    payment1: false,
    payment2: false,
  });

  // Parse Payment Sheet with special header handling
  const parsePaymentSheet = (workbook) => {
    const sheetName = workbook.SheetNames.includes("Orders")
      ? "Orders"
      : workbook.SheetNames[0];
    
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];

    // Get range
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    
    // Skip first row, merge row 2 and row 3 for headers
    const headers = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress2 = XLSX.utils.encode_cell({ r: 1, c: col });
      const cellAddress3 = XLSX.utils.encode_cell({ r: 2, c: col });
      
      const val2 = sheet[cellAddress2] ? String(sheet[cellAddress2].v).trim() : "";
      const val3 = sheet[cellAddress3] ? String(sheet[cellAddress3].v).trim() : "";
      
      // Merge headers from row 2 and row 3
      const mergedHeader = val2 && val3 ? `${val2}_${val3}` : val2 || val3 || `Column_${col}`;
      headers.push(mergedHeader);
    }

    // Parse data rows starting from row 4 (index 3)
    const data = [];
    for (let row = 3; row <= range.e.r; row++) {
      const rowData = {};
      let hasData = false;
      
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        const value = cell ? cell.v : null;
        
        if (value !== null && value !== "") hasData = true;
        rowData[headers[col]] = value;
      }
      
      if (hasData) data.push(rowData);
    }

    return data;
  };

  // Normalize Order ID
  const normalizeOrderId = (id) => {
    if (!id) return "";
    return String(id).trim().toLowerCase();
  };

  // Drag and drop handlers
  const handleDrag = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive((prev) => ({ ...prev, [type]: true }));
    } else if (e.type === "dragleave") {
      setDragActive((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive((prev) => ({ ...prev, [type]: false }));

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      if (type === "order") setOrderFile(file);
      else if (type === "payment1") setPayment1File(file);
      else if (type === "payment2") setPayment2File(file);
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setStatusFilter("");
    setSkuFilter("");
    setProductFilter("");
    setReturnReasonFilter("");
    setSearchQuery("");
  };

  // Export to Excel
  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filteredData);
    XLSX.utils.book_append_sheet(wb, ws, "Consolidated Data");
    XLSX.writeFile(wb, `flipkart-consolidated-${Date.now()}.xlsx`);
  };

  // Handle file processing
  const handleProcessFiles = async () => {
    if (!orderFile) {
      setError("Please upload Order Sheet");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      // Parse Order Sheet
      const orderBuffer = await orderFile.arrayBuffer();
      const orderWorkbook = XLSX.read(orderBuffer);
      const orderSheetName = orderWorkbook.SheetNames.includes("Orders")
        ? "Orders"
        : orderWorkbook.SheetNames[0];
      const orderSheet = orderWorkbook.Sheets[orderSheetName];
      
      // Set range for order sheet
      orderSheet["!ref"] = "A1:Z50000";
      
      const orders = XLSX.utils.sheet_to_json(orderSheet, { defval: null });
      console.log(`Parsed ${orders.length} orders`);

      // Parse Payment Sheets
      let payments = [];
      
      if (payment1File) {
        const payment1Buffer = await payment1File.arrayBuffer();
        const payment1Workbook = XLSX.read(payment1Buffer);
        const payment1Data = parsePaymentSheet(payment1Workbook);
        console.log(`Parsed ${payment1Data.length} payment records from Payment Sheet 1`);
        payments = [...payments, ...payment1Data];
      }

      if (payment2File) {
        const payment2Buffer = await payment2File.arrayBuffer();
        const payment2Workbook = XLSX.read(payment2Buffer);
        const payment2Data = parsePaymentSheet(payment2Workbook);
        console.log(`Parsed ${payment2Data.length} payment records from Payment Sheet 2`);
        payments = [...payments, ...payment2Data];
      }

      // Create payment lookup map
      const paymentMap = {};
      
      // Debug: Log payment sheet columns on first payment entry
      if (payments.length > 0) {
        console.log("Payment sheet columns:", Object.keys(payments[0]));
      }
      
      payments.forEach((payment) => {
        // Try multiple possible Order ID column names
        const orderId = normalizeOrderId(
          payment["Order ID"] ||
          payment["Order_ID"] ||
          payment["order_id"] ||
          payment["OrderID"] ||
          payment["order id"]
        );

        if (!orderId) return;

        // Get settlement value from the exact column name in payment sheet
        // The column is named "Bank Settlement Value (Rs.) \r\n= SUM(J:R)" with line break
        const settlement = parseFloat(
          payment["Bank Settlement Value (Rs.) \r\n= SUM(J:R)"] ||
          payment["Bank Settlement Value (Rs.)_= SUM(J:R)"] ||
          payment["Bank Settlement Value (Rs.) = SUM(J:R)"] ||
          payment["Bank Settlement Value (Rs.)"] ||
          payment["Settlement Amount"] ||
          payment["Settlement_Amount"] ||
          payment["settlement_amount"] ||
          payment["Total Settlement"] ||
          payment["Amount"] ||
          0
        );

        if (!paymentMap[orderId]) {
          paymentMap[orderId] = 0;
        }
        paymentMap[orderId] += settlement;
      });
      
      console.log(`Total unique orders with settlements: ${Object.keys(paymentMap).length}`);

      // Consolidate data
      const consolidated = orders.map((order) => {
        const orderId = normalizeOrderId(
          order.Order_ID || order.order_id || order.OrderID || order["Order ID"]
        );
        
        return {
          Order_ID: order.Order_ID || order.order_id || order.OrderID || order["Order ID"] || "N/A",
          Order_Item_Status: order.Order_Item_Status || order.order_item_status || "N/A",
          SKU: order.SKU || order.sku || "N/A",
          Product_Title: order.Product_Title || order.product_title || order["Product Title"] || "N/A",
          Quantity: order.Quantity || order.quantity || 0,
          Return_Reason: order.Return_Reason || order.return_reason || order["Return Reason"] || "N/A",
          Return_Sub_Reason: order.Return_Sub_Reason || order.return_sub_reason || order["Return Sub Reason"] || "N/A",
          Total_Settlement: paymentMap[orderId] || 0,
        };
      });

      setOrderData(orders);
      setConsolidatedData(consolidated);
      setSuccessMsg(`✅ Successfully processed ${orders.length} orders and ${payments.length} payment records`);
    } catch (err) {
      console.error(err);
      setError(`Parse error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get unique filter values
  const filterOptions = useMemo(() => {
    if (!consolidatedData.length) return { statuses: [], skus: [], products: [], returnReasons: [] };

    const statuses = [...new Set(consolidatedData.map(d => d.Order_Item_Status))].filter(Boolean).sort();
    const skus = [...new Set(consolidatedData.map(d => d.SKU))].filter(Boolean).sort();
    const products = [...new Set(consolidatedData.map(d => d.Product_Title))].filter(Boolean).sort();
    const returnReasons = [...new Set(consolidatedData.map(d => d.Return_Reason))].filter(d => d !== "N/A").sort();

    return { statuses, skus, products, returnReasons };
  }, [consolidatedData]);

  // Filtered data
  const filteredData = useMemo(() => {
    return consolidatedData.filter((row) => {
      if (statusFilter && row.Order_Item_Status !== statusFilter) return false;
      if (skuFilter && row.SKU !== skuFilter) return false;
      if (productFilter && row.Product_Title !== productFilter) return false;
      if (returnReasonFilter && row.Return_Reason !== returnReasonFilter) return false;
      if (searchQuery && !String(row.Order_ID).toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [consolidatedData, statusFilter, skuFilter, productFilter, returnReasonFilter, searchQuery]);

  // Calculate total settlement
  const totalSettlement = useMemo(() => {
    return filteredData.reduce((sum, row) => sum + (parseFloat(row.Total_Settlement) || 0), 0);
  }, [filteredData]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalOrders = filteredData.length;
    const totalQuantity = filteredData.reduce((sum, row) => sum + (parseInt(row.Quantity) || 0), 0);
    const statusCounts = filteredData.reduce((acc, row) => {
      const status = row.Order_Item_Status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const uniqueSKUs = new Set(filteredData.map(row => row.SKU)).size;
    const ordersWithReturns = filteredData.filter(row => row.Return_Reason !== "N/A").length;

    return {
      totalOrders,
      totalQuantity,
      totalSettlement,
      uniqueSKUs,
      ordersWithReturns,
      statusCounts,
    };
  }, [filteredData, totalSettlement]);

  // Table columns
  const columns = useMemo(
    () => [
      {
        accessorKey: "Order_ID",
        header: "Order ID",
        cell: (info) => <div className={styles.orderIdCell}>{info.getValue()}</div>,
      },
      {
        accessorKey: "Order_Item_Status",
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          const getStatusClass = () => {
            if (status.toLowerCase().includes('delivered')) return styles.statusDelivered;
            if (status.toLowerCase().includes('cancelled')) return styles.statusCancelled;
            if (status.toLowerCase().includes('return')) return styles.statusReturn;
            if (status.toLowerCase().includes('pending')) return styles.statusPending;
            return styles.statusDefault;
          };
          return (
            <span className={`${styles.statusBadge} ${getStatusClass()}`}>
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: "SKU",
        header: "SKU",
        cell: (info) => <div className={styles.skuCell}>{info.getValue()}</div>,
      },
      {
        accessorKey: "Product_Title",
        header: "Product Title",
        cell: (info) => <div className={styles.productCell} title={info.getValue()}>{info.getValue()}</div>,
      },
      {
        accessorKey: "Quantity",
        header: "Qty",
        cell: (info) => <div className={styles.quantityCell}>{info.getValue()}</div>,
      },
      {
        accessorKey: "Return_Reason",
        header: "Return Reason",
        cell: (info) => <div>{info.getValue()}</div>,
      },
      {
        accessorKey: "Return_Sub_Reason",
        header: "Return Sub Reason",
        cell: (info) => <div>{info.getValue()}</div>,
      },
      {
        accessorKey: "Total_Settlement",
        header: "Settlement (₹)",
        cell: (info) => (
          <div className={styles.settlementCell}>
            ₹{parseFloat(info.getValue() || 0).toFixed(2)}
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  return (
    <div className={styles.container}>
      <div className={styles.maxWidth}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Orders & Payment Consolidation Dashboard</h1>
          <p className={styles.subtitle}>Upload Order Sheet and Payment Sheets to analyze consolidated settlement data</p>
        </div>

        {/* Upload Section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <FileText style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
            Upload Files
          </h2>
          <div className={styles.uploadGrid}>
            {/* Order Sheet Upload */}
            <div
              className={`${styles.uploadBox} ${
                dragActive.order
                  ? styles.uploadBoxActive
                  : orderFile
                  ? styles.uploadBoxFilled
                  : ''
              }`}
              onDragEnter={(e) => handleDrag(e, "order")}
              onDragLeave={(e) => handleDrag(e, "order")}
              onDragOver={(e) => handleDrag(e, "order")}
              onDrop={(e) => handleDrop(e, "order")}
            >
              <label className={styles.uploadLabel}>
                {orderFile ? (
                  <>
                    <CheckCircle2 className={styles.uploadIconSuccess} />
                    <span className={styles.uploadTitle}>Order Sheet</span>
                    <span className={styles.fileName}>{orderFile.name}</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setOrderFile(null);
                      }}
                      className={styles.removeButton}
                    >
                      <X style={{ width: '0.75rem', height: '0.75rem' }} /> Remove
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className={styles.uploadIcon} />
                    <span className={styles.uploadTitle}>Order Sheet</span>
                    <span className={styles.uploadRequired}>Required</span>
                    <span className={styles.uploadHint}>Click or drag to upload</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setOrderFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Payment Sheet 1 Upload */}
            <div
              className={`${styles.uploadBox} ${
                dragActive.payment1
                  ? styles.uploadBoxActive
                  : payment1File
                  ? styles.uploadBoxFilled
                  : ''
              }`}
              onDragEnter={(e) => handleDrag(e, "payment1")}
              onDragLeave={(e) => handleDrag(e, "payment1")}
              onDragOver={(e) => handleDrag(e, "payment1")}
              onDrop={(e) => handleDrop(e, "payment1")}
            >
              <label className={styles.uploadLabel}>
                {payment1File ? (
                  <>
                    <CheckCircle2 className={styles.uploadIconSuccess} />
                    <span className={styles.uploadTitle}>Payment Sheet 1</span>
                    <span className={styles.fileName}>{payment1File.name}</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setPayment1File(null);
                      }}
                      className={styles.removeButton}
                    >
                      <X style={{ width: '0.75rem', height: '0.75rem' }} /> Remove
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className={styles.uploadIcon} />
                    <span className={styles.uploadTitle}>Payment Sheet 1</span>
                    <span className={styles.uploadOptional}>Optional</span>
                    <span className={styles.uploadHint}>Click or drag to upload</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setPayment1File(e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Payment Sheet 2 Upload */}
            <div
              className={`${styles.uploadBox} ${
                dragActive.payment2
                  ? styles.uploadBoxActive
                  : payment2File
                  ? styles.uploadBoxFilled
                  : ''
              }`}
              onDragEnter={(e) => handleDrag(e, "payment2")}
              onDragLeave={(e) => handleDrag(e, "payment2")}
              onDragOver={(e) => handleDrag(e, "payment2")}
              onDrop={(e) => handleDrop(e, "payment2")}
            >
              <label className={styles.uploadLabel}>
                {payment2File ? (
                  <>
                    <CheckCircle2 className={styles.uploadIconSuccess} />
                    <span className={styles.uploadTitle}>Payment Sheet 2</span>
                    <span className={styles.fileName}>{payment2File.name}</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setPayment2File(null);
                      }}
                      className={styles.removeButton}
                    >
                      <X style={{ width: '0.75rem', height: '0.75rem' }} /> Remove
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className={styles.uploadIcon} />
                    <span className={styles.uploadTitle}>Payment Sheet 2</span>
                    <span className={styles.uploadOptional}>Optional</span>
                    <span className={styles.uploadHint}>Click or drag to upload</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setPayment2File(e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          <button
            onClick={handleProcessFiles}
            disabled={loading || !orderFile}
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
                Process Files
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

        {/* Empty State */}
        {consolidatedData.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateInner}>
              <FileText className={styles.emptyStateIcon} />
              <h3 className={styles.emptyStateTitle}>No Data Yet</h3>
              <p className={styles.emptyStateText}>
                Upload your Order Sheet and Payment Sheets above to start analyzing your Flipkart orders and settlements.
              </p>
              <div className={styles.quickGuide}>
                <p className={styles.quickGuideTitle}>Quick Start Guide:</p>
                <div className={styles.quickGuideList}>
                  <p className={styles.quickGuideItem}>
                    <span className={styles.quickGuideNumber}>1.</span>
                    <span>Upload your Order Sheet (required)</span>
                  </p>
                  <p className={styles.quickGuideItem}>
                    <span className={styles.quickGuideNumber}>2.</span>
                    <span>Upload Payment Sheets (optional, up to 2)</span>
                  </p>
                  <p className={styles.quickGuideItem}>
                    <span className={styles.quickGuideNumber}>3.</span>
                    <span>Click "Process Files" to consolidate your data</span>
                  </p>
                  <p className={styles.quickGuideItem}>
                    <span className={styles.quickGuideNumber}>4.</span>
                    <span>Filter, search, and export your results</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {consolidatedData.length > 0 && (
          <>
            <div className={styles.statsGrid}>
              <div className={`${styles.statCard} ${styles.statCardBlue}`}>
                <div className={styles.statCardInner}>
                  <div>
                    <p className={styles.statCardLabel}>Total Orders</p>
                    <p className={styles.statCardValue}>{statistics.totalOrders.toLocaleString()}</p>
                  </div>
                  <Package className={styles.statCardIcon} />
                </div>
              </div>

              <div className={`${styles.statCard} ${styles.statCardGreen}`}>
                <div className={styles.statCardInner}>
                  <div>
                    <p className={styles.statCardLabel}>Total Settlement</p>
                    <p className={styles.statCardValue}>₹{statistics.totalSettlement.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <DollarSign className={styles.statCardIcon} />
                </div>
              </div>

              <div className={`${styles.statCard} ${styles.statCardPurple}`}>
                <div className={styles.statCardInner}>
                  <div>
                    <p className={styles.statCardLabel}>Unique SKUs</p>
                    <p className={styles.statCardValue}>{statistics.uniqueSKUs}</p>
                  </div>
                  <TrendingUp className={styles.statCardIcon} />
                </div>
              </div>

              <div className={`${styles.statCard} ${styles.statCardOrange}`}>
                <div className={styles.statCardInner}>
                  <div>
                    <p className={styles.statCardLabel}>Orders with Returns</p>
                    <p className={styles.statCardValue}>{statistics.ordersWithReturns}</p>
                  </div>
                  <TrendingDown className={styles.statCardIcon} />
                </div>
              </div>
            </div>

            {/* Filters & Search */}
            <div className={styles.filtersCard}>
              <div className={styles.filtersHeader}>
                <h3 className={styles.filtersTitle}>
                  <Search style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
                  Filters
                </h3>
                <div className={styles.filtersActions}>
                  <button onClick={clearAllFilters} className={`${styles.filterButton} ${styles.clearButton}`}>
                    <X style={{ width: '1rem', height: '1rem' }} />
                    Clear All
                  </button>
                  <button onClick={handleExport} className={`${styles.filterButton} ${styles.exportButton}`}>
                    <Download style={{ width: '1rem', height: '1rem' }} />
                    Export
                  </button>
                </div>
              </div>

              <div className={styles.filtersGrid}>
                {/* Search */}
                <div className={styles.searchContainer}>
                  <Search className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search Order ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>

                {/* Status Filter */}
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.select}>
                  <option value="">All Statuses</option>
                  {filterOptions.statuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>

                {/* SKU Filter */}
                <select value={skuFilter} onChange={(e) => setSkuFilter(e.target.value)} className={styles.select}>
                  <option value="">All SKUs</option>
                  {filterOptions.skus.map((sku) => (
                    <option key={sku} value={sku}>{sku}</option>
                  ))}
                </select>

                {/* Product Filter */}
                <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className={styles.select}>
                  <option value="">All Products</option>
                  {filterOptions.products.slice(0, 100).map((product) => (
                    <option key={product} value={product}>{product.substring(0, 50)}</option>
                  ))}
                </select>

                {/* Return Reason Filter */}
                <select value={returnReasonFilter} onChange={(e) => setReturnReasonFilter(e.target.value)} className={styles.select}>
                  <option value="">All Return Reasons</option>
                  {filterOptions.returnReasons.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              {/* Total Settlement Display */}
              <div className={styles.filtersFooter}>
                <div className={styles.recordCount}>
                  <div className={styles.recordDot}></div>
                  Showing <span className={styles.recordNumber}>{filteredData.length}</span> of <span className={styles.recordNumber}>{consolidatedData.length}</span> orders
                </div>
                <div className={styles.totalSettlement}>
                  <DollarSign className={styles.totalSettlementIcon} />
                  <span className={styles.totalSettlementAmount}>
                    ₹{totalSettlement.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className={styles.tableCard}>
              {filteredData.length === 0 ? (
                <div className={styles.noResults}>
                  <Package className={styles.noResultsIcon} />
                  <p className={styles.noResultsTitle}>No orders match your filters</p>
                  <p className={styles.noResultsText}>Try adjusting your search criteria</p>
                </div>
              ) : (
                <>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead className={styles.thead}>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <th
                                key={header.id}
                                className={styles.th}
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                <div className={styles.thContent}>
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  <ArrowUpDown className={styles.sortIcon} />
                                </div>
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody className={styles.tbody}>
                        {table.getRowModel().rows.map((row, idx) => (
                          <tr 
                            key={row.id} 
                            className={`${styles.tr} ${idx % 2 === 0 ? styles.trEven : styles.trOdd}`}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td key={cell.id} className={styles.td}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className={styles.pagination}>
                    <div className={styles.paginationControls}>
                      <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className={styles.paginationButton}
                      >
                        <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
                        Previous
                      </button>
                      <div className={styles.pageInfo}>
                        <span className={styles.pageInfoText}>
                          Page <span className={styles.pageInfoCurrent}>{table.getState().pagination.pageIndex + 1}</span> of <span className={styles.pageInfoTotal}>{table.getPageCount()}</span>
                        </span>
                      </div>
                      <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className={styles.paginationButton}
                      >
                        Next
                        <ChevronRight style={{ width: '1rem', height: '1rem' }} />
                      </button>
                    </div>

                    <select
                      value={table.getState().pagination.pageSize}
                      onChange={(e) => table.setPageSize(Number(e.target.value))}
                      className={styles.pageSize}
                    >
                      {[25, 50, 100, 200].map((pageSize) => (
                        <option key={pageSize} value={pageSize}>
                          Show {pageSize}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrdersPaymentDashboard;
