import { Box, Divider, Paper, Tab, Tabs, Typography } from "@mui/material";
import React, { useState } from "react";

import StorageExplorer from "./StorageExplorer"; // adjust path if needed

// Define your folder nodes here
const storageNodes = [
  "flipkart-profit-calculator/",
  "amazon-profit-calculator/",
  "meesho-profit-calculator/",
];

const Index = () => {
  const [tabIndex, setTabIndex] = useState(0);

  const handleChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  return (
    <Paper elevation={2} sx={{ p: 2, maxWidth: 1000, mx: "auto", mt: 4 }}>
      <Typography variant="h5" fontWeight={600} gutterBottom textAlign="center">
        Storage Explorer Tabs
      </Typography>

      <Divider sx={{ mb: 2 }} />

      <Tabs
        value={tabIndex}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="storage tabs"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        {storageNodes.map((node, index) => (
          <Tab key={node} label={node.replace(/\/$/, "")} />
        ))}
      </Tabs>

      <Box mt={3}>
        <StorageExplorer basePath={storageNodes[tabIndex]} />
      </Box>
    </Paper>
  );
};

export default Index;
