import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { useGetContactsQuery } from '../../store/contacts/contactsApi';
import { 
  messagesApi,
  useGetChatHistoryQuery, 
  useScheduleMessageMutation, 
  useDeleteMessageMutation, 
  useDeleteMessageForMeMutation,
  useReadChatMutation
} from '../../store/messages/messagesApi';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../routes/paths';
import { getMediaUrl } from '../../shared/services/api';
import {
  Box, Typography, Grid, Paper, TextField, Button, Avatar, List,
  ListItem, ListItemButton, ListItemAvatar, ListItemText, IconButton,
  CircularProgress, Chip, InputAdornment, Menu, MenuItem, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  Schedule as ScheduleIcon,
  Error as FailedIcon,
  Chat as ChatIcon,
  MoreVert as MoreVertIcon,
  Check as CheckIcon,
  Mic as MicIcon,
  CameraAlt as CameraIcon,
  Close as CloseIcon
} from '@mui/icons-material';

export const Chats: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
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
            { type: 'Dashboard', id: 'STATS' },
            { type: 'Contact', id: 'LIST' }
          ]));
          window.dispatchEvent(new Event('notification-ws-update'));
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
  const [readChat] = useReadChatMutation();

  useEffect(() => {
    if (selectedContact) {
      readChat(selectedContact.email).catch((err) =>
        console.error('Failed to mark chat as read', err)
      );
    }
  }, [selectedContact, readChat]);

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

  // Camera Capture State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const startCamera = async () => {
    try {
      setCapturedPhotoUrl(null);
      setPhotoBlob(null);
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Failed to open camera', err);
      alert('Camera access denied or unavailable.');
      setIsCameraOpen(false);
    }
  };

  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            setPhotoBlob(blob);
            setCapturedPhotoUrl(URL.createObjectURL(blob));
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handleRetakePhoto = () => {
    setCapturedPhotoUrl(null);
    setPhotoBlob(null);
  };

  const handleSendPhoto = async () => {
    if (!photoBlob || !selectedContact) return;
    setSending(true);
    try {
      const file = new File([photoBlob], 'camera-capture.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('receiverEmail', selectedContact.email);
      formData.append('messageType', 'IMAGE');
      formData.append('recurringType', 'NONE');
      formData.append('content', 'Captured Photo');
      formData.append('file', file);

      await sendMessageMutation(formData).unwrap();
      handleCloseCamera();
      refetchChatHistory();
    } catch (err) {
      console.error('Failed to send photo', err);
      alert('Failed to send photo attachment');
    } finally {
      setSending(false);
    }
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCapturedPhotoUrl(null);
    setPhotoBlob(null);
  };

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length > 0 && selectedContact) {
          setSending(true);
          try {
            const file = new File([audioBlob], 'voice-recording.webm', { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('receiverEmail', selectedContact.email);
            formData.append('messageType', 'AUDIO');
            formData.append('recurringType', 'NONE');
            formData.append('content', 'Voice Recording');
            formData.append('file', file);

            await sendMessageMutation(formData).unwrap();
            refetchChatHistory();
          } catch (err) {
            console.error('Failed to send audio recording', err);
            alert('Failed to send audio recording.');
          } finally {
            setSending(false);
          }
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to start audio recording', err);
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      };
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isCameraOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOpen, cameraStream]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Filter contacts by query
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string, isRead: boolean) => {
    switch (status) {
      case 'DELIVERED':
        if (isRead) {
          return (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', position: 'relative', width: 16, height: 13, ml: 0.5 }}>
              <CheckIcon sx={{ fontSize: 14, color: '#34b7f1', position: 'absolute', left: 0 }} />
              <CheckIcon sx={{ fontSize: 14, color: '#34b7f1', position: 'absolute', left: 4 }} />
            </Box>
          );
        } else {
          return (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', position: 'relative', width: 16, height: 13, ml: 0.5 }}>
              <CheckIcon sx={{ fontSize: 14, color: 'text.secondary', position: 'absolute', left: 0 }} />
              <CheckIcon sx={{ fontSize: 14, color: 'text.secondary', position: 'absolute', left: 4 }} />
            </Box>
          );
        }
      case 'FAILED':
        return <FailedIcon sx={{ fontSize: 13, color: '#ef4444', ml: 0.5 }} />;
      case 'PENDING':
      case 'SCHEDULED':
      default:
        return <CheckIcon sx={{ fontSize: 14, color: 'text.secondary', ml: 0.5 }} />;
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
          Chats
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Real-time conversation logs. View scheduled pipeline or delivered messages.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ flexGrow: 1, minHeight: 0 }}>
        {/* Contact List (Left Panel) */}
        <Grid item xs={12} md={4} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Paper
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
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
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  style: { color: theme.palette.text.primary }
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
                            <Avatar 
                              src={getMediaUrl(c.profilePhotoUrl) || undefined}
                              sx={{ bgcolor: isSelected ? '#818cf8' : '#334155', color: '#fff', fontWeight: 600 }}
                            >
                              {!c.profilePhotoUrl && c.name.charAt(0).toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <Typography sx={{ color: 'text.primary', fontWeight: 600, fontSize: '0.95rem' }}>
                                  {c.name}
                                </Typography>
                                {c.unreadCount !== undefined && c.unreadCount > 0 && (
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
                                    lineHeight: 1
                                  }}>
                                    {c.unreadCount}
                                  </Box>
                                )}
                              </Box>
                            }
                             secondary={c.email}
                             secondaryTypographyProps={{ color: 'text.secondary', fontSize: '0.8rem' }}
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
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
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
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: 'rgba(255,255,255,0.01)'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar 
                      src={getMediaUrl(selectedContact.profilePhotoUrl) || undefined}
                      sx={{ bgcolor: '#818cf8', color: '#fff', fontWeight: 700 }}
                    >
                      {!selectedContact.profilePhotoUrl && selectedContact.name.charAt(0).toUpperCase()}
                    </Avatar>
                     <Box>
                       <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 700 }}>
                         {selectedContact.name}
                       </Typography>
                       <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
                       <ChatIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                       <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
                               sx={{ opacity: 0, transition: 'opacity 0.2s', color: 'text.secondary' }}
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
                                bgcolor: isMe 
                                  ? (m.status === 'SCHEDULED' 
                                      ? (theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(79, 70, 229, 0.15)') 
                                      : theme.palette.primary.main) 
                                  : (theme.palette.mode === 'dark' ? '#1e293b' : '#f1f5f9'),
                                border: isMe 
                                  ? (m.status === 'SCHEDULED' ? '1px dashed rgba(129, 140, 248, 0.4)' : 'none') 
                                  : (theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.06)'),
                                color: isMe 
                                  ? (m.status === 'SCHEDULED' 
                                      ? (theme.palette.mode === 'dark' ? '#c7d2fe' : '#4f46e5') 
                                      : '#ffffff') 
                                  : (theme.palette.mode === 'dark' ? '#f8fafc' : '#0f172a'),
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
                               <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
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
                                  {getStatusIcon(m.status, m.isRead)}
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
                     borderTop: '1px solid',
                     borderTopColor: 'divider',
                     bgcolor: 'transparent',
                     display: 'flex',
                     alignItems: 'center',
                     gap: 1.5
                   }}
                >
                  {isRecording ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', py: 0.5, px: 2, borderRadius: '24px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: '#ef4444',
                            animation: 'pulse 1.2s infinite',
                            '@keyframes pulse': {
                              '0%': { opacity: 0.3 },
                              '50%': { opacity: 1 },
                              '100%': { opacity: 0.3 }
                            }
                          }}
                        />
                        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                          Recording Audio... {formatRecordingTime(recordingSeconds)}
                        </Typography>
                      </Box>
                      <IconButton onClick={cancelRecording} color="error" size="small" disabled={sending}>
                        <CloseIcon />
                      </IconButton>
                      <IconButton onClick={stopRecording} sx={{ bgcolor: '#10b981', color: '#fff', '&:hover': { bgcolor: '#059669' } }} size="small" disabled={sending}>
                        <SendIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ) : (
                    <>
                      <IconButton onClick={startCamera} color="primary" size="small" disabled={sending}>
                        <CameraIcon />
                      </IconButton>
                      <IconButton onClick={startRecording} color="primary" size="small" disabled={sending}>
                        <MicIcon />
                      </IconButton>
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
                            style: { color: theme.palette.text.primary }
                          }
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                            borderRadius: '24px',
                            '& fieldset': { borderColor: 'divider' },
                            '&:hover fieldset': { borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' },
                            '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
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
                          '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'text.disabled' },
                          width: 40,
                          height: 40
                        }}
                      >
                        <SendIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, p: 4, textAlign: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(99,102,241,0.08)', color: '#818cf8', width: 80, height: 80 }}>
                  <ChatIcon sx={{ fontSize: 40 }} />
                </Avatar>
                 <Box>
                   <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>
                     Select a Contact to Chat
                   </Typography>
                   <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 320 }}>
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

      <Dialog
        open={isCameraOpen}
        onClose={handleCloseCamera}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
            Capture and Send Photo
          </Typography>
          <IconButton onClick={handleCloseCamera} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 360 }}>
          {capturedPhotoUrl ? (
            <Box
              component="img"
              src={capturedPhotoUrl}
              alt="Captured"
              sx={{ width: '100%', height: 'auto', maxHeight: 400, objectFit: 'contain' }}
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ width: '100%', maxHeight: 400, objectFit: 'contain', display: 'block' }}
            />
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </DialogContent>
        <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          {capturedPhotoUrl ? (
            <>
              <Button onClick={handleRetakePhoto} variant="outlined" color="primary">
                Retake
              </Button>
              <Button
                onClick={handleSendPhoto}
                variant="contained"
                sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                disabled={sending}
              >
                {sending ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Send Photo'}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleCloseCamera} variant="outlined" color="secondary">
                Cancel
              </Button>
              <Button
                onClick={handleCapturePhoto}
                variant="contained"
                sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#6366f1' } }}
              >
                Capture
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Chats;
