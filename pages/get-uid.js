import {
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import React, { useState } from "react";
import { getUidFromEmail, getAllUidsFromPartialEmail, getUserDetailsFromUid } from "../utils/userUtils";

const GetUidPage = () => {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchType, setSearchType] = useState("exact");

  const handleGetUid = async () => {
    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      let data;
      
      if (searchType === "exact") {
        const uid = await getUidFromEmail(email, true);
        if (uid) {
          const userDetails = await getUserDetailsFromUid(uid);
          data = {
            type: "exact",
            uid,
            userDetails
          };
        } else {
          setError("No user found with that exact email address");
          setLoading(false);
          return;
        }
      } else {
        const matches = await getAllUidsFromPartialEmail(email);
        data = {
          type: "partial",
          matches
        };
      }

      setResult(data);
    } catch (err) {
      console.error("Error:", err);
      setError("An error occurred while searching");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setEmail("");
    setResult(null);
    setError("");
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
          p: 4,
          maxWidth: 600,
          width: "100%",
          mb: 4,
        }}
      >
        <Typography variant="h5" mb={3} fontWeight={600} textAlign="center">
          🔍 Get UID from Email
        </Typography>

        <Box mb={3}>
          <Button
            variant={searchType === "exact" ? "contained" : "outlined"}
            onClick={() => setSearchType("exact")}
            sx={{ mr: 1 }}
          >
            Exact Match
          </Button>
          <Button
            variant={searchType === "partial" ? "contained" : "outlined"}
            onClick={() => setSearchType("partial")}
          >
            Partial Match
          </Button>
        </Box>

        <TextField
          fullWidth
          label="Enter Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={searchType === "exact" ? "user@example.com" : "john or @gmail.com"}
          sx={{ mb: 2 }}
        />

        <Box display="flex" gap={2}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleGetUid}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Get UID"}
          </Button>
          <Button
            variant="outlined"
            onClick={handleClear}
            disabled={loading}
          >
            Clear
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {result && (
        <Paper
          elevation={2}
          sx={{
            p: 3,
            width: "100%",
            maxWidth: 700,
            bgcolor: "#fff",
          }}
        >
          {result.type === "exact" ? (
            <>
              <Typography variant="h6" gutterBottom>
                ✅ Exact Match Found
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>UID:</strong> {result.uid}
              </Typography>
              {result.userDetails?.details && (
                <>
                  <Typography variant="body1" gutterBottom>
                    <strong>Email:</strong> {result.userDetails.details.email}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Phone:</strong> {result.userDetails.details.phoneNumber || "Not available"}
                  </Typography>
                </>
              )}
            </>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>
                📋 Partial Matches ({result.matches.length})
              </Typography>
              {result.matches.length > 0 ? (
                <List>
                  {result.matches.map((match, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText
                          primary={`UID: ${match.uid}`}
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                Email: {match.email}
                              </Typography>
                              <Typography variant="body2">
                                Phone: {match.phoneNumber || "Not available"}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < result.matches.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  No matches found
                </Typography>
              )}
            </>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default GetUidPage;
