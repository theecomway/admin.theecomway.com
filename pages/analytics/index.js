import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";

import EventSummary from "./eventSummary";
import FilteredEvents from "./FilteredEvents";
import UserLogs from "./UserLogs";
import { database } from "../../hooks/config";
import ProtectedRoute from "../../components/ProtectedRoute";

const now = new Date();
const dateKey = now
  .toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })
  .replace(" ", ""); // e.g., "21Apr"

const LogViewer = () => {
  const [logs, setLogs] = useState({});
  const [selectedDate, setSelectedDate] = useState(dateKey);
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    const logsRef = ref(database, "logs");
    onValue(logsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setLogs(data);

      const sortedDates = Object.keys(data).sort(
        (a, b) =>
          new Date(b.replace(/[^\d]/g, "")) - new Date(a.replace(/[^\d]/g, ""))
      );
      if (sortedDates.length > 0 && !selectedDate) {
        setSelectedDate(sortedDates[0]); // latest date auto-selected
      }
    });
  }, []);

  const filteredLogs = logs[selectedDate] || {};
  const guestLogs = {};
  const userLogs = {};

  Object.entries(filteredLogs).forEach(([userId, activities]) => {
    if (userId.includes("(dot)")) {
      userLogs[userId] = activities;
    } else {
      guestLogs[userId] = activities;
    }
  });

  const totalGuestUsers = Object.keys(guestLogs).length;
  const totalLoggedUsers = Object.keys(userLogs).length;
  const totalUsers = totalGuestUsers + totalLoggedUsers;

  return (
    <ProtectedRoute>
      <Box sx={{ p: 4, maxWidth: "1000px", mx: "auto" }}>
      <Typography variant="h4" fontWeight={600} mb={3}>
        Total Users: {totalUsers} | Guest Users: {totalGuestUsers} | Logged In
        Users: {totalLoggedUsers}
      </Typography>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Date</InputLabel>
        <Select
          label="Date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        >
          {Object.keys(logs).map((date) => (
            <MenuItem key={date} value={date}>
              {date}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)}>
          <Tab label="Filtered Event Logs" />
          <Tab label="Guest Users" />
          <Tab label="Logged In Users" />
        </Tabs>
      </Box>

      {tabIndex === 0 && (
        <FilteredEvents logs={{ [selectedDate]: filteredLogs }} />
      )}
      {tabIndex === 1 && <UserLogs data={{ [selectedDate]: guestLogs }} />}
      {tabIndex === 2 && <UserLogs data={{ [selectedDate]: userLogs }} />}
      <EventSummary logs={{ [selectedDate]: filteredLogs }} />
      </Box>
    </ProtectedRoute>
  );
};

export default LogViewer;
