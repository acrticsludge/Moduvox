import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from '../styles/theme';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { fadeIn, easeOut } from '../lib/animations';
import { mockData } from '../lib/mockData';

export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pageOpacity = fadeIn(frame, 10);
  const contentOpacity = fadeIn(frame - 15, 15);

  // Show projects after delay
  const showProjects = frame > 60;
  const projectsOpacity = showProjects ? fadeIn(frame - 60, 20) : 0;

  // Modal appears
  const showModal = frame > 90;
  const modalOpacity = showModal ? fadeIn(frame - 90, 15) : 0;

  return (
    <div
      style={{
        background: theme.colors.canvas,
        minHeight: '100vh',
        fontFamily: theme.fonts.sans,
        opacity: pageOpacity,
      }}
    >
      <Navbar isLoggedIn={true} />

      <div style={{ display: 'flex', paddingTop: theme.spacing.navbarHeight, minHeight: '100vh' }}>
        <Sidebar activeItem="All Projects" />

        <main style={{ flex: 1, opacity: contentOpacity }}>
          {/* Header */}
          <header
            style={{
              background: theme.colors.surface,
              borderBottom: `1px solid ${theme.colors.borderFaint}`,
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h1 style={{ fontSize: 18, fontWeight: 600, color: theme.colors.charcoal, margin: 0 }}>
              All Projects
            </h1>
            <button
              style={{
                background: theme.colors.charcoal,
                color: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: theme.radius.md,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: `1px solid ${theme.colors.charcoal}B3`,
                fontFamily: theme.fonts.sans,
              }}
            >
              <span style={{ fontSize: 16 }}>+</span> New Project
            </button>
          </header>

          {/* Content Area */}
          <div style={{ padding: 24 }}>
            {!showProjects ? (
              /* Empty State */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '80px 0',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: theme.radius.xl,
                    background: theme.colors.zinc100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    marginBottom: 16,
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={theme.colors.charcoal} strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.colors.charcoal, margin: '0 0 8px' }}>
                  No projects yet
                </h2>
                <p style={{ fontSize: 14, color: theme.colors.mutedSteel, margin: '0 0 16px' }}>
                  Create your first project to get started.
                </p>
                <a
                  href="#"
                  style={{
                    background: theme.colors.charcoal,
                    color: '#FFFFFF',
                    padding: '10px 20px',
                    borderRadius: theme.radius.md,
                    fontSize: 14,
                    fontWeight: 500,
                    textDecoration: 'none',
                    fontFamily: theme.fonts.sans,
                  }}
                >
                  Create your first project
                </a>
              </div>
            ) : (
              /* Projects Grid */
              <div style={{ opacity: projectsOpacity }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 16,
                  }}
                >
                  {[
                    { name: 'Q4 Training', color: '#3B82F6', icon: 'FolderKanban', presentations: 3 },
                    { name: 'Onboarding', color: '#22C55E', icon: 'FileText', presentations: 1 },
                    { name: 'Compliance', color: '#F59E0B', icon: 'Presentation', presentations: 2 },
                  ].map((project, i) => (
                    <article
                      key={i}
                      style={{
                        background: theme.colors.surface,
                        borderRadius: theme.radius.xl,
                        border: `1px solid ${theme.colors.zinc200}`,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: `box-shadow 200ms`,
                      }}
                    >
                      {/* Color Bar */}
                      <div style={{ height: 4, background: project.color }} />

                      <div style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: theme.radius.md,
                              background: `${project.color}20`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 18,
                              flexShrink: 0,
                            }}
                          >
                            {project.icon === 'FolderKanban' && (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={project.color} strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                            )}
                            {project.icon === 'FileText' && (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={project.color} strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                              </svg>
                            )}
                            {project.icon === 'Presentation' && (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={project.color} strokeWidth="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" />
                                <path d="M8 21h8" />
                                <path d="M12 17v4" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.colors.charcoal, margin: '0 0 4px' }}>
                              {project.name}
                            </h3>
                            <p style={{ fontSize: 12, color: theme.colors.mutedSteel, margin: 0 }}>
                              {project.presentations} presentation{project.presentations !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: `${theme.colors.charcoal}66`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            opacity: modalOpacity,
          }}
        >
          <div
            style={{
              background: theme.colors.surface,
              borderRadius: theme.radius.xl,
              width: 480,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <header style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.colors.borderFaint}` }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.colors.charcoal, margin: 0 }}>
                Create project
              </h2>
            </header>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Name */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: theme.colors.charcoal, marginBottom: 6, display: 'block' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Q4 Training"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${theme.colors.zinc200}`,
                      borderRadius: theme.radius.md,
                      fontSize: 14,
                      color: theme.colors.charcoal,
                      fontFamily: theme.fonts.sans,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: theme.colors.charcoal, marginBottom: 6, display: 'block' }}>
                    Description
                  </label>
                  <textarea
                    defaultValue="Quarterly compliance training"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${theme.colors.zinc200}`,
                      borderRadius: theme.radius.md,
                      fontSize: 14,
                      color: theme.colors.charcoal,
                      fontFamily: theme.fonts.sans,
                      minHeight: 80,
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Color Picker */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: theme.colors.charcoal, marginBottom: 6, display: 'block' }}>
                    Color
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map((color) => (
                      <button
                        key={color}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: color,
                          cursor: 'pointer',
                          border: color === '#3B82F6' ? `2px solid ${theme.colors.charcoal}` : '2px solid transparent',
                          boxSizing: 'border-box',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Icon Picker */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: theme.colors.charcoal, marginBottom: 6, display: 'block' }}>
                    Icon
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[
                      'FolderKanban', 'FileText', 'Presentation', 'Users',
                      'BookOpen', 'Briefcase', 'Megaphone', 'Globe'
                    ].map((iconName) => (
                      <button
                        key={iconName}
                        style={{
                          aspectRatio: '1',
                          borderRadius: theme.radius.md,
                          background: theme.colors.zinc100,
                          border: `1px solid ${theme.colors.zinc200}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                        }}
                      >
                        {iconName === 'FolderKanban' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.charcoal} strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                        {iconName === 'FileText' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.charcoal} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
                        {iconName === 'Presentation' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.charcoal} strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>}
                        {iconName === 'Users' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.charcoal} strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                        {iconName === 'BookOpen' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.charcoal} strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>}
                        {iconName === 'Briefcase' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.charcoal} strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
                        {iconName === 'Megaphone' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.charcoal} strokeWidth="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c1.26 1.5 5 2 5 2s.5-3.74 2-5c-1.5-1.26-2-5-2-5s-3.74.5-5 2c-1.26-1.5-5-2-5-2z"/><path d="M14 15.23c.33 0 .63-.05.94-.14 3.39-1.05 6.67-1.4 10.13-.55A25.58 25.58 0 0 1 24 21.72"/></svg>}
                        {iconName === 'Globe' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.charcoal} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Create Button */}
                <button
                  style={{
                    background: theme.colors.charcoal,
                    color: '#FFFFFF',
                    padding: '10px 16px',
                    borderRadius: theme.radius.md,
                    fontSize: 14,
                    fontWeight: 500,
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: `1px solid ${theme.colors.charcoal}B3`,
                    width: '100%',
                    fontFamily: theme.fonts.sans,
                  }}
                >
                  Create project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};