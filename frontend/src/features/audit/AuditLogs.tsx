import React from 'react';
import { Box, Typography, Alert, CircularProgress, Chip } from '@mui/material';
import { useGetAuditLogsQuery } from '../../store/audit/auditApi';
import { VirtualizedTable } from '../../shared/components/VirtualizedTable';

export const AuditLogs: React.FC = () => {
  const { data: auditLogs = [], isLoading, error } = useGetAuditLogsQuery();

  const getEventColor = (eventName: string) => {
    if (eventName.includes('HIJACKING') || eventName.includes('FAILED') || eventName.includes('LOCKED')) return 'error';
    if (eventName.includes('SUCCESS') || eventName.includes('REGISTER')) return 'success';
    if (eventName.includes('LOGOUT')) return 'warning';
    return 'default';
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: '80px' },
    {
      field: 'eventName',
      headerName: 'Event',
      width: '180px',
      renderCell: (row: any) => (
        <Chip
          label={row.eventName}
          size="small"
          color={getEventColor(row.eventName) as any}
          sx={{ fontWeight: 700 }}
        />
      ),
    },
    { field: 'actor', headerName: 'Actor (User)', width: '220px' },
    { field: 'ipAddress', headerName: 'IP Address', width: '150px' },
    { field: 'actionDetails', headerName: 'Action Details', width: '400px' },
    {
      field: 'createdAt',
      headerName: 'Timestamp',
      width: '200px',
      renderCell: (row: any) => new Date(row.createdAt).toLocaleString(),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#f8fafc', mb: 1 }}>
          Security Audit Logs
        </Typography>
        <Typography variant="body1" sx={{ color: '#94a3b8' }}>
          Real-time stream of authorization events, user registrations, logins, and trigger rotation failures.
        </Typography>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
          Failed to load security audit logs. Ensure your user has ROLE_ADMIN permissions.
        </Alert>
      ) : null}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : auditLogs.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: '12px' }}>
          No audit records found.
        </Alert>
      ) : (
        <VirtualizedTable columns={columns} rows={auditLogs} rowHeight={60} height={550} />
      )}
    </Box>
  );
};

export default AuditLogs;
