import { useState, useEffect } from 'react';
import type { ThemeMode } from '../types';
import { getActivityLogsApi } from '../lib/api';

interface ActivityLogProps {
  theme: ThemeMode;
}

interface LogItem {
  id: number;
  email: string;
  name: string;
  role: string;
  action: 'LOGIN' | 'LOGOUT' | 'REGISTER' | string;
  timestamp?: string;
  createdAt?: string;
  ipAddress: string;
}

export default function ActivityLogPanel({ theme: _theme }: ActivityLogProps) {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getActivityLogsApi()
      .then(res => {
        if (res.success && res.logs) {
          setLogs(res.logs);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Gagal memuat activity logs:", err);
        setLoading(false);
      });
  }, []);

  const filteredLogs = logs.filter(log => filterRole === 'all' || (log.role && log.role.toLowerCase().includes(filterRole.toLowerCase())));

  return (
    <div style={{ padding: '24px 16px 80px', maxWidth: 1000, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      {/* Banner */}
      <div className="am-card" style={{ padding: 24, borderRadius: 20, background: 'linear-gradient(135deg, #03045E 0%, #0077B6 100%)', color: 'white', marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>📋 Log Aktivitas Login & Logout User</div>
        <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>
          Pantau riwayat akses seluruh pengguna sistem (Buyer, Seller, Admin Koperasi, dan Driver) secara real-time.
        </p>
      </div>

      {/* Filter Role */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Filter Peran:</span>
        {['all', 'buyer', 'seller', 'driver', 'admin', 'super_admin'].map(r => (
          <button
            key={r}
            onClick={() => setFilterRole(r)}
            style={{
              padding: '6px 12px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: filterRole === r ? 'var(--am-primary)' : 'var(--am-surface)',
              color: filterRole === r ? 'white' : 'var(--am-text)',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tabel Log Aktivitas */}
      <div className="am-card" style={{ padding: 16, borderRadius: 16, background: 'var(--am-surface)', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--am-text-muted)' }}>Memuat log aktivitas...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--am-text-muted)' }}>Belum ada log aktivitas tercatat.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--am-border)', color: 'var(--am-text-muted)' }}>
                <th style={{ padding: '10px' }}>Waktu</th>
                <th style={{ padding: '10px' }}>Pengguna</th>
                <th style={{ padding: '10px' }}>Role</th>
                <th style={{ padding: '10px' }}>Aktivitas</th>
                <th style={{ padding: '10px' }}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => {
                const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleString('id-ID') : (log.timestamp || '-');
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--am-border)' }}>
                    <td style={{ padding: '12px 10px', fontSize: 12, color: 'var(--am-text-muted)' }}>{dateStr}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--am-text)' }}>{log.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>{log.email}</div>
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: '#E0F2FE', color: '#0369A1' }}>
                        {(log.role || 'USER').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{ 
                        fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                        background: log.action === 'LOGIN' ? '#DCFCE7' : log.action === 'LOGOUT' ? '#FEE2E2' : '#FEF3C7',
                        color: log.action === 'LOGIN' ? '#16A34A' : log.action === 'LOGOUT' ? '#DC2626' : '#D97706'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', fontSize: 12, fontFamily: 'monospace', color: 'var(--am-text-muted)' }}>{log.ipAddress || '127.0.0.1'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
