export const mockData = {
  project: {
    id: 'proj-1',
    name: 'Q4 Training',
    description: 'Quarterly compliance training',
    color: '#3B82F6',
    icon: 'FolderKanban',
    createdAt: '2026-07-10',
  },
  presentation: {
    id: 'pres-1',
    title: 'Phishing Prevention',
    slideCount: 12,
    status: 'ready' as const,
    shareToken: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  },
  slides: [
    { number: 1, title: 'Phishing Prevention', bullets: ['What is phishing?', 'Common tactics', 'How to protect yourself'] },
    { number: 2, title: 'What is Phishing?', bullets: ['Social engineering attack', 'Impersonates trusted entities', 'Goal: steal credentials'] },
    { number: 3, title: 'Common Tactics', bullets: ['Urgent language', 'Fake login pages', 'Suspicious attachments'] },
    { number: 4, title: 'How to Protect', bullets: ['Verify sender address', "Don't click suspicious links", 'Report to IT'] },
  ],
  narrations: [
    'Welcome to our phishing prevention training. Today we will cover how to identify and avoid phishing attacks that target our organization.',
    'Phishing is a social engineering attack where criminals impersonate trusted entities like your bank or IT department to steal your login credentials.',
    'Common tactics include creating a sense of urgency, building fake login pages that look real, and sending suspicious attachments that install malware.',
    'To protect yourself, always verify the sender email address, never click on suspicious links, and report any unusual requests to the IT security team immediately.',
  ],
  voice: {
    name: 'Professional Tone',
    type: 'preset' as const,
    description: 'Clear, authoritative, and professional narration voice',
  },
  viewer: {
    name: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    status: 'completed' as const,
    completion: 100,
    timeSpent: '12:04',
  },
  user: {
    name: 'Alex Morgan',
    email: 'alex@company.com',
  },
};
