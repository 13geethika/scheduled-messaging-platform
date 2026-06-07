import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  fetchContacts, fetchPendingRequests, sendContactRequest, acceptContactRequest,
  rejectContactRequest, blockContact, removeContact, clearContactMessages
} from '../../store/contacts/contactsSlice';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box, Typography, Grid, Paper, Tabs, Tab, TextField, Button, List,
  ListItem, ListItemText, ListItemSecondaryAction, IconButton, Alert,
  Avatar, CircularProgress, Tooltip, Divider
} from '@mui/material';
import {
  PersonAdd as AddIcon, Check as AcceptIcon, Close as RejectIcon,
  Block as BlockIcon, Delete as DeleteIcon, Search as SearchIcon
} from '@mui/icons-material';

const addSchema = yup.object().shape({
  email: yup.string().email('Enter a valid email').required('Email is required'),
});

export const Contacts: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { contacts, pendingRequests, loading, error, successMessage } = useSelector((state: RootState) => state.contacts);

  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(addSchema),
  });

  useEffect(() => {
    dispatch(clearContactMessages());
    dispatch(fetchContacts('ACCEPTED'));
    dispatch(fetchPendingRequests());
  }, [dispatch]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    dispatch(clearContactMessages());
    if (newValue === 0) {
      dispatch(fetchContacts('ACCEPTED'));
    } else if (newValue === 1) {
      dispatch(fetchPendingRequests());
    } else if (newValue === 2) {
      dispatch(fetchContacts('BLOCKED'));
    }
  };

  const onAddContact = (data: { email: string }) => {
    dispatch(sendContactRequest(data.email)).then((res) => {
      if (!res.toString().includes('rejected')) {
        reset();
      }
    });
  };

  const handleAccept = (id: number) => {
    dispatch(acceptContactRequest(id));
  };

  const handleReject = (id: number) => {
    dispatch(rejectContactRequest(id));
  };

  const handleBlock = (id: number) => {
    dispatch(blockContact(id));
  };

  const handleRemove = (id: number) => {
    dispatch(removeContact(id));
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#f8fafc', mb: 1 }}>
          Contacts
        </Typography>
        <Typography variant="body1" sx={{ color: '#94a3b8' }}>
          Connect with colleagues, search contacts, and manage communication approvals.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>{successMessage}</Alert>}

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ bgcolor: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', overflow: 'hidden' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              textColor="inherit"
              indicatorColor="primary"
              sx={{
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                px: 2,
                '& .MuiTab-root': { color: '#94a3b8', fontWeight: 600, py: 2 },
                '& .Mui-selected': { color: '#818cf8' },
                '& .MuiTabs-indicator': { backgroundColor: '#818cf8' }
              }}
            >
              <Tab label="Contacts List" />
              <Tab label={`Requests (${pendingRequests.length})`} />
              <Tab label="Blocked Users" />
            </Tabs>

            {/* Contacts list tab */}
            {activeTab === 0 && (
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
                  <SearchIcon sx={{ color: '#64748b' }} />
                  <TextField
                    size="small"
                    placeholder="Search contacts..."
                    fullWidth
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    slotProps={{
                      input: {
                        style: { color: '#f8fafc' }
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&.Mui-focused fieldset': { borderColor: '#818cf8' },
                      }
                    }}
                  />
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={30} /></Box>
                ) : filteredContacts.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', py: 4 }}>No contacts found</Typography>
                ) : (
                  <List>
                    {filteredContacts.map((c) => (
                      <React.Fragment key={c.id}>
                        <ListItem sx={{ py: 1.5 }}>
                          <Avatar sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', mr: 2, fontWeight: 700 }}>
                            {c.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <ListItemText
                            primary={c.name}
                            secondary={c.email}
                            primaryTypographyProps={{ fontWeight: 600, color: '#f8fafc' }}
                            secondaryTypographyProps={{ color: '#64748b' }}
                          />
                          <ListItemSecondaryAction>
                            <Tooltip title="Block User">
                              <IconButton onClick={() => handleBlock(c.id)} sx={{ color: '#f59e0b', mr: 1 }}>
                                <BlockIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remove Connection">
                              <IconButton onClick={() => handleRemove(c.id)} sx={{ color: '#ef4444' }}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>
                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)' }} />
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Box>
            )}

            {/* Pending requests tab */}
            {activeTab === 1 && (
              <Box sx={{ p: 3 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={30} /></Box>
                ) : pendingRequests.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', py: 4 }}>No pending requests</Typography>
                ) : (
                  <List>
                    {pendingRequests.map((r) => (
                      <React.Fragment key={r.id}>
                        <ListItem sx={{ py: 1.5 }}>
                          <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', mr: 2, fontWeight: 700 }}>
                            {r.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <ListItemText
                            primary={r.name}
                            secondary={r.email}
                            primaryTypographyProps={{ fontWeight: 600, color: '#f8fafc' }}
                            secondaryTypographyProps={{ color: '#64748b' }}
                          />
                          <ListItemSecondaryAction>
                            <Tooltip title="Accept Request">
                              <IconButton onClick={() => handleAccept(r.id)} sx={{ color: '#10b981', mr: 1 }}>
                                <AcceptIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject Request">
                              <IconButton onClick={() => handleReject(r.id)} sx={{ color: '#ef4444' }}>
                                <RejectIcon />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>
                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)' }} />
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Box>
            )}

            {/* Blocked tab */}
            {activeTab === 2 && (
              <Box sx={{ p: 3 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={30} /></Box>
                ) : contacts.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', py: 4 }}>No blocked users</Typography>
                ) : (
                  <List>
                    {contacts.map((c) => (
                      <React.Fragment key={c.id}>
                        <ListItem sx={{ py: 1.5 }}>
                          <Avatar sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', mr: 2, fontWeight: 700 }}>
                            {c.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <ListItemText
                            primary={c.name}
                            secondary={c.email}
                            primaryTypographyProps={{ fontWeight: 600, color: '#f8fafc' }}
                            secondaryTypographyProps={{ color: '#64748b' }}
                          />
                          <ListItemSecondaryAction>
                            <Tooltip title="Unblock / Remove">
                              <IconButton onClick={() => handleRemove(c.id)} sx={{ color: '#ef4444' }}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>
                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)' }} />
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Add Connection Widget */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 4, bgcolor: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <AddIcon sx={{ color: '#818cf8' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                Add Contact
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
              Send a request by email. Once they accept, you can schedule messages to them.
            </Typography>
            <form onSubmit={handleSubmit(onAddContact)} noValidate>
              <TextField
                fullWidth
                label="Contact's Email"
                id="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register('email')}
                slotProps={{
                  input: {
                    style: { color: '#f8fafc' }
                  }
                }}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&.Mui-focused fieldset': { borderColor: '#818cf8' },
                  },
                  '& .MuiInputLabel-root': { color: '#94a3b8' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#818cf8' },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{
                  py: 1.2,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                Send Request
              </Button>
            </form>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Contacts;
