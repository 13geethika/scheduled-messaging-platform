import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { useGetContactsQuery } from '../../store/contacts/contactsApi';
import { 
  messagesApi,
  useGetChatHistoryQuery, 
  useScheduleMessageMutation, 
  useDeleteMessageMutation, 
  useDeleteMessageForMeMutation 
} from '../../store/messages/messagesApi';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../routes/paths';
import { getMediaUrl } from '../../shared/services/api';
import {
  Box, Typography, Grid, Paper, TextField, Button, Avatar, List,
  ListItem, ListItemButton, ListItemAvatar, ListItemText, IconButton,
  CircularProgress, Chip, InputAdornment, Menu, MenuItem
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  Schedule as ScheduleIcon,
  CheckCircle as DeliveredIcon,
  Error as FailedIcon,
  WatchLater as PendingIcon,
  Chat as ChatIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';

export const Chats: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [typedMessage, setTypedMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('accessToken') || '';
    const baseApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    
    let wsUrl = '';
    if (baseApiUrl.startsWith('http')) {
      wsUrl = baseApiUrl
        .replace('http://', 'ws://')
        .replace('https://', 'wss://');
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}${baseApiUrl}`;
    }
    
    let cleanUrl = wsUrl;
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    if (cleanUrl.endsWith('/api')) {
      cleanUrl = cleanUrl.slice(0, -4);
    }
    wsUrl = `${cleanUrl}/ws?token=${token}`;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'MESSAGE_UPDATE' || payload.event === 'MESSAGE_DELETE') {
          // Trigger immediate RTK Query cache tag invalidation
          dispatch(messagesApi.util.invalidateTags([
            { type: 'Message', id: 'LIST' },
            { type: 'Dashboard', id: 'STATS' }
          ]));
        }
      } catch (err) {
        console.error('Failed to parse WS payload', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [user, dispatch]);

  // Queries
  const { data: contacts = [], isLoading: contactsLoading } = useGetContactsQuery('ACCEPTED');
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchChatHistory } = useGetChatHistoryQuery(
    selectedContact?.email || '',
    {
      skip: !selectedContact,
    }
  );

  // Mutations
  const [sendMessageMutation] = useScheduleMessageMutation();
  const [deleteMsg] = useDeleteMessageMutation();
  const [deleteMsgForMe] = useDeleteMessageForMeMutation();

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [activeMenuMessage, setActiveMenuMessage] = useState<any>(null);

  const handleOpenMessageMenu = (event: React.MouseEvent<HTMLElement>, message: any) => {
    setMenuAnchorEl(event.currentTarget);
    setActiveMenuMessage(message);
  };

  const handleCloseMessageMenu = () => {
    setMenuAnchorEl(null);
    setActiveMenuMessage(null);
  };

  const handleDeleteForEveryone = async () => {
    if (!activeMenuMessage) return;
    try {
      await deleteMsg(activeMenuMessage.id).unwrap();
      refetchChatHistory();
    } catch (err) {
      console.error('Failed to delete message for everyone', err);
    }
    handleCloseMessageMenu();
  };

  const handleDeleteForMe = async () => {
    if (!activeMenuMessage) return;
    try {
      await deleteMsgForMe(activeMenuMessage.id).unwrap();
      refetchChatHistory();
    } catch (err) {
      console.error('Failed to delete message for me', err);
    }
    handleCloseMessageMenu();
  };

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send message "now" (which sends directly without scheduling)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !selectedContact || sending) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('receiverEmail', selectedContact.email);
      formData.append('messageType', 'TEXT');
      formData.append('recurringType', 'NONE');
      formData.append('content', typedMessage.trim());

      await sendMessageMutation(formData).unwrap();
      setTypedMessage('');
      refetchChatHistory();
    } catch (err: any) {
      console.error('Failed to send message', err);
      alert(err.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Navigate to Scheduler prefilled with contact
  const handleScheduleFuture = () => {
    if (!selectedContact) return;
    navigate(PATHS.SCHEDULER, { state: { prefilledEmail: selectedContact.email } });
  };

  // Filter contacts by query
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <DeliveredIcon sx={{ fontSize: 13, color: '#10b981', ml: 0.5 }} />;
      case 'FAILED':
        return <FailedIcon sx={{ fontSize: 13, color: '#ef4444', ml: 0.5 }} />;
      case 'PENDING':
        return <PendingIcon sx={{ fontSize: 13, color: '#f59e0b', ml: 0.5 }} />;
      case 'SCHEDULED':
      default:
        return <ScheduleIcon sx={{ fontSize: 13, color: '#6366f1', ml: 0.5 }} />;
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#f8fafc', mb: 0.5 }}>
          Chats
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
          Real-time conversation logs. View scheduled pipeline or delivered messages.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ flexGrow: 1, minHeight: 0 }}>
        {/* Contact List (Left Panel) */}
        <Grid item xs={12} md={4} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Paper
            sx={{
              p: 2,
              bgcolor: '#0f172a',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#64748b' }} />
                    </InputAdornment>
                  ),
                  style: { color: '#f8fafc' }
                }
              }}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.02)',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&.Mui-focused fieldset': { borderColor: '#818cf8' },
                }
              }}
            />

            <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
              {contactsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                  <CircularProgress size={30} />
                </Box>
              ) : filteredContacts.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', py: 5 }}>
                  No connected contacts found
                </Typography>
              ) : (
                <List sx={{ p: 0 }}>
                  {filteredContacts.map((c) => {
                    const isSelected = selectedContact?.id === c.id;
                    return (
                      <ListItem
                        key={c.id}
                        disablePadding
                        sx={{ mb: 1 }}
                      >
                        <ListItemButton
                          onClick={() => setSelectedContact(c)}
                          selected={isSelected}
                          sx={{
                            borderRadius: '12px',
                            p: 1.5,
                            bgcolor: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                            '&.Mui-selected:hover': { bgcolor: 'rgba(99, 102, 241, 0.15)' },
                            transition: 'all 0.2s'
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: isSelected ? '#818cf8' : '#334155', color: '#fff', fontWeight: 600 }}>
                              {c.name.charAt(0).toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={c.name}
                            secondary={c.email}
                            primaryTypographyProps={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.95rem' }}
                            secondaryTypographyProps={{ color: '#64748b', fontSize: '0.8rem' }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Chat Area (Right Panel) */}
        <Grid item xs={12} md={8} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Paper
            sx={{
              bgcolor: '#0f172a',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
              overflow: 'hidden'
            }}
          >
            {selectedContact ? (
              <>
                {/* Chat Header */}
                <Box
                  sx={{
                    p: 2.5,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: 'rgba(255,255,255,0.01)'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#818cf8', color: '#fff', fontWeight: 700 }}>
                      {selectedContact.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                        {selectedContact.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        {selectedContact.email}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    variant="outlined"
                    startIcon={<ScheduleIcon />}
                    onClick={handleScheduleFuture}
                    sx={{
                      borderColor: 'rgba(129, 140, 248, 0.3)',
                      color: '#818cf8',
                      textTransform: 'none',
                      borderRadius: '8px',
                      '&:hover': {
                        borderColor: '#818cf8',
                        bgcolor: 'rgba(129, 140, 248, 0.05)'
                      }
                    }}
                  >
                    Schedule Future Message
                  </Button>
                </Box>

                {/* Message Log */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {messagesLoading && messages.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <CircularProgress size={35} />
                    </Box>
                  ) : messages.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1 }}>
                      <ChatIcon sx={{ fontSize: 40, color: '#334155' }} />
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        No messages exchanged yet.
                      </Typography>
                    </Box>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.senderEmail === user?.email;
                      const displayTime = m.scheduledTime || m.sentTime;
                      const date = displayTime ? new Date(displayTime) : new Date();
                      const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const formattedDate = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                      
                      return (
                        <Box
                          key={m.id}
                          sx={{
                            display: 'flex',
                            flexDirection: isMe ? 'row-reverse' : 'row',
                            alignItems: 'center',
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            gap: 1.2,
                            maxWidth: '85%',
                            '&:hover .message-menu-btn': { opacity: 1 }
                          }}
                        >
                          {/* Options trigger */}
                          <IconButton
                            className="message-menu-btn"
                            size="small"
                            onClick={(e) => handleOpenMessageMenu(e, m)}
                            sx={{ opacity: 0, transition: 'opacity 0.2s', color: '#64748b' }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>

                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: isMe ? 'flex-end' : 'flex-start'
                            }}
                          >
                            {/* Message bubble */}
                            <Box
                              sx={{
                                p: 2,
                                borderRadius: isMe ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                                bgcolor: isMe ? (m.status === 'SCHEDULED' ? 'rgba(99, 102, 241, 0.2)' : '#4f46e5') : '#1e293b',
                                border: isMe ? (m.status === 'SCHEDULED' ? '1px dashed rgba(129, 140, 248, 0.4)' : 'none') : '1px solid rgba(255,255,255,0.04)',
                                color: '#f8fafc',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                            >
                              {m.messageType === 'TEXT' ? (
                                <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                  {m.content}
                                </Typography>
                              ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  {m.messageType === 'IMAGE' && m.fileUrl && (
                                    <Box
                                      component="img"
                                      src={getMediaUrl(m.fileUrl)}
                                      alt="Attachment"
                                      sx={{
                                        maxWidth: '100%',
                                        maxHeight: 240,
                                        borderRadius: '12px',
                                        objectFit: 'cover',
                                        cursor: 'pointer',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                      }}
                                      onClick={() => window.open(getMediaUrl(m.fileUrl), '_blank')}
                                    />
                                  )}
                                  {m.messageType === 'VIDEO' && m.fileUrl && (
                                    <Box
                                      component="video"
                                      src={getMediaUrl(m.fileUrl)}
                                      controls
                                      sx={{
                                        maxWidth: '100%',
                                        maxHeight: 240,
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                      }}
                                    />
                                  )}
                                  {m.messageType === 'AUDIO' && m.fileUrl && (
                                    <Box
                                      component="audio"
                                      src={getMediaUrl(m.fileUrl)}
                                      controls
                                      sx={{
                                        maxWidth: '100%',
                                        minWidth: 220
                                      }}
                                    />
                                  )}
                                  {m.content && (
                                    <Typography variant="body2" sx={{ mt: 0.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                      {m.content}
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </Box>

                            {/* Footer label (timestamp & status) */}
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, px: 0.5 }}>
                              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                                {formattedDate} at {formattedTime}
                              </Typography>
                              {isMe && (
                                <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.8 }}>
                                  <Chip
                                    label={m.status}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      height: 16,
                                      fontSize: '0.65rem',
                                      fontWeight: 800,
                                      color: m.status === 'DELIVERED' ? '#10b981' : m.status === 'FAILED' ? '#ef4444' : '#6366f1',
                                      borderColor: m.status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.2)' : m.status === 'FAILED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                      px: 0.5
                                    }}
                                  />
                                  {getStatusIcon(m.status)}
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Input Tray */}
                <Box
                  component="form"
                  onSubmit={handleSendMessage}
                  sx={{
                    p: 2,
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    bgcolor: 'rgba(255,255,255,0.005)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                  }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Type a message..."
                    value={typedMessage}
                    onChange={(e) => setTypedMessage(e.target.value)}
                    disabled={sending}
                    autoComplete="off"
                    slotProps={{
                      input: {
                        style: { color: '#f8fafc' }
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.02)',
                        borderRadius: '24px',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&.Mui-focused fieldset': { borderColor: '#818cf8' },
                      }
                    }}
                  />
                  <IconButton
                    type="submit"
                    disabled={!typedMessage.trim() || sending}
                    sx={{
                      bgcolor: '#4f46e5',
                      color: '#fff',
                      '&:hover': { bgcolor: '#6366f1' },
                      '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.03)', color: '#334155' },
                      width: 40,
                      height: 40
                    }}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, p: 4, textAlign: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(99,102,241,0.08)', color: '#818cf8', width: 80, height: 80 }}>
                  <ChatIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1 }}>
                    Select a Contact to Chat
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 320 }}>
                    Choose a contact from the sidebar to view your scheduled message queue and delivery history.
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMessageMenu}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            color: 'text.primary',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }
        }}
      >
        {activeMenuMessage?.status === 'SCHEDULED' ? (
          <MenuItem onClick={handleDeleteForEveryone} sx={{ color: '#ef4444' }}>
            Cancel Schedule
          </MenuItem>
        ) : (
          [
            <MenuItem key="delete-for-me" onClick={handleDeleteForMe}>
              Delete for me
            </MenuItem>,
            activeMenuMessage?.senderEmail === user?.email && (
              <MenuItem key="delete-for-everyone" onClick={handleDeleteForEveryone} sx={{ color: '#ef4444' }}>
                Delete for everyone
              </MenuItem>
            )
          ].filter(Boolean) as React.ReactElement[]
        )}
      </Menu>
    </Box>
  );
};

export default Chats;
