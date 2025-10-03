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
  Folder as FolderIcon,
  ShoppingCart as OrdersIcon,
  ShoppingCart as ShoppingCartIcon,
  Payment as PaymentIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  History as LogsIcon,
  Notifications as NotificationsIcon,
  Subscription as SubscriptionIcon,
  FolderOpen as FilesIcon,
  Chat as ChatIcon,
  Assessment as ReportsIcon,
  Receipt as InvoiceIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import { ref, get, child, onValue, off } from 'firebase/database';
import { doc, getDoc, updateDoc, setDoc, deleteField, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { database, firestore } from '../hooks/config';
import ProtectedRoute from '../components/ProtectedRoute';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userNodes, setUserNodes] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeData, setNodeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState({});
  const [profileDetailsStatus, setProfileDetailsStatus] = useState({});
  const [transferring, setTransferring] = useState(false);
  const [profileCheckPerformed, setProfileCheckPerformed] = useState(false);

  // Fetch all users from the users-plan node in Realtime Database
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('=== FETCHING USERS FROM REALTIME DATABASE ===');
      console.log('Fetching all users from users-plan node...');
      
      const usersPlanRef = ref(database, 'users-plan');
      console.log('Database reference created:', usersPlanRef.toString());
      
      const snapshot = await get(usersPlanRef);
      console.log(`Snapshot exists: ${snapshot.exists()}`);
      console.log(`Snapshot value:`, snapshot.val());
      
      if (!snapshot.exists()) {
        console.log('No users found in users-plan node');
        setUsers([]);
        return;
      }
      
      const usersData = snapshot.val();
      const usersList = [];
      let processedCount = 0;
      
      Object.keys(usersData).forEach((userId) => {
        processedCount++;
        console.log(`Processing user ${processedCount}:`);
        console.log(`  - User ID: ${userId}`);
        console.log(`  - User data:`, usersData[userId]);
        
        const userData = {
          id: userId,
          ...usersData[userId]
        };
        
        usersList.push(userData);
        console.log(`  - User data fields:`, Object.keys(usersData[userId]));
        console.log(`  - Full user data:`, userData);
      });
      
      console.log(`=== FETCH SUMMARY ===`);
      console.log(`Total users found: ${Object.keys(usersData).length}`);
      console.log(`Processed users: ${processedCount}`);
      console.log(`Users list length: ${usersList.length}`);
      console.log(`User IDs loaded:`, usersList.map(u => u.id));
      
      setUsers(usersList);
    } catch (err) {
      console.error('Error fetching users from Realtime Database:', err);
      console.error('Error details:', {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      setError(`Failed to fetch users: ${err.message}. Please check console for details.`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed user plan data for a specific user
  const fetchUserData = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching user plan details for: ${userId}`);
      
      const userRef = ref(database, `users-plan/${userId}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userPlanData = snapshot.val();
        console.log(`User plan data for ${userId}:`, userPlanData);
        
        setUserData({
          id: userId,
          ...userPlanData
        });
      } else {
        console.log(`No plan data found for user: ${userId}`);
        setError('User plan data not found');
      }
    } catch (err) {
      console.error('Error fetching user plan data:', err);
      setError('Failed to fetch user plan data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // This function is no longer needed for Realtime Database
  // User plan details are fetched directly in fetchUserData

  // This function is no longer needed for Realtime Database
  // We're focusing on user plan details only

  // Handle user selection
  const handleUserClick = (user) => {
    setSelectedUser(user);
    setExpandedUser(expandedUser === user.id ? null : user.id);
    setSelectedNode(null);
    setNodeData(null);
    fetchUserData(user.id);
    // Check profile details for this user
    checkProfileDetails(user.id);
  };

  // This function is no longer needed for Realtime Database

  // Handle refresh
  const handleRefresh = () => {
    console.log('=== MANUAL REFRESH TRIGGERED ===');
    fetchUsers();
    setSelectedUser(null);
    setUserData(null);
    setUserNodes({});
    setSelectedNode(null);
    setNodeData(null);
    setExpandedUser(null);
    setMigrationStatus({});
    setProfileDetailsStatus({});
    setProfileCheckPerformed(false);
  };

  // Force refresh with detailed logging
  const forceRefresh = async () => {
    console.log('=== FORCE REFRESH STARTED ===');
    setLoading(true);
    setError(null);
    
    try {
      // Clear all state first
      setUsers([]);
      setSelectedUser(null);
      setUserData(null);
      setUserNodes({});
      setSelectedNode(null);
      setNodeData(null);
      setExpandedUser(null);
      setMigrationStatus({});
      setProfileDetailsStatus({});
      setProfileCheckPerformed(false);
      
      // Wait a moment for state to clear
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch users again
      await fetchUsers();
      
      console.log('=== FORCE REFRESH COMPLETED ===');
    } catch (err) {
      console.error('Force refresh error:', err);
      setError('Force refresh failed. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Check if user has profile details in Firestore
  const checkProfileDetails = async (userId) => {
    try {
      console.log(`Checking profile details for user: ${userId}`);
      
      const profileDetailsRef = doc(firestore, 'users', userId, 'profile', 'details');
      const profileSnapshot = await getDoc(profileDetailsRef);
      
      if (profileSnapshot.exists()) {
        const profileData = profileSnapshot.data();
        console.log(`Profile details found for ${userId}:`, profileData);
        
        setProfileDetailsStatus(prev => ({
          ...prev,
          [userId]: {
            exists: true,
            data: profileData,
            fields: Object.keys(profileData)
          }
        }));
        
        return true;
      } else {
        console.log(`No profile details found for user: ${userId}`);
        setProfileDetailsStatus(prev => ({
          ...prev,
          [userId]: {
            exists: false,
            data: null,
            fields: []
          }
        }));
        
        return false;
      }
    } catch (err) {
      console.error(`Error checking profile details for ${userId}:`, err);
      setProfileDetailsStatus(prev => ({
        ...prev,
        [userId]: {
          exists: false,
          data: null,
          fields: [],
          error: err.message
        }
      }));
      
      return false;
    }
  };

  // Delete the entire profile subcollection
  const deleteProfileSubcollection = async (userId) => {
    try {
      console.log(`Deleting profile subcollection for user: ${userId}`);
      
      // Get all documents in the profile subcollection
      const profileCollectionRef = collection(firestore, 'users', userId, 'profile');
      const profileSnapshot = await getDocs(profileCollectionRef);
      
      // Delete each document in the subcollection
      const deletePromises = [];
      profileSnapshot.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(docSnapshot.ref));
      });
      
      // Wait for all deletions to complete
      await Promise.all(deletePromises);
      
      console.log(`Successfully deleted profile subcollection for user: ${userId}`);
      return true;
    } catch (err) {
      console.error(`Error deleting profile subcollection for ${userId}:`, err);
      throw err;
    }
  };

  // Transfer profile details from subcollection to root level
  const transferProfileDetails = async (userId) => {
    try {
      setTransferring(true);
      setError(null);
      
      console.log(`Starting profile details transfer for user: ${userId}`);
      
      // Get the profile details
      const profileDetailsRef = doc(firestore, 'users', userId, 'profile', 'details');
      const profileSnapshot = await getDoc(profileDetailsRef);
      
      if (!profileSnapshot.exists()) {
        throw new Error('Profile details not found');
      }
      
      const profileData = profileSnapshot.data();
      console.log(`Profile data to transfer:`, profileData);
      
      // Get the main user document
      const userRef = doc(firestore, 'users', userId);
      const userSnapshot = await getDoc(userRef);
      
      if (!userSnapshot.exists()) {
        console.log(`User document ${userId} not found in Firestore, creating it with profile details...`);
        // Create the user document with profile details
        await setDoc(userRef, {
          ...profileData,
          createdAt: new Date().toISOString()
        });
      } else {
        // Update the existing user document with profile details at root level
        await updateDoc(userRef, {
          ...profileData
        });
      }
      
      // Delete the entire profile subcollection
      await deleteProfileSubcollection(userId);
      
      console.log(`Successfully transferred profile details for user: ${userId}`);
      
      setMigrationStatus(prev => ({
        ...prev,
        [userId]: {
          status: 'success',
          message: 'Profile details transferred and subcollection deleted successfully'
        }
      }));
      
      // Update profile details status
      setProfileDetailsStatus(prev => ({
        ...prev,
        [userId]: {
          exists: false,
          data: null,
          fields: [],
          transferred: true
        }
      }));
      
      // Refresh user data to show updated structure
      await fetchUserData(userId);
      
    } catch (err) {
      console.error(`Error transferring profile details for ${userId}:`, err);
      setMigrationStatus(prev => ({
        ...prev,
        [userId]: {
          status: 'error',
          message: err.message
        }
      }));
    } finally {
      setTransferring(false);
    }
  };

  // Check profile details for all users
  const checkAllProfileDetails = async () => {
    setLoading(true);
    setError(null);
    setProfileCheckPerformed(true);
    
    console.log('Checking profile details for all users...');
    
    for (const user of users) {
      await checkProfileDetails(user.id);
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setLoading(false);
  };

  // Get users that need data transfer
  const getUsersNeedingTransfer = () => {
    return users.filter(user => {
      const profileStatus = profileDetailsStatus[user.id];
      return profileStatus?.exists && !profileStatus?.transferred;
    });
  };

  // Get users that have been transferred
  const getTransferredUsers = () => {
    return users.filter(user => {
      const profileStatus = profileDetailsStatus[user.id];
      return profileStatus?.transferred;
    });
  };

  // Get users with no profile details
  const getUsersWithNoProfile = () => {
    return users.filter(user => {
      const profileStatus = profileDetailsStatus[user.id];
      return !profileStatus?.exists && !profileStatus?.transferred;
    });
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

  // These functions are not needed for Realtime Database

  // This function is not needed for Realtime Database

  // Debug functions for Realtime Database
  const logUsersPlanData = () => {
    console.log('=== USERS-PLAN DATA DEBUG ===');
    console.log(`Total users found: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`User ${index + 1}: ${user.id}`);
      console.log('  Plan fields:', Object.keys(user).filter(key => key !== 'id'));
      console.log('  Full plan data:', user);
    });
    console.log('=== END USERS-PLAN DEBUG ===');
  };

  const checkRealtimeDatabaseConfig = () => {
    console.log('=== REALTIME DATABASE CONFIGURATION CHECK ===');
    console.log('Database instance:', database);
    console.log('Database URL:', database.app.options.databaseURL);
    console.log('Database app name:', database.app.name);
    console.log('Database project ID:', database.app.options.projectId);
    console.log('=== END REALTIME DATABASE CONFIG CHECK ===');
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
    <ProtectedRoute>
      <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Users Management
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Check profile details for all users in Firestore">
            <Button
              variant="contained"
              onClick={checkAllProfileDetails}
              disabled={users.length === 0 || loading}
              color="secondary"
              startIcon={<PersonIcon />}
            >
              Check Profile Details
            </Button>
          </Tooltip>
          <Tooltip title="Debug: Log users-plan data to console">
            <Button
              variant="outlined"
              onClick={logUsersPlanData}
              disabled={users.length === 0}
              color="info"
            >
              Debug Users
            </Button>
          </Tooltip>
          <Tooltip title="Check Realtime Database configuration">
            <Button
              variant="outlined"
              onClick={checkRealtimeDatabaseConfig}
              color="info"
            >
              Check DB Config
            </Button>
          </Tooltip>
          <Tooltip title="Force refresh with detailed logging">
            <Button
              variant="outlined"
              onClick={forceRefresh}
              disabled={loading}
              color="primary"
            >
              Force Refresh
            </Button>
          </Tooltip>
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

      {/* Users Summary */}
      {users.length > 0 && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          icon={<InfoIcon />}
        >
          <Typography variant="body2">
            <strong>Users Plan Summary:</strong> Found {users.length} users with plan data from Realtime Database.
            {profileCheckPerformed && (
              <span> 
                {getUsersNeedingTransfer().length} users need data transfer, {getTransferredUsers().length} users already transferred, {getUsersWithNoProfile().length} users have no profile details.
              </span>
            )}
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Users List */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {profileCheckPerformed ? 'Users by Transfer Status' : 'Users Plan Data'} ({users.length} users found)
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {users.length === 0 ? (
                <Typography color="text.secondary" align="center" py={4}>
                  No users found in users-plan node
                </Typography>
              ) : !profileCheckPerformed ? (
                <Box textAlign="center" py={4}>
                  <Typography color="text.secondary" variant="body1" gutterBottom>
                    Click "Check Profile Details" to see which users need data transfer
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={checkAllProfileDetails}
                    disabled={loading}
                    startIcon={<PersonIcon />}
                    sx={{ mt: 2 }}
                  >
                    Check Profile Details
                  </Button>
                </Box>
              ) : (
                <Box>
                  {/* Users Needing Transfer */}
                  {getUsersNeedingTransfer().length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" color="warning.main" gutterBottom>
                        ⚠️ Users Needing Data Transfer ({getUsersNeedingTransfer().length})
                      </Typography>
                      <List>
                        {getUsersNeedingTransfer().map((user, index) => {
                          const profileStatus = profileDetailsStatus[user.id];
                          const userMigrationStatus = migrationStatus[user.id];
                          
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
                                    <PersonIcon sx={{ mr: 2, color: 'warning.main' }} />
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
                                          {user.planName && (
                                            <Chip
                                              label={user.planName}
                                              size="small"
                                              color="secondary"
                                              icon={<SubscriptionIcon />}
                                            />
                                          )}
                                          <Chip
                                            label={`${profileStatus.fields.length} profile fields`}
                                            size="small"
                                            color="warning"
                                            icon={<PersonIcon />}
                                          />
                                        </Box>
                                      }
                                      secondary={
                                        <Typography variant="body2" color="text.secondary">
                                          Click to view plan details
                                        </Typography>
                                      }
                                    />
                                  </ListItemButton>
                                  
                                  {/* Profile Details Transfer Button */}
                                  <Box sx={{ px: 2, pb: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<MigrateIcon />}
                                        disabled={transferring}
                                        onClick={() => transferProfileDetails(user.id)}
                                        color="warning"
                                      >
                                        {transferring ? 'Transferring...' : 'Transfer Profile Data'}
                                      </Button>
                                      
                                      {userMigrationStatus?.message && (
                                        <Typography 
                                          variant="caption" 
                                          color={
                                            userMigrationStatus.status === 'success' ? 'success.main' :
                                            userMigrationStatus.status === 'error' ? 'error.main' : 'text.secondary'
                                          }
                                        >
                                          {userMigrationStatus.message}
                                        </Typography>
                                      )}
                                    </Stack>
                                  </Box>
                                </Box>
                              </ListItem>
                              {index < getUsersNeedingTransfer().length - 1 && <Divider />}
                            </React.Fragment>
                          );
                        })}
                      </List>
                    </Box>
                  )}

                  {/* Transferred Users */}
                  {getTransferredUsers().length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" color="success.main" gutterBottom>
                        ✅ Transferred Users ({getTransferredUsers().length})
                      </Typography>
                      <List>
                        {getTransferredUsers().map((user, index) => (
                          <React.Fragment key={user.id}>
                            <ListItem disablePadding>
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
                                <PersonIcon sx={{ mr: 2, color: 'success.main' }} />
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
                                      {user.planName && (
                                        <Chip
                                          label={user.planName}
                                          size="small"
                                          color="secondary"
                                          icon={<SubscriptionIcon />}
                                        />
                                      )}
                                      <Chip
                                        label="Transferred"
                                        size="small"
                                        color="success"
                                        icon={<CheckCircleIcon />}
                                      />
                                    </Box>
                                  }
                                  secondary={
                                    <Typography variant="body2" color="text.secondary">
                                      Click to view plan details
                                    </Typography>
                                  }
                                />
                              </ListItemButton>
                            </ListItem>
                            {index < getTransferredUsers().length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    </Box>
                  )}

                  {/* Users with No Profile */}
                  {getUsersWithNoProfile().length > 0 && (
                    <Box>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        ℹ️ Users with No Profile Details ({getUsersWithNoProfile().length})
                      </Typography>
                      <List>
                        {getUsersWithNoProfile().map((user, index) => (
                          <React.Fragment key={user.id}>
                            <ListItem disablePadding>
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
                                <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
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
                                      {user.planName && (
                                        <Chip
                                          label={user.planName}
                                          size="small"
                                          color="secondary"
                                          icon={<SubscriptionIcon />}
                                        />
                                      )}
                                      <Chip
                                        label="No Profile"
                                        size="small"
                                        color="default"
                                        variant="outlined"
                                      />
                                    </Box>
                                  }
                                  secondary={
                                    <Typography variant="body2" color="text.secondary">
                                      Click to view plan details
                                    </Typography>
                                  }
                                />
                              </ListItemButton>
                            </ListItem>
                            {index < getUsersWithNoProfile().length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* User Details and Nodes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Details & Nodes
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {!selectedUser ? (
                <Typography color="text.secondary" align="center" py={4}>
                  Select a user to view details and nodes
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
                      
                      {/* Profile Details Status */}
                      {profileDetailsStatus[selectedUser.id] && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="h6" sx={{ mb: 1 }}>
                            Profile Details Status
                          </Typography>
                          {profileDetailsStatus[selectedUser.id].exists ? (
                            <Alert severity="warning" sx={{ mb: 1 }}>
                              <Typography variant="body2">
                                <strong>Profile details found in Firestore:</strong> {profileDetailsStatus[selectedUser.id].fields.length} fields available for transfer.
                                <br />
                                <strong>Fields:</strong> {profileDetailsStatus[selectedUser.id].fields.join(', ')}
                              </Typography>
                            </Alert>
                          ) : profileDetailsStatus[selectedUser.id].transferred ? (
                            <Alert severity="success" sx={{ mb: 1 }}>
                              <Typography variant="body2">
                                <strong>Profile details have been transferred</strong> to the root level of the user document.
                              </Typography>
                            </Alert>
                          ) : (
                            <Alert severity="info" sx={{ mb: 1 }}>
                              <Typography variant="body2">
                                No profile details found in Firestore for this user.
                              </Typography>
                            </Alert>
                          )}
                        </Box>
                      )}

                      {/* User Data */}
                      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                        User Plan Data
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

                      {/* User Nodes */}
                      {userNodes[selectedUser.id] && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="h6" sx={{ mb: 1 }}>
                            User Nodes/Collections ({Object.keys(userNodes[selectedUser.id]).length} found)
                          </Typography>
                          {Object.keys(userNodes[selectedUser.id]).length === 0 ? (
                            <Typography color="text.secondary" variant="body2">
                              No nodes found for this user. Check console for discovery logs.
                            </Typography>
                          ) : (
                            <List dense>
                              {Object.entries(userNodes[selectedUser.id]).map(([nodeName, nodeItems]) => (
                                <Accordion key={nodeName} sx={{ mb: 1 }}>
                                  <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{
                                      backgroundColor: 'primary.light',
                                      '&:hover': {
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                      },
                                    }}
                                  >
                                    <Box display="flex" alignItems="center" gap={1}>
                                      {getNodeIcon(nodeName)}
                                      <Typography variant="subtitle2" fontWeight="medium">
                                        {nodeName}
                                      </Typography>
                                      <Chip
                                        label={`${nodeItems.length} items`}
                                        size="small"
                                        color="secondary"
                                      />
                                    </Box>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    <List dense>
                                      {nodeItems.map((item, index) => (
                                        <ListItem key={item.id} disablePadding>
                                          <ListItemButton
                                            onClick={() => handleNodeClick(selectedUser.id, nodeName, item.id)}
                                            selected={selectedNode?.userId === selectedUser.id && 
                                                     selectedNode?.nodeName === nodeName && 
                                                     selectedNode?.nodeId === item.id}
                                            sx={{
                                              borderRadius: 1,
                                              mb: 0.5,
                                              '&.Mui-selected': {
                                                backgroundColor: 'secondary.light',
                                                '&:hover': {
                                                  backgroundColor: 'secondary.main',
                                                },
                                              },
                                            }}
                                          >
                                            <ListItemText
                                              primary={
                                                <Box display="flex" alignItems="center" gap={1}>
                                                  <Typography variant="body2" fontWeight="medium">
                                                    {item.id}
                                                  </Typography>
                                                  {Object.keys(item).filter(key => key !== 'id').length > 0 && (
                                                    <Chip
                                                      label={`${Object.keys(item).filter(key => key !== 'id').length} fields`}
                                                      size="small"
                                                      variant="outlined"
                                                    />
                                                  )}
                                                </Box>
                                              }
                                              secondary={
                                                <Typography variant="caption" color="text.secondary">
                                                  Click to view details
                                                </Typography>
                                              }
                                            />
                                          </ListItemButton>
                                        </ListItem>
                                      ))}
                                    </List>
                                  </AccordionDetails>
                                </Accordion>
                              ))}
                            </List>
                          )}
                        </Box>
                      )}

                      {/* Node Data */}
                      {selectedNode && nodeData && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="h6" sx={{ mb: 1 }}>
                            Node Data: {selectedNode.nodeName}/{selectedNode.nodeId}
                          </Typography>
                          <Paper
                            sx={{
                              p: 2,
                              backgroundColor: 'secondary.light',
                              maxHeight: 300,
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
                              {formatData(nodeData)}
                            </Typography>
                          </Paper>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </Box>
    </ProtectedRoute>
  );
};

export default UsersList;
