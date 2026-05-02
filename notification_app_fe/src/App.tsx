// Main App component - routing and layout
// Provides Material UI theme and page navigation

import React, { useState, FC } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  useTheme,
  Typography,
  Theme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { appTheme } from './styles/theme';
import AllNotificationsPage from './pages/AllNotificationsPage';
import PriorityNotificationsPage from './pages/PriorityNotificationsPage';
import { notificationLogger } from './services/notificationLogger';

interface PageConfig {
  id: string;
  label: string;
  component: React.ComponentType;
}

const PAGES: PageConfig[] = [
  { id: 'all', label: 'All Notifications', component: AllNotificationsPage },
  { id: 'priority', label: 'Priority Inbox', component: PriorityNotificationsPage },
];

const App: FC = () => {
  const theme: Theme = appTheme;
  const muiTheme: Theme = useTheme();
  const isMobileScreen: boolean = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [currentPage, setCurrentPage] = useState<string>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const activePage: PageConfig | undefined = PAGES.find((p) => p.id === currentPage);
  const ActivePageComponent: React.ComponentType = activePage?.component || AllNotificationsPage;

  const handleNavigateToPage = (pageId: string): void => {
    setCurrentPage(pageId);
    setIsSidebarOpen(false);
    notificationLogger.logUserAction(`Navigate to page: ${pageId}`);
  };

  const toggleSidebar = (): void => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Header */}
      <AppBar position="sticky">
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsIcon sx={{ fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Notification System
            </Typography>
          </Box>

          {isMobileScreen ? (
            <IconButton color="inherit" onClick={toggleSidebar} size="large">
              {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {PAGES.map((page) => (
                <Button
                  key={page.id}
                  color={currentPage === page.id ? 'secondary' : 'inherit'}
                  onClick={() => handleNavigateToPage(page.id)}
                  variant={currentPage === page.id ? 'contained' : 'text'}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    borderRadius: 1,
                  }}
                >
                  {page.label}
                </Button>
              ))}
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Sidebar */}
      {isMobileScreen && (
        <Drawer
          anchor="right"
          open={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        >
          <Box sx={{ width: 250, paddingY: 2 }}>
            <List>
              {PAGES.map((page) => (
                <ListItem key={page.id} disablePadding>
                  <ListItemButton
                    selected={currentPage === page.id}
                    onClick={() => handleNavigateToPage(page.id)}
                  >
                    <ListItemText primary={page.label} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>
      )}

      {/* Page Content */}
      <Box component="main" sx={{ backgroundColor: theme.palette.background.default, minHeight: '100vh' }}>
        <ActivePageComponent />
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          backgroundColor: theme.palette.grey[900],
          color: '#fff',
          textAlign: 'center',
          padding: 2,
          marginTop: 4,
        }}
      >
        <Typography variant="body2">
          © 2026 Campus Notification System. All rights reserved.
        </Typography>
      </Box>
    </ThemeProvider>
  );
};

export default App;
