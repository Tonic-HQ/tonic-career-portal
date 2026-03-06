/** A custom field on the apply form */
export interface ApplyFormField {
  /** Display label */
  label: string;
  /** Bullhorn entity field name to write to */
  bullhornField: string;
  /** Field type */
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  /** Required field? */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Where to get select options:
   *  - 'bullhorn': fetch from Bullhorn field metadata at runtime (stays in sync)
   *  - 'static': use the options array below (for non-Bullhorn values)
   *  Defaults to 'bullhorn' for select fields */
  optionsSource?: 'bullhorn' | 'static';
  /** Static options (only used when optionsSource is 'static') */
  options?: string[];
}

/** Maps standard apply form fields to Bullhorn candidate fields.
 *  Keys are our field names, values are Bullhorn Candidate entity field paths.
 *  Common Bullhorn fields: firstName, lastName, email, phone, companyURL,
 *  customText1-20, customTextBlock1-5, source, status, category, etc. */
export interface FieldMappings {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  linkedInUrl?: string;
  /** Source/attribution field */
  source?: string;
  /** Any additional field mappings (our field name → Bullhorn field) */
  [key: string]: string | undefined;
}

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
    /** Additional custom fields to show on the apply form */
    customFields?: ApplyFormField[];
  };
  /** Maps apply form fields to Bullhorn candidate entity fields */
  fieldMappings: FieldMappings;
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
    customFields: [],
  },
  fieldMappings: {
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    phone: 'phone',
    linkedInUrl: 'companyURL',
    source: 'source',
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
