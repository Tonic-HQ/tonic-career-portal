import { useState, useEffect, useRef } from 'react';
import { submitApplication } from '../api';
import { loadConfig } from '../config';

interface Props {
  jobId: number;
  jobTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ApplyModal({ jobId, jobTitle, isOpen, onClose }: Props) {
  const config = loadConfig();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setErrorMessage('');
      setPrivacyChecked(false);
      setTimeout(() => firstInputRef.current?.focus(), 100);
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

    const form = e.currentTarget;
    const formData = new FormData(form);

    const firstName = (formData.get('firstName') as string).trim();
    const lastName = (formData.get('lastName') as string).trim();
    const email = (formData.get('email') as string).trim();

    if (!firstName || !lastName || !email) {
      setStatus('error');
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus('error');
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    try {
      await submitApplication(jobId, formData);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`applied_${jobId}`, 'true');
      }
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
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

      {/* Modal — full-screen on mobile, centered card on desktop */}
      <div className="relative bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-md mx-auto overflow-hidden animate-scale-in h-full sm:h-auto flex flex-col sm:block">
        {/* Header accent bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--color-primary) 0%, #7c3aed 100%)' }} />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4">
          <div>
            <h2 id="modal-title" className="text-xl font-bold text-gray-900 tracking-tight">
              Apply Now
            </h2>
            <p className="text-sm text-gray-400 font-light mt-0.5 line-clamp-1">{jobTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl p-1.5 transition-all flex-shrink-0"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="h-px bg-gray-100 mx-6" />

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
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
                    onFocus={e => { e.currentTarget.style.boxShadow = inputFocusStyle; }}
                    onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

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

                {config.applyForm.mode === 'full' && (
                  <div>
                    <label htmlFor="resume" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                      Resume {config.applyForm.resumeRequired && <span className="text-red-400 normal-case tracking-normal font-normal">*</span>}
                    </label>
                    <input
                      type="file"
                      id="resume"
                      name="resume"
                      accept=".pdf,.doc,.docx,.txt"
                      required={config.applyForm.resumeRequired}
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

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-5 w-full text-white font-semibold px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm"
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
