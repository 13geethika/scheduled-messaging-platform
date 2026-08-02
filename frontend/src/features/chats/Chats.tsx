import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { useGetContactsQuery, useGetPendingRequestsQuery } from '../../store/contacts/contactsApi';
import { 
  messagesApi,
  useGetChatHistoryQuery, 
  useScheduleMessageMutation, 
  useDeleteMessageMutation, 
  useDeleteMessageForMeMutation,
  useReadChatMutation,
  useGetGroupsQuery,
  useCreateGroupMutation,
  useGetGroupChatHistoryQuery,
  useGetPendingInvitationsQuery,
  useAcceptInvitationMutation,
  useLeaveGroupMutation,
  useMakeAdminMutation,
  useUpdateGroupSettingsMutation,
  useUpdateGroupPhotoMutation,
  useAddGroupMembersMutation,
  useRemoveGroupMemberMutation
} from '../../store/messages/messagesApi';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../routes/paths';
import { getMediaUrl } from '../../shared/services/api';
import {
  Box, Typography, Grid, Paper, TextField, Button, Avatar, List,
  ListItem, ListItemButton, ListItemAvatar, ListItemText, IconButton,
  CircularProgress, Chip, InputAdornment, Menu, MenuItem, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab, FormControlLabel, Checkbox
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
  Close as CloseIcon,
  Group as GroupIcon,
  Add as AddIcon,
  ExitToApp as LeaveIcon,
  CloudUpload as UploadIcon,
  InfoOutlined as InfoIcon,
  Delete as DeleteIcon,
  EditOutlined as EditIcon
} from '@mui/icons-material';

