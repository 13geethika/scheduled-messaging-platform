import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useGetContactsQuery } from '../../store/contacts/contactsApi';
import {
  useGetMessagesQuery,
  useScheduleMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  usePauseMessageMutation,
  useResumeMessageMutation,
  useRetryFailedMessageMutation
} from '../../store/messages/messagesApi';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { getMediaUrl } from '../../shared/services/api';
import {
  Box, Typography, Grid, Paper, TextField, Button, Select, MenuItem,
  FormControl, InputLabel, FormHelperText, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, Tooltip, CircularProgress, Link
} from '@mui/material';
import {
  PlayArrow as ResumeIcon, Pause as PauseIcon, Delete as DeleteIcon,
  Edit as EditIcon, Replay as RetryIcon, Upload as UploadIcon, Schedule as ScheduleIcon
} from '@mui/icons-material';

const schema = yup.object().shape({
  receiverEmail: yup.string().email('Enter a valid email').required('Recipient is required'),
  content: yup.string().when('messageType', {
    is: 'TEXT',
    then: (s) => s.required('Content is required for text messages'),
    otherwise: (s) => s.nullable(),
  }),
  messageType: yup.string().required('Message type is required'),
  scheduledTime: yup.string()
    .required('Scheduled date & time is required')
    .test('is-future', 'Scheduled time must be in the future', (value) => {
      if (!value) return false;
      return new Date(value) > new Date();
    }),
  recurringType: yup.string().required('Frequency is required'),
});

