import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { onValue, ref, remove } from "firebase/database";

import { database } from "../hooks/config";
import dayjs from "dayjs";

const USER_PLANS_PATH = "users-plan";

const PlansDashboard = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    const plansRef = ref(database, USER_PLANS_PATH);

    onValue(plansRef, (snapshot) => {
      const data = snapshot.val();
      const fetchedPlans = [];

      if (data) {
        Object.keys(data).forEach((userId) => {
          const plan = data[userId]["plan-details"];
          fetchedPlans.push({
            userId,
            ...plan,
          });
        });
      }

      setPlans(fetchedPlans);
      setLoading(false);
    });
  }, []);

  const handleDelete = (userId) => {
    const planRef = ref(database, `${USER_PLANS_PATH}/${userId}/plan-details`);
    remove(planRef);
  };

  const filterPlans = (index) => {
    const now = dayjs();
    const in3Days = now.add(3, "day");

    switch (index) {
      case 0: // Current Active
        return plans.filter((p) => Number(p.validUntil) > now.valueOf());
      case 1: // Expired
        return plans.filter((p) => Number(p.validUntil) <= now.valueOf());
      case 2: // Expiring in 3 Days
        return plans.filter(
          (p) =>
            Number(p.validUntil) > now.valueOf() &&
            Number(p.validUntil) <= in3Days.valueOf()
        );
      case 3: // Paid Plans
        return plans.filter((p) => p.paymentId?.startsWith("pay_"));
      case 4: // Free Access
        return plans.filter((p) => p.paymentId === "Free Access");
      case 5: // Other Plans
        return plans.filter(
          (p) =>
            !p.paymentId?.startsWith("pay_") && p.paymentId !== "Free Access"
        );
      default:
        return [];
    }
  };

  const renderTable = (filteredPlans) => {
    if (filteredPlans.length === 0) {
      return (
        <Typography align="center" mt={2}>
          No plans found in this category.
        </Typography>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Plan Type</TableCell>
              <TableCell>Payment ID</TableCell>
              <TableCell>Expiry Date</TableCell>
              <TableCell>Expires In</TableCell>
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPlans.map((plan) => {
              const expiry = dayjs(Number(plan.validUntil));
              const daysLeft = expiry.diff(dayjs(), "day");

              return (
                <TableRow key={plan.userId}>
                  <TableCell>{plan.email}</TableCell>
                  <TableCell>{plan.planType}</TableCell>
                  <TableCell>{plan.paymentId}</TableCell>
                  <TableCell>{expiry.format("DD MMM YYYY")}</TableCell>
                  <TableCell>
                    <Typography
                      color={daysLeft < 3 ? "error" : "textSecondary"}
                    >
                      {daysLeft} days
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleDelete(plan.userId)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (loading) return <CircularProgress />;

  const filtered = filterPlans(tabIndex);

  return (
    <Box sx={{ maxWidth: "1000px", margin: "auto", p: 2 }}>
      <Typography variant="h5" mb={2}>
        User Plans
      </Typography>

      <Tabs
        value={tabIndex}
        onChange={(e, newValue) => setTabIndex(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        <Tab label="✅ Current Active" />
        <Tab label="❌ Expired Plans" />
        <Tab label="⏳ Expiring in 3 Days" />
        <Tab label="💳 Paid Plans" />
        <Tab label="🆓 Free Access" />
        <Tab label="🎟️ Coupon Code" />
      </Tabs>

      {renderTable(filtered)}
    </Box>
  );
};

export default PlansDashboard;
