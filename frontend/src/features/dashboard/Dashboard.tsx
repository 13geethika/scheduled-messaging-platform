import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { fetchDashboardStats } from '../../store/messages/messagesSlice';
import {
  Grid, Card, CardContent, Typography, Box, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, CircularProgress, Alert, Link, useTheme
} from '@mui/material';
import {
  Send as SendIcon, ErrorOutline as FailedIcon, HourglassEmpty as PendingIcon,
  Message as MsgIcon
} from '@mui/icons-material';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

export const Dashboard: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { stats, loading, error } = useSelector((state: RootState) => state.messages);

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: '#818cf8' }} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ borderRadius: '12px' }}>{error}</Alert>;
  }

  // Fallback / default data
  const total = stats?.totalScheduled || 0;
  const delivered = stats?.deliveredCount || 0;
  const failed = stats?.failedCount || 0;
  const pending = stats?.pendingCount || 0;
  const upcoming = stats?.upcomingMessages || [];

  const cards = [
    { title: 'Total Messages', value: total, icon: <MsgIcon sx={{ fontSize: 28 }} />, color: '#6366f1', bg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0) 100%)' },
    { title: 'Delivered Messages', value: delivered, icon: <SendIcon sx={{ fontSize: 28 }} />, color: '#10b981', bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0) 100%)' },
    { title: 'Active Schedules', value: pending, icon: <PendingIcon sx={{ fontSize: 28 }} />, color: '#f59e0b', bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0) 100%)' },
    { title: 'Failed Delivery', value: failed, icon: <FailedIcon sx={{ fontSize: 28 }} />, color: '#ef4444', bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0) 100%)' },
  ];

  // Recharts Pie Data
  const pieData = [
    { name: 'Delivered', value: delivered, color: '#10b981' },
    { name: 'Pending', value: pending, color: '#f59e0b' },
    { name: 'Failed', value: failed, color: '#ef4444' }
  ].filter(d => d.value > 0);

  // If no data, populate a mock item to draw a blank/grey circle
  const defaultPieData = pieData.length > 0 ? pieData : [{ name: 'No Messages', value: 1, color: '#475569' }];

  // Recharts Bar Data
  const barData = [
    { name: 'Total', Count: total },
    { name: 'Delivered', Count: delivered },
    { name: 'Scheduled', Count: pending },
    { name: 'Failed', Count: failed }
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
          Overview
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Real-time tracking of message scheduling and Quartz execution statistics.
        </Typography>
      </Box>

      {/* Analytics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cards.map((c) => (
          <Grid item xs={12} sm={6} md={3} key={c.title}>
            <Card
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '16px',
                backgroundImage: c.bg,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.palette.mode === 'dark' ? '0 12px 20px -10px rgba(0,0,0,0.5)' : '0 12px 20px -10px rgba(0,0,0,0.1)',
                  borderColor: theme.palette.primary.main
                }
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>
                    {c.title}
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 800 }}>
                    {c.value}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.02)', color: c.color }}>
                  {c.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Analytics Graphs */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '20px', color: 'text.primary' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3 }}>
              Delivery Overview
            </Typography>
            <Box sx={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis dataKey="name" stroke={theme.palette.text.secondary} tickLine={false} />
                  <YAxis stroke={theme.palette.text.secondary} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '8px' }}
                    labelStyle={{ color: theme.palette.text.primary, fontWeight: 600 }}
                  />
                  <Bar dataKey="Count" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '20px', color: 'text.primary', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3 }}>
              Status Breakdown
            </Typography>
            <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={defaultPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {defaultPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '8px' }}
                    itemStyle={{ color: theme.palette.text.primary }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Upcoming Table */}
      <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '20px', color: 'text.primary' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Upcoming Deliveries
        </Typography>
        {upcoming.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">No upcoming scheduled messages</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: 'divider', color: 'text.secondary', fontWeight: 700 } }}>
                  <TableCell>Recipient</TableCell>
                  <TableCell>Content / Attachment</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell>Scheduled Time</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {upcoming.map((row) => (
                  <TableRow key={row.id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0' } }}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.receiverName}</Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>{row.receiverEmail}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {row.messageType === 'TEXT' ? row.content : (
                        <Link href={row.fileUrl || '#'} target="_blank" rel="noreferrer" sx={{ color: '#818cf8', textDecoration: 'none' }}>
                          View Attachment
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={row.messageType} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: '#f8fafc', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>{row.recurringType}</TableCell>
                    <TableCell>{new Date(row.scheduledTime).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip label={row.status} color="warning" size="small" sx={{ fontWeight: 600 }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default Dashboard;
