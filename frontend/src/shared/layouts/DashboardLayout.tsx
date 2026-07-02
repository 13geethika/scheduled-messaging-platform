import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { logout } from '../../store/auth/authSlice';
import { PATHS } from '../../routes/paths';
import { useGetContactsQuery } from '../../store/contacts/contactsApi';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, IconButton,
  ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar, Menu,
  MenuItem, Badge, Tooltip, useMediaQuery, useTheme, Button
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard as DashboardIcon, People as PeopleIcon,
  Schedule as ScheduleIcon, Chat as ChatIcon, AccountCircle as AccountIcon, Logout as LogoutIcon,
  Notifications as BellIcon, Shield as ShieldIcon
} from '@mui/icons-material';
import api, { getMediaUrl } from '../services/api';

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
      setNotifications(response.data.data || []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000); // refresh every 15s
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

  const handleMarkAsUnread = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/unread`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'UNREAD' } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
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

  if (user?.role === 'ROLE_ADMIN') {
    menuItems.push({ text: 'Audit Logs', icon: <ShieldIcon />, path: PATHS.AUDIT_LOGS });
  }

  const { data: contacts = [] } = useGetContactsQuery('ACCEPTED', { skip: !user });
  const unreadChatsCount = contacts.filter(c => c.unreadCount && c.unreadCount > 0).length;

  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length;

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', color: 'text.primary' }}>
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
        <Typography variant="h6" noWrap sx={{ fontWeight: 800, letterSpacing: '-0.5px', color: 'text.primary' }}>
          ChronosMsg
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
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
                  bgcolor: active ? (theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.08)') : 'transparent',
                  color: active ? theme.palette.primary.main : theme.palette.text.secondary,
                  '&:hover': {
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    color: theme.palette.text.primary
                  },
                  transition: 'all 0.2s'
                }}
              >
                <ListItemIcon sx={{ color: active ? theme.palette.primary.main : theme.palette.text.secondary, minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 600 }} />
                {item.text === 'Chats' && unreadChatsCount > 0 && (
                  <Box sx={{
                    bgcolor: '#818cf8',
                    color: '#fff',
                    borderRadius: '10px',
                    px: 1,
                    py: 0.25,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    minWidth: '16px',
                    textAlign: 'center',
                    lineHeight: 1,
                    ml: 1
                  }}>
                    {unreadChatsCount}
                  </Box>
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', px: 2 }}>
          LOGGED IN AS
        </Typography>
        <Typography variant="body2" noWrap sx={{ color: 'text.primary', fontWeight: 600, display: 'block', px: 2 }}>
          {user?.name}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* AppBar Header */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(2, 6, 23, 0.75)' : 'rgba(248, 250, 252, 0.75)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' }, color: 'text.secondary' }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap sx={{ fontWeight: 700, color: 'text.primary', display: { xs: 'none', sm: 'block' } }}>
            {menuItems.find(item => item.path === location.pathname)?.text || 'Platform'}
          </Typography>
          <Box sx={{ display: 'none', xs: 'block' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Notification Bell */}
            <Tooltip title="Notifications">
              <IconButton onClick={handleOpenNotifMenu} sx={{ color: 'text.secondary', bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
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
                  width: 320, maxHeight: 400, bgcolor: 'background.paper',
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '16px', color: 'text.primary',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
                }
              }}
            >
              <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Notifications</Typography>
                {unreadCount > 0 && <Typography variant="caption" sx={{ color: 'primary.main' }}>{unreadCount} unread</Typography>}
              </Box>
              <Divider sx={{ borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
              {notifications.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                  <Typography variant="body2">No notifications yet</Typography>
                </Box>
              ) : (
                notifications.map((n) => (
                  <Box
                    key={n.id}
                    sx={{
                      py: 1.5, px: 2, borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                      whiteSpace: 'normal', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      bgcolor: n.status === 'UNREAD' ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                      width: '100%', boxSizing: 'border-box'
                    }}
                  >
                    <Typography variant="body2" sx={{ color: n.status === 'UNREAD' ? 'text.primary' : 'text.secondary', fontWeight: n.status === 'UNREAD' ? 600 : 400, mb: 1 }}>
                      {n.message}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      {n.status === 'UNREAD' ? (
                        <Button 
                          size="small" 
                          variant="text" 
                          onClick={() => handleMarkAsRead(n.id)}
                          sx={{ p: 0, minWidth: 0, textTransform: 'none', fontSize: '0.75rem', color: 'primary.main', fontWeight: 600 }}
                        >
                          Mark as read
                        </Button>
                      ) : (
                        <Button 
                          size="small" 
                          variant="text" 
                          onClick={() => handleMarkAsUnread(n.id)}
                          sx={{ p: 0, minWidth: 0, textTransform: 'none', fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}
                        >
                          Mark as unread
                        </Button>
                      )}
                      <Button 
                        size="small" 
                        variant="text" 
                        onClick={() => handleDeleteNotification(n.id)}
                        sx={{ p: 0, minWidth: 0, textTransform: 'none', fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}
                      >
                        Delete
                      </Button>
                    </Box>
                  </Box>
                ))
              )}
            </Menu>

            {/* Profile Avatar */}
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar 
                  src={getMediaUrl(user?.profilePhotoUrl) || undefined}
                  sx={{ bgcolor: 'primary.main', color: '#fff', fontWeight: 700 }}
                >
                  {!user?.profilePhotoUrl && user?.name?.charAt(0).toUpperCase()}
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
                  bgcolor: 'background.paper', border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: '16px', color: 'text.primary', width: 180,
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
                }
              }}
            >
              <MenuItem onClick={() => { handleCloseUserMenu(); navigate(PATHS.PROFILE); }} sx={{ py: 1.2 }}>
                <ListItemIcon sx={{ color: 'text.secondary' }}><AccountIcon fontSize="small" /></ListItemIcon>
                <Typography variant="body2">My Profile</Typography>
              </MenuItem>
              <Divider sx={{ borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
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
