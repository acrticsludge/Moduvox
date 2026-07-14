import React from 'react';
import { theme } from '../../styles/theme';

export const AnalyticsMockup: React.FC = () => {
  const viewers = [
    { name: 'Sarah Chen', email: 'sarah@company.com', status: 'Completed', completion: 100, time: '12:04' },
    { name: 'Mike Torres', email: 'mike@company.com', status: 'In progress', completion: 67, time: '8:30' },
    { name: 'Priya Kapoor', email: 'priya@company.com', status: 'Not viewed', completion: 0, time: '—' },
    { name: 'James Wilson', email: 'james@company.com', status: 'Completed', completion: 100, time: '8:30' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return { bg: theme.colors.green50, border: `${theme.colors.green500}40`, color: theme.colors.green700 };
      case 'In progress':
        return { bg: theme.colors.amber100, border: `${theme.colors.amber700}40`, color: theme.colors.amber700 };
      default:
        return { bg: theme.colors.zinc100, border: `${theme.colors.zinc300}40`, color: theme.colors.mutedSteel };
    }
  };

  return (
    <div
      style={{
        background: theme.colors.surface,
        borderRadius: theme.radius.xl,
        padding: 24,
        border: `1px solid ${theme.colors.zinc200}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Summary Stats */}
      <div style={{ display: 'flex', gap: 24, paddingBottom: 16, borderBottom: `1px solid ${theme.colors.zinc200}` }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: theme.colors.charcoal, fontFamily: theme.fonts.sans }}>4</div>
          <div style={{ fontSize: 12, color: theme.colors.mutedSteel, fontFamily: theme.fonts.sans, marginTop: 4 }}>Total viewers</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: theme.colors.charcoal, fontFamily: theme.fonts.sans }}>2</div>
          <div style={{ fontSize: 12, color: theme.colors.mutedSteel, fontFamily: theme.fonts.sans, marginTop: 4 }}>Completed</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: theme.colors.charcoal, fontFamily: theme.fonts.sans }}>67%</div>
          <div style={{ fontSize: 12, color: theme.colors.mutedSteel, fontFamily: theme.fonts.sans, marginTop: 4 }}>Avg completion</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: theme.fonts.sans }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.colors.zinc200}` }}>
              {['Name', 'Email', 'Status', 'Completion', 'Time'].map((header) => (
                <th
                  key={header}
                  style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    fontWeight: 500,
                    color: theme.colors.mutedSteel,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {viewers.map((viewer) => {
              const statusStyle = getStatusBadge(viewer.status);
              return (
                <tr key={viewer.email} style={{ borderBottom: `1px solid ${theme.colors.zinc100}` }}>
                  <td style={{ padding: '12px 16px', color: theme.colors.charcoal, fontWeight: 500 }}>
                    {viewer.name}
                  </td>
                  <td style={{ padding: '12px 16px', color: theme.colors.mutedSteel }}>{viewer.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: theme.radius.sm,
                        fontSize: 11,
                        fontWeight: 500,
                        background: statusStyle.bg,
                        border: `1px solid ${statusStyle.border}`,
                        color: statusStyle.color,
                      }}
                    >
                      {viewer.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: theme.colors.charcoal }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 4, background: theme.colors.zinc200, borderRadius: 2 }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${viewer.completion}%`,
                            background: viewer.status === 'Completed' ? theme.colors.green500 : theme.colors.amber500,
                            borderRadius: 2,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 11, fontFamily: theme.fonts.mono, fontVariantNumeric: 'tabular-nums' }}>
                        {viewer.completion}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: theme.colors.mutedSteel, fontFamily: theme.fonts.mono, fontSize: 11 }}>
                    {viewer.time}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 16,
          borderTop: `1px solid ${theme.colors.zinc200}`,
        }}
      >
        <span style={{ fontSize: 12, color: theme.colors.mutedSteel, fontFamily: theme.fonts.sans }}>
          Showing 4 of 12 viewers
        </span>
        <button
          style={{
            padding: '8px 16px',
            borderRadius: theme.radius.md,
            background: theme.colors.charcoal,
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 500,
            border: `1px solid ${theme.colors.charcoal}B3`,
            cursor: 'pointer',
            fontFamily: theme.fonts.sans,
          }}
        >
          Export CSV
        </button>
      </div>
    </div>
  );
};