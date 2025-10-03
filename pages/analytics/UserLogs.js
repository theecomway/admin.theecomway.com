import {
  Box,
  Card,
  CardContent,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import React from "react";

const getTimeAgo = (timestamp) => {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000); // in seconds

  if (isNaN(diff)) return "";

  if (diff < 60) return `${diff} sec ${diff !== 1 ? "s" : ""} ago`;
  if (diff < 3600)
    return `${Math.floor(diff / 60)} min${diff < 120 ? "" : "s"} ago`;
  if (diff < 86400)
    return `${Math.floor(diff / 3600)} hour${diff < 7200 ? "" : "s"} ago`;
  return `${Math.floor(diff / 86400)} day${diff < 172800 ? "" : "s"} ago`;
};

const TimelineItem = ({ action, time }) => (
  <Box sx={{ display: "flex", alignItems: "center" }}>
    <Typography
      sx={{ fontSize: "0.9rem", color: "text.secondary", minWidth: 100 }}
    >
      {getTimeAgo(time)}
    </Typography>
    <Typography sx={{ fontSize: "0.9rem", color: "text.primary", ml: 1 }}>
      {action}
    </Typography>
  </Box>
);

const getLatestTimestamp = (activities) => {
  return Math.max(...Object.keys(activities).map(Number));
};

const UserLogs = ({ data = {} }) => (
  <Box sx={{ mt: 2 }}>
    {Object.entries(data).map(([date, users]) => {
      const sortedUsers = Object.entries(users).sort((a, b) => {
        const timeA = getLatestTimestamp(a[1]);
        const timeB = getLatestTimestamp(b[1]);
        return timeB - timeA;
      });

      return (
        <Paper key={date} sx={{ mb: 3 }} elevation={2}>
          <Typography variant="h6" sx={{ mb: 2, color: "#555" }}>
            {date}
          </Typography>
          <Grid container spacing={2}>
            {sortedUsers.map(([userId, activities]) => (
              <Grid item xs={12} sm={12} md={6} key={userId}>
                <Card
                  variant="outlined"
                  sx={{ borderLeft: "4px solid #1976d2" }}
                >
                  <CardContent>
                    <Typography
                      variant="subtitle2"
                      color="textSecondary"
                      gutterBottom
                    >
                      {userId}
                    </Typography>
                    <Stack sx={{ mt: 1 }} divider={<Divider flexItem />}>
                      {Object.entries(activities).map(
                        ([time, action], index) => (
                          <TimelineItem
                            key={index}
                            action={action}
                            time={time}
                          />
                        )
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      );
    })}
  </Box>
);

export default UserLogs;
