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
  Chip,
  Card,
  CardContent,
  CardActionArea,
  Fade,
  Skeleton,
  Alert,
  IconButton,
  InputAdornment,
} from "@mui/material";
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import React, { useState } from "react";
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit, startAt, endAt, or } from "firebase/firestore";

import { firestore } from "../hooks/config";
import ProtectedRoute from "../components/ProtectedRoute";

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
    <ProtectedRoute>
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
        elevation={1}
        sx={{
          p: isMobile ? 3 : 4,
          maxWidth: 600,
          width: "100%",
          mb: 4,
          borderRadius: 2,
          bgcolor: "#fff",
          border: "1px solid #e0e0e0",
        }}
      >
        <Box display="flex" alignItems="center" mb={3}>
          <SearchIcon sx={{ mr: 2, fontSize: 28, color: "primary.main" }} />
          <Typography variant="h5" fontWeight={500} color="text.primary">
            Search Users
          </Typography>
        </Box>
        
        <Box>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Search By</InputLabel>
            <Select
              value={searchType}
              label="Search By"
              onChange={(e) => setSearchType(e.target.value)}
            >
              <MenuItem value="email">
                <Box display="flex" alignItems="center">
                  <EmailIcon sx={{ mr: 1 }} />
                  Email Address
                </Box>
              </MenuItem>
              <MenuItem value="phone">
                <Box display="flex" alignItems="center">
                  <PhoneIcon sx={{ mr: 1 }} />
                  Phone Number
                </Box>
              </MenuItem>
              <MenuItem value="company">
                <Box display="flex" alignItems="center">
                  <BusinessIcon sx={{ mr: 1 }} />
                  Company Name
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label={
              searchType === "email" 
                ? "Enter Email Address" 
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
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {searchType === "email" ? <EmailIcon sx={{ color: "text.secondary" }} /> :
                   searchType === "phone" ? <PhoneIcon sx={{ color: "text.secondary" }} /> :
                   <BusinessIcon sx={{ color: "text.secondary" }} />}
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setSearchTerm("")}
                    size="small"
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !loading) {
                handleSearch();
              }
            }}
          />
          
          <Button
            fullWidth
            variant="contained"
            onClick={handleSearch}
            disabled={loading || !searchTerm.trim()}
            sx={{
              py: 1.5,
              fontSize: "1rem",
              fontWeight: 500,
              borderRadius: 2,
              textTransform: "none",
              "&:hover": {
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              },
            }}
          >
            {loading ? (
              <Box display="flex" alignItems="center">
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Searching...
              </Box>
            ) : (
              <Box display="flex" alignItems="center">
                <SearchIcon sx={{ mr: 1 }} />
                Search Users
              </Box>
            )}
          </Button>
        </Box>

        {error && (
          <Fade in={!!error}>
            <Alert 
              severity="error" 
              sx={{ 
                mt: 2, 
                borderRadius: 2,
              }}
            >
              {error}
            </Alert>
          </Fade>
        )}
      </Paper>

      {/* Empty state when no search performed */}
      {!loading && allMatches.length === 0 && !userData && !error && (
        <Fade in={true} timeout={200}>
          <Paper
            elevation={2}
            sx={{
              p: 6,
              width: "100%",
              maxWidth: 600,
              bgcolor: "#fff",
              borderRadius: 3,
              textAlign: "center",
            }}
          >
            <SearchIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
            <Typography variant="h5" gutterBottom color="text.secondary">
              Ready to Search
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Enter a search term above to find users by email, phone, or company name
            </Typography>
          </Paper>
        </Fade>
      )}

      {/* Show search results list */}
      {allMatches.length > 0 && !userData && (
        <Fade in={allMatches.length > 0} timeout={200}>
          <Paper
            elevation={1}
            sx={{
              p: isMobile ? 2 : 3,
              width: "100%",
              maxWidth: 800,
              bgcolor: "#fff",
              borderRadius: 2,
              border: "1px solid #e0e0e0",
            }}
          >
            <Box display="flex" alignItems="center" mb={3}>
              <SearchIcon sx={{ mr: 1, color: "primary.main" }} />
              <Typography variant="h5" fontWeight={500}>
                Search Results
              </Typography>
              <Chip 
                label={`${allMatches.length} found`} 
                color="primary" 
                size="small" 
                sx={{ ml: 2 }}
              />
            </Box>
            
            <Box display="flex" flexDirection="column" gap={2}>
              {allMatches.map((match, index) => (
                <Fade in={true} timeout={100 + index * 25} key={match.userId}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      border: selectedUserId === match.userId 
                        ? "2px solid #1976d2" 
                        : "1px solid #e0e0e0",
                      "&:hover": {
                        borderColor: "#1976d2",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      },
                    }}
                    onClick={() => handleUserSelect(match.userId)}
                  >
                    <CardActionArea>
                      <CardContent sx={{ p: 3 }}>
                        <Box display="flex" alignItems="center" mb={2}>
                          <PersonIcon sx={{ mr: 1, color: "primary.main" }} />
                          <Typography variant="h6" fontWeight={500} color="primary">
                            {match.email || "No email"}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                          <Chip
                            icon={<PersonIcon />}
                            label={`ID: ${match.userId.slice(0, 8)}...`}
                            size="small"
                            variant="outlined"
                          />
                          {match.phoneNumber && (
                            <Chip
                              icon={<PhoneIcon />}
                              label={match.phoneNumber}
                              size="small"
                              variant="outlined"
                              color="success"
                            />
                          )}
                          {match.companyName && (
                            <Chip
                              icon={<BusinessIcon />}
                              label={match.companyName}
                              size="small"
                              variant="outlined"
                              color="secondary"
                            />
                          )}
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary">
                          Click to view full details and activity
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Fade>
              ))}
            </Box>
          </Paper>
        </Fade>
      )}

      {/* Loading state for user details */}
      {loading && selectedUserId && !userData && (
        <Fade in={loading} timeout={150}>
          <Paper
            elevation={3}
            sx={{
              p: isMobile ? 2 : 3,
              width: "100%",
              maxWidth: 900,
              bgcolor: "#fff",
              borderRadius: 3,
            }}
          >
            <Box display="flex" alignItems="center" mb={3}>
              <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
              <Box>
                <Skeleton variant="text" width={200} height={32} />
                <Skeleton variant="text" width={150} height={20} />
              </Box>
            </Box>
            
            <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={3} mb={3}>
              <Card elevation={2} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Skeleton variant="text" width={150} height={24} sx={{ mb: 2 }} />
                  <Box display="flex" flexDirection="column" gap={2}>
                    <Skeleton variant="text" width="100%" height={20} />
                    <Skeleton variant="text" width="80%" height={20} />
                    <Skeleton variant="text" width="90%" height={20} />
                  </Box>
                </CardContent>
              </Card>
              <Card elevation={2} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Skeleton variant="text" width={150} height={24} sx={{ mb: 2 }} />
                  <Box display="flex" flexDirection="column" gap={2}>
                    <Skeleton variant="text" width="100%" height={20} />
                    <Skeleton variant="text" width="70%" height={20} />
                    <Skeleton variant="text" width="85%" height={20} />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Paper>
        </Fade>
      )}

      {/* Show selected user details */}
      {userData && (
        <Fade in={!!userData} timeout={200}>
          <Paper
            elevation={1}
            sx={{
              p: isMobile ? 2 : 3,
              width: "100%",
              maxWidth: 900,
              bgcolor: "#fff",
              borderRadius: 2,
              border: "1px solid #e0e0e0",
            }}
          >
            {/* Header */}
            <Box 
              sx={{ 
                bgcolor: "#f8f9fa",
                p: 3,
                mb: 3,
                borderRadius: 2,
                border: "1px solid #e0e0e0",
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center">
                  <PersonIcon sx={{ mr: 2, fontSize: 28, color: "primary.main" }} />
                  <Box>
                    <Typography variant="h5" fontWeight={500} color="text.primary">
                      User Details
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ID: {userData.userId}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => {
                    setUserData(null);
                    setSelectedUserId(null);
                  }}
                >
                  Back to Results
                </Button>
              </Box>
            </Box>

            {/* User Information Cards */}
            <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={3} mb={3}>
              {/* Basic Info Card */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary" fontWeight={600}>
                    📋 Basic Information
                  </Typography>
                  
                  <Box display="flex" flexDirection="column" gap={2}>
                    <Box display="flex" alignItems="center">
                      <EmailIcon sx={{ mr: 1, color: "text.secondary" }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Email
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {userData.email || "Not available"}
                        </Typography>
                      </Box>
                    </Box>

                    {userData.phoneNumber && (
                      <Box display="flex" alignItems="center">
                        <PhoneIcon sx={{ mr: 1, color: "text.secondary" }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Phone
                          </Typography>
                          <Typography variant="body1" fontWeight={500}>
                            {userData.phoneNumber}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {userData.companyName && (
                      <Box display="flex" alignItems="center">
                        <BusinessIcon sx={{ mr: 1, color: "text.secondary" }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Company
                          </Typography>
                          <Typography variant="body1" fontWeight={500}>
                            {userData.companyName}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>

              {/* Account Info Card */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary" fontWeight={600}>
                    🏛️ Account Information
                  </Typography>
                  
                  <Box display="flex" flexDirection="column" gap={2}>
                    {userData.gstNumber && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          GST Number
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {userData.gstNumber}
                        </Typography>
                      </Box>
                    )}

                    {userData.createdAt && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Created
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {new Date(userData.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    )}

                    {userData.lastLogin && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Last Login
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {new Date(userData.lastLogin).toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Plan Information */}
            {userData.plan && (
              <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary" fontWeight={600}>
                    💳 Subscription Plan
                  </Typography>
                  
                  <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr 1fr" }} gap={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Plan Type
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {userData.plan.planType}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Payment ID
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {userData.plan.paymentId}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Valid Until
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {new Date(userData.plan.validUntil).toLocaleDateString()}
                      </Typography>
                      <Chip 
                        label={`${calculateDaysLeft(userData.plan.validUntil)} days left`}
                        color={calculateDaysLeft(userData.plan.validUntil) < 7 ? "error" : "success"}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Contact Actions */}
            {userData.phoneNumber && (
              <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary" fontWeight={600}>
                    📱 Contact Actions
                  </Typography>
                  
                  <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} gap={2}>
                    <Button
                      variant="outlined"
                      startIcon={<PhoneIcon />}
                      href={`tel:${userData.phoneNumber}`}
                      sx={{ textTransform: "none", flex: 1 }}
                    >
                      Call {userData.phoneNumber}
                    </Button>

                    <Button
                      variant="outlined"
                      color="success"
                      startIcon={<EmailIcon />}
                      href={createWhatsAppLink(
                        userData.phoneNumber,
                        "Hey! 👋 Thank you for being a part of TheEcomWay! Feel free to reach out if you need any help 😊"
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ textTransform: "none", flex: 1 }}
                    >
                      Send Welcome Message
                    </Button>

                    <Button
                      variant="outlined"
                      color="info"
                      startIcon={<EmailIcon />}
                      href={createWhatsAppLink(
                        userData.phoneNumber,
                        "Hi! 👋 Just checking in — hope everything's going great with your experience on TheEcomWay. Let us know if you need anything!"
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ textTransform: "none", flex: 1 }}
                    >
                      Send Follow-up
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Activity Summary */}
            <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary" fontWeight={600}>
                  📊 Label Cropping Activity
                </Typography>
                
                <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={3}>
                  <Box textAlign="center" p={2} sx={{ bgcolor: "rgba(25, 118, 210, 0.05)", borderRadius: 2 }}>
                    <Typography variant="h4" color="primary" fontWeight={700}>
                      {userData.activity.flipkart}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Flipkart Labels
                    </Typography>
                  </Box>
                  <Box textAlign="center" p={2} sx={{ bgcolor: "rgba(156, 39, 176, 0.05)", borderRadius: 2 }}>
                    <Typography variant="h4" color="secondary" fontWeight={700}>
                      {userData.activity.meesho}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Meesho Labels
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>


            {/* Platform Activity Details */}
            {(Object.keys(userData.flipkartData).length > 0 || Object.keys(userData.meeshoData).length > 0) && (
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" color="primary" fontWeight={600}>
                      🔍 Platform Activity Details
                    </Typography>
                    <Button
                      variant="text"
                      onClick={() => setShowSkuDetails((prev) => !prev)}
                      size="small"
                    >
                      {showSkuDetails ? "Hide Details" : "Show Details"}
                    </Button>
                  </Box>

                  <Collapse in={showSkuDetails}>
                    <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={3}>
                      {Object.keys(userData.flipkartData).length > 0 && (
                        <Card variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                            🛒 Flipkart Activity
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Total Cropped: {userData.flipkartData.labelsProcessed?.totalCropped || 0}
                          </Typography>
                          {userData.flipkartData.labelsProcessed?.lastProcessed && (
                            <Typography variant="body2" color="text.secondary">
                              Last Processed: {new Date(userData.flipkartData.labelsProcessed.lastProcessed).toLocaleString()}
                            </Typography>
                          )}
                        </Card>
                      )}
                      
                      {Object.keys(userData.meeshoData).length > 0 && (
                        <Card variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle1" fontWeight="bold" color="secondary" gutterBottom>
                            🛍️ Meesho Activity
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Total Cropped: {userData.meeshoData.labelsProcessed?.totalCropped || 0}
                          </Typography>
                          {userData.meeshoData.labelsProcessed?.lastProcessed && (
                            <Typography variant="body2" color="text.secondary">
                              Last Processed: {new Date(userData.meeshoData.labelsProcessed.lastProcessed).toLocaleString()}
                            </Typography>
                          )}
                        </Card>
                      )}
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            )}
          </Paper>
        </Fade>
      )}
      </Box>
    </ProtectedRoute>
  );
};

export default UserDashboard;
