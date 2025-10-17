import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Collapse,
} from '@mui/material';
import {
  Dashboard,
  Analytics,
  ShoppingCart,
  Store,
  FileCopy,
  Search,
  Phone,
  Label,
  Payment,
  MergeType,
  Assessment,
  Person,
  Settings,
  ExpandLess,
  ExpandMore,
  EventNote,
  Timeline,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useState } from 'react';

const Sidebar = ({ onClose }) => {
  const router = useRouter();
  const location = router.pathname;
  const [openSections, setOpenSections] = useState({
    amazon: false,
    analytics: false,
    sessionanalytics: false,
    flipkart: false,
    files: false,
  });

  const handleSectionToggle = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleNavigation = (path) => {
    router.push(path);
    if (onClose) onClose(); // Close mobile drawer
  };

  const menuItems = [
    {
      title: 'Dashboard',
      icon: <Dashboard />,
      path: '/',
    },
    {
      title: 'Analytics',
      icon: <Analytics />,
      path: '/analytics',
      children: [
        { title: 'Event Summary', path: '/analytics/eventSummary' },
        { title: 'Filtered Events', path: '/analytics/FilteredEvents' },
        { title: 'User Logs', path: '/analytics/UserLogs' },
      ],
    },
    {
      title: 'Session Analytics',
      icon: <Timeline />,
      path: '/session-analytics',
      children: [
        { title: 'Analytics Dashboard', path: '/analytics-dashboard' },
        { title: 'Sessions', path: '/sessions' },
      ],
    },
    {
      title: 'Amazon Tools',
      icon: <Store />,
      path: '/amazon',
      children: [
        { title: 'Auth', path: '/amazon-auth' },
        { title: 'Payment Export', path: '/amazon-tools/PaymentExport' },
      ],
    },
    {
      title: 'Flipkart Tools',
      icon: <ShoppingCart />,
      path: '/flipkart',
      children: [
        { title: 'Dashboard', path: '/flipkart' },
        { title: 'Orders Report', path: '/flipkart-tools/orders-report' },
      ],
    },
    {
      title: 'Files',
      icon: <FileCopy />,
      path: '/files',
      children: [
        { title: 'Storage Explorer', path: '/files/StorageExplorer' },
      ],
    },
    {
      title: 'Search',
      icon: <Search />,
      path: '/search',
    },
    {
      title: 'Coupon Manager',
      icon: <Payment />,
      path: '/coupon-manager',
    },
    {
      title: 'Fake Meesho Labels',
      icon: <Label />,
      path: '/fake-meesho-labels',
    },
    {
      title: 'Fake Simulator',
      icon: <Phone />,
      path: '/fake-simulator',
    },
    {
      title: 'OTP Fails',
      icon: <Assessment />,
      path: '/OTPFails',
    },
    {
      title: 'Plan Reminders',
      icon: <Person />,
      path: '/PlanReminders',
    },
    {
      title: 'User Plans',
      icon: <Settings />,
      path: '/user-plans',
    },
    {
      title: 'Users List',
      icon: <Person />,
      path: '/users-list',
    },
  ];

  const renderMenuItem = (item) => {
    const isActive = location.pathname === item.path;
    const hasChildren = item.children && item.children.length > 0;
    const isSectionOpen = openSections[item.title.toLowerCase().replace(/\s+/g, '')];

    if (hasChildren) {
      return (
        <React.Fragment key={item.title}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleSectionToggle(item.title.toLowerCase().replace(/\s+/g, ''))}
              sx={{
                backgroundColor: isActive ? 'primary.light' : 'transparent',
                '&:hover': {
                  backgroundColor: 'primary.light',
                },
              }}
            >
              <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.title}
                sx={{ color: isActive ? 'primary.main' : 'inherit' }}
              />
              {isSectionOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          <Collapse in={isSectionOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map((child) => {
                const isChildActive = location.pathname === child.path;
                return (
                  <ListItem key={child.title} disablePadding>
                    <ListItemButton
                      onClick={() => handleNavigation(child.path)}
                      sx={{
                        pl: 4,
                        backgroundColor: isChildActive ? 'primary.light' : 'transparent',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                        },
                      }}
                    >
                      <ListItemText 
                        primary={child.title}
                        sx={{ 
                          color: isChildActive ? 'primary.main' : 'inherit',
                          fontSize: '0.9rem',
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Collapse>
        </React.Fragment>
      );
    }

    return (
      <ListItem key={item.title} disablePadding>
        <ListItemButton
          onClick={() => handleNavigation(item.path)}
          sx={{
            backgroundColor: isActive ? 'primary.light' : 'transparent',
            '&:hover': {
              backgroundColor: 'primary.light',
            },
          }}
        >
          <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'inherit' }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText 
            primary={item.title}
            sx={{ color: isActive ? 'primary.main' : 'inherit' }}
          />
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          TheEComWay
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Admin Dashboard
        </Typography>
      </Box>
      
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List>
          {menuItems.map(renderMenuItem)}
        </List>
      </Box>
    </Box>
  );
};

export default Sidebar;
