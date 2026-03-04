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
  companyName: 'Tonic HQ',
  companyLogoUrl: '',
  companyUrl: 'https://tonichq.com',
  primaryColor: '#2563EB',
  accentColor: '#10B981',
  fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
  darkMode: false,
  service: {
    swimlane: '91',
    corpToken: '3apw29',
    fields: 'id,title,publishedCategory(id,name),address(city,state,countryName),employmentType,salary,salaryUnit,dateLastPublished,publicDescription,isOpen,isPublic,isDeleted',
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
