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
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit, startAt, endAt, or } from "firebase/firestore";

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
  const [selectedUserId, setSelectedUserId] = useState(null);
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

  const handleUserSelect = async (userId) => {
    setSelectedUserId(userId);
    setLoading(true);
    setError("");

    try {
      // Get user data and plan data from Firestore
      const [userDocSnap, planSnap] = await Promise.all([
        getDoc(doc(firestore, "users", userId)),
        getDoc(doc(firestore, "users-plan", userId)),
      ]);

      const userDocData = userDocSnap.exists() ? userDocSnap.data() : {};
      
      // Try to get activity data from different possible collection structures
      let flipkartData = {};
      let meeshoData = {};
      
      try {
        // Try different possible collection structures
        const [flipkartSnap, meeshoSnap] = await Promise.all([
          getDoc(doc(firestore, "flipkart-labels-cropped", userId)),
          getDoc(doc(firestore, "meesho-labels-cropped", userId)),
        ]);
        
        flipkartData = flipkartSnap.exists() ? flipkartSnap.data() : {};
        meeshoData = meeshoSnap.exists() ? meeshoSnap.data() : {};
      } catch (activityError) {
        console.log("Activity data not found in separate collections:", activityError);
        // Try to get from users-activity collection
        try {
          const [flipkartSnap, meeshoSnap] = await Promise.all([
            getDoc(doc(firestore, "users-activity", userId)),
            getDoc(doc(firestore, "users-activity", userId)),
          ]);
          
          flipkartData = flipkartSnap.exists() ? flipkartSnap.data() : {};
          meeshoData = meeshoSnap.exists() ? meeshoSnap.data() : {};
        } catch (secondError) {
          console.log("Activity data not found in users-activity collection:", secondError);
          // Activity data might be stored within the user document or not available
          flipkartData = userDocData.flipkartData || {};
          meeshoData = userDocData.meeshoData || {};
        }
      }

      setUserData({
        userId,
        email: userDocData.email || null,
        phoneNumber: userDocData.phone || null,
        companyName: userDocData.companyName || null,
        gstNumber: userDocData.gstNumber || null,
        createdAt: userDocData.createdAt || null,
        lastLogin: userDocData.lastLogin || null,
        plan: planSnap.exists() ? planSnap.data() : null,
        activity: {
          flipkart: flipkartData?.labelsProcessed?.totalCropped || 0,
          meesho: meeshoData?.labelsProcessed?.totalCropped || 0,
        },
        flipkartData: flipkartData,
        meeshoData: meeshoData,
      });
    } catch (err) {
      console.error(err);
      setError("Something went wrong while loading user details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setError("");
    setUserData(null);
    setSelectedUserId(null);
    setShowSkuDetails(false);
    setLoading(true);

    try {
      let userId = null;
      let userEmail = null;
      let userPhoneNumber = null;
      let allMatchingUsers = [];

      if (searchType === "email") {
        // Search through users collection for email field with partial match using range queries
        const searchValue = searchTerm.trim().toLowerCase();
        const usersRef = collection(firestore, "users");
        
        try {
          console.log("Searching for email:", searchValue);
          
          // Create range query for partial email matching
          // This will find emails that start with the search term
          const q = query(
            usersRef,
            where("email", ">=", searchValue),
            where("email", "<=", searchValue + "\uf8ff")
          );
          
          const snapshot = await getDocs(q);
          console.log("Users found:", snapshot.size);
          
          snapshot.forEach((doc) => {
            const userData = doc.data();
            
            if (userData?.email) {
              const email = userData.email.toLowerCase();
              // Double-check for partial match (in case of case sensitivity issues)
              if (email.includes(searchValue)) {
                const match = {
                  userId: doc.id,
                  email: userData.email,
                  phoneNumber: userData.phone || null,
                  companyName: userData.companyName || null,
                };
                allMatchingUsers.push(match);
              }
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
        // Search through users collection for phone field with partial match using range queries
        const phoneSearchValue = searchTerm.trim();
        const usersRef = collection(firestore, "users");
        
        try {
          console.log("Searching for phone:", phoneSearchValue);
          
          // Create range query for partial phone matching
          const q = query(
            usersRef,
            where("phone", ">=", phoneSearchValue),
            where("phone", "<=", phoneSearchValue + "\uf8ff")
          );
          
          const snapshot = await getDocs(q);
          console.log("Users found:", snapshot.size);
          
          snapshot.forEach((doc) => {
            const userData = doc.data();
            
            if (userData?.phone) {
              const phone = userData.phone;
              // Double-check for partial match
              if (phone.includes(phoneSearchValue)) {
                const match = {
                  userId: doc.id,
                  email: userData.email || null,
                  phoneNumber: userData.phone,
                  companyName: userData.companyName || null,
                };
                allMatchingUsers.push(match);
              }
            }
          });
        } catch (error) {
          console.error("Phone search error:", error);
          console.error("Error details:", error.code, error.message);
          setError(`Error searching for phone: ${error.message}. Please try again.`);
          setLoading(false);
          return;
        }
      } else if (searchType === "company") {
        // Search through users collection for companyName field with partial match using range queries
        const companySearchValue = searchTerm.trim().toLowerCase();
        const usersRef = collection(firestore, "users");
        
        try {
          console.log("Searching for company:", companySearchValue);
          
          // Create range query for partial company name matching
          const q = query(
            usersRef,
            where("companyName", ">=", companySearchValue),
            where("companyName", "<=", companySearchValue + "\uf8ff")
          );
          
          const snapshot = await getDocs(q);
          console.log("Users found:", snapshot.size);
          
          snapshot.forEach((doc) => {
            const userData = doc.data();
            
            if (userData?.companyName) {
              const companyName = userData.companyName.toLowerCase();
              // Double-check for partial match
              if (companyName.includes(companySearchValue)) {
                const match = {
                  userId: doc.id,
                  email: userData.email || null,
                  phoneNumber: userData.phone || null,
                  companyName: userData.companyName,
                };
                allMatchingUsers.push(match);
              }
            }
          });
        } catch (error) {
          console.error("Company search error:", error);
          console.error("Error details:", error.code, error.message);
          setError(`Error searching for company: ${error.message}. Please try again.`);
          setLoading(false);
          return;
        }
      }

      // Set all matches for display
      setAllMatches(allMatchingUsers);

      if (allMatchingUsers.length === 0) {
        setError("No users found matching your search criteria.");
        setLoading(false);
        return;
      }
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
            <MenuItem value="email">Email</MenuItem>
            <MenuItem value="phone">Phone Number</MenuItem>
            <MenuItem value="company">Company Name</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label={
            searchType === "email" 
              ? "Enter Email" 
              : searchType === "phone" 
              ? "Enter Phone Number" 
              : "Enter Company Name"
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={
            searchType === "email" 
              ? "e.g., john, @gmail.com" 
              : searchType === "phone" 
              ? "e.g., 9876543210" 
              : "e.g., My Company"
          }
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

      {/* Show search results list */}
      {allMatches.length > 0 && !userData && (
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
            🔍 Search Results ({allMatches.length} found)
          </Typography>
          
          <Box display="flex" flexDirection="column" gap={1}>
            {allMatches.map((match, index) => (
              <Paper
                key={match.userId}
                elevation={1}
                sx={{
                  p: 2,
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "#f5f5f5",
                  },
                  border: selectedUserId === match.userId ? "2px solid #1976d2" : "1px solid #e0e0e0",
                }}
                onClick={() => handleUserSelect(match.userId)}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  {match.email || "No email"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>User ID:</strong> {match.userId}
                </Typography>
                {match.phoneNumber && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Phone:</strong> {match.phoneNumber}
                  </Typography>
                )}
                {match.companyName && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Company:</strong> {match.companyName}
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
        </Paper>
      )}

      {/* Show selected user details */}
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
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              🆔 User ID:{" "}
              <Typography component="span" fontWeight="bold">
                {userData.userId}
              </Typography>
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setUserData(null);
                setSelectedUserId(null);
              }}
            >
              ← Back to Results
            </Button>
          </Box>

          <Typography variant="body1" gutterBottom>
            📧 Email:{" "}
            <Typography component="span" fontWeight="bold">
              {userData.email || "Not available"}
            </Typography>
          </Typography>

          {userData.companyName && (
            <Typography variant="body1" gutterBottom>
              🏢 Company:{" "}
              <Typography component="span" fontWeight="bold">
                {userData.companyName}
              </Typography>
            </Typography>
          )}

          {userData.gstNumber && (
            <Typography variant="body1" gutterBottom>
              🏛️ GST Number:{" "}
              <Typography component="span" fontWeight="bold">
                {userData.gstNumber}
              </Typography>
            </Typography>
          )}

          {userData.createdAt && (
            <Typography variant="body1" gutterBottom>
              📅 Created:{" "}
              <Typography component="span" fontWeight="bold">
                {new Date(userData.createdAt).toLocaleDateString()}
              </Typography>
            </Typography>
          )}

          {userData.lastLogin && (
            <Typography variant="body1" gutterBottom>
              🔄 Last Login:{" "}
              <Typography component="span" fontWeight="bold">
                {new Date(userData.lastLogin).toLocaleString()}
              </Typography>
            </Typography>
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
