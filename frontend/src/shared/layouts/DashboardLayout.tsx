import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { logout } from '../../store/auth/authSlice';
import { PATHS } from '../../routes/paths';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, IconButton,
  ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar, Menu,
  MenuItem, Badge, Tooltip, useMediaQuery, useTheme
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard as DashboardIcon, People as PeopleIcon,
  Schedule as ScheduleIcon, Chat as ChatIcon, AccountCircle as AccountIcon, Logout as LogoutIcon,
  Notifications as BellIcon, Check as CheckIcon
} from '@mui/icons-material';
import api from '../services/api';

const drawerWidth = 260;

export const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElNotif, setAnchorElNotif] = useState<null | HTMLElement>(null);
  
  interface SystemNotification {
    id: number;
    message: string;
    status: string;
  }
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  // Fetch notifications regularly
  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleOpenNotifMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNotif(event.currentTarget);
  };

  const handleCloseNotifMenu = () => {
    setAnchorElNotif(null);
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'READ' } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    dispatch(logout()).then(() => {
      navigate(PATHS.LOGIN);
    });
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: PATHS.DASHBOARD },
    { text: 'Contacts', icon: <PeopleIcon />, path: PATHS.CONTACTS },
    { text: 'Scheduler', icon: <ScheduleIcon />, path: PATHS.SCHEDULER },
    { text: 'Chats', icon: <ChatIcon />, path: PATHS.CHATS },
    { text: 'Profile', icon: <AccountIcon />, path: PATHS.PROFILE },
  ];

  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length;

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0f172a', color: '#f8fafc' }}>
      <Toolbar sx={{ px: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 32, height: 32, borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1.2rem', color: '#fff'
          }}
        >
          C
        </Box>
        <Typography variant="h6" noWrap sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
          ChronosMsg
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
      <List sx={{ px: 2, py: 3, flexGrow: 1 }}>
        {menuItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={() => isMobile && setMobileOpen(false)}
                sx={{
                  borderRadius: '12px',
                  bgcolor: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: active ? '#818cf8' : '#94a3b8',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.02)',
                    color: '#f8fafc'
                  },
                  transition: 'all 0.2s'
                }}
              >
                <ListItemIcon sx={{ color: active ? '#818cf8' : '#64748b', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 600 }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', px: 2 }}>
          LOGGED IN AS
        </Typography>
        <Typography variant="body2" noWrap sx={{ color: '#e2e8f0', fontWeight: 600, display: 'block', px: 2 }}>
          {user?.name}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#020617' }}>
      {/* AppBar Header */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'rgba(2, 6, 23, 0.75)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' }, color: '#94a3b8' }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap sx={{ fontWeight: 700, color: '#f8fafc', display: { xs: 'none', sm: 'block' } }}>
            {menuItems.find(item => item.path === location.pathname)?.text || 'Platform'}
          </Typography>
          <Box sx={{ display: 'none', xs: 'block' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Notification Bell */}
            <Tooltip title="Notifications">
              <IconButton onClick={handleOpenNotifMenu} sx={{ color: '#94a3b8', bgcolor: 'rgba(255,255,255,0.02)' }}>
                <Badge badgeContent={unreadCount} color="error">
                  <BellIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Menu
              sx={{ mt: '45px' }}
              anchorEl={anchorElNotif}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              open={Boolean(anchorElNotif)}
              onClose={handleCloseNotifMenu}
              PaperProps={{
                sx: {
                  width: 320, maxHeight: 400, bgcolor: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', color: '#f8fafc',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
                }
              }}
            >
              <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Notifications</Typography>
                {unreadCount > 0 && <Typography variant="caption" sx={{ color: '#818cf8' }}>{unreadCount} unread</Typography>}
              </Box>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
              {notifications.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center', color: '#64748b' }}>
                  <Typography variant="body2">No notifications yet</Typography>
                </Box>
              ) : (
                notifications.map((n) => (
                  <MenuItem
                    key={n.id}
                    onClick={() => n.status === 'UNREAD' && handleMarkAsRead(n.id)}
                    sx={{
                      py: 1.5, px: 2, borderBottom: '1px solid rgba(255,255,255,0.04)',
                      whiteSpace: 'normal', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      bgcolor: n.status === 'UNREAD' ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }
                    }}
                  >
                    <Typography variant="body2" sx={{ color: n.status === 'UNREAD' ? '#f8fafc' : '#94a3b8', fontWeight: n.status === 'UNREAD' ? 600 : 400 }}>
                      {n.message}
                    </Typography>
                    {n.status === 'UNREAD' && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: '#818cf8' }}>
                        <CheckIcon sx={{ fontSize: 12 }} />
                        <Typography variant="caption">Mark as read</Typography>
                      </Box>
                    )}
                  </MenuItem>
                ))
              )}
            </Menu>

            {/* Profile Avatar */}
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar sx={{ bgcolor: '#6366f1', color: '#fff', fontWeight: 700 }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
            
            <Menu
              sx={{ mt: '45px' }}
              anchorEl={anchorElUser}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
              PaperProps={{
                sx: {
                  bgcolor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px', color: '#f8fafc', width: 180,
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
                }
              }}
            >
              <MenuItem onClick={() => { handleCloseUserMenu(); navigate(PATHS.PROFILE); }} sx={{ py: 1.2 }}>
                <ListItemIcon sx={{ color: '#94a3b8' }}><AccountIcon fontSize="small" /></ListItemIcon>
                <Typography variant="body2">My Profile</Typography>
              </MenuItem>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
              <MenuItem onClick={handleLogout} sx={{ py: 1.2, color: '#ef4444' }}>
                <ListItemIcon sx={{ color: '#ef4444' }}><LogoutIcon fontSize="small" /></ListItemIcon>
                <Typography variant="body2">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Responsive Navigation Drawer */}
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }} // Better open performance on mobile
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid rgba(255,255,255,0.06)' },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid rgba(255,255,255,0.06)' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 4 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px', // Space for Toolbar
          color: '#f8fafc',
        }}
      >
        <React.Suspense fallback={
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <Typography variant="body1" sx={{ color: '#94a3b8' }}>Loading component...</Typography>
          </Box>
        }>
          <Outlet />
        </React.Suspense>
      </Box>
    </Box>
  );
};
