import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useState } from "react";
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit, startAt, endAt } from "firebase/firestore";

import { firestore } from "../hooks/config";

const createWhatsAppLink = (phoneNumber, message) => {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/91${phoneNumber}?text=${encodedMessage}`;
};

const UserDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("email");
  const [userData, setUserData] = useState(null);
  const [allMatches, setAllMatches] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSkuDetails, setShowSkuDetails] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);

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
      let userId = null;
      let userEmail = null;
      let userPhoneNumber = null;

      if (searchType === "email") {
        // Simple approach: get all users and filter client-side
        const searchValue = searchTerm.trim().toLowerCase();
        const usersRef = collection(firestore, "users");
        
        try {
          console.log("Fetching all users for email search:", searchValue);
          const snapshot = await getDocs(usersRef);
          console.log("Total users fetched:", snapshot.size);
          
          snapshot.forEach((doc) => {
            const userData = doc.data();
            const profileDetails = userData?.profile?.details;
            if (profileDetails?.email?.toLowerCase().includes(searchValue)) {
              userId = doc.id;
              userEmail = profileDetails.email;
              userPhoneNumber = profileDetails.phone || null;
              console.log("Found user:", { userId, userEmail, userPhoneNumber });
            }
          });
        } catch (error) {
          console.error("Email search error:", error);
          console.error("Error details:", error.code, error.message);
          setError(`Error searching for email: ${error.message}. Please try again.`);
          setLoading(false);
          return;
        }
      } else if (searchType === "phone") {
        // Simple approach: get all users and filter client-side
        const phoneSearchValue = searchTerm.trim();
        const usersRef = collection(firestore, "users");
        
        try {
          console.log("Fetching all users for phone search:", phoneSearchValue);
          const snapshot = await getDocs(usersRef);
          console.log("Total users fetched:", snapshot.size);
          
          snapshot.forEach((doc) => {
            const userData = doc.data();
            const profileDetails = userData?.profile?.details;
            if (profileDetails?.phone?.includes(phoneSearchValue)) {
              userId = doc.id;
              userEmail = profileDetails.email;
              userPhoneNumber = profileDetails.phone;
              console.log("Found user by phone:", { userId, userEmail, userPhoneNumber });
            }
          });
        } catch (error) {
          console.error("Phone search error:", error);
          console.error("Error details:", error.code, error.message);
          setError(`Error searching for phone: ${error.message}. Please try again.`);
          setLoading(false);
          return;
        }
      }

      if (!userId) {
        setError("No users found matching your search criteria.");
        setLoading(false);
        return;
      }

      // Use UID-based paths to fetch user data from Firestore
      const [planSnap, flipkartSnap, meeshoSnap] =
        await Promise.all([
          getDoc(doc(firestore, "users-plan", userId)),
          getDoc(doc(firestore, "users-activity", "flipkart-labels-cropped", userId)),
          getDoc(doc(firestore, "users-activity", "meesho-labels-cropped", userId)),
        ]);

      setUserData({
        userId,
        email: userEmail,
        phoneNumber: userPhoneNumber,
        plan: planSnap.exists() ? planSnap.data() : null,
        activity: {
          flipkart: flipkartSnap.data()?.labelsProcessed?.totalCropped || 0,
          meesho: meeshoSnap.data()?.labelsProcessed?.totalCropped || 0,
        },
        flipkartData: flipkartSnap.exists() ? flipkartSnap.data() : {},
        meeshoData: meeshoSnap.exists() ? meeshoSnap.data() : {},
      });

      // Set allMatches for compatibility with existing UI
      setAllMatches([{
        userId,
        email: userEmail,
        phoneNumber: userPhoneNumber,
      }]);
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
          🔍 Search User
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Search By</InputLabel>
          <Select
            value={searchType}
            label="Search By"
            onChange={(e) => setSearchType(e.target.value)}
          >
            <MenuItem value="email">Email (Partial Match)</MenuItem>
            <MenuItem value="phone">Phone Number</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label={searchType === "email" ? "Enter Email (Partial Match)" : "Enter Phone Number"}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={searchType === "email" ? "e.g., john, @gmail.com" : "e.g., 9876543210"}
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

          <Typography variant="body1" gutterBottom>
            📧 Email:{" "}
            <Typography component="span" fontWeight="bold">
              {userData.email || "Not available"}
            </Typography>
          </Typography>

          {/* Show multiple matches indicator */}
          {allMatches.length > 1 && (
            <Box mt={2} mb={2}>
              <Typography variant="body2" color="info.main" gutterBottom>
                ⚠️ Found {allMatches.length} matching users. Showing the first one.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowAllMatches(!showAllMatches)}
              >
                {showAllMatches ? "Hide" : "Show"} All Matches
              </Button>
              
              <Collapse in={showAllMatches}>
                <Box mt={2} p={2} bgcolor="#f5f5f5" borderRadius={1}>
                  <Typography variant="subtitle2" gutterBottom>
                    All Matching Users:
                  </Typography>
                  {allMatches.map((match, index) => (
                    <Box key={index} mb={1} p={1} bgcolor="white" borderRadius={1}>
                      <Typography variant="body2">
                        <strong>User ID:</strong> {match.userId}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Email:</strong> {match.email || "Not available"}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Phone:</strong> {match.phoneNumber || "Not available"}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Collapse>
            </Box>
          )}

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
            <Typography>Flipkart: {userData.activity.flipkart}</Typography>
            <Typography>Meesho: {userData.activity.meesho}</Typography>
          </Box>

          {/* 🔽 Toggle to Show Platform Details */}
          {(Object.keys(userData.flipkartData).length > 0 || Object.keys(userData.meeshoData).length > 0) && (
            <Box mt={3}>
              <Button
                variant="text"
                onClick={() => setShowSkuDetails((prev) => !prev)}
              >
                {showSkuDetails ? "Hide" : "Show"} Platform Activity Details
              </Button>

              <Collapse in={showSkuDetails}>
                <Box mt={2}>
                  {Object.keys(userData.flipkartData).length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        🛒 Flipkart Activity:
                      </Typography>
                      <Typography variant="body2">
                        Total Cropped: {userData.flipkartData.labelsProcessed?.totalCropped || 0}
                      </Typography>
                      {userData.flipkartData.labelsProcessed?.lastProcessed && (
                        <Typography variant="body2">
                          Last Processed: {new Date(userData.flipkartData.labelsProcessed.lastProcessed).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  )}
                  
                  {Object.keys(userData.meeshoData).length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        🛍️ Meesho Activity:
                      </Typography>
                      <Typography variant="body2">
                        Total Cropped: {userData.meeshoData.labelsProcessed?.totalCropped || 0}
                      </Typography>
                      {userData.meeshoData.labelsProcessed?.lastProcessed && (
                        <Typography variant="body2">
                          Last Processed: {new Date(userData.meeshoData.labelsProcessed.lastProcessed).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  )}
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
