import * as XLSX from "xlsx";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Badge,
  Box,
  Input,
  Typography,
} from "@mui/material";
import React, { useState } from "react";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const OrdersSummary = () => {
  const [summary, setSummary] = useState(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [debugMsg, setDebugMsg] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setSummary(null);
    setTotalOrders(0);
    setDebugMsg("");

    try {
      console.log("Loading file:", file.name);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetNames = workbook.SheetNames;
      console.log("Available sheets:", sheetNames);

      // pick "Orders" if it exists, otherwise first sheet
      const sheetName = sheetNames.includes("Orders")
        ? "Orders"
        : sheetNames[0];
      if (!sheetNames.includes("Orders")) {
        console.warn(`"Orders" sheet not found, using "${sheetName}" instead.`);
        setError(`"Orders" sheet not found, using "${sheetName}" instead.`);
      }

      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        setError(`Couldn’t load sheet "${sheetName}".`);
        return;
      }


      // ─── Hard-coded range ───────────────────────────────
      sheet["!ref"] = "A1:Z10000"; // set

      const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
      console.log(`Parsed ${rows.length} rows from "${sheetName}".`);
      setDebugMsg(
        `Sheets: [${sheetNames.join(", ")}] • Using: ${sheetName} • Rows: ${
          rows.length
        }`
      );

      const parsed = {};
      rows.forEach((row, i) => {
        const status = row.order_item_status;
        const sku = row.sku;
        const orderId = row.order_id;
        if (!status || !sku || !orderId) {
          console.debug(`Skipping row ${i + 1}:`, row);
          return;
        }
        if (!parsed[status]) parsed[status] = { total: 0, skus: {} };
        parsed[status].total += 1;
        if (!parsed[status].skus[sku]) {
          parsed[status].skus[sku] = { quantity: 0, orders: new Set() };
        }
        parsed[status].skus[sku].quantity += 1;
        parsed[status].skus[sku].orders.add(orderId);
      });

      const formatted = {};
      Object.entries(parsed).forEach(([status, sec]) => {
        formatted[status] = {
          total: sec.total,
          skus: Object.entries(sec.skus).map(([sku, info]) => ({
            sku,
            quantity: info.quantity,
            orders: Array.from(info.orders),
          })),
        };
      });

      const grandTotal = Object.values(formatted).reduce(
        (sum, sec) => sum + sec.total,
        0
      );
      setTotalOrders(grandTotal);
      setSummary(formatted);
    } catch (err) {
      console.error(err);
      setError("Parse error – make sure it's a valid Excel file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3} maxWidth={800} mx="auto">
      <Input
        type="file"
        inputProps={{ accept: ".xlsx,.xls" }}
        onChange={handleFile}
        sx={{ mb: 2 }}
        fullWidth
      />

      {loading && <Typography>Loading and parsing file…</Typography>}
      {error && <Typography color="error">{error}</Typography>}
      {debugMsg && (
        <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
          {debugMsg}
        </Typography>
      )}

      {summary &&
        Object.entries(summary).map(([status, data]) => (
          <Accordion key={status} sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                {status} — {data.total}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {data.skus.map((skuData, idx) => (
                <Accordion key={idx} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      <strong>SKU:</strong> {skuData.sku} &nbsp;|&nbsp;
                      <strong>Qty:</strong> {skuData.quantity}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2">
                      <strong>Order IDs:</strong> {skuData.orders.join(", ")}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </AccordionDetails>
          </Accordion>
        ))}
    </Box>
  );
};

export default OrdersSummary;
