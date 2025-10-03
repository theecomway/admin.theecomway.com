import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  Alert,
  Divider,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  Google as GoogleIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
      router.push('/search'); // Redirect to search page after successful login
    } catch (error) {
      setError(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      
      router.push('/search'); // Redirect to search page after successful login
    } catch (error) {
      setError(error.message || `Failed to ${isSignUp ? 'sign up' : 'sign in'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={10}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              color: 'white',
              p: 4,
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              TheEcomWay Admin
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              {isSignUp ? 'Create your admin account' : 'Sign in to your admin account'}
            </Typography>
          </Box>

          <CardContent sx={{ p: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {/* Google Sign In */}
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignIn}
              disabled={loading}
              sx={{
                mb: 3,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                borderColor: '#db4437',
                color: '#db4437',
                '&:hover': {
                  borderColor: '#c23321',
                  backgroundColor: 'rgba(219, 68, 55, 0.04)',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={20} sx={{ mr: 1 }} />
              ) : (
                'Continue with Google'
              )}
            </Button>

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>

            {/* Email/Password Form */}
            <Box component="form" onSubmit={handleEmailAuth}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                InputProps={{
                  startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                InputProps={{
                  startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{ mb: 3 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                disabled={loading}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 500,
                  mb: 2,
                }}
              >
                {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </Button>

              <Box textAlign="center">
                <Button
                  variant="text"
                  onClick={() => setIsSignUp(!isSignUp)}
                  disabled={loading}
                  sx={{ textTransform: 'none' }}
                >
                  {isSignUp 
                    ? 'Already have an account? Sign in' 
                    : "Don't have an account? Sign up"
                  }
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Paper>

        {/* Footer */}
        <Box textAlign="center" mt={3}>
          <Typography variant="body2" color="white" sx={{ opacity: 0.8 }}>
            Secure admin access to TheEcomWay platform
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default SignIn;
