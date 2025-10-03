import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Button,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  CloudUpload as MigrateIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { collection, getDocs, doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { firestore } from '../hooks/config';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState({});

  // Fetch all user UIDs from the users collection
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const usersCollection = collection(firestore, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      const usersList = [];
      usersSnapshot.forEach((doc) => {
        usersList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      debugger
      setUsers(usersList);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed data for a specific user
  const fetchUserData = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      
      const userDoc = doc(firestore, 'users', userId);
      const userSnapshot = await getDoc(userDoc);
      
      if (userSnapshot.exists()) {
        setUserData({
          id: userSnapshot.id,
          ...userSnapshot.data()
        });
      } else {
        setError('User data not found');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to fetch user data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle user selection
  const handleUserClick = (user) => {
    setSelectedUser(user);
    setExpandedUser(expandedUser === user.id ? null : user.id);
    fetchUserData(user.id);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchUsers();
    setSelectedUser(null);
    setUserData(null);
    setExpandedUser(null);
    setMigrationStatus({});
  };

  // Migrate user profile data from profile/details to root level
  const migrateUserData = async (userId) => {
    try {
      setMigrating(true);
      setError(null);
      
      const userDoc = doc(firestore, 'users', userId);
      const userSnapshot = await getDoc(userDoc);
      
      if (!userSnapshot.exists()) {
        throw new Error('User document not found');
      }
      
      const userData = userSnapshot.data();
      const profileDetails = userData?.profile?.details;
      
      if (!profileDetails) {
        setMigrationStatus(prev => ({
          ...prev,
          [userId]: { status: 'no-data', message: 'No profile details found to migrate' }
        }));
        return;
      }
      
      // Check if data is already migrated
      const hasMigratedData = Object.keys(profileDetails).some(key => 
        userData.hasOwnProperty(key) && userData[key] === profileDetails[key]
      );
      
      if (hasMigratedData) {
        setMigrationStatus(prev => ({
          ...prev,
          [userId]: { status: 'already-migrated', message: 'Data appears to already be migrated' }
        }));
        return;
      }
      
      // Update the user document with profile details at root level
      await updateDoc(userDoc, {
        ...profileDetails,
        migratedAt: new Date().toISOString(),
        migratedFrom: 'profile/details'
      });
      
      // Remove the profile/details subcollection (optional - you might want to keep it)
      // await updateDoc(userDoc, {
      //   profile: deleteField()
      // });
      
      setMigrationStatus(prev => ({
        ...prev,
        [userId]: { status: 'success', message: 'Data migrated successfully' }
      }));
      
      // Refresh user data to show updated structure
      await fetchUserData(userId);
      
    } catch (err) {
      console.error('Error migrating user data:', err);
      setMigrationStatus(prev => ({
        ...prev,
        [userId]: { status: 'error', message: err.message }
      }));
    } finally {
      setMigrating(false);
    }
  };

  // Migrate all users at once
  const migrateAllUsers = async () => {
    setMigrating(true);
    setError(null);
    
    const usersWithProfileDetails = users.filter(user => 
      user.profile?.details && Object.keys(user.profile.details).length > 0
    );
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of usersWithProfileDetails) {
      try {
        await migrateUserData(user.id);
        successCount++;
      } catch (err) {
        console.error(`Error migrating user ${user.id}:`, err);
        errorCount++;
      }
    }
    
    setMigrationStatus(prev => ({
      ...prev,
      'all': { 
        status: 'completed', 
        message: `Migration completed: ${successCount} successful, ${errorCount} errors` 
      }
    }));
    
    setMigrating(false);
    // Refresh the users list
    await fetchUsers();
  };

  // Format data for display
  const formatData = (data) => {
    if (typeof data === 'object' && data !== null) {
      return JSON.stringify(data, null, 2);
    }
    return String(data);
  };

  // Get data type for styling
  const getDataType = (value) => {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'object') return 'object';
    return 'string';
  };

  // Check if user has profile details to migrate
  const hasProfileDetails = (user) => {
    return user?.profile?.details && Object.keys(user.profile.details).length > 0;
  };

  // Get migration status for a user
  const getMigrationStatus = (userId) => {
    return migrationStatus[userId] || { status: 'pending', message: '' };
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading && users.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Users Management
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="contained"
            startIcon={<MigrateIcon />}
            onClick={migrateAllUsers}
            disabled={migrating || users.filter(hasProfileDetails).length === 0}
            color="secondary"
          >
            {migrating ? 'Migrating All...' : 'Migrate All'}
          </Button>
          <Tooltip title="Refresh users list">
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Migration Summary */}
      {users.length > 0 && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          icon={<InfoIcon />}
        >
          <Typography variant="body2">
            <strong>Migration Status:</strong> {users.filter(hasProfileDetails).length} users need migration, {users.filter(user => !hasProfileDetails(user)).length} already migrated
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Users List */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                All Users ({users.length})
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {users.length === 0 ? (
                <Typography color="text.secondary" align="center" py={4}>
                  No users found
                </Typography>
              ) : (
                <List>
                  {users.map((user, index) => {
                    const userHasProfileDetails = hasProfileDetails(user);
                    const migrationStatus = getMigrationStatus(user.id);
                    
                    return (
                      <React.Fragment key={user.id}>
                        <ListItem disablePadding>
                          <Box sx={{ width: '100%' }}>
                            <ListItemButton
                              onClick={() => handleUserClick(user)}
                              selected={selectedUser?.id === user.id}
                              sx={{
                                borderRadius: 1,
                                mb: 1,
                                '&.Mui-selected': {
                                  backgroundColor: 'primary.light',
                                  '&:hover': {
                                    backgroundColor: 'primary.main',
                                  },
                                },
                              }}
                            >
                              <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
                              <ListItemText
                                primary={
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="subtitle1" fontWeight="medium">
                                      {user.id}
                                    </Typography>
                                    {user.email && (
                                      <Chip
                                        label={user.email}
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                      />
                                    )}
                                    {!userHasProfileDetails && (
                                      <Chip
                                        label="Migrated"
                                        size="small"
                                        color="success"
                                        icon={<CheckCircleIcon />}
                                      />
                                    )}
                                  </Box>
                                }
                                secondary={
                                  <Typography variant="body2" color="text.secondary">
                                    Click to view details
                                  </Typography>
                                }
                              />
                            </ListItemButton>
                            
                            {/* Migration Button and Status */}
                            <Box sx={{ px: 2, pb: 1 }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<MigrateIcon />}
                                  disabled={!userHasProfileDetails || migrating}
                                  onClick={() => migrateUserData(user.id)}
                                  color={
                                    migrationStatus.status === 'success' ? 'success' :
                                    migrationStatus.status === 'error' ? 'error' :
                                    migrationStatus.status === 'already-migrated' ? 'warning' : 'primary'
                                  }
                                >
                                  {migrating && migrationStatus.status === 'pending' ? 'Migrating...' : 'Migrate'}
                                </Button>
                                
                                {migrationStatus.message && (
                                  <Typography 
                                    variant="caption" 
                                    color={
                                      migrationStatus.status === 'success' ? 'success.main' :
                                      migrationStatus.status === 'error' ? 'error.main' :
                                      migrationStatus.status === 'already-migrated' ? 'warning.main' : 'text.secondary'
                                    }
                                  >
                                    {migrationStatus.message}
                                  </Typography>
                                )}
                              </Stack>
                            </Box>
                          </Box>
                        </ListItem>
                        {index < users.length - 1 && <Divider />}
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* User Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {!selectedUser ? (
                <Typography color="text.secondary" align="center" py={4}>
                  Select a user to view details
                </Typography>
              ) : (
                <Box>
                  {loading && (
                    <Box display="flex" justifyContent="center" py={2}>
                      <CircularProgress size={24} />
                    </Box>
                  )}
                  
                  {userData && (
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        User ID: {userData.id}
                      </Typography>
                      
                      <List dense>
                        {Object.entries(userData)
                          .filter(([key]) => key !== 'id')
                          .map(([key, value]) => (
                            <Accordion key={key} sx={{ mb: 1 }}>
                              <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                sx={{
                                  backgroundColor: 'grey.50',
                                  '&:hover': {
                                    backgroundColor: 'grey.100',
                                  },
                                }}
                              >
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Typography variant="subtitle2" fontWeight="medium">
                                    {key}
                                  </Typography>
                                  <Chip
                                    label={getDataType(value)}
                                    size="small"
                                    color={
                                      getDataType(value) === 'object' ? 'secondary' :
                                      getDataType(value) === 'boolean' ? 'warning' :
                                      getDataType(value) === 'number' ? 'info' : 'default'
                                    }
                                  />
                                </Box>
                              </AccordionSummary>
                              <AccordionDetails>
                                <Paper
                                  sx={{
                                    p: 2,
                                    backgroundColor: 'grey.50',
                                    maxHeight: 200,
                                    overflow: 'auto',
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    component="pre"
                                    sx={{
                                      fontFamily: 'monospace',
                                      fontSize: '0.875rem',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    {formatData(value)}
                                  </Typography>
                                </Paper>
                              </AccordionDetails>
                            </Accordion>
                          ))}
                      </List>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UsersList;
