import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Tooltip,
  Chip,
  Divider,
} from '@mui/material';
import {
  AccountCircle,
  Login,
  Logout,
  Person,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const Header = () => {
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      handleClose();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      width: '100%',
      px: 2,
    }}>
      <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
        Admin Dashboard
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {user ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={<Person />}
                label={user.email}
                variant="outlined"
                size="small"
                sx={{ 
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText',
                  '& .MuiChip-icon': {
                    color: 'inherit',
                  },
                }}
              />
            </Box>
            
            <Tooltip title="Account settings">
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls={open ? 'menu-appbar' : undefined}
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <Avatar 
                  src={user.photoURL} 
                  alt={user.displayName || user.email}
                  sx={{ width: 32, height: 32 }}
                >
                  {user.displayName ? user.displayName[0].toUpperCase() : user.email[0].toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={open}
              onClose={handleClose}
            >
              <MenuItem disabled>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="body2" color="text.primary">
                    {user.displayName || 'User'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleSignOut}>
                <Logout sx={{ mr: 1 }} />
                Sign Out
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Button
            variant="contained"
            startIcon={<Login />}
            onClick={handleSignIn}
            sx={{
              backgroundColor: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
            }}
          >
            Sign In
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default Header;
