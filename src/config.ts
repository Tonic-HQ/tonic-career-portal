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

// Runtime override — set by preview page when loading from URL hash
let _runtimeOverride: Partial<PortalConfig> | null = null;

export function setConfigOverride(override: Partial<PortalConfig> | null) {
  _runtimeOverride = override;
  // Invalidate job cache when config changes
  if (typeof window !== 'undefined') {
    (window as any).__tonicJobCacheInvalid = true;
  }
}

export function getConfigOverride(): Partial<PortalConfig> | null {
  return _runtimeOverride;
}

export function loadConfig(): PortalConfig {
  if (!_runtimeOverride) return defaultConfig;
  return {
    ...defaultConfig,
    ..._runtimeOverride,
    service: {
      ...defaultConfig.service,
      ...(_runtimeOverride.service ?? {}),
    },
    applyForm: {
      ...defaultConfig.applyForm,
      ...(_runtimeOverride.applyForm ?? {}),
    },
  };
}
