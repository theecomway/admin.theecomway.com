import { 
  Container, 
  Typography, 
  Button, 
  Box,
  CircularProgress
} from "@mui/material";
import { 
  Login as LoginIcon,
  AdminPanelSettings as AdminIcon
} from "@mui/icons-material";
import { useRouter } from "next/router";
import React from "react";
import { useAuth } from "../hooks/useAuth";

const HomePage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleSignIn = () => {
    router.push('/signin');
  };

  const handleGoToAdmin = () => {
    router.push('/search');
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Container maxWidth="sm" sx={{ textAlign: "center" }}>
          <CircularProgress size={60} sx={{ mb: 2, color: "white" }} />
          <Typography variant="h6" color="white" sx={{ opacity: 0.9 }}>
            Loading...
          </Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Container maxWidth="sm" sx={{ textAlign: "center" }}>
        <Box
          sx={{
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: 4,
            padding: 4,
            backdropFilter: "blur(10px)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          }}
        >
          <AdminIcon 
            sx={{ 
              fontSize: 64, 
              color: "primary.main", 
              mb: 2,
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))"
            }} 
          />
          <Typography 
            variant="h4" 
            component="h1" 
            fontWeight="bold" 
            gutterBottom
            sx={{ 
              background: "linear-gradient(45deg, #1976d2, #1565c0)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            TheEcomWay Admin
          </Typography>
          
          {user ? (
            <Box>
              <Typography variant="body1" color="success.main" sx={{ mb: 2 }}>
                Welcome back, {user.email}!
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<AdminIcon />}
                onClick={handleGoToAdmin}
                sx={{
                  py: 1.5,
                  px: 4,
                  borderRadius: 3,
                  textTransform: "none",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                }}
              >
                Go to Admin Dashboard
              </Button>
            </Box>
          ) : (
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={handleSignIn}
              sx={{
                py: 1.5,
                px: 4,
                borderRadius: 3,
                textTransform: "none",
                fontSize: "1.1rem",
                fontWeight: 600,
              }}
            >
              Sign In to Admin Panel
            </Button>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;
