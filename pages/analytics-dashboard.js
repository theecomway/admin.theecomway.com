import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  Event as EventIcon,
  Timer as TimerIcon,
  Computer as DesktopIcon,
  PhoneAndroid as MobileIcon,
  Tablet as TabletIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { firestore } from '../hooks/config';
import ProtectedRoute from '../components/ProtectedRoute';
import {
  getDateRange,
  formatEpochDate,
  calculateDuration,
  isSessionActive,
  getAnalytics,
} from '../utils/userLogger';

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('today');
  
  // Metrics
  const [metrics, setMetrics] = useState({
    dau: 0, // Daily Active Users
    totalSessions: 0,
    activeSessions: 0,
    avgDuration: 0,
    totalEvents: 0,
    deviceBreakdown: {},
    platformBreakdown: {},
  });

  // Real-time data
  const [recentEvents, setRecentEvents] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [activeSessionsList, setActiveSessionsList] = useState([]);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching analytics data...');

      // Calculate date range based on selection
      let startDate, endDate;
      const now = new Date();

      switch (timeRange) {
        case 'today':
          startDate = now;
          endDate = now;
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = yesterday;
          endDate = yesterday;
          break;
        case 'last7days':
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          startDate = sevenDaysAgo;
          endDate = now;
          break;
        case 'last30days':
          const thirtyDaysAgo = new Date(now);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          startDate = thirtyDaysAgo;
          endDate = now;
          break;
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = now;
          break;
        default:
          startDate = now;
          endDate = now;
      }

      const startTimestamp = getDateRange(startDate).start;
      const endTimestamp = getDateRange(endDate).end;

      // Fetch sessions
      const sessionsRef = collection(firestore, 'sessions');
      const sessionsQuery = query(
        sessionsRef,
        where('dateKey', '>=', startTimestamp),
        where('dateKey', '<=', endTimestamp),
        orderBy('dateKey', 'desc'),
        limit(1000)
      );

      const sessionsSnapshot = await getDocs(sessionsQuery);
      console.log(`Found ${sessionsSnapshot.size} sessions`);

      const sessions = [];
      const userSessionCounts = {};
      const deviceCounts = {};
      const platformCounts = {};
      let totalDuration = 0;
      let validDurations = 0;
      let activeSessions = 0;
      let totalEvents = 0;

      // Process sessions
      for (const sessionDoc of sessionsSnapshot.docs) {
        const sessionData = { id: sessionDoc.id, ...sessionDoc.data() };
        sessions.push(sessionData);

        // Count sessions per user
        const uid = sessionData.uid;
        userSessionCounts[uid] = (userSessionCounts[uid] || 0) + 1;

        // Device breakdown
        const device = sessionData.info?.device || 'unknown';
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;

        // Platform breakdown
        const platform = sessionData.info?.platform || 'unknown';
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;

        // Calculate duration
        const duration = calculateDuration(sessionData.createdAt, sessionData.lastActive);
        if (duration > 0) {
          totalDuration += duration;
          validDurations++;
        }

        // Check if active
        if (isSessionActive(sessionData.lastActive)) {
          activeSessions++;
        }

        // Get event count
        try {
          const eventsRef = collection(firestore, `sessions/${sessionDoc.id}/events`);
          const eventsSnapshot = await getDocs(eventsRef);
          totalEvents += eventsSnapshot.size;
          sessionData.eventCount = eventsSnapshot.size;
        } catch (err) {
          console.error(`Error fetching events for session ${sessionDoc.id}:`, err);
          sessionData.eventCount = 0;
        }
      }

      // Calculate DAU (unique users for the period)
      const dau = Object.keys(userSessionCounts).length;

      // Calculate average duration
      const avgDuration = validDurations > 0 ? Math.round(totalDuration / validDurations) : 0;

      // Get top users
      const topUsersArray = Object.entries(userSessionCounts)
        .map(([uid, count]) => ({ uid, sessionCount: count }))
        .sort((a, b) => b.sessionCount - a.sessionCount)
        .slice(0, 10);

      // Get active sessions list
      const activeSessionsArray = sessions
        .filter(s => isSessionActive(s.lastActive))
        .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))
        .slice(0, 20);

      // Get recent events (from most recent sessions)
      const recentEventsArray = [];
      const recentSessions = sessions.slice(0, 10);
      for (const session of recentSessions) {
        try {
          const eventsRef = collection(firestore, `sessions/${session.id}/events`);
          const eventsQuery = query(eventsRef, orderBy('timestamp', 'desc'), limit(5));
          const eventsSnapshot = await getDocs(eventsQuery);
          
          eventsSnapshot.forEach(eventDoc => {
            recentEventsArray.push({
              id: eventDoc.id,
              sessionId: session.id,
              userId: session.uid,
              email: session.info?.email,
              ...eventDoc.data(),
            });
          });
        } catch (err) {
          console.error(`Error fetching recent events:`, err);
        }
      }

      // Sort recent events by timestamp
      recentEventsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // Update state
      setMetrics({
        dau,
        totalSessions: sessions.length,
        activeSessions,
        avgDuration,
        totalEvents,
        deviceBreakdown: deviceCounts,
        platformBreakdown: platformCounts,
      });

      setTopUsers(topUsersArray);
      setActiveSessionsList(activeSessionsArray);
      setRecentEvents(recentEventsArray.slice(0, 50));

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(`Failed to fetch analytics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchAnalytics();
  };

  // Get device icon
  const getDeviceIcon = (device) => {
    switch (device?.toLowerCase()) {
      case 'mobile':
        return <MobileIcon />;
      case 'tablet':
        return <TabletIcon />;
      case 'desktop':
        return <DesktopIcon />;
      default:
        return <DesktopIcon />;
    }
  };

  // Calculate percentage
  const calculatePercentage = (value, total) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Effects
  useEffect(() => {
    fetchAnalytics();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 60000);

    return () => clearInterval(interval);
  }, [timeRange]);

  return (
    <ProtectedRoute>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Analytics Dashboard
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="yesterday">Yesterday</MenuItem>
                <MenuItem value="last7days">Last 7 Days</MenuItem>
                <MenuItem value="last30days">Last 30 Days</MenuItem>
                <MenuItem value="thisMonth">This Month</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Refresh data">
              <IconButton onClick={handleRefresh} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        )}

        {!loading && (
          <>
            {/* Key Metrics */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          Daily Active Users
                        </Typography>
                        <Typography variant="h3" fontWeight="bold">
                          {metrics.dau}
                        </Typography>
                      </Box>
                      <PeopleIcon sx={{ fontSize: 48, opacity: 0.5 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          Total Sessions
                        </Typography>
                        <Typography variant="h3" fontWeight="bold">
                          {metrics.totalSessions}
                        </Typography>
                      </Box>
                      <EventIcon sx={{ fontSize: 48, opacity: 0.5 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          Active Now
                        </Typography>
                        <Typography variant="h3" fontWeight="bold">
                          {metrics.activeSessions}
                        </Typography>
                      </Box>
                      <CircleIcon sx={{ fontSize: 48, opacity: 0.5 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          Avg Duration
                        </Typography>
                        <Typography variant="h3" fontWeight="bold">
                          {metrics.avgDuration}m
                        </Typography>
                      </Box>
                      <TimerIcon sx={{ fontSize: 48, opacity: 0.5 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Additional Metrics */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Total Events
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {metrics.totalEvents}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {metrics.totalSessions > 0 
                        ? `${Math.round(metrics.totalEvents / metrics.totalSessions)} avg per session`
                        : 'No sessions'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Session Engagement
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {metrics.totalSessions > 0 
                        ? `${calculatePercentage(metrics.activeSessions, metrics.totalSessions)}%`
                        : '0%'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active sessions ratio
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Bounce Rate
                    </Typography>
                    <Typography variant="h4" color="error.main">
                      {metrics.totalSessions > 0 
                        ? `${calculatePercentage(
                            metrics.totalSessions - metrics.activeSessions,
                            metrics.totalSessions
                          )}%`
                        : '0%'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Inactive sessions
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Device & Platform Breakdown */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Device Breakdown
                    </Typography>
                    <List>
                      {Object.entries(metrics.deviceBreakdown).map(([device, count]) => (
                        <React.Fragment key={device}>
                          <ListItem>
                            <Box display="flex" alignItems="center" width="100%">
                              {getDeviceIcon(device)}
                              <ListItemText
                                primary={device.charAt(0).toUpperCase() + device.slice(1)}
                                secondary={`${count} sessions (${calculatePercentage(count, metrics.totalSessions)}%)`}
                                sx={{ ml: 2 }}
                              />
                              <Chip
                                label={count}
                                color="primary"
                                size="small"
                              />
                            </Box>
                          </ListItem>
                          <Divider />
                        </React.Fragment>
                      ))}
                      {Object.keys(metrics.deviceBreakdown).length === 0 && (
                        <ListItem>
                          <ListItemText
                            primary="No device data available"
                            secondary="Sessions will appear here once tracked"
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Platform Breakdown
                    </Typography>
                    <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {Object.entries(metrics.platformBreakdown)
                        .sort((a, b) => b[1] - a[1])
                        .map(([platform, count]) => (
                          <React.Fragment key={platform}>
                            <ListItem>
                              <ListItemText
                                primary={platform}
                                secondary={`${count} sessions (${calculatePercentage(count, metrics.totalSessions)}%)`}
                              />
                              <Chip
                                label={count}
                                color="secondary"
                                size="small"
                              />
                            </ListItem>
                            <Divider />
                          </React.Fragment>
                        ))}
                      {Object.keys(metrics.platformBreakdown).length === 0 && (
                        <ListItem>
                          <ListItemText
                            primary="No platform data available"
                            secondary="Sessions will appear here once tracked"
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Top Users & Active Sessions */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Top Active Users
                    </Typography>
                    <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                      {topUsers.map((user, index) => (
                        <React.Fragment key={user.uid}>
                          <ListItem>
                            <ListItemText
                              primary={
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Chip
                                    label={`#${index + 1}`}
                                    size="small"
                                    color={index === 0 ? 'primary' : 'default'}
                                  />
                                  <Typography variant="body2" fontFamily="monospace">
                                    {user.uid}
                                  </Typography>
                                </Box>
                              }
                              secondary={`${user.sessionCount} sessions`}
                            />
                          </ListItem>
                          <Divider />
                        </React.Fragment>
                      ))}
                      {topUsers.length === 0 && (
                        <ListItem>
                          <ListItemText
                            primary="No user data available"
                            secondary="Top users will appear here once sessions are tracked"
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <CircleIcon sx={{ color: 'success.main', fontSize: 12 }} />
                      <Typography variant="h6">
                        Currently Active Sessions
                      </Typography>
                    </Box>
                    <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                      {activeSessionsList.map((session) => (
                        <React.Fragment key={session.id}>
                          <ListItem>
                            <Box display="flex" alignItems="center" mr={2}>
                              {getDeviceIcon(session.info?.device)}
                            </Box>
                            <ListItemText
                              primary={session.info?.email || session.uid}
                              secondary={`Last active: ${formatEpochDate(session.lastActive)}`}
                            />
                            <Chip
                              icon={<CircleIcon sx={{ fontSize: 8 }} />}
                              label="Active"
                              size="small"
                              color="success"
                            />
                          </ListItem>
                          <Divider />
                        </React.Fragment>
                      ))}
                      {activeSessionsList.length === 0 && (
                        <ListItem>
                          <ListItemText
                            primary="No active sessions"
                            secondary="Active sessions will appear here"
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Recent Events Feed */}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Recent Events Feed
                    </Typography>
                    <List sx={{ maxHeight: 500, overflow: 'auto' }}>
                      {recentEvents.map((event, index) => (
                        <React.Fragment key={`${event.sessionId}-${event.id}-${index}`}>
                          <ListItem>
                            <ListItemText
                              primary={
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Chip label={event.type} size="small" color="primary" />
                                  <Typography variant="body2">
                                    {event.email || event.userId}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatEpochDate(event.timestamp)}
                                  </Typography>
                                  {event.data && (
                                    <Typography
                                      variant="caption"
                                      component="pre"
                                      sx={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.7rem',
                                        mt: 0.5,
                                        p: 0.5,
                                        backgroundColor: 'grey.100',
                                        borderRadius: 1,
                                        overflow: 'auto',
                                        maxHeight: 100,
                                      }}
                                    >
                                      {JSON.stringify(event.data, null, 2)}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                          <Divider />
                        </React.Fragment>
                      ))}
                      {recentEvents.length === 0 && (
                        <ListItem>
                          <ListItemText
                            primary="No recent events"
                            secondary="Events will appear here as users interact with your app"
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </ProtectedRoute>
  );
};

export default AnalyticsDashboard;
