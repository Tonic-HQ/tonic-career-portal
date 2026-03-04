export interface PortalConfig {
  companyName: string;
  companyLogoUrl: string;
  companyUrl: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  darkMode: boolean;
  service: {
    swimlane: string;
    corpToken: string;
    fields: string;
  };
  applyForm: {
    mode: 'quick' | 'full';
    resumeRequired: boolean;
    showPhone: boolean;
  };
  privacyPolicyUrl: string;
  googleAnalyticsId: string;
}

export const defaultConfig: PortalConfig = {
  companyName: 'Tonic Staffing',
  companyLogoUrl: '',
  companyUrl: 'https://tonichq.com',
  primaryColor: '#2563EB',
  accentColor: '#10B981',
  fontFamily: 'Inter, system-ui, sans-serif',
  darkMode: false,
  service: {
    swimlane: '1',
    corpToken: 'demo',
    fields: 'id,title,publishedCategory,address,employmentType,salary,dateLastPublished,publicDescription,benefits',
  },
  applyForm: {
    mode: 'quick',
    resumeRequired: false,
    showPhone: true,
  },
  privacyPolicyUrl: '',
  googleAnalyticsId: '',
};

export function loadConfig(): PortalConfig {
  return defaultConfig;
}
