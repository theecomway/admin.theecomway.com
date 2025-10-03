import { Autocomplete, Box, TextField, Typography } from "@mui/material";
import React, { useState } from "react";

import UserLogs from "./UserLogs";

const FilteredEvents = ({ logs = {} }) => {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [filteredLogs, setFilteredLogs] = useState({});

  const allEvents = new Set();
  Object.values(logs).forEach((users) => {
    Object.values(users).forEach((actions) => {
      Object.values(actions).forEach((a) => allEvents.add(a));
    });
  });
  const eventTypes = Array.from(allEvents).sort();

  const handleChange = (event, selected) => {
    setSelectedEvent(selected || "");
    const filtered = {};
    if (!selected) return setFilteredLogs({});

    Object.entries(logs).forEach(([date, users]) => {
      Object.entries(users).forEach(([userId, activities]) => {
        const matched = Object.entries(activities).filter(([, action]) =>
          action.includes(selected)
        );
        if (matched.length > 0) {
          if (!filtered[date]) filtered[date] = {};
          filtered[date][userId] = activities;
        }
      });
    });
    setFilteredLogs(filtered);
  };

  const userCount = Object.values(filteredLogs).reduce(
    (total, users) => total + Object.keys(users).length,
    0
  );

  return (
    <Box>
      <Autocomplete
        fullWidth
        options={eventTypes}
        value={selectedEvent}
        onChange={handleChange}
        renderInput={(params) => (
          <TextField {...params} label="Search or Select Event" />
        )}
        sx={{ mb: 4 }}
        clearOnEscape
      />

      {selectedEvent && (
        <Box>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Users who triggered: "{selectedEvent}" ({userCount} users)
          </Typography>
          <UserLogs data={filteredLogs} />
        </Box>
      )}
    </Box>
  );
};

export default FilteredEvents;
