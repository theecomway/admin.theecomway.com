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
  FileText,
  BarChart3,
  PieChart,
  RotateCcw,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BadgeCheck
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

  // Analytics sections toggle
  const [showAnalytics, setShowAnalytics] = useState({
    status: true,
    topSKUs: true,
    returns: true,
    courierReturns: true,
    claims: true,
    claimsTable: true,
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

  // Normalize SKU - Remove quotes and SKU: prefix
  const normalizeSku = (sku) => {
    if (!sku) return "";
    return String(sku)
      .replace(/^["']+|["']+$/g, '') // Remove quotes from start/end
      .replace(/["']/g, '')           // Remove any remaining quotes
      .replace(/^SKU:/i, '')          // Remove SKU: prefix (case insensitive)
      .trim();
  };

  // Normalize Product Title - Remove quotes
  const normalizeProductTitle = (title) => {
    if (!title) return "";
    return String(title)
      .replace(/^["']+|["']+$/g, '') // Remove quotes from start/end
      .replace(/["']/g, '')           // Remove any remaining quotes
      .trim();
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

  // Export Claims to Excel
  const handleClaimsExport = () => {
    const claimsData = filteredData.filter(row => row.Is_Claim === true);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(claimsData);
    XLSX.utils.book_append_sheet(wb, ws, "Claims");
    XLSX.writeFile(wb, `flipkart-claims-${Date.now()}.xlsx`);
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
        
        const settlement = paymentMap[orderId] || 0;
        const orderStatus = order.Order_Item_Status || order.order_item_status || "N/A";
        const returnReason = order.Return_Reason || order.return_reason || order["Return Reason"] || "N/A";
        
        // Determine if this is a return or RTO
        const isReturn = orderStatus.toLowerCase().includes('return') || returnReason !== "N/A";
        const isRTO = orderStatus.toLowerCase().includes('rto');
        const isReturnOrRTO = isReturn || isRTO;
        
        // Determine if this is a courier return (return with zero settlement)
        const isCourierReturn = isReturnOrRTO && settlement === 0;
        
        // Determine if this is a claim (return/RTO with positive settlement)
        const isClaim = isReturnOrRTO && settlement > 0;
        const claimAmount = isClaim ? settlement : 0;
        
        // Normalize SKU and Product Title
        const rawSku = order.SKU || order.sku || "";
        const rawProductTitle = order.Product_Title || order.product_title || order["Product Title"] || "";
        
        return {
          Order_ID: order.Order_ID || order.order_id || order.OrderID || order["Order ID"] || "N/A",
          Order_Item_Status: orderStatus,
          SKU: normalizeSku(rawSku) || "N/A",
          Product_Title: normalizeProductTitle(rawProductTitle) || "N/A",
          Quantity: order.Quantity || order.quantity || 0,
          Return_Reason: returnReason,
          Return_Sub_Reason: order.Return_Sub_Reason || order.return_sub_reason || order["Return Sub Reason"] || "N/A",
          Total_Settlement: settlement,
          Return_Type: isCourierReturn ? "Courier Return" : isReturnOrRTO ? "Regular Return" : "N/A",
          Is_Claim: isClaim,
          Claim_Amount: claimAmount,
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
    
    // Average order value
    const avgOrderValue = totalOrders > 0 ? totalSettlement / totalOrders : 0;
    
    // Return rate
    const returnRate = totalOrders > 0 ? (ordersWithReturns / totalOrders * 100) : 0;
    
    // Top SKUs by settlement
    const skuSettlements = filteredData.reduce((acc, row) => {
      const sku = row.SKU;
      if (!acc[sku]) {
        acc[sku] = { sku, settlement: 0, orders: 0, quantity: 0 };
      }
      acc[sku].settlement += parseFloat(row.Total_Settlement) || 0;
      acc[sku].orders += 1;
      acc[sku].quantity += parseInt(row.Quantity) || 0;
      return acc;
    }, {});
    
    const topSKUs = Object.values(skuSettlements)
      .sort((a, b) => b.settlement - a.settlement)
      .slice(0, 5);
    
    // Return reasons breakdown
    const returnReasons = filteredData
      .filter(row => row.Return_Reason !== "N/A")
      .reduce((acc, row) => {
        const reason = row.Return_Reason;
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {});
    
    const topReturnReasons = Object.entries(returnReasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));
    
    // Orders with positive vs negative settlement
    const positiveSettlement = filteredData.filter(row => parseFloat(row.Total_Settlement) > 0).length;
    const negativeSettlement = filteredData.filter(row => parseFloat(row.Total_Settlement) < 0).length;
    const zeroSettlement = filteredData.filter(row => parseFloat(row.Total_Settlement) === 0).length;
    
    // Courier returns analysis
    const courierReturns = filteredData.filter(row => row.Return_Type === "Courier Return").length;
    const regularReturns = filteredData.filter(row => row.Return_Type === "Regular Return").length;
    const courierReturnRate = totalOrders > 0 ? (courierReturns / totalOrders * 100) : 0;
    
    // Claims analysis (returns/RTOs with positive settlement)
    const ordersWithClaims = filteredData.filter(row => row.Is_Claim === true).length;
    const totalClaimAmount = filteredData.reduce((sum, row) => sum + (parseFloat(row.Claim_Amount) || 0), 0);
    const avgClaimAmount = ordersWithClaims > 0 ? totalClaimAmount / ordersWithClaims : 0;
    const claimRate = totalOrders > 0 ? (ordersWithClaims / totalOrders * 100) : 0;

    return {
      totalOrders,
      totalQuantity,
      totalSettlement,
      uniqueSKUs,
      ordersWithReturns,
      statusCounts,
      avgOrderValue,
      returnRate,
      topSKUs,
      topReturnReasons,
      positiveSettlement,
      negativeSettlement,
      zeroSettlement,
      courierReturns,
      regularReturns,
      courierReturnRate,
      ordersWithClaims,
      totalClaimAmount,
      avgClaimAmount,
      claimRate,
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
        accessorKey: "Return_Type",
        header: "Return Type",
        cell: (info) => {
          const type = info.getValue();
          if (type === "N/A") return <span style={{ color: '#9ca3af' }}>-</span>;
          const isCourier = type === "Courier Return";
          return (
            <span className={`${styles.statusBadge}`} style={{ 
              backgroundColor: isCourier ? '#fef3c7' : '#fed7aa',
              color: isCourier ? '#92400e' : '#9a3412'
            }}>
              {type}
            </span>
          );
        },
      },
      {
        accessorKey: "Is_Claim",
        header: "Claim",
        cell: (info) => {
          const isClaim = info.getValue();
          const claimAmount = info.row.original.Claim_Amount;
          if (!isClaim) return <span style={{ color: '#9ca3af' }}>-</span>;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span className={`${styles.statusBadge}`} style={{ 
                backgroundColor: '#f3e8ff',
                color: '#7c3aed',
                fontSize: '0.75rem'
              }}>
                ✓ Claim
              </span>
              <span style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>
                ₹{parseFloat(claimAmount || 0).toFixed(0)}
              </span>
            </div>
          );
        },
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

            {/* Advanced Analytics */}
            <div className={styles.analyticsGrid}>
              {/* Average Order Value */}
              <div className={styles.analyticsCard}>
                <div className={styles.analyticsCardLabel}>Avg Order Value</div>
                <div className={styles.analyticsCardValue}>₹{statistics.avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <div className={styles.analyticsCardSubtext}>Per order settlement</div>
              </div>

              {/* Return Rate */}
              <div className={styles.analyticsCard}>
                <div className={styles.analyticsCardLabel}>Return Rate</div>
                <div className={styles.analyticsCardValue}>{statistics.returnRate.toFixed(1)}%</div>
                <div className={styles.analyticsCardSubtext}>{statistics.ordersWithReturns} of {statistics.totalOrders} orders</div>
              </div>

              {/* Total Quantity */}
              <div className={styles.analyticsCard}>
                <div className={styles.analyticsCardLabel}>Total Quantity</div>
                <div className={styles.analyticsCardValue}>{statistics.totalQuantity.toLocaleString()}</div>
                <div className={styles.analyticsCardSubtext}>Items across all orders</div>
              </div>

              {/* Courier Returns */}
              <div className={styles.analyticsCard}>
                <div className={styles.analyticsCardLabel}>Courier Returns</div>
                <div className={styles.analyticsCardValue}>{statistics.courierReturns}</div>
                <div className={styles.analyticsCardSubtext}>{statistics.courierReturnRate.toFixed(1)}% of total orders</div>
              </div>

              {/* Regular Returns */}
              <div className={styles.analyticsCard}>
                <div className={styles.analyticsCardLabel}>Regular Returns</div>
                <div className={styles.analyticsCardValue}>{statistics.regularReturns}</div>
                <div className={styles.analyticsCardSubtext}>Returns with settlement</div>
              </div>

              {/* Claims */}
              <div className={styles.analyticsCard} style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)' }}>
                <div className={styles.analyticsCardLabel} style={{ color: '#7c3aed' }}>Claims (Positive Return Settlement)</div>
                <div className={styles.analyticsCardValue} style={{ color: '#7c3aed' }}>{statistics.ordersWithClaims}</div>
                <div className={styles.analyticsCardSubtext} style={{ color: '#9333ea' }}>Total: ₹{statistics.totalClaimAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              </div>
            </div>

            {/* Settlement Breakdown */}
            <div className={styles.analyticsSection}>
              <div className={styles.analyticsSectionHeader} onClick={() => setShowAnalytics({...showAnalytics, status: !showAnalytics.status})}>
                <h3 className={styles.analyticsSectionTitle}>
                  <PieChart style={{ width: '1.25rem', height: '1.25rem', color: '#3b82f6' }} />
                  Settlement Analysis
                </h3>
                {showAnalytics.status ? <ChevronUp style={{ width: '1.25rem', height: '1.25rem' }} /> : <ChevronDown style={{ width: '1.25rem', height: '1.25rem' }} />}
              </div>
              {showAnalytics.status && (
                <>
                  <div className={styles.settementBreakdown}>
                    <div className={styles.settlementType}>
                      <div className={`${styles.settlementTypeValue} ${styles.positiveValue}`}>{statistics.positiveSettlement}</div>
                      <div className={styles.settlementTypeLabel}>Positive</div>
                    </div>
                    <div className={styles.settlementType}>
                      <div className={`${styles.settlementTypeValue} ${styles.neutralValue}`}>{statistics.zeroSettlement}</div>
                      <div className={styles.settlementTypeLabel}>Zero</div>
                    </div>
                    <div className={styles.settlementType}>
                      <div className={`${styles.settlementTypeValue} ${styles.negativeValue}`}>{statistics.negativeSettlement}</div>
                      <div className={styles.settlementTypeLabel}>Negative</div>
                    </div>
                  </div>
                  <div className={styles.statusBreakdown} style={{ marginTop: '1.5rem' }}>
                    {Object.entries(statistics.statusCounts).map(([status, count]) => {
                      const percentage = (count / statistics.totalOrders * 100).toFixed(1);
                      return (
                        <div key={status} className={styles.statusBar}>
                          <div className={styles.statusBarLabel}>{status}</div>
                          <div className={styles.statusBarProgress}>
                            <div className={styles.statusBarFill} style={{ width: `${percentage}%` }}></div>
                          </div>
                          <div className={styles.statusBarValue}>{count} ({percentage}%)</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Top SKUs */}
            {statistics.topSKUs.length > 0 && (
              <div className={styles.analyticsSection}>
                <div className={styles.analyticsSectionHeader} onClick={() => setShowAnalytics({...showAnalytics, topSKUs: !showAnalytics.topSKUs})}>
                  <h3 className={styles.analyticsSectionTitle}>
                    <BarChart3 style={{ width: '1.25rem', height: '1.25rem', color: '#3b82f6' }} />
                    Top 5 SKUs by Settlement
                  </h3>
                  {showAnalytics.topSKUs ? <ChevronUp style={{ width: '1.25rem', height: '1.25rem' }} /> : <ChevronDown style={{ width: '1.25rem', height: '1.25rem' }} />}
                </div>
                {showAnalytics.topSKUs && (
                  <div>
                    {statistics.topSKUs.map((item, idx) => (
                      <div key={item.sku} className={styles.topItem}>
                        <div className={styles.topItemRank}>{idx + 1}</div>
                        <div className={styles.topItemInfo}>
                          <div className={styles.topItemLabel}>{item.sku}</div>
                          <div className={styles.topItemSubtext}>{item.orders} orders • {item.quantity} qty</div>
                        </div>
                        <div className={styles.topItemValue}>₹{item.settlement.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Top Return Reasons */}
            {statistics.topReturnReasons.length > 0 && (
              <div className={styles.analyticsSection}>
                <div className={styles.analyticsSectionHeader} onClick={() => setShowAnalytics({...showAnalytics, returns: !showAnalytics.returns})}>
                  <h3 className={styles.analyticsSectionTitle}>
                    <RotateCcw style={{ width: '1.25rem', height: '1.25rem', color: '#3b82f6' }} />
                    Top 5 Return Reasons
                  </h3>
                  {showAnalytics.returns ? <ChevronUp style={{ width: '1.25rem', height: '1.25rem' }} /> : <ChevronDown style={{ width: '1.25rem', height: '1.25rem' }} />}
                </div>
                {showAnalytics.returns && (
                  <div>
                    {statistics.topReturnReasons.map((item, idx) => (
                      <div key={item.reason} className={styles.topItem}>
                        <div className={styles.topItemRank}>{idx + 1}</div>
                        <div className={styles.topItemInfo}>
                          <div className={styles.topItemLabel} style={{ fontFamily: 'inherit' }}>{item.reason}</div>
                          <div className={styles.topItemSubtext}>{((item.count / statistics.ordersWithReturns) * 100).toFixed(1)}% of returns</div>
                        </div>
                        <div className={styles.topItemValue} style={{ color: '#dc2626' }}>{item.count}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Courier Returns Analysis */}
            {statistics.courierReturns > 0 && (
              <div className={styles.analyticsSection}>
                <div className={styles.analyticsSectionHeader} onClick={() => setShowAnalytics({...showAnalytics, courierReturns: !showAnalytics.courierReturns})}>
                  <h3 className={styles.analyticsSectionTitle}>
                    <RefreshCw style={{ width: '1.25rem', height: '1.25rem', color: '#3b82f6' }} />
                    Courier Returns Analysis
                  </h3>
                  {showAnalytics.courierReturns ? <ChevronUp style={{ width: '1.25rem', height: '1.25rem' }} /> : <ChevronDown style={{ width: '1.25rem', height: '1.25rem' }} />}
                </div>
                {showAnalytics.courierReturns && (
                  <div className={styles.settementBreakdown}>
                    <div className={styles.settlementType}>
                      <div className={`${styles.settlementTypeValue}`} style={{ color: '#f59e0b' }}>{statistics.courierReturns}</div>
                      <div className={styles.settlementTypeLabel}>Courier Returns</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>Zero settlement</div>
                    </div>
                    <div className={styles.settlementType}>
                      <div className={`${styles.settlementTypeValue}`} style={{ color: '#10b981' }}>{statistics.regularReturns}</div>
                      <div className={styles.settlementTypeLabel}>Regular Returns</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>With settlement</div>
                    </div>
                    <div className={styles.settlementType}>
                      <div className={`${styles.settlementTypeValue}`} style={{ color: '#3b82f6' }}>{statistics.courierReturnRate.toFixed(1)}%</div>
                      <div className={styles.settlementTypeLabel}>Courier Return Rate</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>Of total orders</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Claims Analysis */}
            {statistics.ordersWithClaims > 0 && (
              <div className={styles.analyticsSection}>
                <div className={styles.analyticsSectionHeader} onClick={() => setShowAnalytics({...showAnalytics, claims: !showAnalytics.claims})}>
                  <h3 className={styles.analyticsSectionTitle}>
                    <BadgeCheck style={{ width: '1.25rem', height: '1.25rem', color: '#7c3aed' }} />
                    Claims Analysis (Returns/RTOs with Positive Settlement)
                  </h3>
                  {showAnalytics.claims ? <ChevronUp style={{ width: '1.25rem', height: '1.25rem' }} /> : <ChevronDown style={{ width: '1.25rem', height: '1.25rem' }} />}
                </div>
                {showAnalytics.claims && (
                  <div>
                    <div className={styles.settementBreakdown}>
                      <div className={styles.settlementType}>
                        <div className={`${styles.settlementTypeValue}`} style={{ color: '#7c3aed' }}>{statistics.ordersWithClaims}</div>
                        <div className={styles.settlementTypeLabel}>Total Claims</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>{statistics.claimRate.toFixed(1)}% of orders</div>
                      </div>
                      <div className={styles.settlementType}>
                        <div className={`${styles.settlementTypeValue}`} style={{ color: '#7c3aed' }}>₹{statistics.totalClaimAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                        <div className={styles.settlementTypeLabel}>Total Claim Amount</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>Positive settlement</div>
                      </div>
                      <div className={styles.settlementType}>
                        <div className={`${styles.settlementTypeValue}`} style={{ color: '#7c3aed' }}>₹{statistics.avgClaimAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                        <div className={styles.settlementTypeLabel}>Avg Claim Value</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>Per claim order</div>
                      </div>
                    </div>
                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#faf5ff', borderRadius: '0.5rem', borderLeft: '4px solid #7c3aed' }}>
                      <p style={{ fontSize: '0.875rem', color: '#6d28d9', fontWeight: 500, marginBottom: '0.5rem' }}>
                        ℹ️ What are Claims?
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#7c3aed', lineHeight: '1.5' }}>
                        Claims are orders marked as Returns or RTOs that have positive settlement amounts. These represent cases where you received payment despite the return/RTO, which may indicate:
                      </p>
                      <ul style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                        <li>Partial refunds to customers</li>
                        <li>Shipping or handling charges recovered</li>
                        <li>Restocking fees applied</li>
                        <li>Settlement timing differences</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Claims Detail Table */}
            {statistics.ordersWithClaims > 0 && (
              <div className={styles.analyticsSection}>
                <div className={styles.analyticsSectionHeader}>
                  <div onClick={() => setShowAnalytics({...showAnalytics, claimsTable: !showAnalytics.claimsTable})} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, cursor: 'pointer' }}>
                    <BadgeCheck style={{ width: '1.25rem', height: '1.25rem', color: '#7c3aed' }} />
                    <h3 className={styles.analyticsSectionTitle} style={{ marginBottom: 0 }}>
                      All Claims - Detailed View ({statistics.ordersWithClaims} orders)
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClaimsExport();
                      }}
                      className={`${styles.filterButton} ${styles.exportButton}`}
                      style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}
                    >
                      <Download style={{ width: '0.875rem', height: '0.875rem' }} />
                      Export Claims
                    </button>
                    {showAnalytics.claimsTable ? <ChevronUp style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }} onClick={() => setShowAnalytics({...showAnalytics, claimsTable: !showAnalytics.claimsTable})} /> : <ChevronDown style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }} onClick={() => setShowAnalytics({...showAnalytics, claimsTable: !showAnalytics.claimsTable})} />}
                  </div>
                </div>
                {showAnalytics.claimsTable && (
                  <div style={{ marginTop: '1rem' }}>
                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead style={{ backgroundColor: '#faf5ff' }}>
                          <tr>
                            <th className={styles.th} style={{ color: '#7c3aed' }}>Order ID</th>
                            <th className={styles.th} style={{ color: '#7c3aed' }}>Status</th>
                            <th className={styles.th} style={{ color: '#7c3aed' }}>SKU</th>
                            <th className={styles.th} style={{ color: '#7c3aed' }}>Product Title</th>
                            <th className={styles.th} style={{ color: '#7c3aed' }}>Qty</th>
                            <th className={styles.th} style={{ color: '#7c3aed' }}>Return Reason</th>
                            <th className={styles.th} style={{ color: '#7c3aed' }}>Return Sub Reason</th>
                            <th className={styles.th} style={{ color: '#7c3aed' }}>Claim Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className={styles.tbody}>
                          {filteredData.filter(row => row.Is_Claim === true).map((row, idx) => (
                            <tr key={idx} className={`${styles.tr} ${idx % 2 === 0 ? styles.trEven : styles.trOdd}`} style={{ backgroundColor: idx % 2 === 0 ? '#faf5ff' : 'white' }}>
                              <td className={styles.td}>
                                <div className={styles.orderIdCell}>{row.Order_ID}</div>
                              </td>
                              <td className={styles.td}>
                                <span className={`${styles.statusBadge}`} style={{ 
                                  backgroundColor: row.Order_Item_Status.toLowerCase().includes('return') ? '#fed7aa' : '#fef3c7',
                                  color: row.Order_Item_Status.toLowerCase().includes('return') ? '#9a3412' : '#92400e'
                                }}>
                                  {row.Order_Item_Status}
                                </span>
                              </td>
                              <td className={styles.td}>
                                <div className={styles.skuCell}>{row.SKU}</div>
                              </td>
                              <td className={styles.td}>
                                <div className={styles.productCell} title={row.Product_Title}>{row.Product_Title}</div>
                              </td>
                              <td className={styles.td}>
                                <div className={styles.quantityCell}>{row.Quantity}</div>
                              </td>
                              <td className={styles.td} style={{ fontSize: '0.875rem' }}>
                                {row.Return_Reason}
                              </td>
                              <td className={styles.td} style={{ fontSize: '0.875rem' }}>
                                {row.Return_Sub_Reason}
                              </td>
                              <td className={styles.td}>
                                <div style={{ textAlign: 'right', fontWeight: 700, color: '#7c3aed', fontSize: '1rem' }}>
                                  ₹{parseFloat(row.Claim_Amount || 0).toFixed(2)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f3e8ff', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: '#7c3aed', fontWeight: 600 }}>
                        Total Claims: {statistics.ordersWithClaims} orders
                      </span>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: '#7c3aed' }}>
                        Total Amount: ₹{statistics.totalClaimAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

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
