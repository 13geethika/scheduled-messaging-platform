import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { fetchContacts } from '../../store/contacts/contactsSlice';
import api from '../../shared/services/api';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../routes/paths';
import {
  Box, Typography, Grid, Paper, TextField, Button, Avatar, List,
  ListItem, ListItemButton, ListItemAvatar, ListItemText, IconButton,
  CircularProgress, Chip, InputAdornment
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  Schedule as ScheduleIcon,
  CheckCircle as DeliveredIcon,
  Error as FailedIcon,
  WatchLater as PendingIcon,
  Chat as ChatIcon
} from '@mui/icons-material';

interface ChatMessage {
  id: number;
  senderEmail: string;
  receiverEmail: string;
  receiverName: string;
  content: string;
  messageType: string;
  fileUrl: string | null;
  status: string;
  scheduledTime: string;
  sentTime: string | null;
  recurringType: string;
}

export const Chats: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  const { contacts, loading: contactsLoading } = useSelector((state: RootState) => state.contacts);
  const { user } = useSelector((state: RootState) => state.auth);

  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<any>(null);

  // Fetch accepted contacts on mount
  useEffect(() => {
    dispatch(fetchContacts('ACCEPTED'));
  }, [dispatch]);

  // Load chat history when selected contact changes
  const fetchChatHistory = async (contactEmail: string, showLoader = false) => {
    if (showLoader) setMessagesLoading(true);
    try {
      const response = await api.get(`/messages/chat?email=${contactEmail}`);
      setMessages(response.data);
    } catch (err) {
      console.error('Failed to load chat history', err);
    } finally {
      if (showLoader) setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedContact) {
      // Initial fetch with loader
      fetchChatHistory(selectedContact.email, true);

      // Clear any existing poll
      if (pollingRef.current) clearInterval(pollingRef.current);

      // Poll for updates every 4 seconds
      pollingRef.current = setInterval(() => {
        fetchChatHistory(selectedContact.email, false);
      }, 4000);
    } else {
      setMessages([]);
      if (pollingRef.current) clearInterval(pollingRef.current);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedContact]);

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

      await api.post('/messages/schedule', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTypedMessage('');
      
      // Instantly fetch to show in pipeline
      fetchChatHistory(selectedContact.email, false);
    } catch (err: any) {
      console.error('Failed to send message', err);
      alert(err.response?.data?.error || 'Failed to send message');
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
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#64748b' }} />
                  </InputAdornment>
                ),
                style: { color: '#f8fafc' }
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
                  {messagesLoading ? (
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
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '75%',
                            alignSelf: isMe ? 'flex-end' : 'flex-start'
                          }}
                        >
                          {/* Message bubble */}
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: isMe ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                              bgcolor: isMe ? '#4f46e5' : '#1e293b',
                              border: isMe ? 'none' : '1px solid rgba(255,255,255,0.04)',
                              color: '#f8fafc',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          >
                            {m.messageType === 'TEXT' ? (
                              <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                {m.content}
                              </Typography>
                            ) : (
                              <Box>
                                <Typography variant="caption" sx={{ display: 'block', mb: 1, color: isMe ? '#c7d2fe' : '#818cf8', fontWeight: 600 }}>
                                  [{m.messageType} ATTACHMENT]
                                </Typography>
                                {m.content && (
                                  <Typography variant="body2" sx={{ mb: 1.5, wordBreak: 'break-word' }}>
                                    {m.content}
                                  </Typography>
                                )}
                                <Button
                                  variant="contained"
                                  size="small"
                                  href={m.fileUrl || '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  sx={{
                                    bgcolor: 'rgba(255,255,255,0.15)',
                                    color: '#fff',
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
                                  }}
                                >
                                  View Media
                                </Button>
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
                    InputProps={{
                      style: { color: '#f8fafc' }
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
    </Box>
  );
};

export default Chats;
