import React, { useEffect, useState } from 'react';
import {
  useGetContactsQuery,
  useGetPendingRequestsQuery,
  useSendContactRequestMutation,
  useAcceptContactRequestMutation,
  useRejectContactRequestMutation,
  useBlockContactMutation,
  useRemoveContactMutation,
  useUnblockContactMutation,
  useUpdateContactAliasMutation
} from '../../store/contacts/contactsApi';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box, Typography, Grid, Paper, Tabs, Tab, TextField, Button, List,
  ListItem, ListItemText, ListItemSecondaryAction, IconButton, Alert,
  Avatar, CircularProgress, Tooltip, Divider, Dialog, DialogTitle,
  DialogContent, DialogActions
} from '@mui/material';
import {
  PersonAdd as AddIcon, Check as AcceptIcon, Close as RejectIcon,
  Block as BlockIcon, Delete as DeleteIcon, Search as SearchIcon,
  LockOpen as LockOpenIcon, Edit as EditIcon
} from '@mui/icons-material';

const addSchema = yup.object().shape({
  email: yup.string().email('Enter a valid email').required('Email is required'),
});

export const Contacts: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(addSchema),
  });

  // Queries
  const contactsStatus = activeTab === 2 ? 'BLOCKED' : 'ACCEPTED';
  const { data: contacts = [], isLoading: loadingContacts, refetch: refetchContacts } = useGetContactsQuery(contactsStatus);
  const { data: pendingRequests = [], isLoading: loadingPending, refetch: refetchPending } = useGetPendingRequestsQuery();

  // Mutations
  const [sendRequest, { isLoading: isSending }] = useSendContactRequestMutation();
  const [acceptRequest] = useAcceptContactRequestMutation();
  const [rejectRequest] = useRejectContactRequestMutation();
  const [blockContactMutation] = useBlockContactMutation();
  const [removeContactMutation] = useRemoveContactMutation();
  const [unblockContactMutation] = useUnblockContactMutation();
  const [updateContactAlias] = useUpdateContactAliasMutation();

  // Alias Dialog States
  const [aliasDialogOpen, setAliasDialogOpen] = useState(false);
  const [selectedAliasContact, setSelectedAliasContact] = useState<any>(null);
  const [aliasInput, setAliasInput] = useState('');

  const handleEditAliasClick = (contact: any) => {
    setSelectedAliasContact(contact);
    setAliasInput(contact.customName || '');
    setAliasDialogOpen(true);
  };

  const handleSaveAlias = async () => {
    if (!selectedAliasContact) return;
    try {
      setSuccessMessage(null);
      setErrorMessage(null);
      await updateContactAlias({ id: selectedAliasContact.id, alias: aliasInput }).unwrap();
      setSuccessMessage('Nickname updated successfully');
      setAliasDialogOpen(false);
      setSelectedAliasContact(null);
      setAliasInput('');
      refetchContacts();
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Failed to update nickname');
    }
  };

  useEffect(() => {
    // Clear messages on mount
    setSuccessMessage(null);
    setErrorMessage(null);
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const onAddContact = async (data: { email: string }) => {
    try {
      setSuccessMessage(null);
      setErrorMessage(null);
      const res = await sendRequest(data.email).unwrap();
      setSuccessMessage(res.message || 'Contact request sent successfully');
      reset();
      refetchPending();
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Failed to send contact request');
    }
  };

  const handleAccept = async (id: number) => {
    try {
      setSuccessMessage(null);
      setErrorMessage(null);
      const res = await acceptRequest(id).unwrap();
      setSuccessMessage(res.message || 'Contact request accepted');
      refetchPending();
      refetchContacts();
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Failed to accept request');
    }
  };

  const handleReject = async (id: number) => {
    try {
      setSuccessMessage(null);
      setErrorMessage(null);
      const res = await rejectRequest(id).unwrap();
      setSuccessMessage(res.message || 'Contact request rejected');
      refetchPending();
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Failed to reject request');
    }
  };

  const handleBlock = async (id: number) => {
    try {
      setSuccessMessage(null);
      setErrorMessage(null);
      const res = await blockContactMutation(id).unwrap();
      setSuccessMessage(res.message || 'Contact blocked successfully');
      refetchContacts();
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Failed to block contact');
    }
  };

  const handleRemove = async (id: number) => {
    try {
      setSuccessMessage(null);
      setErrorMessage(null);
      const res = await removeContactMutation(id).unwrap();
      setSuccessMessage(res.message || 'Contact removed successfully');
      refetchContacts();
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Failed to remove contact');
    }
  };

  const handleUnblock = async (id: number) => {
    try {
      setSuccessMessage(null);
      setErrorMessage(null);
      const res = await unblockContactMutation(id).unwrap();
      setSuccessMessage(res.message || 'Contact unblocked successfully');
      refetchContacts();
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Failed to unblock contact');
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
          Contact Manager
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Add connections, approve requests, and maintain your conversation pipeline.
        </Typography>
      </Box>

      {errorMessage && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{errorMessage}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>{successMessage}</Alert>}

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '20px', overflow: 'hidden' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              textColor="inherit"
              indicatorColor="primary"
              sx={{
                borderBottom: '1px solid',
                borderBottomColor: 'divider',
                px: 2,
                '& .MuiTab-root': { color: 'text.secondary', fontWeight: 600, py: 2 },
                '& .Mui-selected': { color: 'primary.main' },
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
                    sx={{}}
                  />
                </Box>

                {loadingContacts ? (
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
                             primary={
                               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                 <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>
                                   {c.name}
                                 </Typography>
                                 {c.customName && (
                                   <Typography variant="caption" sx={{ color: 'text.secondary', bgcolor: 'action.selected', px: 1, py: 0.25, borderRadius: '4px', fontSize: '0.7rem' }}>
                                     Private Nickname
                                   </Typography>
                                 )}
                               </Box>
                             }
                             secondary={c.email}
                             secondaryTypographyProps={{ color: '#64748b' }}
                           />
                           <ListItemSecondaryAction>
                             <Tooltip title="Edit Nickname">
                               <IconButton onClick={() => handleEditAliasClick(c)} sx={{ color: '#818cf8', mr: 1 }}>
                                 <EditIcon />
                               </IconButton>
                             </Tooltip>
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
                        <Divider sx={{ borderColor: 'divider' }} />
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Box>
            )}

            {/* Pending requests tab */}
            {activeTab === 1 && (
              <Box sx={{ p: 3 }}>
                {loadingPending ? (
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
                            primaryTypographyProps={{ fontWeight: 600, color: 'text.primary' }}
                            secondaryTypographyProps={{ color: 'text.secondary' }}
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
                        <Divider sx={{ borderColor: 'divider' }} />
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Box>
            )}

            {/* Blocked tab */}
            {activeTab === 2 && (
              <Box sx={{ p: 3 }}>
                {loadingContacts ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={30} /></Box>
                ) : filteredContacts.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>No blocked users</Typography>
                ) : (
                  <List>
                    {filteredContacts.map((c) => (
                      <React.Fragment key={c.id}>
                        <ListItem sx={{ py: 1.5 }}>
                          <Avatar sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', mr: 2, fontWeight: 700 }}>
                            {c.name.charAt(0).toUpperCase()}
                          </Avatar>
                           <ListItemText
                             primary={c.name}
                             secondary={
                               <>
                                 <Typography variant="body2" component="span" sx={{ display: 'block', color: 'text.secondary' }}>{c.email}</Typography>
                                 <Typography variant="caption" component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                   Unblocked {c.unblockCount ?? 0}/2 times
                                 </Typography>
                               </>
                             }
                             primaryTypographyProps={{ fontWeight: 600, color: 'text.primary' }}
                           />
                           <ListItemSecondaryAction>
                             <Tooltip title={c.unblockCount !== undefined && c.unblockCount >= 2 ? "Unblock limit reached (max 2)" : "Unblock User"}>
                               <span>
                                 <IconButton 
                                   onClick={() => handleUnblock(c.id)} 
                                   disabled={c.unblockCount !== undefined && c.unblockCount >= 2}
                                   sx={{ color: '#10b981', mr: 1, '&.Mui-disabled': { color: 'rgba(16, 185, 129, 0.3)' } }}
                                 >
                                   <LockOpenIcon />
                                 </IconButton>
                               </span>
                             </Tooltip>
                             <Tooltip title="Delete Relationship">
                               <IconButton onClick={() => handleRemove(c.id)} sx={{ color: '#ef4444' }}>
                                 <DeleteIcon />
                               </IconButton>
                             </Tooltip>
                           </ListItemSecondaryAction>
                        </ListItem>
                        <Divider sx={{ borderColor: 'divider' }} />
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
          <Paper sx={{ p: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '20px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <AddIcon sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Add Contact
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
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
                sx={{ mb: 3 }}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isSending}
                sx={{
                  py: 1.2,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                {isSending ? <CircularProgress size={24} color="inherit" /> : 'Send Request'}
              </Button>
            </form>
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Nickname Dialog */}
      <Dialog open={aliasDialogOpen} onClose={() => setAliasDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Contact Nickname</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Set a convenient private name for this contact. This is private to your account and does not affect their profile name.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Nickname / Alias"
            value={aliasInput}
            onChange={(e) => setAliasInput(e.target.value)}
            placeholder={selectedAliasContact?.name}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setAliasDialogOpen(false)} variant="outlined" sx={{ borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button onClick={handleSaveAlias} variant="contained" sx={{ borderRadius: '8px' }}>
            Save Nickname
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Contacts;
