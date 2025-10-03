import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";

import { database } from "../hooks/config";
import dayjs from "dayjs";

const PlanDashboard = () => {
  const [plans, setPlans] = useState([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const TABS = [
    { label: "Expiring Today", daysLeft: 0 },
    { label: "Expiring in 1 Day", daysLeft: 1 },
    { label: "Expiring in 3 Days", daysLeft: 3 },
  ];

  useEffect(() => {
    const plansRef = ref(database, "users-plan");
    const usersRef = ref(database, "users-details");

    onValue(plansRef, (planSnap) => {
      const plansRaw = planSnap.val() || {};
      onValue(usersRef, (userSnap) => {
        const usersRaw = userSnap.val() || {};
        const enriched = Object.values(plansRaw)
          .map((plan) => {
            const userId = plan["plan-details"]?.userId;
            const userDetails = usersRaw[userId]?.details;

            if (!userId || !userDetails) return null; // Skip invalid

            const validUntil = dayjs(plan["plan-details"]?.validUntil);
            const daysLeft = validUntil.diff(dayjs(), "day");

            return {
              planType: plan["plan-details"]?.planType,
              ...userDetails,
              daysLeft,
              validDate: validUntil.format("YYYY-MM-DD"),
            };
          })
          .filter(Boolean); // remove nulls

        setPlans(enriched);
        setLoading(false);
      });
    });
  }, []);

  const filteredPlans = plans.filter(
    (p) => p.daysLeft === TABS[tabIndex].daysLeft
  );

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        User Plans Dashboard
      </Typography>

      <Tabs value={tabIndex} onChange={(e, idx) => setTabIndex(idx)}>
        {TABS.map((tab, i) => (
          <Tab key={i} label={tab.label} />
        ))}
      </Tabs>

      {loading ? (
        <CircularProgress sx={{ mt: 4 }} />
      ) : (
        <Box mt={3}>
          {filteredPlans.length === 0 ? (
            <Typography>No plans in this tab</Typography>
          ) : (
            filteredPlans.map((p, i) => (
              <Paper key={i} sx={{ mb: 2, p: 2 }}>
                <Typography>
                  <strong>Email:</strong> {p.email}
                </Typography>
                <Typography>
                  <strong>Phone:</strong> {p.phoneNumber || "N/A"}
                </Typography>
                <Typography>
                  <strong>Plan:</strong> {p.planType}
                </Typography>
                <Typography>
                  <strong>Expires on:</strong> {p.validDate}
                </Typography>

                <Button
                  variant="contained"
                  color="success"
                  sx={{ mt: 1 }}
                  href={`https://wa.me/91${p.phoneNumber}?text=Your%20Basic%20Plan%20is%20expiring%20tomorrow%20%F0%9F%98%B1%0ARenew%20now%20or%20your%20tools%20and%20reports%20might%20just%20say%20%E2%80%94%20%E2%80%9CGoodbye%2C%20my%20friend!%E2%80%9D%20%F0%9F%AB%A1%F0%9F%93%89%0ADon%E2%80%99t%20let%20your%20business%20hit%20pause%20%E2%80%94%20upgrade%20and%20keep%20moving%20forward%20%F0%9F%9A%80%0A%0A%E2%80%94%20TheEcomWay%20Team%20%F0%9F%92%BC%E2%9C%A8`}
                  target="_blank"
                  disabled={!p.phoneNumber}
                >
                  Send WhatsApp Reminder
                </Button>
              </Paper>
            ))
          )}
        </Box>
      )}
    </Box>
  );
};

export default PlanDashboard;
