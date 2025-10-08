import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
  Badge,
  Divider,
  List,
  ListItem,
  ListItemText,
  TablePagination,
  TableSortLabel,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  GetApp as ExportIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Computer as DesktopIcon,
  PhoneAndroid as MobileIcon,
  Tablet as TabletIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  startAfter,
  Timestamp 
} from 'firebase/firestore';
import { firestore } from '../hooks/config';
import ProtectedRoute from '../components/ProtectedRoute';

// Helper function to get date range for queries
const getDateRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  
  return {
    start: start.getTime(),
    end: end.getTime()
  };
};

// Format epoch timestamp to readable date
const formatEpochDate = (epoch) => {
  if (!epoch) return 'N/A';
  return new Date(epoch).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Calculate duration in minutes
const calculateDuration = (start, end) => {
  if (!start || !end) return 0;
  return Math.round((end - start) / (1000 * 60));
};

// Check if session is active (last active within 15 minutes)
const isSessionActive = (lastActive) => {
  if (!lastActive) return false;
  const fifteenMinAgo = Date.now() - (15 * 60 * 1000);
  return lastActive >= fifteenMinAgo;
};

const SessionsPage = () => {
  // State management
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionEvents, setSessionEvents] = useState([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [orderByField, setOrderByField] = useState('createdAt');
  const [orderDirection, setOrderDirection] = useState('desc');

  // Filter states
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchUserId, setSearchUserId] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [activeOnly, setActiveOnly] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    uniqueUsers: 0,
    avgDuration: 0,
  });

  // Fetch sessions from Firestore
  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching sessions from Firestore...');

      // Build query based on date range
      let queryConstraints = [];
      let startTimestamp, endTimestamp;

      if (dateRange === 'today') {
        const today = getDateRange(new Date());
        startTimestamp = today.start;
        endTimestamp = today.end;
      } else if (dateRange === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const range = getDateRange(yesterday);
        startTimestamp = range.start;
        endTimestamp = range.end;
      } else if (dateRange === 'last7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        startTimestamp = getDateRange(sevenDaysAgo).start;
        endTimestamp = getDateRange(new Date()).end;
      } else if (dateRange === 'last30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        startTimestamp = getDateRange(thirtyDaysAgo).start;
        endTimestamp = getDateRange(new Date()).end;
      } else if (dateRange === 'custom' && customStartDate && customEndDate) {
        startTimestamp = getDateRange(new Date(customStartDate)).start;
        endTimestamp = getDateRange(new Date(customEndDate)).end;
      } else {
        // Default to today
        const today = getDateRange(new Date());
        startTimestamp = today.start;
        endTimestamp = today.end;
      }

      const sessionsRef = collection(firestore, 'sessions');
      const q = query(
        sessionsRef,
        where('dateKey', '>=', startTimestamp),
        where('dateKey', '<=', endTimestamp),
        orderBy('dateKey', 'desc'),
        limit(500) // Limit to prevent too many reads
      );

      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.size} sessions`);

      const sessionsData = [];
      
      // Get events count for each session (this is expensive, consider caching)
      for (const sessionDoc of snapshot.docs) {
        const sessionData = {
          id: sessionDoc.id,
          ...sessionDoc.data(),
        };

        // Optionally fetch event count (comment out if too slow)
        try {
          const eventsRef = collection(firestore, `sessions/${sessionDoc.id}/events`);
          const eventsSnapshot = await getDocs(eventsRef);
          sessionData.eventCount = eventsSnapshot.size;
        } catch (err) {
          console.error(`Error fetching events for session ${sessionDoc.id}:`, err);
          sessionData.eventCount = 0;
        }

        sessionsData.push(sessionData);
      }

      setSessions(sessionsData);
      applyFilters(sessionsData);
      calculateStats(sessionsData);
      
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(`Failed to fetch sessions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to sessions
  const applyFilters = (sessionsData) => {
    let filtered = [...sessionsData];

    // Search by email
    if (searchEmail) {
      filtered = filtered.filter(session => 
        session.info?.email?.toLowerCase().includes(searchEmail.toLowerCase())
      );
    }

    // Search by user ID
    if (searchUserId) {
      filtered = filtered.filter(session => 
        session.uid?.toLowerCase().includes(searchUserId.toLowerCase())
      );
    }

    // Filter by device
    if (deviceFilter !== 'all') {
      filtered = filtered.filter(session => 
        session.info?.device === deviceFilter
      );
    }

    // Filter active sessions only
    if (activeOnly) {
      filtered = filtered.filter(session => 
        isSessionActive(session.lastActive)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[orderByField] || 0;
      const bVal = b[orderByField] || 0;
      return orderDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setFilteredSessions(filtered);
  };

  // Calculate statistics
  const calculateStats = (sessionsData) => {
    const uniqueUsers = new Set(sessionsData.map(s => s.uid)).size;
    const activeSessions = sessionsData.filter(s => isSessionActive(s.lastActive)).length;
    
    let totalDuration = 0;
    let validDurations = 0;
    sessionsData.forEach(session => {
      const duration = calculateDuration(session.createdAt, session.lastActive);
      if (duration > 0) {
        totalDuration += duration;
        validDurations++;
      }
    });
    
    const avgDuration = validDurations > 0 ? Math.round(totalDuration / validDurations) : 0;

    setStats({
      totalSessions: sessionsData.length,
      activeSessions,
      uniqueUsers,
      avgDuration,
    });
  };

  // Fetch session details and events
  const fetchSessionDetails = async (sessionId) => {
    try {
      setLoading(true);
      console.log(`Fetching details for session: ${sessionId}`);

      const eventsRef = collection(firestore, `sessions/${sessionId}/events`);
      const eventsSnapshot = await getDocs(eventsRef);

      const events = [];
      eventsSnapshot.forEach(doc => {
        events.push({ id: doc.id, ...doc.data() });
      });

      // Sort by timestamp
      events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      setSessionEvents(events);
      setDetailModalOpen(true);
      
    } catch (err) {
      console.error('Error fetching session details:', err);
      setError('Failed to fetch session details');
    } finally {
      setLoading(false);
    }
  };

  // Handle view session details
  const handleViewSession = (session) => {
    setSelectedSession(session);
    fetchSessionDetails(session.id);
  };

  // Handle close detail modal
  const handleCloseModal = () => {
    setDetailModalOpen(false);
    setSelectedSession(null);
    setSessionEvents([]);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Session ID', 'User ID', 'Email', 'Device', 'Platform', 'Created', 'Last Active', 'Duration (min)', 'Events', 'Status'];
    const rows = filteredSessions.map(session => [
      session.id,
      session.uid || 'N/A',
      session.info?.email || 'N/A',
      session.info?.device || 'N/A',
      session.info?.platform || 'N/A',
      formatEpochDate(session.createdAt),
      formatEpochDate(session.lastActive),
      calculateDuration(session.createdAt, session.lastActive),
      session.eventCount || 0,
      isSessionActive(session.lastActive) ? 'Active' : 'Inactive',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessions_${dateRange}_${new Date().toISOString()}.csv`;
    a.click();
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchEmail('');
    setSearchUserId('');
    setDeviceFilter('all');
    setActiveOnly(false);
    applyFilters(sessions);
  };

  // Handle sort
  const handleSort = (field) => {
    const isAsc = orderByField === field && orderDirection === 'asc';
    setOrderDirection(isAsc ? 'desc' : 'asc');
    setOrderByField(field);
  };

  // Get device icon
  const getDeviceIcon = (device) => {
    switch (device?.toLowerCase()) {
      case 'mobile':
        return <MobileIcon fontSize="small" />;
      case 'tablet':
        return <TabletIcon fontSize="small" />;
      case 'desktop':
        return <DesktopIcon fontSize="small" />;
      default:
        return <DesktopIcon fontSize="small" />;
    }
  };

  // Effects
  useEffect(() => {
    fetchSessions();
  }, [dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    applyFilters(sessions);
  }, [searchEmail, searchUserId, deviceFilter, activeOnly, orderByField, orderDirection]);

  return (
    <ProtectedRoute>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            User Sessions
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={exportToCSV}
              disabled={filteredSessions.length === 0}
            >
              Export CSV
            </Button>
            <Tooltip title="Refresh sessions">
              <IconButton onClick={fetchSessions} color="primary">
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

        {/* Statistics Cards */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Total Sessions
                </Typography>
                <Typography variant="h4">
                  {stats.totalSessions}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Active Sessions
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.activeSessions}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Unique Users
                </Typography>
                <Typography variant="h4">
                  {stats.uniqueUsers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Avg Duration
                </Typography>
                <Typography variant="h4">
                  {stats.avgDuration}m
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <FilterIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Filters</Typography>
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                sx={{ ml: 'auto' }}
              >
                Clear All
              </Button>
            </Box>
            
            <Grid container spacing={2}>
              {/* Date Range */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Date Range</InputLabel>
                  <Select
                    value={dateRange}
                    label="Date Range"
                    onChange={(e) => setDateRange(e.target.value)}
                  >
                    <MenuItem value="today">Today</MenuItem>
                    <MenuItem value="yesterday">Yesterday</MenuItem>
                    <MenuItem value="last7days">Last 7 Days</MenuItem>
                    <MenuItem value="last30days">Last 30 Days</MenuItem>
                    <MenuItem value="custom">Custom Range</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Custom Date Range */}
              {dateRange === 'custom' && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Start Date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="End Date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </>
              )}

              {/* Search Email */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search by Email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </Grid>

              {/* Search User ID */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search by User ID"
                  value={searchUserId}
                  onChange={(e) => setSearchUserId(e.target.value)}
                  placeholder="user123"
                />
              </Grid>

              {/* Device Filter */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Device Type</InputLabel>
                  <Select
                    value={deviceFilter}
                    label="Device Type"
                    onChange={(e) => setDeviceFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Devices</MenuItem>
                    <MenuItem value="mobile">Mobile</MenuItem>
                    <MenuItem value="tablet">Tablet</MenuItem>
                    <MenuItem value="desktop">Desktop</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Active Only Toggle */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={activeOnly ? 'active' : 'all'}
                    label="Status"
                    onChange={(e) => setActiveOnly(e.target.value === 'active')}
                  >
                    <MenuItem value="all">All Sessions</MenuItem>
                    <MenuItem value="active">Active Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Sessions Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sessions ({filteredSessions.length})
            </Typography>

            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : filteredSessions.length === 0 ? (
              <Alert severity="info">No sessions found matching your filters</Alert>
            ) : (
              <>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <TableSortLabel
                            active={orderByField === 'createdAt'}
                            direction={orderByField === 'createdAt' ? orderDirection : 'asc'}
                            onClick={() => handleSort('createdAt')}
                          >
                            Created
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Device</TableCell>
                        <TableCell>Platform</TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={orderByField === 'lastActive'}
                            direction={orderByField === 'lastActive' ? orderDirection : 'asc'}
                            onClick={() => handleSort('lastActive')}
                          >
                            Last Active
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="right">Duration</TableCell>
                        <TableCell align="right">Events</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredSessions
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((session) => {
                          const duration = calculateDuration(session.createdAt, session.lastActive);
                          const active = isSessionActive(session.lastActive);
                          
                          return (
                            <TableRow key={session.id} hover>
                              <TableCell>
                                <Typography variant="body2">
                                  {formatEpochDate(session.createdAt)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" fontWeight="medium">
                                    {session.info?.email || 'N/A'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {session.uid}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={getDeviceIcon(session.info?.device)}
                                  label={session.info?.device || 'N/A'}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {session.info?.platform || 'N/A'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {formatEpochDate(session.lastActive)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2">
                                  {duration} min
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={session.eventCount || 0}
                                  size="small"
                                  color="primary"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={<CircleIcon sx={{ fontSize: 10 }} />}
                                  label={active ? 'Active' : 'Inactive'}
                                  size="small"
                                  color={active ? 'success' : 'default'}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="View Details">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewSession(session)}
                                  >
                                    <ViewIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <TablePagination
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  component="div"
                  count={filteredSessions.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Session Detail Modal */}
        <Dialog
          open={detailModalOpen}
          onClose={handleCloseModal}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Session Details
            {selectedSession && isSessionActive(selectedSession.lastActive) && (
              <Chip
                icon={<CircleIcon sx={{ fontSize: 10 }} />}
                label="Active"
                size="small"
                color="success"
                sx={{ ml: 2 }}
              />
            )}
          </DialogTitle>
          <DialogContent dividers>
            {selectedSession && (
              <>
                {/* Session Info */}
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    Session Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Session ID
                      </Typography>
                      <Typography variant="body1" fontFamily="monospace">
                        {selectedSession.id}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        User ID
                      </Typography>
                      <Typography variant="body1">
                        {selectedSession.uid}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body1">
                        {selectedSession.info?.email || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Device
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getDeviceIcon(selectedSession.info?.device)}
                        <Typography variant="body1">
                          {selectedSession.info?.device || 'N/A'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Platform
                      </Typography>
                      <Typography variant="body1">
                        {selectedSession.info?.platform || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Created
                      </Typography>
                      <Typography variant="body1">
                        {formatEpochDate(selectedSession.createdAt)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Last Active
                      </Typography>
                      <Typography variant="body1">
                        {formatEpochDate(selectedSession.lastActive)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Duration
                      </Typography>
                      <Typography variant="body1">
                        {calculateDuration(selectedSession.createdAt, selectedSession.lastActive)} minutes
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        User Agent
                      </Typography>
                      <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                        {selectedSession.info?.userAgent || 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Events Timeline */}
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Events Timeline ({sessionEvents.length} events)
                  </Typography>
                  {loading ? (
                    <Box display="flex" justifyContent="center" py={2}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : sessionEvents.length === 0 ? (
                    <Alert severity="info">No events found for this session</Alert>
                  ) : (
                    <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                      {sessionEvents.map((event, index) => (
                        <React.Fragment key={event.id}>
                          <ListItem alignItems="flex-start">
                            <ListItemText
                              primary={
                                <Box display="flex" justifyContent="space-between">
                                  <Typography variant="subtitle2">
                                    {event.type}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatEpochDate(event.timestamp)}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                event.data && (
                                  <Typography
                                    variant="caption"
                                    component="pre"
                                    sx={{
                                      fontFamily: 'monospace',
                                      fontSize: '0.75rem',
                                      mt: 1,
                                      p: 1,
                                      backgroundColor: 'grey.100',
                                      borderRadius: 1,
                                      overflow: 'auto',
                                    }}
                                  >
                                    {JSON.stringify(event.data, null, 2)}
                                  </Typography>
                                )
                              }
                            />
                          </ListItem>
                          {index < sessionEvents.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ProtectedRoute>
  );
};

export default SessionsPage;
