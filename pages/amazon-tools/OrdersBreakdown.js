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

  const filterableColumns = [
    "amazon-order-id",
    "order-status",
    "sku",
    "quantity",
    "asin",
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
      <Button
        onClick={clearFilters}
        variant="contained"
        color="secondary"
        style={{ marginTop: "10px" }}
      >
        Clear Filters
      </Button>

      <FormGroup row>
        {filterableColumns.map((col) => (
          <FormControlLabel
            key={col}
            control={
              <Checkbox
                checked={visibleColumns.includes(col)}
                onChange={handleColumnVisibilityChange}
                name={col}
              />
            }
            label={col}
          />
        ))}
      </FormGroup>
      <div
        style={{
          display: "flex",
          width: "1000px",
          gap: "10px",
          flexDirection: "row",
          marginTop: "10px",
        }}
      >
        {filterableColumns
          .filter((col) => visibleColumns.includes(col))
          .map((col) => (
            <Autocomplete
              style={{ width: 400 }}
              key={col}
              options={[...new Set(rows.map((row) => row[col] || ""))]}
              value={filters[col] || ""}
              onChange={(event, newValue) =>
                handleFilterChange({ target: { value: newValue || "" } }, col)
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={col}
                  variant="outlined"
                  placeholder={`Search ${col}`}
                  fullWidth
                />
              )}
            />
          ))}
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
