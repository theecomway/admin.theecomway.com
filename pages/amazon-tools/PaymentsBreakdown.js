import { Box, Button, TextField } from "@mui/material";
import React, { useState } from "react";

import { DataGrid } from "@mui/x-data-grid";
import Papa from "papaparse";

const CSVUploader = () => {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [filters, setFilters] = useState({});

  // Handle file upload and parse CSV
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (result) => {
        if (result.data.length > 12) {
          // Extract headers from the 12th row (index 11)
          const headers = result.data[11].map((header, index) => ({
            field: `col${index}`,
            headerName: header || `Column ${index + 1}`,
            width: 150,
            filterable: true,
          }));
          setColumns(headers);

          // Extract data starting from the 13th row (index 12)
          const formattedRows = result.data.slice(12).map((row, rowIndex) => {
            const rowData = {};
            headers.forEach((header, colIndex) => {
              rowData[header.field] = row[colIndex] || "";
            });
            return { id: rowIndex, ...rowData };
          });
          setRows(formattedRows);
        } else {
          alert("CSV file must have at least 12 rows.");
        }
      },
      skipEmptyLines: true,
    });
  };

  // Handle filtering for DataGrid
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value.toLowerCase() }));
  };

  // Filtered rows based on input values
  const filteredRows = rows.filter((row) =>
    Object.keys(filters).every((field) =>
      row[field]
        .toString()
        .toLowerCase()
        .includes(filters[field] || "")
    )
  );

  return (
    <Box sx={{ padding: "20px" }}>
      <input type="file" accept=".csv" onChange={handleFileUpload} />

      {columns.length > 0 && (
        <Box sx={{ marginTop: "20px" }}>
          {/* Render Filter Inputs */}
          <Box sx={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            {columns.map((col) => (
              <TextField
                key={col.field}
                label={col.headerName}
                variant="outlined"
                size="small"
                onChange={(e) => handleFilterChange(col.field, e.target.value)}
              />
            ))}
          </Box>

          {/* Render DataGrid */}
          <DataGrid
            rows={filteredRows}
            columns={columns}
            pageSize={10}
            autoHeight
            disableColumnMenu
          />
        </Box>
      )}
    </Box>
  );
};

export default CSVUploader;
