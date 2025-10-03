import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from "@mui/material";

import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import GoogleIcon from "@mui/icons-material/Google";
import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { user, signInWithGoogle, signOutUser, loading } = useAuth();

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Paper
        elevation={4}
        sx={{
          padding: 4,
          width: "100%",
          textAlign: "center",
          borderRadius: 4,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 1,
          }}
        >
          <AdminPanelSettingsIcon fontSize="large" color="primary" />
          <Typography variant="h5" fontWeight="bold" ml={1}>
            The Ecom Way – Admin Panel
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 4, fontStyle: "italic" }}
        >
          You are one of the <strong>privileged few</strong> entrusted with
          access to this core administrative control panel.
          <br />
          <em>With great power comes great responsibility.</em>
          Every action here has direct consequences on The Ecom Way’s engine.
          Handle with precision. Lead with vision.
        </Typography>

        {loading ? (
          <CircularProgress />
        ) : user ? (
          <>
            <Avatar
              alt={user.displayName}
              src={user.photoURL}
              sx={{ width: 80, height: 80, margin: "0 auto", mb: 2 }}
            />
            <Typography variant="h6" gutterBottom>
              Welcome, {user.displayName}
            </Typography>
            <Button
              variant="contained"
              color="error"
              onClick={signOutUser}
              sx={{ mt: 2 }}
            >
              Sign Out
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            startIcon={<GoogleIcon />}
            onClick={signInWithGoogle}
            sx={{ mt: 3 }}
          >
            Sign In with Google
          </Button>
        )}
      </Paper>
    </Container>
  );
}