export const Chats: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const { user } = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState<'direct' | 'group'>('direct');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [typedMessage, setTypedMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Group creation dialog states
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);

  // Group Settings dialog states
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [groupSettingsName, setGroupSettingsName] = useState('');
  const [groupSettingsDesc, setGroupSettingsDesc] = useState('');
  const [groupSettingsAdminsOnly, setGroupSettingsAdminsOnly] = useState(false);

  // Status & Typing States
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [userStatuses, setUserStatuses] = useState<Record<string, { onlineStatus: string; lastSeen?: string }>>({});
  const [replyingToMessage, setReplyingToMessage] = useState<any>(null);

  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<any>(null);

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
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'MESSAGE_UPDATE' || payload.event === 'MESSAGE_DELETE') {
          // Trigger immediate RTK Query cache tag invalidation
          const tags = [
            { type: 'Message', id: 'LIST' },
            { type: 'Dashboard', id: 'STATS' },
            { type: 'Contact', id: 'LIST' }
          ] as any[];
          if (payload.message && payload.message.groupId) {
            tags.push({ type: 'Message', id: `GROUP_CHAT_${payload.message.groupId}` });
            tags.push({ type: 'Group', id: payload.message.groupId });
          }
          if (payload.groupId) {
            tags.push({ type: 'Message', id: `GROUP_CHAT_${payload.groupId}` });
            tags.push({ type: 'Group', id: payload.groupId });
          }
          dispatch(messagesApi.util.invalidateTags(tags));
          window.dispatchEvent(new Event('notification-ws-update'));
        } else if (payload.event === 'GROUP_UPDATE') {
          dispatch(messagesApi.util.invalidateTags([
            { type: 'Group', id: 'LIST' },
            { type: 'Group', id: 'INVITATIONS' },
            { type: 'Group', id: payload.group.id }
          ]));
          const currentUserMember = payload.group.members.find((m: any) => m.email === user?.email);
          if (currentUserMember && currentUserMember.status === 'PENDING' && !alertedGroupIdsRef.current.includes(payload.group.id)) {
            alertedGroupIdsRef.current.push(payload.group.id);
            alert(`You have been invited to join the group "${payload.group.name}" by ${payload.group.createdByName}!`);
          }
          setSelectedGroup((prev: any) => (prev && prev.id === payload.group.id ? payload.group : prev));
        } else if (payload.event === 'GROUP_LEAVE') {
          dispatch(messagesApi.util.invalidateTags([
            { type: 'Group', id: 'LIST' },
            { type: 'Group', id: payload.groupId }
          ]));
          setSelectedGroup((prev: any) => (prev && prev.id === payload.groupId ? null : prev));
        } else if (payload.event === 'TYPING_START') {
          const key = payload.groupId ? `group_${payload.groupId}_${payload.senderEmail}` : payload.senderEmail;
          setTypingUsers(prev => ({ ...prev, [key]: true }));
        } else if (payload.event === 'TYPING_STOP') {
          const key = payload.groupId ? `group_${payload.groupId}_${payload.senderEmail}` : payload.senderEmail;
          setTypingUsers(prev => ({ ...prev, [key]: false }));
        } else if (payload.event === 'USER_STATUS_CHANGE') {
          setUserStatuses(prev => ({
            ...prev,
            [payload.email]: {
              onlineStatus: payload.status,
              lastSeen: payload.lastSeen
            }
          }));
        }
      } catch (err) {
        console.error('Failed to parse WS payload', err);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [user, dispatch]);

  // Queries
  const { data: contacts = [], isLoading: contactsLoading } = useGetContactsQuery('ACCEPTED');
  const { data: groups = [], isLoading: groupsLoading, refetch: refetchGroups } = useGetGroupsQuery();
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchChatHistory } = useGetChatHistoryQuery(
    selectedContact?.email || '',
    {
      skip: !selectedContact,
    }
  );
  const { data: groupMessages = [], isLoading: groupMessagesLoading, refetch: refetchGroupHistory } = useGetGroupChatHistoryQuery(
    selectedGroup?.id || 0,
    {
      skip: !selectedGroup,
    }
  );
  const { data: invitations = [], refetch: refetchInvitations } = useGetPendingInvitationsQuery();
  const { data: pendingRequests = [] } = useGetPendingRequestsQuery();

  // Mutations
  const [acceptInvitation] = useAcceptInvitationMutation();
  const [leaveGroup] = useLeaveGroupMutation();
  const [makeAdmin] = useMakeAdminMutation();
  const [updateGroupSettings] = useUpdateGroupSettingsMutation();
  const [updateGroupPhoto] = useUpdateGroupPhotoMutation();
  const [addGroupMembers] = useAddGroupMembersMutation();
  const [removeGroupMember] = useRemoveGroupMemberMutation();

  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState<string[]>([]);
  const [showAddMembersSection, setShowAddMembersSection] = useState(false);
  const alertedGroupIdsRef = useRef<number[]>([]);

  const currentGroupMember = selectedGroup?.members?.find((m: any) => m.email === user?.email);
  const isCurrentGroupAdmin = currentGroupMember?.role === 'ADMIN';
  const cannotSendMessage = selectedGroup && selectedGroup.adminsOnlyMessaging && !isCurrentGroupAdmin;

  const activeMessages = selectedGroup ? groupMessages : messages;
  const activeMessagesLoading = selectedGroup ? groupMessagesLoading : messagesLoading;
  const activeChatRefetch = selectedGroup ? refetchGroupHistory : refetchChatHistory;

  // Initialize statuses from contacts list
  useEffect(() => {
    if (contacts && contacts.length > 0) {
      const initial: Record<string, { onlineStatus: string; lastSeen?: string }> = {};
      contacts.forEach(c => {
        initial[c.email] = {
          onlineStatus: (c as any).onlineStatus || 'OFFLINE',
          lastSeen: (c as any).lastSeen
        };
      });
      setUserStatuses(prev => ({ ...initial, ...prev }));
    }
  }, [contacts]);

  const getStatusText = (email: string) => {
    const statusObj = userStatuses[email];
    if (!statusObj) return 'Offline';
    if (statusObj.onlineStatus === 'ONLINE') return 'Online';
    if (statusObj.onlineStatus === 'AWAY') return 'Away';
    return formatLastSeen(statusObj.lastSeen);
  };

  const formatLastSeen = (lastSeenStr?: string) => {
    if (!lastSeenStr) return 'Offline';
    const date = new Date(lastSeenStr);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return `Last seen today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Last seen yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return `Last seen on ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedMessage(val);

    if ((!selectedContact && !selectedGroup) || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    if (!isTypingRef.current && val.trim() !== '') {
      isTypingRef.current = true;
      const payload: any = { event: 'TYPING_START' };
      if (selectedGroup) {
        payload.groupId = selectedGroup.id;
      } else {
        payload.receiverEmail = selectedContact.email;
      }
      wsRef.current.send(JSON.stringify(payload));
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        const payload: any = { event: 'TYPING_STOP' };
        if (selectedGroup) {
          payload.groupId = selectedGroup.id;
        } else {
          payload.receiverEmail = selectedContact.email;
        }
        wsRef.current?.send(JSON.stringify(payload));
      }
    }, 2000);
  };

  const stopTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingRef.current && (selectedContact || selectedGroup) && wsRef.current?.readyState === WebSocket.OPEN) {
      isTypingRef.current = false;
      const payload: any = { event: 'TYPING_STOP' };
      if (selectedGroup) {
        payload.groupId = selectedGroup.id;
      } else {
        payload.receiverEmail = selectedContact.email;
      }
      wsRef.current.send(JSON.stringify(payload));
    }
  };

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

  const handleReply = () => {
    if (!activeMenuMessage) return;
    let senderName = 'You';
    if (activeMenuMessage.senderEmail !== user?.email) {
      if (selectedGroup) {
        const member = selectedGroup.members.find((m: any) => m.email === activeMenuMessage.senderEmail);
        senderName = member ? member.name : activeMenuMessage.senderEmail;
      } else {
        senderName = selectedContact?.name || activeMenuMessage.senderEmail;
      }
    }
    setReplyingToMessage({
      id: activeMenuMessage.id,
      content: activeMenuMessage.content || (activeMenuMessage.messageType !== 'TEXT' ? `[${activeMenuMessage.messageType}]` : ''),
      replyToMessageSenderName: senderName,
      senderEmail: activeMenuMessage.senderEmail
    });
    handleCloseMessageMenu();
  };

  const handleDeleteForEveryone = async () => {
    if (!activeMenuMessage) return;
    try {
      await deleteMsg(activeMenuMessage.id).unwrap();
      activeChatRefetch();
    } catch (err) {
      console.error('Failed to delete message for everyone', err);
    }
    handleCloseMessageMenu();
  };

  const handleDeleteForMe = async () => {
    if (!activeMenuMessage) return;
    try {
      await deleteMsgForMe(activeMenuMessage.id).unwrap();
      activeChatRefetch();
    } catch (err) {
      console.error('Failed to delete message for me', err);
    }
    handleCloseMessageMenu();
  };

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  // Handle send message "now" (which sends directly without scheduling)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || (!selectedContact && !selectedGroup) || sending) return;

    stopTyping();
    setSending(true);
    try {
      const formData = new FormData();
      if (selectedGroup) {
        formData.append('groupId', selectedGroup.id.toString());
      } else {
        formData.append('receiverEmail', selectedContact.email);
      }
      formData.append('messageType', 'TEXT');
      formData.append('recurringType', 'NONE');
      formData.append('content', typedMessage.trim());
      if (replyingToMessage) {
        formData.append('replyToMessageId', replyingToMessage.id.toString());
      }

      await sendMessageMutation(formData).unwrap();
      setTypedMessage('');
      setReplyingToMessage(null);
      activeChatRefetch();
    } catch (err: any) {
      console.error('Failed to send message', err);
      alert(err.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Navigate to Scheduler prefilled with contact or group
  const handleScheduleFuture = () => {
    if (selectedGroup) {
      navigate(PATHS.SCHEDULER, { state: { prefilledGroupId: selectedGroup.id } });
    } else if (selectedContact) {
      navigate(PATHS.SCHEDULER, { state: { prefilledEmail: selectedContact.email } });
    }
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
    if (!photoBlob || (!selectedContact && !selectedGroup)) return;
    setSending(true);
    try {
      const file = new File([photoBlob], 'camera-capture.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      if (selectedGroup) {
        formData.append('groupId', selectedGroup.id.toString());
      } else {
        formData.append('receiverEmail', selectedContact.email);
      }
      formData.append('messageType', 'IMAGE');
      formData.append('recurringType', 'NONE');
      formData.append('content', 'Captured Photo');
      formData.append('file', file);
      if (replyingToMessage) {
        formData.append('replyToMessageId', replyingToMessage.id.toString());
      }

      await sendMessageMutation(formData).unwrap();
      setReplyingToMessage(null);
      handleCloseCamera();
      activeChatRefetch();
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

        if (audioChunksRef.current.length > 0 && (selectedContact || selectedGroup)) {
          setSending(true);
          try {
            const file = new File([audioBlob], 'voice-recording.webm', { type: 'audio/webm' });
            const formData = new FormData();
            if (selectedGroup) {
              formData.append('groupId', selectedGroup.id.toString());
            } else {
              formData.append('receiverEmail', selectedContact.email);
            }
            formData.append('messageType', 'AUDIO');
            formData.append('recurringType', 'NONE');
            formData.append('content', 'Voice Recording');
            formData.append('file', file);
            if (replyingToMessage) {
              formData.append('replyToMessageId', replyingToMessage.id.toString());
            }

            await sendMessageMutation(formData).unwrap();
            setReplyingToMessage(null);
            activeChatRefetch();
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

  const [createGroupMutation, { isLoading: isCreatingGroup }] = useCreateGroupMutation();

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      alert('Group name is required');
      return;
    }
    if (selectedGroupMembers.length === 0) {
      alert('Select at least one group member');
      return;
    }
    try {
      await createGroupMutation({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        memberEmails: selectedGroupMembers
      }).unwrap();

      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedGroupMembers([]);
      setIsCreateGroupOpen(false);
      refetchGroups();
    } catch (err: any) {
      console.error('Failed to create group', err);
      alert(err.data?.message || 'Failed to create group');
    }
  };

  const handleAcceptInvitation = async (groupId: number) => {
    try {
      await acceptInvitation(groupId).unwrap();
      refetchInvitations();
      refetchGroups();
    } catch (err: any) {
      alert(err.data?.message || 'Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (groupId: number) => {
    try {
      await leaveGroup(groupId).unwrap();
      refetchInvitations();
    } catch (err: any) {
      alert(err.data?.message || 'Failed to decline invitation');
    }
  };

  const handleLeaveGroup = async (groupId: number) => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await leaveGroup(groupId).unwrap();
      setSelectedGroup(null);
      closeGroupSettings();
      refetchGroups();
    } catch (err: any) {
      alert(err.data?.message || 'Failed to leave group');
    }
  };

  const handleMakeAdmin = async (groupId: number, userId: number) => {
    try {
      await makeAdmin({ groupId, userId }).unwrap();
      refetchGroups();
      // Update selectedGroup with new details from the refetched groups list
      const updated = groups.find(g => g.id === groupId);
      if (updated) setSelectedGroup(updated);
    } catch (err: any) {
      alert(err.data?.message || 'Failed to promote member');
    }
  };

  const handleSaveGroupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    try {
      const response = await updateGroupSettings({
        groupId: selectedGroup.id,
        name: groupSettingsName.trim(),
        description: groupSettingsDesc.trim() || undefined,
        adminsOnlyMessaging: groupSettingsAdminsOnly
      }).unwrap();
      closeGroupSettings();
      refetchGroups();
      if (response && response.data) {
        setSelectedGroup(response.data);
      }
    } catch (err: any) {
      alert(err.data?.message || 'Failed to update settings');
    }
  };

  const handleUploadGroupPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await updateGroupPhoto({ groupId: selectedGroup.id, formData }).unwrap();
      refetchGroups();
      if (response && response.data) {
        setSelectedGroup(response.data);
      }
    } catch (err: any) {
      alert(err.data?.message || 'Failed to upload group photo');
    }
  };

  const handleAddGroupMembers = async () => {
    if (!selectedGroup || selectedMembersToAdd.length === 0) return;
    try {
      await addGroupMembers({
        groupId: selectedGroup.id,
        memberEmails: selectedMembersToAdd
      }).unwrap();
      setSelectedMembersToAdd([]);
      refetchGroups();
      alert('Members invited successfully!');
    } catch (err: any) {
      alert(err.data?.message || 'Failed to add members');
    }
  };

  const handleRemoveGroupMember = async (userId: number) => {
    if (!selectedGroup) return;
    if (!window.confirm('Are you sure you want to remove this member from the group?')) return;
    try {
      await removeGroupMember({
        groupId: selectedGroup.id,
        userId
      }).unwrap();
      refetchGroups();
    } catch (err: any) {
      alert(err.data?.message || 'Failed to remove member');
    }
  };

  function closeGroupSettings() {
    setIsGroupSettingsOpen(false);
    setShowAddMembersSection(false);
    setSelectedMembersToAdd([]);
  }

  const getGroupTypingText = () => {
    if (!selectedGroup) return '';
    const groupTypingList = Object.keys(typingUsers)
      .filter(k => k.startsWith(`group_${selectedGroup.id}_`) && typingUsers[k])
      .map(k => k.replace(`group_${selectedGroup.id}_`, ''));
      
    if (groupTypingList.length === 0) return '';
    
    const names = groupTypingList.map(email => {
      const contact = contacts.find(c => c.email === email);
      return contact ? contact.name : email;
    });
    
    if (names.length === 1) return `${names[0]} is typing...`;
    return `${names.join(', ')} are typing...`;
  };

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
              placeholder={activeTab === 'direct' ? "Search contacts..." : "Search groups..."}
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

            <Tabs
              value={activeTab}
              onChange={(_e, v) => {
                setActiveTab(v);
                if (v === 'direct') {
                  setSelectedGroup(null);
                } else {
                  setSelectedContact(null);
                }
              }}
              sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab label={pendingRequests.length > 0 ? `Chats (${pendingRequests.length})` : "Chats"} value="direct" sx={{ fontWeight: 600, textTransform: 'none' }} />
              <Tab label={invitations.length > 0 ? `Groups (${invitations.length})` : "Groups"} value="group" sx={{ fontWeight: 600, textTransform: 'none' }} />
            </Tabs>

            {activeTab === 'group' && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setIsCreateGroupOpen(true)}
                sx={{ mb: 2, textTransform: 'none', borderRadius: '12px' }}
                fullWidth
              >
                Create Group
              </Button>
            )}

            {activeTab === 'group' && invitations.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#f59e0b', px: 1 }}>
                  Pending Invitations ({invitations.length})
                </Typography>
                <List sx={{ p: 0, bgcolor: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                  {invitations.map((inv) => (
                    <ListItem
                      key={inv.id}
                      sx={{
                        p: 1.5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        gap: 1
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar src={getMediaUrl(inv.groupPhotoUrl) || undefined} sx={{ bgcolor: '#f59e0b', width: 36, height: 36 }}>
                          {!inv.groupPhotoUrl && <GroupIcon />}
                        </Avatar>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {inv.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Invited by {inv.createdByName}
                          </Typography>
                        </Box>
                      </Box>
                      {inv.description && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', px: 0.5, fontStyle: 'italic' }}>
                          "{inv.description}"
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          onClick={() => handleAcceptInvitation(inv.id)}
                          sx={{ textTransform: 'none', py: 0.5, flexGrow: 1, borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          Accept
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleDeclineInvitation(inv.id)}
                          sx={{ textTransform: 'none', py: 0.5, flexGrow: 1, borderRadius: '6px', fontSize: '0.75rem' }}
                        >
                          Decline
                        </Button>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
              {activeTab === 'direct' ? (
                contactsLoading ? (
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
                              <Box sx={{ position: 'relative' }}>
                                <Avatar 
                                  src={getMediaUrl(c.profilePhotoUrl) || undefined}
                                  sx={{ bgcolor: isSelected ? '#818cf8' : '#334155', color: '#fff', fontWeight: 600 }}
                                >
                                  {!c.profilePhotoUrl && c.name.charAt(0).toUpperCase()}
                                </Avatar>
                                {userStatuses[c.email] && (
                                  <Box sx={{
                                    position: 'absolute',
                                    bottom: 2,
                                    right: 2,
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    bgcolor: userStatuses[c.email].onlineStatus === 'ONLINE' ? '#10b981' : 
                                             userStatuses[c.email].onlineStatus === 'AWAY' ? '#f59e0b' : '#94a3b8',
                                    border: '2px solid',
                                    borderColor: theme.palette.mode === 'dark' ? '#0f172a' : '#ffffff'
                                  }} />
                                )}
                              </Box>
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
                              secondary={
                                typingUsers[c.email] ? (
                                  <Typography component="span" variant="body2" sx={{ color: '#10b981', fontStyle: 'italic', fontWeight: 600, fontSize: '0.8rem', display: 'block' }}>
                                    typing...
                                  </Typography>
                                ) : (
                                  c.email
                                )
                              }
                              secondaryTypographyProps={{ color: 'text.secondary', fontSize: '0.8rem' }}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                )
              ) : (
                groupsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                    <CircularProgress size={30} />
                  </Box>
                ) : groups.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', py: 5 }}>
                    No groups found
                  </Typography>
                ) : (
                  <List sx={{ p: 0 }}>
                    {groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())).map((g) => {
                      const isSelected = selectedGroup?.id === g.id;
                      const hasTyping = Object.keys(typingUsers).some(k => k.startsWith(`group_${g.id}_`) && typingUsers[k]);
                      return (
                        <ListItem
                          key={g.id}
                          disablePadding
                          sx={{ mb: 1 }}
                        >
                          <ListItemButton
                            onClick={() => setSelectedGroup(g)}
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
                                src={getMediaUrl(g.groupPhotoUrl) || undefined}
                                sx={{ bgcolor: isSelected ? '#818cf8' : '#334155', color: '#fff' }}
                              >
                                {!g.groupPhotoUrl && <GroupIcon />}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={g.name}
                              secondary={
                                hasTyping ? (
                                  <Typography component="span" variant="body2" sx={{ color: '#10b981', fontStyle: 'italic', fontWeight: 600, fontSize: '0.8rem', display: 'block' }}>
                                    someone is typing...
                                  </Typography>
                                ) : (
                                  g.description || `${g.members.length} members`
                                )
                              }
                              slotProps={{
                                primary: { sx: { fontWeight: 600, color: 'text.primary' } },
                                secondary: { sx: { color: 'text.secondary', fontSize: '0.8rem' } }
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                )
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
            {selectedContact || selectedGroup ? (
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
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      cursor: selectedGroup ? 'pointer' : 'default',
                      p: 0.5,
                      borderRadius: '8px',
                      transition: 'background-color 0.2s',
                      '&:hover': selectedGroup ? { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' } : {}
                    }}
                    onClick={() => {
                      if (selectedGroup) {
                        setGroupSettingsName(selectedGroup.name);
                        setGroupSettingsDesc(selectedGroup.description || '');
                        setGroupSettingsAdminsOnly(selectedGroup.adminsOnlyMessaging);
                        setIsGroupSettingsOpen(true);
                      }
                    }}
                  >
                    {selectedGroup ? (
                      <Avatar
                        src={getMediaUrl(selectedGroup.groupPhotoUrl) || undefined}
                        sx={{ bgcolor: '#818cf8', color: '#fff' }}
                      >
                        {!selectedGroup.groupPhotoUrl && <GroupIcon />}
                      </Avatar>
                    ) : (
                      <Avatar 
                        src={getMediaUrl(selectedContact.profilePhotoUrl) || undefined}
                        sx={{ bgcolor: '#818cf8', color: '#fff', fontWeight: 700 }}
                      >
                        {!selectedContact.profilePhotoUrl && selectedContact.name.charAt(0).toUpperCase()}
                      </Avatar>
                    )}
                    <Box>
                      <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 700, lineHeight: 1.2 }}>
                        {selectedGroup ? selectedGroup.name : selectedContact.name}
                      </Typography>
                      {selectedGroup ? (
                        getGroupTypingText() ? (
                          <Typography variant="caption" sx={{ color: '#10b981', fontStyle: 'italic', fontWeight: 600 }}>
                            {getGroupTypingText()}
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {selectedGroup.description || `${selectedGroup.members.length} members`}
                          </Typography>
                        )
                      ) : (
                        typingUsers[selectedContact.email] ? (
                          <Typography variant="caption" sx={{ color: '#10b981', fontStyle: 'italic', fontWeight: 600 }}>
                            typing...
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {getStatusText(selectedContact.email)}
                          </Typography>
                        )
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {selectedGroup && (
                      <IconButton
                        onClick={() => {
                          setGroupSettingsName(selectedGroup.name);
                          setGroupSettingsDesc(selectedGroup.description || '');
                          setGroupSettingsAdminsOnly(selectedGroup.adminsOnlyMessaging);
                          setIsGroupSettingsOpen(true);
                        }}
                        sx={{
                          color: '#818cf8',
                          bgcolor: 'rgba(129, 140, 248, 0.05)',
                          '&:hover': {
                            bgcolor: 'rgba(129, 140, 248, 0.12)'
                          }
                        }}
                      >
                        {isCurrentGroupAdmin ? <EditIcon /> : <InfoIcon />}
                      </IconButton>
                    )}
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
                </Box>

                {/* Message Log */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {activeMessagesLoading && activeMessages.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <CircularProgress size={35} />
                    </Box>
                  ) : activeMessages.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1 }}>
                       <ChatIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                       <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                         No messages exchanged yet.
                       </Typography>
                    </Box>
                  ) : (
                    activeMessages.map((m) => {
                      const isMe = m.senderEmail === user?.email;
                      const displayTime = m.scheduledTime || m.sentTime;
                      const date = displayTime ? new Date(displayTime) : new Date();
                      const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const formattedDate = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                      
                      return (
                        <Box
                          id={`message-${m.id}`}
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
                               {selectedGroup && !isMe && (
                                 <Typography variant="caption" sx={{ fontWeight: 700, color: '#818cf8', display: 'block', mb: 0.5 }}>
                                   {(() => {
                                     const groupMember = selectedGroup.members.find((memberItem: any) => memberItem.email === m.senderEmail);
                                     return groupMember ? groupMember.name : m.senderEmail;
                                   })()}
                                 </Typography>
                               )}
                               {m.replyToMessageId && (
                                 <Box
                                   onClick={() => {
                                     const el = document.getElementById(`message-${m.replyToMessageId}`);
                                     el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                   }}
                                   sx={{
                                     p: 1,
                                     mb: 1,
                                     borderRadius: '6px',
                                     bgcolor: isMe ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                     borderLeft: '4px solid',
                                     borderColor: isMe ? '#ec4899' : '#818cf8',
                                     cursor: 'pointer',
                                     display: 'flex',
                                     flexDirection: 'column',
                                     gap: 0.25,
                                     maxWidth: '100%',
                                     '&:hover': {
                                       bgcolor: isMe ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.1)'
                                     }
                                   }}
                                 >
                                   <Typography variant="caption" sx={{ fontWeight: 700, color: isMe ? '#f472b6' : '#a5b4fc', fontSize: '0.75rem' }}>
                                     {m.replyToMessageSenderName}
                                   </Typography>
                                   <Typography variant="body2" sx={{
                                     fontSize: '0.8rem',
                                     color: isMe ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                                     whiteSpace: 'nowrap',
                                     overflow: 'hidden',
                                     textOverflow: 'ellipsis',
                                     maxWidth: '240px'
                                   }}>
                                     {m.replyToMessageContent}
                                   </Typography>
                                 </Box>
                               )}
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
                  sx={{
                    borderTop: '1px solid',
                    borderTopColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {replyingToMessage && (
                    <Box
                      sx={{
                        p: 1.5,
                        px: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                        borderBottom: '1px solid',
                        borderBottomColor: 'divider',
                        borderLeft: '4px solid #818cf8'
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block' }}>
                          Replying to {replyingToMessage.replyToMessageSenderName}
                        </Typography>
                        <Typography variant="body2" sx={{
                          fontSize: '0.85rem',
                          color: 'text.secondary',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '500px'
                        }}>
                          {replyingToMessage.content}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={() => setReplyingToMessage(null)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                  <Box
                    component="form"
                    onSubmit={handleSendMessage}
                    sx={{
                       p: 2,
                       bgcolor: 'transparent',
                       display: 'flex',
                       alignItems: 'center',
                       gap: 1.5
                     }}
                  >
                    {cannotSendMessage ? (
                      <Box sx={{
                        width: '100%',
                        py: 2,
                        px: 3,
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                          Only admins can send messages to this group.
                        </Typography>
                      </Box>
                    ) : isRecording ? (
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
                          onChange={handleInputChange}
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
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, p: 4, textAlign: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(99,102,241,0.08)', color: '#818cf8', width: 80, height: 80 }}>
                  <ChatIcon sx={{ fontSize: 40 }} />
                </Avatar>
                 <Box>
                   <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>
                     Select a Conversation
                   </Typography>
                   <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 320 }}>
                     Choose a contact or group from the sidebar to view your scheduled message queue and delivery history.
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
            <MenuItem key="reply" onClick={handleReply}>
              Reply
            </MenuItem>,
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

      {/* Create Group Dialog */}
      <Dialog
        open={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.primary'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Create New Group</DialogTitle>
        <form onSubmit={handleCreateGroup}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Group Name"
              required
              fullWidth
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              slotProps={{
                input: { style: { color: theme.palette.text.primary } }
              }}
            />
            <TextField
              label="Description (Optional)"
              fullWidth
              multiline
              rows={2}
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
              slotProps={{
                input: { style: { color: theme.palette.text.primary } }
              }}
            />
            <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 700 }}>
              Select Group Members
            </Typography>
            <List sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
              {contacts.length === 0 ? (
                <Typography variant="body2" sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
                  No contacts to invite
                </Typography>
              ) : (
                contacts.map((contact) => (
                  <ListItem key={contact.id} dense>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedGroupMembers.includes(contact.email)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroupMembers([...selectedGroupMembers, contact.email]);
                            } else {
                              setSelectedGroupMembers(selectedGroupMembers.filter(email => email !== contact.email));
                            }
                          }}
                        />
                      }
                      label={`${contact.name} (${contact.email})`}
                    />
                  </ListItem>
                ))
              )}
            </List>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setIsCreateGroupOpen(false)} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isCreatingGroup}
              sx={{ textTransform: 'none', bgcolor: '#818cf8', '&:hover': { bgcolor: '#6366f1' } }}
            >
              {isCreatingGroup ? <CircularProgress size={20} color="inherit" /> : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Group Settings Dialog */}
      <Dialog
        open={isGroupSettingsOpen}
        onClose={closeGroupSettings}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.primary'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Group Info & Settings
          <IconButton onClick={closeGroupSettings} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleSaveGroupSettings}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 0 }}>
            {/* Group Photo Section */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, my: 1 }}>
              <Avatar
                src={getMediaUrl(selectedGroup?.groupPhotoUrl) || undefined}
                sx={{ width: 80, height: 80, bgcolor: '#818cf8', fontSize: '2.5rem' }}
              >
                {!selectedGroup?.groupPhotoUrl && <GroupIcon sx={{ fontSize: 40 }} />}
              </Avatar>
              {isCurrentGroupAdmin && (
                <Button
                  component="label"
                  variant="text"
                  size="small"
                  startIcon={<UploadIcon />}
                  sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                >
                  Change Photo
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleUploadGroupPhoto}
                  />
                </Button>
              )}
            </Box>

            <TextField
              label="Group Name"
              required
              fullWidth
              disabled={!isCurrentGroupAdmin}
              value={groupSettingsName}
              onChange={(e) => setGroupSettingsName(e.target.value)}
              slotProps={{
                input: { style: { color: theme.palette.text.primary } }
              }}
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              disabled={!isCurrentGroupAdmin}
              value={groupSettingsDesc}
              onChange={(e) => setGroupSettingsDesc(e.target.value)}
              slotProps={{
                input: { style: { color: theme.palette.text.primary } }
              }}
            />

            {isCurrentGroupAdmin && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={groupSettingsAdminsOnly}
                    onChange={(e) => setGroupSettingsAdminsOnly(e.target.checked)}
                  />
                }
                label="Only Admins can send messages"
              />
            )}

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>
              Members ({selectedGroup?.members?.length || 0})
            </Typography>

            <List sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: 0 }}>
              {selectedGroup?.members?.map((member: any) => {
                const isMemberAdmin = member.role === 'ADMIN';
                const isMemberPending = member.status === 'PENDING';
                return (
                  <ListItem
                    key={member.id}
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' }
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Avatar
                        src={getMediaUrl(member.profilePhotoUrl) || undefined}
                        sx={{ width: 32, height: 32, bgcolor: '#334155', fontSize: '0.9rem' }}
                      >
                        {!member.profilePhotoUrl && member.name.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {member.name}
                          </Typography>
                          {isMemberAdmin && (
                            <Chip
                              label="Admin"
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: '0.65rem',
                                bgcolor: 'rgba(99, 102, 241, 0.15)',
                                color: '#818cf8',
                                fontWeight: 700
                              }}
                            />
                          )}
                          {isMemberPending && (
                            <Chip
                              label="Invited"
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: '0.65rem',
                                bgcolor: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                                fontWeight: 700
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={member.email}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isCurrentGroupAdmin && !isMemberAdmin && !isMemberPending && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleMakeAdmin(selectedGroup.id, member.id)}
                          sx={{ textTransform: 'none', py: 0.25, px: 1, fontSize: '0.7rem', borderRadius: '6px' }}
                        >
                          Make Admin
                        </Button>
                      )}
                      {isCurrentGroupAdmin && member.email !== user?.email && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveGroupMember(member.id)}
                          sx={{ p: 0.5 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </ListItem>
                );
              })}
            </List>

            {isCurrentGroupAdmin && (
              <Box sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Add New Members
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setShowAddMembersSection(!showAddMembersSection)}
                    sx={{
                      color: '#818cf8',
                      bgcolor: 'rgba(129, 140, 248, 0.05)',
                      '&:hover': { bgcolor: 'rgba(129, 140, 248, 0.12)' }
                    }}
                  >
                    {showAddMembersSection ? <CloseIcon fontSize="small" /> : <AddIcon fontSize="small" />}
                  </IconButton>
                </Box>
                {showAddMembersSection && (
                  contacts.filter(c => !selectedGroup?.members?.some((m: any) => m.email === c.email)).length === 0 ? (
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', px: 1 }}>
                      All contacts are already members of this group.
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <List sx={{ maxHeight: 120, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: 0 }}>
                        {contacts
                          .filter(c => !selectedGroup?.members?.some((m: any) => m.email === c.email))
                          .map((contact) => (
                            <ListItem key={contact.id} dense sx={{ py: 0.5 }}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={selectedMembersToAdd.includes(contact.email)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedMembersToAdd([...selectedMembersToAdd, contact.email]);
                                      } else {
                                        setSelectedMembersToAdd(selectedMembersToAdd.filter(email => email !== contact.email));
                                      }
                                    }}
                                  />
                                }
                                label={`${contact.name} (${contact.email})`}
                                slotProps={{
                                  typography: { variant: 'body2', sx: { fontSize: '0.85rem' } }
                                }}
                              />
                            </ListItem>
                          ))}
                      </List>
                      <Button
                        variant="contained"
                        size="small"
                        disabled={selectedMembersToAdd.length === 0}
                        onClick={handleAddGroupMembers}
                        sx={{ textTransform: 'none', alignSelf: 'flex-end', bgcolor: '#818cf8', '&:hover': { bgcolor: '#6366f1' } }}
                      >
                        Invite Selected ({selectedMembersToAdd.length})
                      </Button>
                    </Box>
                  )
                )}
              </Box>
            )}

            <Button
              variant="outlined"
              color="error"
              startIcon={<LeaveIcon />}
              onClick={() => handleLeaveGroup(selectedGroup?.id)}
              sx={{ textTransform: 'none', mt: 1, borderRadius: '8px' }}
              fullWidth
            >
              Leave Group
            </Button>
          </DialogContent>

          {isCurrentGroupAdmin && (
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={closeGroupSettings} sx={{ textTransform: 'none' }}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                sx={{ textTransform: 'none', bgcolor: '#818cf8', '&:hover': { bgcolor: '#6366f1' } }}
              >
                Save Settings
              </Button>
            </DialogActions>
          )}
        </form>
      </Dialog>
    </Box>
  );
};

export default Chats;
