import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { Box, CircularProgress, Typography } from '@mui/material';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        bgcolor="#f4f6f8"
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Checking authentication...
        </Typography>
      </Box>
    );
  }

  // If user is not authenticated, redirect to home page
  if (!user) {
    if (typeof window !== 'undefined') {
      router.push('/');
    }
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        bgcolor="#f4f6f8"
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Redirecting to sign in...
        </Typography>
      </Box>
    );
  }

  // If user is authenticated, render the protected content
  return children;
};

export default ProtectedRoute;
