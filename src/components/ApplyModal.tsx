import { useState, useEffect, useRef } from 'react';
import { submitApplication } from '../api';
import { loadConfig, getConfigOverride } from '../config';
import { getAttribution, formatAttributionNote } from '../utils/attribution';
import { buildLinkedInAuthUrl, consumeLinkedInProfile } from '../utils/linkedin';
import type { LinkedInProfile } from '../utils/linkedin';

interface Props {
  jobId?: number;
  jobTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  linkedInProfile?: LinkedInProfile | null;
}

export default function ApplyModal({ jobId, jobTitle, isOpen, onClose, linkedInProfile }: Props) {
  const config = loadConfig();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [filledByLinkedIn, setFilledByLinkedIn] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Auto-fill from LinkedIn profile if available
  useEffect(() => {
    if (linkedInProfile) {
      setFirstName(linkedInProfile.firstName);
      setLastName(linkedInProfile.lastName);
      setEmail(linkedInProfile.email);
      if (linkedInProfile.linkedinId) {
        setLinkedInUrl(`https://www.linkedin.com/in/${linkedInProfile.linkedinId}`);
      }
      setFilledByLinkedIn(true);
    }
  }, [linkedInProfile]);

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setErrorMessage('');
      setPrivacyChecked(false);
      if (!linkedInProfile) {
        setTimeout(() => firstInputRef.current?.focus(), 100);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    const trimFirst = firstName.trim();
    const trimLast = lastName.trim();
    const trimEmail = email.trim();

    if (!trimFirst || !trimLast || !trimEmail) {
      setStatus('error');
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimEmail)) {
      setStatus('error');
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    // Validate LinkedIn URL if provided
    const trimLinkedIn = linkedInUrl.trim();
    if (trimLinkedIn && !trimLinkedIn.includes('linkedin.com/')) {
      setStatus('error');
      setErrorMessage('Please enter a valid LinkedIn profile URL.');
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Ensure controlled values are in formData
    formData.set('firstName', trimFirst);
    formData.set('lastName', trimLast);
    formData.set('email', trimEmail);
    if (trimLinkedIn) formData.set('linkedInUrl', trimLinkedIn);

    // Attach attribution data
    const attribution = getAttribution();
    if (attribution) {
      formData.set('source', attribution.source);
      formData.set('attributionNote', formatAttributionNote(attribution));
    }

    // Flag if filled via LinkedIn
    if (filledByLinkedIn) {
      formData.set('appliedViaLinkedIn', 'true');
    }

    try {
      const result = await submitApplication(jobId, formData, jobTitle);
      if (typeof localStorage !== 'undefined') {
        if (jobId) localStorage.setItem(`applied_${jobId}`, 'true');
      }
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'Something went wrong. Please try again.');
    }
  }

  function handleLinkedInAuth() {
    const override = getConfigOverride();
    const portalId = (override as any)?.portalId || 'preview';
    const authUrl = buildLinkedInAuthUrl(portalId, jobId, window.location.href);
    window.location.href = authUrl;
  }

  const requirePrivacy = Boolean(config.privacyPolicyUrl);
  const canSubmit = status !== 'submitting' && (!requirePrivacy || privacyChecked);

  const inputClass = "w-full border border-gray-200 rounded-xl px-3.5 py-3 text-base sm:text-sm text-gray-900 focus:outline-none focus:border-blue-400 bg-white placeholder:text-gray-400 transition-all";
  const inputFocusStyle = "0 0 0 3px rgba(37,99,235,0.1), 0 1px 3px rgba(0,0,0,0.05)";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop — backdrop blur */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal — full-screen slide-up on mobile, centered card on desktop */}
      <div className="relative bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-md mx-auto overflow-hidden animate-slide-up sm:animate-scale-in h-full sm:h-auto flex flex-col sm:block">
        {/* Header accent bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--color-primary) 0%, #7c3aed 100%)' }} />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4">
          <div>
            <h2 id="modal-title" className="text-xl font-bold text-gray-900 tracking-tight">
              {jobId ? 'Apply Now' : 'Submit Your Information'}
            </h2>
            {jobTitle && <p className="text-sm text-gray-400 font-light mt-0.5 line-clamp-1">{jobTitle}</p>}
            {!jobId && <p className="text-sm text-gray-400 font-light mt-0.5">We'll match you with relevant opportunities</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all flex-shrink-0 flex items-center justify-center"
            aria-label="Close modal"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="h-px bg-gray-100 mx-6" />

        {/* Content */}
        <div className="p-6 pb-safe flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {status === 'success' ? (
            <div className="text-center py-6">
              {/* Animated success icon */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 animate-success-pop"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', boxShadow: '0 8px 24px -4px rgba(16,185,129,0.4)' }}
              >
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">Application Submitted!</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-xs mx-auto font-light">
                Thank you for applying. We'll review your application and reach out soon.
              </p>
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {status === 'error' && errorMessage && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 animate-fade-up">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Continue with LinkedIn button */}
                {!filledByLinkedIn && (
                  <button
                    type="button"
                    onClick={handleLinkedInAuth}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 border-[#0A66C2] bg-[#0A66C2] text-white font-semibold text-sm hover:bg-[#004182] active:scale-[0.98] transition-all"
                    style={{ minHeight: '48px' }}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    Continue with LinkedIn
                  </button>
                )}

                {!filledByLinkedIn && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">or fill manually</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}

                {filledByLinkedIn && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <svg className="w-4 h-4 text-[#0A66C2] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    <span className="text-sm font-medium text-blue-700">Filled from LinkedIn</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                      First Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
                    </label>
                    <input
                      ref={firstInputRef}
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      autoComplete="given-name"
                      className={inputClass}
                      placeholder="Jane"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      onFocus={e => { e.currentTarget.style.boxShadow = inputFocusStyle; }}
                      onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                      Last Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      autoComplete="family-name"
                      className={inputClass}
                      placeholder="Smith"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      onFocus={e => { e.currentTarget.style.boxShadow = inputFocusStyle; }}
                      onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Email Address <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    autoComplete="email"
                    className={inputClass}
                    placeholder="jane@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={e => { e.currentTarget.style.boxShadow = inputFocusStyle; }}
                    onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                {/* LinkedIn URL field */}
                {config.applyForm.showLinkedIn !== false && (
                <div>
                  <label htmlFor="linkedInUrl" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                    LinkedIn Profile
                  </label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0A66C2] pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    <input
                      type="url"
                      id="linkedInUrl"
                      name="linkedInUrl"
                      autoComplete="url"
                      className={`${inputClass} pl-9`}
                      placeholder="linkedin.com/in/janesmith"
                      value={linkedInUrl}
                      onChange={e => setLinkedInUrl(e.target.value)}
                      onFocus={e => { e.currentTarget.style.boxShadow = inputFocusStyle; }}
                      onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
                )}

                {config.applyForm.showPhone && (
                  <div>
                    <label htmlFor="phone" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      autoComplete="tel"
                      className={inputClass}
                      placeholder="(555) 555-5555"
                      onFocus={e => { e.currentTarget.style.boxShadow = inputFocusStyle; }}
                      onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                )}

                {/* Custom fields from portal config */}
                {config.applyForm.customFields?.map((field) => (
                  <div key={field.bullhornField}>
                    <label htmlFor={`custom-${field.bullhornField}`} className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                      {field.label}
                      {field.required && <span className="text-red-400 normal-case tracking-normal font-normal ml-1">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        id={`custom-${field.bullhornField}`}
                        name={field.bullhornField}
                        required={field.required}
                        className={inputClass}
                        defaultValue=""
                      >
                        <option value="" disabled>{field.placeholder || `Select ${field.label}`}</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        id={`custom-${field.bullhornField}`}
                        name={field.bullhornField}
                        required={field.required}
                        className={`${inputClass} min-h-[80px]`}
                        placeholder={field.placeholder}
                        rows={3}
                        onFocus={e => { e.currentTarget.style.boxShadow = inputFocusStyle; }}
                        onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
                      />
                    ) : field.type === 'checkbox' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`custom-${field.bullhornField}`}
                          name={field.bullhornField}
                          className="h-4 w-4 rounded border-gray-300"
                          style={{ accentColor: 'var(--color-primary)' }}
                        />
                        <label htmlFor={`custom-${field.bullhornField}`} className="text-sm text-gray-600">
                          {field.placeholder || field.label}
                        </label>
                      </div>
                    ) : (
                      <input
                        type="text"
                        id={`custom-${field.bullhornField}`}
                        name={field.bullhornField}
                        required={field.required}
                        className={inputClass}
                        placeholder={field.placeholder}
                        onFocus={e => { e.currentTarget.style.boxShadow = inputFocusStyle; }}
                        onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
                      />
                    )}
                  </div>
                ))}

                {/* Resume upload — configurable: off, optional, required */}
                {(config.applyForm.resume || 'off') !== 'off' && (
                  <div>
                    <label htmlFor="resume" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                      Resume {config.applyForm.resume === 'required' && <span className="text-red-400 normal-case tracking-normal font-normal">*</span>}
                    </label>
                    <input
                      type="file"
                      id="resume"
                      name="resume"
                      accept=".pdf,.doc,.docx,.txt"
                      required={config.applyForm.resume === 'required'}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:text-white transition-all cursor-pointer"
                      style={{ '--file-bg': 'var(--color-primary)' } as React.CSSProperties}
                    />
                    <p className="mt-1.5 text-xs text-gray-400 font-light">PDF, Word, or plain text accepted</p>
                  </div>
                )}

                {requirePrivacy && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <input
                      type="checkbox"
                      id="privacy"
                      checked={privacyChecked}
                      onChange={e => setPrivacyChecked(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 cursor-pointer"
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <label htmlFor="privacy" className="text-sm text-gray-600 font-light cursor-pointer">
                      I have read and agree to the{' '}
                      <a
                        href={config.privacyPolicyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full text-white font-semibold px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    boxShadow: canSubmit ? '0 4px 14px -2px rgba(37,99,235,0.35)' : 'none',
                  }}
                  onMouseEnter={e => { if (canSubmit) e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  {status === 'submitting' ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full font-semibold px-6 py-3 rounded-xl text-sm text-gray-700 transition-all hover:bg-gray-200"
                  style={{ backgroundColor: '#f3f3f3' }}
                >
                  Cancel
                </button>
              </div>

              <p className="mt-3 text-xs text-gray-400 text-center font-light flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Your information is kept confidential and secure.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
