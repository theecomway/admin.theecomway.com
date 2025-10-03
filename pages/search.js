import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Paper,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useState } from "react";
import { get, ref } from "firebase/database";

import { database } from "../hooks/config";

const createWhatsAppLink = (phoneNumber, message) => {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/91${phoneNumber}?text=${encodedMessage}`;
};

const UserDashboard = () => {
  const [email, setEmail] = useState("");
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSkuDetails, setShowSkuDetails] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const calculateDaysLeft = (timestamp) => {
    const now = Date.now();
    const diff = timestamp - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleSearch = async () => {
    setError("");
    setUserData(null);
    setShowSkuDetails(false);
    setLoading(true);

    try {
      const snapshot = await get(ref(database, "users-details"));
      let userId = null;
      let phoneNumber = null;

      snapshot.forEach((childSnap) => {
        const details = childSnap.val().details;
        if (details?.email === email.trim()) {
          userId = childSnap.key;
          phoneNumber = details?.phoneNumber || null;
        }
      });

      if (!userId) {
        setError("User not found.");
        setLoading(false);
        return;
      }

      const [planSnap, amazonSnap, flipkartSnap, meeshoSnap, profitSnap] =
        await Promise.all([
          get(ref(database, `users-plan/${userId}/plan-details`)),
          get(
            ref(
              database,
              `users-activity/amazon-labels-cropped/${userId}/labels-processed`
            )
          ),
          get(
            ref(
              database,
              `users-activity/flipkart-labels-cropped/${userId}/labels-processed`
            )
          ),
          get(
            ref(
              database,
              `users-activity/meesho-labels-cropped/${userId}/labels-processed`
            )
          ),
          get(
            ref(
              database,
              `users-activity/amazon-profit-calculator/${userId}/purchase-price-by-sku`
            )
          ),
        ]);

      setUserData({
        userId,
        phoneNumber,
        plan: planSnap.exists() ? planSnap.val() : null,
        activity: {
          amazon: amazonSnap.val()?.totalCropped || 0,
          flipkart: flipkartSnap.val()?.totalCropped || 0,
          meesho: meeshoSnap.val()?.totalCropped || 0,
        },
        skuPrices: profitSnap.exists() ? profitSnap.val() : {},
      });
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      bgcolor="#f4f6f8"
      px={2}
    >
      <Paper
        elevation={3}
        sx={{
          p: isMobile ? 3 : 4,
          maxWidth: 500,
          width: "100%",
          mb: 4,
        }}
      >
        <Typography variant="h5" mb={3} fontWeight={600} textAlign="center">
          🔍 Search User by Email
        </Typography>
        <TextField
          fullWidth
          label="Enter Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button
          fullWidth
          variant="contained"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Search"}
        </Button>

        {error && (
          <Typography color="error" mt={2} textAlign="center">
            {error}
          </Typography>
        )}
      </Paper>

      {userData && (
        <Paper
          elevation={2}
          sx={{
            p: isMobile ? 2 : 3,
            width: "100%",
            maxWidth: 700,
            bgcolor: "#fff",
          }}
        >
          <Typography variant="h6" gutterBottom>
            🆔 User ID:{" "}
            <Typography component="span" fontWeight="bold">
              {userData.userId}
            </Typography>
          </Typography>

          {userData.plan && (
            <>
              <Typography>
                <strong>Plan:</strong> {userData.plan.planType}
              </Typography>
              <Typography>
                <strong>Payment:</strong> {userData.plan.paymentId}
              </Typography>
              <Typography>
                <strong>Valid Until:</strong>{" "}
                {new Date(userData.plan.validUntil).toLocaleDateString()} (
                {calculateDaysLeft(userData.plan.validUntil)} days left)
              </Typography>
            </>
          )}

          {/* 📞 Phone & WhatsApp */}
          {userData.phoneNumber && (
            <Box mt={3}>
              <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                📱 Contact
              </Typography>

              <Box display="flex" flexDirection="column" gap={1}>
                <Button
                  variant="outlined"
                  href={`tel:${userData.phoneNumber}`}
                  sx={{ textTransform: "none" }}
                >
                  📞 Call {userData.phoneNumber}
                </Button>

                <Button
                  variant="outlined"
                  color="success"
                  href={createWhatsAppLink(
                    userData.phoneNumber,
                    "Hey! 👋 Thank you for being a part of TheEcomWay! Feel free to reach out if you need any help 😊"
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ textTransform: "none" }}
                >
                  🟢 Send Welcome Message
                </Button>

                <Button
                  variant="outlined"
                  color="success"
                  href={createWhatsAppLink(
                    userData.phoneNumber,
                    "Hi! 👋 Just checking in — hope everything’s going great with your experience on TheEcomWay. Let us know if you need anything!"
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ textTransform: "none" }}
                >
                  💬 Send Follow-up Message
                </Button>
              </Box>
            </Box>
          )}

          {/* 📊 Activity Summary */}
          <Box mt={3}>
            <Typography variant="subtitle1" fontWeight="bold">
              📦 Label Cropping Activity
            </Typography>
            <Typography>Amazon: {userData.activity.amazon}</Typography>
            <Typography>Flipkart: {userData.activity.flipkart}</Typography>
            <Typography>Meesho: {userData.activity.meesho}</Typography>
          </Box>

          {/* 🔽 Toggle to Show SKU Prices */}
          {Object.keys(userData.skuPrices).length > 0 && (
            <Box mt={3}>
              <Button
                variant="text"
                onClick={() => setShowSkuDetails((prev) => !prev)}
              >
                {showSkuDetails ? "Hide" : "Show"} SKU Purchase Details
              </Button>

              <Collapse in={showSkuDetails}>
                <Box mt={2}>
                  {Object.entries(userData.skuPrices).map(([sku, data]) => (
                    <Typography key={sku}>
                      {sku}: ₹{data.purchasePrice}
                    </Typography>
                  ))}
                </Box>
              </Collapse>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default UserDashboard;