const formatToLocalDatetimeLocal = (utcString: string) => {
  if (!utcString) return '';
  const date = new Date(utcString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const Scheduler: React.FC = () => {
  const location = useLocation();
  const prefilledEmail = location.state?.prefilledEmail;

  // Local Alerts
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Queries
  const { data: contacts = [] } = useGetContactsQuery('ACCEPTED');
  const { data: messages = [], isLoading: loadingMessages, refetch: refetchMessages } = useGetMessagesQuery();

  // Mutations
  const [scheduleMsg, { isLoading: isScheduling }] = useScheduleMessageMutation();
  const [editMsg] = useEditMessageMutation();
  const [deleteMsg] = useDeleteMessageMutation();
  const [pauseMsg] = usePauseMessageMutation();
  const [resumeMsg] = useResumeMessageMutation();
  const [retryFailedMsg] = useRetryFailedMessageMutation();

  const loading = loadingMessages;
  const activeSchedules = messages;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editingMsg, setEditingMsg] = useState<any>(null); // Message details being edited
  const [openEditModal, setOpenEditModal] = useState(false);

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      messageType: 'TEXT',
      recurringType: 'NONE',
      receiverEmail: '',
      content: '',
      scheduledTime: '',
    }
  });

  const selectedMessageType = watch('messageType');

  useEffect(() => {
    if (prefilledEmail) {
      reset({
        messageType: 'TEXT',
        recurringType: 'NONE',
        receiverEmail: prefilledEmail,
        content: '',
        scheduledTime: '',
      });
    }
  }, [prefilledEmail, reset]);

  const onSchedule = async (data: any) => {
    try {
      setSuccessMessage(null);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append('receiverEmail', data.receiverEmail);
      formData.append('messageType', data.messageType);
      formData.append('scheduledTime', new Date(data.scheduledTime).toISOString());
      formData.append('recurringType', data.recurringType);
      if (data.content) {
        formData.append('content', data.content);
      }
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await scheduleMsg(formData).unwrap();
      setSuccessMessage('Message scheduled successfully');
      reset({
        messageType: 'TEXT',
        recurringType: 'NONE',
        content: '',
        scheduledTime: '',
        receiverEmail: '',
      });
      setSelectedFile(null);
      refetchMessages();
    } catch (err: any) {
      setErrorMessage(err.data?.error || err.data?.message || 'Failed to schedule message');
    }
  };

  const handleEditOpen = (msg: any) => {
    setEditingMsg({
      ...msg,
      scheduledTime: formatToLocalDatetimeLocal(msg.scheduledTime)
    });
    setOpenEditModal(true);
  };

  const handleEditClose = () => {
    setEditingMsg(null);
    setEditFile(null);
    setOpenEditModal(false);
  };

  const onUpdateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMsg) return;

    try {
      setSuccessMessage(null);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append('receiverEmail', editingMsg.receiverEmail);
      formData.append('messageType', editingMsg.messageType);
      formData.append('scheduledTime', new Date(editingMsg.scheduledTime).toISOString());
      formData.append('recurringType', editingMsg.recurringType);
      if (editingMsg.content) {
        formData.append('content', editingMsg.content);
      }
      if (editFile) {
        formData.append('file', editFile);
      }

      await editMsg({ id: editingMsg.id, formData }).unwrap();
      setSuccessMessage('Message updated successfully');
      handleEditClose();
      refetchMessages();
    } catch (err: any) {
      setErrorMessage(err.data?.error || err.data?.message || 'Failed to update message');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setSuccessMessage(null);
      setErrorMessage(null);
      await deleteMsg(id).unwrap();
      setSuccessMessage('Message schedule deleted successfully');
      refetchMessages();
    } catch (err: any) {
      setErrorMessage(err.data?.error || err.data?.message || 'Failed to delete message');
    }
  };

  const handlePause = async (id: number) => {
    try {
      setSuccessMessage(null);
      setErrorMessage(null);
      await pauseMsg(id).unwrap();
      setSuccessMessage('Job trigger paused successfully');
      refetchMessages();
    } catch (err: any) {
      setErrorMessage(err.data?.error || err.data?.message || 'Failed to pause job trigger');
    }
  };

  const handleResume = async (id: number) => {
    try {
      setSuccessMessage(null);
      setErrorMessage(null);
      await resumeMsg(id).unwrap();
      setSuccessMessage('Job trigger resumed successfully');
      refetchMessages();
    } catch (err: any) {
      setErrorMessage(err.data?.error || err.data?.message || 'Failed to resume job trigger');
    }
  };

  const handleRetry = async (id: number) => {
    try {
      setSuccessMessage(null);
      setErrorMessage(null);
      await retryFailedMsg(id).unwrap();
      setSuccessMessage('Retrying job trigger execution');
      refetchMessages();
    } catch (err: any) {
      setErrorMessage(err.data?.error || err.data?.message || 'Failed to retry job trigger');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setEditFile(e.target.files[0]);
    }
  };

  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'success';
      case 'FAILED': return 'error';
      case 'PENDING': return 'default'; // Paused
      case 'SCHEDULED': return 'warning'; // Active
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
          Scheduler
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Schedule new messages and media resources, view triggers, and toggle job parameters.
        </Typography>
      </Box>

      {errorMessage && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{errorMessage}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>{successMessage}</Alert>}

      <Grid container spacing={4} sx={{ mb: 5 }}>
        {/* Schedule Form */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '20px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <ScheduleIcon sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Create Schedule
              </Typography>
            </Box>
            
            <form onSubmit={handleSubmit(onSchedule)} noValidate>
              {/* Recipient selection */}
              <FormControl fullWidth sx={{ mb: 2.5 }} error={!!errors.receiverEmail}>
                <InputLabel>Recipient</InputLabel>
                <Controller
                  name="receiverEmail"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Recipient"
                      sx={{}}
                    >
                      {contacts.length === 0 ? (
                        <MenuItem disabled value="">No contacts available</MenuItem>
                      ) : (
                        contacts.map(c => (
                          <MenuItem key={c.id} value={c.email}>{c.name} ({c.email})</MenuItem>
                        ))
                      )}
                    </Select>
                  )}
                />
                <FormHelperText>{errors.receiverEmail?.message}</FormHelperText>
              </FormControl>

              {/* Message Type */}
              <FormControl fullWidth sx={{ mb: 2.5 }}>
                <InputLabel>Message Type</InputLabel>
                <Controller
                  name="messageType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Message Type"
                      sx={{}}
                    >
                      <MenuItem value="TEXT">Text Message</MenuItem>
                      <MenuItem value="IMAGE">Image Attachment</MenuItem>
                      <MenuItem value="VIDEO">Video Attachment</MenuItem>
                      <MenuItem value="AUDIO">Audio Attachment</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>

              {/* Text content field (optional for media, required for text) */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Message Content"
                error={!!errors.content}
                helperText={errors.content?.message}
                {...register('content')}
                sx={{ mb: 2.5 }}
              />

              {/* Media Upload (visible if not text type) */}
              {selectedMessageType !== 'TEXT' && (
                <Box sx={{ mb: 2.5 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    startIcon={<UploadIcon />}
                    sx={{
                      py: 1.2, borderColor: 'divider', color: 'text.secondary', textTransform: 'none',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
                    }}
                  >
                    Upload Media Attachment
                    <input type="file" hidden onChange={handleFileChange} accept={selectedMessageType === 'IMAGE' ? 'image/*' : selectedMessageType === 'VIDEO' ? 'video/*' : 'audio/*'} />
                  </Button>
                  {selectedFile && (
                    <Typography variant="caption" sx={{ color: '#818cf8', display: 'block', mt: 1, fontWeight: 600 }}>
                      Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </Typography>
                  )}
                </Box>
              )}

              {/* Date & Time Picker */}
              <TextField
                fullWidth
                type="datetime-local"
                label="Scheduled Date & Time"
                error={!!errors.scheduledTime}
                helperText={errors.scheduledTime?.message}
                {...register('scheduledTime')}
                slotProps={{
                  inputLabel: { shrink: true }
                }}
                sx={{ mb: 2.5 }}
              />

              {/* Recurring schedule */}
              <FormControl fullWidth sx={{ mb: 3.5 }}>
                <InputLabel>Frequency</InputLabel>
                <Controller
                  name="recurringType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Frequency"
                      sx={{}}
                    >
                      <MenuItem value="NONE">Once (No Recurrence)</MenuItem>
                      <MenuItem value="DAILY">Daily</MenuItem>
                      <MenuItem value="WEEKLY">Weekly</MenuItem>
                      <MenuItem value="MONTHLY">Monthly</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isScheduling}
                sx={{
                  py: 1.5,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                {isScheduling ? <CircularProgress size={24} color="inherit" /> : 'Schedule Message'}
              </Button>
            </form>
          </Paper>
        </Grid>

        {/* Schedules Table */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '20px' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, color: 'text.primary' }}>
              Job Schedules
            </Typography>

            {loading && activeSchedules.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
            ) : activeSchedules.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', py: 5 }}>No schedules found. Create one to begin.</Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ '& th': { borderColor: 'divider', color: 'text.secondary', fontWeight: 700 } }}>
                      <TableCell>Recipient</TableCell>
                      <TableCell>Content / Attachment</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Schedule Details</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeSchedules.map((m) => (
                      <TableRow key={m.id} sx={{ '& td': { borderColor: 'divider', color: 'text.primary' } }}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.receiverName}</Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>{m.receiverEmail}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.messageType === 'TEXT' ? m.content : (
                            <Link href={m.fileUrl ? getMediaUrl(m.fileUrl) : '#'} target="_blank" rel="noreferrer" sx={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
                              View Attachment
                            </Link>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip label={m.messageType} size="small" sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ display: 'block', fontWeight: 500 }}>
                            {new Date(m.scheduledTime).toLocaleString()}
                          </Typography>
                          {m.recurringType !== 'NONE' && (
                            <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 600 }}>
                              Recurring: {m.recurringType}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip label={m.status} color={getStatusChipColor(m.status)} size="small" sx={{ fontWeight: 600 }} />
                          {m.status === 'FAILED' && m.errorMessage && (
                            <Tooltip title={m.errorMessage}>
                              <Typography variant="caption" sx={{ color: '#ef4444', display: 'block', mt: 0.5, cursor: 'pointer', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Details
                              </Typography>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                            {m.status === 'SCHEDULED' && (
                              <Tooltip title="Pause Job">
                                <IconButton onClick={() => handlePause(m.id)} sx={{ color: '#f59e0b' }} size="small">
                                  <PauseIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {m.status === 'PENDING' && (
                              <Tooltip title="Resume Job">
                                <IconButton onClick={() => handleResume(m.id)} sx={{ color: '#10b981' }} size="small">
                                  <ResumeIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {m.status === 'FAILED' && (
                              <Tooltip title="Retry Job">
                                <IconButton onClick={() => handleRetry(m.id)} sx={{ color: '#818cf8' }} size="small">
                                  <RetryIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {m.status !== 'DELIVERED' && (
                              <Tooltip title="Edit Details">
                                <IconButton onClick={() => handleEditOpen(m)} sx={{ color: '#38bdf8' }} size="small">
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Delete Schedule">
                              <IconButton onClick={() => handleDelete(m.id)} sx={{ color: '#ef4444' }} size="small">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Modal */}
      <Dialog
        open={openEditModal}
        onClose={handleEditClose}
        PaperProps={{
          sx: { bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider', borderRadius: '20px', width: '100%', maxWidth: 450 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Scheduled Job</DialogTitle>
        <form onSubmit={onUpdateMessage}>
          <DialogContent>
            {editingMsg && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  fullWidth
                  disabled
                  label="Recipient"
                  value={editingMsg.receiverEmail}
                  sx={{}}
                />

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Message Content"
                  value={editingMsg.content || ''}
                  onChange={(e) => setEditingMsg({ ...editingMsg, content: e.target.value })}
                  sx={{}}
                />

                {editingMsg.messageType !== 'TEXT' && (
                  <Box>
                    <Button
                      variant="outlined"
                      component="label"
                      fullWidth
                      startIcon={<UploadIcon />}
                      sx={{ py: 1, borderColor: 'divider', color: 'text.secondary', textTransform: 'none', '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' } }}
                    >
                      Update Attachment File
                      <input type="file" hidden onChange={handleEditFileChange} accept={editingMsg.messageType === 'IMAGE' ? 'image/*' : editingMsg.messageType === 'VIDEO' ? 'video/*' : 'audio/*'} />
                    </Button>
                    {editFile ? (
                      <Typography variant="caption" sx={{ color: '#818cf8', display: 'block', mt: 1, fontWeight: 600 }}>
                        New: {editFile.name}
                      </Typography>
                    ) : editingMsg.fileUrl ? (
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 1 }}>
                        Existing attachment will be preserved
                      </Typography>
                    ) : null}
                  </Box>
                )}

                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Scheduled Date & Time"
                  value={editingMsg.scheduledTime}
                  onChange={(e) => setEditingMsg({ ...editingMsg, scheduledTime: e.target.value })}
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                  sx={{}}
                />

                <FormControl fullWidth>
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={editingMsg.recurringType}
                    label="Frequency"
                    onChange={(e) => setEditingMsg({ ...editingMsg, recurringType: e.target.value })}
                    sx={{}}
                  >
                    <MenuItem value="NONE">Once (No Recurrence)</MenuItem>
                    <MenuItem value="DAILY">Daily</MenuItem>
                    <MenuItem value="WEEKLY">Weekly</MenuItem>
                    <MenuItem value="MONTHLY">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleEditClose} sx={{ color: '#64748b', textTransform: 'none' }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#818cf8', '&:hover': { bgcolor: '#6366f1' }, textTransform: 'none', borderRadius: '8px' }}>
              Save Changes
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Scheduler;
