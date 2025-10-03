import { Box, Card, CardContent, Grid, Typography } from "@mui/material";

import React from "react";

const EventSummary = ({ logs }) => {
  const eventUserCountsByDate = {};

  Object.entries(logs || {}).forEach(([date, users]) => {
    const eventMap = {};
    Object.entries(users).forEach(([userId, activities]) => {
      Object.values(activities).forEach((action) => {
        if (!eventMap[action]) eventMap[action] = new Set();
        eventMap[action].add(userId);
      });
    });
    const sorted = Object.entries(eventMap)
      .map(([event, set]) => [event, set.size])
      .sort((a, b) => b[1] - a[1]);
    eventUserCountsByDate[date] = Object.fromEntries(sorted);
  });

  return (
    <Box sx={{ mb: 5 }}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Event Summary by Date
      </Typography>
      {Object.entries(eventUserCountsByDate).map(([date, events]) => (
        <Box key={date} sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {date}
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(events).map(([event, count]) => (
              <Grid item xs={12} sm={6} md={4} key={event}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={500}>
                      {count} Users triggered:
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {event}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
};

export default EventSummary;
