import React, { useRef, useState } from 'react';
import type { UIEvent } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

interface Column {
  field: string;
  headerName: string;
  width: number | string;
  renderCell?: (row: any) => React.ReactNode;
}

interface VirtualizedTableProps {
  columns: Column[];
  rows: any[];
  rowHeight?: number;
  height?: number;
}

export const VirtualizedTable: React.FC<VirtualizedTableProps> = ({ columns, rows, rowHeight = 60, height = 500 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const visibleCount = Math.ceil(height / rowHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 3);
  const endIndex = Math.min(rows.length - 1, startIndex + visibleCount + 5);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const visibleRows = rows.slice(startIndex, endIndex + 1);

  return (
    <TableContainer
      component={Paper}
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height, overflowY: 'auto', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px' }}
    >
      <Table stickyHeader style={{ minWidth: 650 }}>
        <TableHead>
          <TableRow sx={{ '& th': { backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontWeight: 700 } }}>
            {columns.map((col) => (
              <TableCell key={col.field} style={{ width: col.width }}>
                {col.headerName}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Spacer before visible items */}
          {startIndex > 0 && (
            <TableRow style={{ height: startIndex * rowHeight }}>
              <TableCell colSpan={columns.length} style={{ padding: 0, border: 0 }} />
            </TableRow>
          )}
          {visibleRows.map((row, index) => {
            const actualIndex = startIndex + index;
            return (
              <TableRow
                key={row.id || actualIndex}
                style={{ height: rowHeight }}
                sx={{
                  '& td': { borderColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0', py: 1.5 },
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.01)' }
                }}
              >
                {columns.map((col) => (
                  <TableCell key={col.field} style={{ width: col.width }}>
                    {col.renderCell ? col.renderCell(row) : row[col.field]}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
          {/* Spacer after visible items */}
          {rows.length - 1 > endIndex && (
            <TableRow style={{ height: (rows.length - 1 - endIndex) * rowHeight }}>
              <TableCell colSpan={columns.length} style={{ padding: 0, border: 0 }} />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
