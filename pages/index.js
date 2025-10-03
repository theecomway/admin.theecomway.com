import { 
  Card, 
  CardContent, 
  Container, 
  Typography, 
  Button, 
  Box,
  useTheme,
  useMediaQuery
} from "@mui/material";
import { 
  Login as LoginIcon,
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon
} from "@mui/icons-material";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";

const quotes = [
  "Power without empathy destroys. Empathy with wisdom builds.",
  "The loudest voice in history is not the conqueror, but the conscience that followed.",
  "Those who listen, learn. Those who impose, repeat history.",
  "A society grows stronger not by ruling the weak, but by raising them.",
  "In every age, those who united hearts outlasted those who divided minds.",
  "Fear builds walls; courage builds bridges.",
  "Progress is born when truth meets humility.",
  "Every empire that ignored the people fell by the people's silence.",
  "Kindness may not make the headlines, but it rewrites history.",
  "The future belongs to those who balance reason, resolve, and empathy.",
];

const HomePage = () => {
  const [quote, setQuote] = useState("");
  const { user, loading } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[randomIndex]);
  }, []);

  const handleSignIn = () => {
    router.push('/signin');
  };

  const handleGoToAdmin = () => {
    router.push('/search');
  };

  if (!quote) return null; // Prevent rendering before hydration

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
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Box display="flex" flexDirection="column" alignItems="center" gap={4}>
          {/* Welcome Section */}
          <Card 
            elevation={10} 
            sx={{ 
              padding: isMobile ? 3 : 4, 
              borderRadius: 4,
              width: "100%",
              maxWidth: 600,
              textAlign: "center",
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
            }}
          >
            <CardContent>
              <AdminIcon 
                sx={{ 
                  fontSize: 64, 
                  color: "primary.main", 
                  mb: 2,
                  filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))"
                }} 
              />
              <Typography 
                variant="h3" 
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
              <Typography 
                variant="h6" 
                color="text.secondary" 
                sx={{ mb: 3, opacity: 0.8 }}
              >
                Secure admin access to manage your e-commerce platform
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
            </CardContent>
          </Card>

          {/* Quote Section */}
          <Card 
            elevation={6} 
            sx={{ 
              padding: isMobile ? 3 : 4, 
              borderRadius: 4,
              width: "100%",
              maxWidth: 600,
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(10px)",
            }}
          >
            <CardContent>
              <SecurityIcon 
                sx={{ 
                  fontSize: 48, 
                  color: "text.secondary", 
                  mb: 2,
                  opacity: 0.7
                }} 
              />
              <Typography
                variant="h6"
                component="blockquote"
                sx={{
                  fontStyle: "italic",
                  textAlign: "center",
                  color: "text.primary",
                  lineHeight: 1.6,
                }}
              >
                "{quote}"
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;
