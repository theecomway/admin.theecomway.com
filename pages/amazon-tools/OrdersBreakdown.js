import {
  Autocomplete,
  Button,
  Checkbox,
  Container,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";

import { DataGrid } from "@mui/x-data-grid";
import PaymentsBreakdown from "./PaymentsBreakdown";

function formatDate(isoString) {
  const date = new Date(isoString);

  // Options for formatting the date
  const options = { year: "numeric", month: "long", day: "numeric" };

  // Convert to formatted string
  return date.toLocaleDateString("en-US", options);
}

const FileFilterComponent = () => {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [filters, setFilters] = useState({});
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [firstOrderDate, setFirstOrderDate] = useState("");
  const [lastOrderDate, setLastOrderDate] = useState("");
  const [numericSummary, setNumericSummary] = useState({});

  const filterableColumns = [
    "amazon-order-id",
    "merchant-order-id",
    "purchase-date",
    "last-updated-date",
    "order-status",
    "fulfillment-channel",
    "sales-channel",
    "order-channel",
    "url",
    "ship-service-level",
    "product-name",
    "sku",
    "asin",
    "item-status",
    "quantity",
    "currency",
    "item-price",
    "item-tax",
    "shipping-price",
    "shipping-tax",
    "gift-wrap-price",
    "gift-wrap-tax",
    "item-promotion-discount",
    "ship-promotion-discount",
    "ship-city",
    "ship-state",
    "ship-postal-code",
    "ship-country",
    "promotion-ids",
    "is-business-order",
    "purchase-order-number",
    "price-designation",
    "fulfilled-by",
    "is-replacement-order",
    "is-exchange-order",
    "original-order-id",
    "is-iba",
    "amazon-programs"
  ];

  useEffect(() => {
    const savedFilters = JSON.parse(localStorage.getItem("filters")) || {};
    const savedVisibleColumns =
      JSON.parse(localStorage.getItem("visibleColumns")) || filterableColumns;
    setFilters(savedFilters);
    setVisibleColumns(savedVisibleColumns);
  }, []);

  useEffect(() => {
    localStorage.setItem("filters", JSON.stringify(filters));
    localStorage.setItem("visibleColumns", JSON.stringify(visibleColumns));
  }, [filters, visibleColumns]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const lines = e.target.result.split("\n");
        const headers = lines[0].split("\t");
        setColumns(
          headers.map((header) => ({
            field: header,
            headerName: header,
            width: 200,
          }))
        );
        const dataRows = lines.slice(1).map((line, id) => {
          const values = line.split("\t");
          return {
            id,
            ...Object.fromEntries(headers.map((h, i) => [h, values[i] || ""])),
          };
        });
        setRows(dataRows);

        if (headers.includes("purchase-date")) {
          const dates = dataRows
            .map((row) => row["purchase-date"])
            .filter((date) => date)
            .sort();
          setFirstOrderDate(formatDate(dates[0]) || "N/A");
          setLastOrderDate(formatDate(dates[dates.length - 1]) || "N/A");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFilterChange = (event, column) => {
    setFilters({ ...filters, [column]: event.target.value });
  };

  const handleColumnVisibilityChange = (event) => {
    const column = event.target.name;
    setVisibleColumns((prev) =>
      event.target.checked
        ? [...prev, column]
        : prev.filter((col) => col !== column)
    );
  };

  const clearFilters = () => {
    setFilters({});
  };

  const filteredRows = rows.filter((row) =>
    Object.keys(filters).every(
      (col) =>
        !filters[col] ||
        row[col]?.toLowerCase().includes(filters[col].toLowerCase())
    )
  );

  const totalQuantity = filteredRows.reduce(
    (sum, row) => sum + (parseInt(row["quantity"], 10) || 0),
    0
  );

  // Calculate numeric summaries for filtered data
  const calculateNumericSummary = (data) => {
    const numericColumns = [
      "quantity", "item-price", "item-tax", "shipping-price", 
      "shipping-tax", "gift-wrap-price", "gift-wrap-tax", 
      "item-promotion-discount", "ship-promotion-discount"
    ];
    
    const summary = {};
    
    numericColumns.forEach(col => {
      const values = data
        .map(row => parseFloat(row[col]) || 0)
        .filter(val => !isNaN(val));
      
      if (values.length > 0) {
        summary[col] = {
          total: values.reduce((sum, val) => sum + val, 0),
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    });
    
    return summary;
  };

  // Update numeric summary when filtered rows change
  useEffect(() => {
    setNumericSummary(calculateNumericSummary(filteredRows));
  }, [filteredRows]);

  return (
    <Container maxWidth={false}>
      <input type="file" accept=".txt" onChange={handleFileUpload} />
      <Typography variant="h6" style={{ marginTop: "10px" }}>
        Total Orders: {rows.length}
      </Typography>
      <Typography variant="h6" style={{ marginTop: "10px" }}>
        Filtered Orders: {filteredRows.length} | Quantity:
        {totalQuantity}
      </Typography>
      <Typography variant="h6" style={{ marginTop: "10px" }}>
        First Order Date: {firstOrderDate} | Last Order Date: {lastOrderDate}
      </Typography>
      
      {/* Numeric Summary Section */}
      {Object.keys(numericSummary).length > 0 && (
        <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
          <Typography variant="h6" style={{ marginBottom: "15px" }}>
            Numeric Summary (Filtered Data)
          </Typography>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "15px" }}>
            {Object.entries(numericSummary).map(([column, stats]) => (
              <div key={column} style={{ padding: "10px", backgroundColor: "white", borderRadius: "4px", border: "1px solid #ddd" }}>
                <Typography variant="subtitle1" style={{ fontWeight: "bold", marginBottom: "8px" }}>
                  {column.replace(/-/g, " ").toUpperCase()}
                </Typography>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", fontSize: "14px" }}>
                  <div>Total: {stats.total.toFixed(2)}</div>
                  <div>Average: {stats.average.toFixed(2)}</div>
                  <div>Min: {stats.min.toFixed(2)}</div>
                  <div>Max: {stats.max.toFixed(2)}</div>
                  <div>Count: {stats.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: "20px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <Button
          onClick={clearFilters}
          variant="contained"
          color="secondary"
        >
          Clear All Filters
        </Button>
        {Object.keys(filters).filter(key => filters[key]).length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Typography variant="body2" style={{ color: "#666" }}>
              Active filters ({Object.keys(filters).filter(key => filters[key]).length}):
            </Typography>
            {Object.entries(filters)
              .filter(([key, value]) => value)
              .map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    backgroundColor: "#e3f2fd",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    border: "1px solid #2196f3"
                  }}
                >
                  <strong>{key.replace(/-/g, " ")}:</strong> {value}
                </div>
              ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#e3f2fd", borderRadius: "8px" }}>
        <Typography variant="h6" style={{ marginBottom: "10px" }}>
          Column Visibility
        </Typography>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setVisibleColumns([...filterableColumns])}
          >
            Select All
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setVisibleColumns([])}
          >
            Clear All
          </Button>
        </div>
        <FormGroup 
          style={{ 
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "8px",
            maxHeight: "200px",
            overflowY: "auto"
          }}
        >
          {filterableColumns.map((col) => (
            <FormControlLabel
              key={col}
              control={
                <Checkbox
                  checked={visibleColumns.includes(col)}
                  onChange={handleColumnVisibilityChange}
                  name={col}
                  size="small"
                />
              }
              label={
                <span 
                  style={{ 
                    fontSize: "12px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "150px",
                    display: "inline-block"
                  }}
                  title={col.replace(/-/g, " ")}
                >
                  {col.replace(/-/g, " ")}
                </span>
              }
              style={{ 
                margin: "2px 0",
                alignItems: "flex-start"
              }}
            />
          ))}
        </FormGroup>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
          marginTop: "20px",
          padding: "20px",
          backgroundColor: "#f9f9f9",
          borderRadius: "8px"
        }}
      >
        {filterableColumns
          .filter((col) => visibleColumns.includes(col))
          .map((col) => {
            // Get unique values for this column
            const uniqueValues = [...new Set(rows.map((row) => row[col] || "").filter(val => val !== ""))].sort();
            const hasManyValues = uniqueValues.length > 25;
            
            return (
              <FormControl 
                key={col} 
                variant="outlined" 
                size="small"
                style={{ 
                  minWidth: "280px",
                  maxWidth: "100%",
                  marginBottom: "8px"
                }}
              >
                {hasManyValues ? (
                  // Free-style text input for columns with many values
                  <TextField
                    label={col.replace(/-/g, " ").toUpperCase()}
                    value={filters[col] || ""}
                    onChange={(event) => handleFilterChange(event, col)}
                    variant="outlined"
                    size="small"
                    placeholder={`Filter by ${col.replace(/-/g, " ")}...`}
                    style={{
                      fontSize: "14px"
                    }}
                    InputLabelProps={{
                      style: { 
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "calc(100% - 40px)"
                      }
                    }}
                    InputProps={{
                      style: { fontSize: "14px" }
                    }}
                  />
                ) : (
                  // Dropdown for columns with few values
                  <>
                    <InputLabel 
                      id={`${col}-label`}
                      shrink={true}
                      style={{ 
                        fontSize: "12px",
                        fontWeight: "500",
                        color: "#666",
                        backgroundColor: "white",
                        padding: "0 4px",
                        transform: "translate(14px, -6px) scale(0.85)",
                        transformOrigin: "top left"
                      }}
                    >
                      {col.replace(/-/g, " ").toUpperCase()}
                    </InputLabel>
                    <Select
                      labelId={`${col}-label`}
                      value={filters[col] || ""}
                      onChange={(event) => handleFilterChange(event, col)}
                      label={col.replace(/-/g, " ").toUpperCase()}
                      displayEmpty
                      style={{
                        fontSize: "14px",
                        minHeight: "56px",
                        padding: "8px 12px"
                      }}
                      inputProps={{
                        style: {
                          fontSize: "14px",
                          padding: "8px 12px",
                          minHeight: "40px"
                        }
                      }}
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 300,
                            minWidth: "200px",
                            maxWidth: "400px"
                          }
                        },
                        anchorOrigin: {
                          vertical: "bottom",
                          horizontal: "left"
                        },
                        transformOrigin: {
                          vertical: "top",
                          horizontal: "left"
                        }
                      }}
                      renderValue={(selected) => {
                        if (!selected) {
                          return <span style={{ color: "#999", fontSize: "14px" }}>All {col.replace(/-/g, " ")}</span>;
                        }
                        return (
                          <span 
                            style={{ 
                              fontSize: "14px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "100%",
                              display: "block"
                            }}
                            title={selected}
                          >
                            {selected}
                          </span>
                        );
                      }}
                    >
                      <MenuItem value="" style={{ fontSize: "14px", minHeight: "36px", padding: "8px 16px" }}>
                        <em>All {col.replace(/-/g, " ")}</em>
                      </MenuItem>
                      {uniqueValues.map((value) => (
                        <MenuItem 
                          key={value} 
                          value={value}
                          style={{ 
                            fontSize: "14px",
                            minHeight: "36px",
                            padding: "8px 16px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "100%"
                          }}
                          title={value}
                        >
                          {value}
                        </MenuItem>
                      ))}
                    </Select>
                  </>
                )}
              </FormControl>
            );
          })}
      </div>
      <div style={{ height: "70vh", width: "100%", marginTop: "20px" }}>
        <DataGrid
          rows={filteredRows}
          columns={columns.filter((col) => visibleColumns.includes(col.field))}
          pageSize={10}
        />
      </div>
      <PaymentsBreakdown />
    </Container>
  );
};

export default FileFilterComponent;
