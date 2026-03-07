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

/** Custom font definition for portal branding */
export interface CustomFont {
  /** Font family name (e.g., 'Gucci Sans Pro') */
  family: string;
  /** Font file URLs by weight */
  weights: {
    weight: number;
    url: string;
    format?: 'opentype' | 'truetype' | 'woff' | 'woff2';
  }[];
}

export interface PortalConfig {
  companyName: string;
  companyLogoUrl: string;
  companyUrl: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  /** Custom font files to load (if fontFamily requires non-Google fonts) */
  customFont?: CustomFont;
  /** Custom CSS overrides (injected into the page) */
  customCss?: string;
  darkMode: boolean;
  /** Portal ID (Crockford Base32) for API routing */
  portalId?: string;
  /** API mode: 'public' (default) uses Bullhorn public API, 'rest' uses server-side proxy with full credentials */
  apiMode?: 'public' | 'rest';
  /** Border radius for job cards (e.g., '20px', '12px', '0'). Defaults to '8px'. */
  cardBorderRadius?: string;
  /** Hide client company name and description (common in staffing — end client is confidential) */
  hideClientName?: boolean;
  /** Standard text appended to every job description (disclaimers, benefits info, EEO statements).
   *  Supports HTML. Applied automatically so it doesn't need to be in every Bullhorn job. */
  jobDescriptionFooter?: string;
  /** Customizable UI labels */
  labels?: {
    /** Main heading above job list. Defaults to "Open Positions" */
    heading?: string;
  };
  service: {
    swimlane: string;
    corpToken: string;
    fields: string;
  };
  applyForm: {
    mode: 'quick' | 'full';
    /** Resume upload: 'off' (hidden), 'optional' (shown but not required), 'required' (must upload) */
    resume: 'off' | 'optional' | 'required';
    /** @deprecated Use resume field instead */
    resumeRequired?: boolean;
    showPhone: boolean;
    /** Show LinkedIn URL field */
    showLinkedIn?: boolean;
    /** Additional custom fields to show on the apply form */
    customFields?: ApplyFormField[];
    /** Status for new candidates (default: 'New Lead') */
    candidateStatus?: string;
    /** Status for job submissions / web responses (default: 'New Lead') */
    submissionStatus?: string;
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
    resume: 'optional',
    showPhone: true,
    showLinkedIn: true,
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
