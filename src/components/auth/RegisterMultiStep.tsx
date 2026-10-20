import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Church, 
  HeartHandshake, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Briefcase,
  Sparkles,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Database,
  ShieldAlert,
  RotateCcw,
  WifiOff,
  LogIn
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { INITIAL_DEPARTMENTS, INITIAL_GROUPS } from '../../lib/seedData';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface RegisterMultiStepProps {
  onSwitchToLogin: () => void;
  onRegisteredSuccess: () => void;
  onRegistrationInitiated?: () => void;
}

export type RegistrationStage = 
  | 'IDLE' 
  | 'VALIDATING' 
  | 'CHECKING_EMAIL' 
  | 'CREATING_AUTH' 
  | 'SAVING_DIRECTORY' 
  | 'FINALIZING' 
  | 'COMPLETED';

interface GranularStageInfo {
  id: RegistrationStage;
  label: string;
  description: string;
  weight: number;
}

const REGISTRATION_STAGES: GranularStageInfo[] = [
  {
    id: 'VALIDATING',
    label: 'Form & Input Validation',
    description: 'Verifying all personal, contact, and emergency details',
    weight: 15
  },
  {
    id: 'CHECKING_EMAIL',
    label: 'Directory Registry Verification',
    description: 'Verifying email uniqueness in church membership roster',
    weight: 35
  },
  {
    id: 'CREATING_AUTH',
    label: 'Authentication Credentials',
    description: 'Creating encrypted access account and signing permissions',
    weight: 60
  },
  {
    id: 'SAVING_DIRECTORY',
    label: 'Atomic Database Transaction',
    description: 'Executing synchronized ACID transaction to users and members collections',
    weight: 85
  },
  {
    id: 'FINALIZING',
    label: 'Digital Membership ID Generation',
    description: 'Assigning unique member number and church sanctuary pass',
    weight: 98
  }
];

interface ActionableError {
  title: string;
  message: string;
  type: 'duplicate' | 'weak_password' | 'invalid_email' | 'transaction' | 'network' | 'permission' | 'general';
  field?: string;
  targetStep?: number;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const RegisterMultiStep: React.FC<RegisterMultiStepProps> = ({
  onSwitchToLogin,
  onRegisteredSuccess,
  onRegistrationInitiated
}) => {
  const { signUp } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [currentStage, setCurrentStage] = useState<RegistrationStage>('IDLE');
  const [error, setError] = useState<ActionableError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [createdMembershipNumber, setCreatedMembershipNumber] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Personal
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    dateOfBirth: '1995-06-15',
    photoUrl: '',

    // Step 2: Contact
    phone: '',
    email: '',
    address: '',
    city: 'Ikeja',
    state: 'Lagos',
    country: 'Nigeria',

    // Step 3: Church & Credentials
    departmentName: 'Choir & Worship',
    groupName: 'Grace Cell Fellowship',
    occupation: '',
    skills: '',
    password: '',
    confirmPassword: '',

    // Step 4: Emergency
    emergencyName: '',
    emergencyPhone: ''
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field-specific error and global error
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (error) {
      setError(null);
    }
  };

  const validateStep = (s: number): boolean => {
    const errors: Record<string, string> = {};

    if (s === 1) {
      if (!formData.firstName.trim()) {
        errors.firstName = 'First name is required.';
      }
      if (!formData.lastName.trim()) {
        errors.lastName = 'Last name is required.';
      }
      if (!formData.dateOfBirth) {
        errors.dateOfBirth = 'Date of birth is required.';
      }
    } else if (s === 2) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email.trim()) {
        errors.email = 'Email address is required.';
      } else if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please enter a valid email address (e.g. member@faithtrack.church).';
      }

      const cleanPhone = formData.phone.replace(/[\s-]/g, '');
      if (!formData.phone.trim()) {
        errors.phone = 'Phone number is required.';
      } else if (cleanPhone.length < 8) {
        errors.phone = 'Please enter a valid phone number (at least 8 digits).';
      }

      if (!formData.address.trim()) {
        errors.address = 'Residential street address is required.';
      }
      if (!formData.city.trim()) {
        errors.city = 'City is required.';
      }
      if (!formData.state.trim()) {
        errors.state = 'State / Region is required.';
      }
    } else if (s === 3) {
      if (!formData.password) {
        errors.password = 'Please create a password.';
      } else if (formData.password.length < 8) {
        errors.password = 'Password must contain at least 8 characters.';
      }
      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Please repeat your password to confirm.';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Those passwords don't match. Please re-enter.";
      }
    } else if (s === 4) {
      if (!formData.emergencyName.trim()) {
        errors.emergencyName = 'Please provide an emergency contact name.';
      }
      if (!formData.emergencyPhone.trim()) {
        errors.emergencyPhone = 'Please provide an emergency contact phone number.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...errors }));
      const firstError = Object.values(errors)[0];
      setError({
        title: 'Information Incomplete',
        message: firstError,
        type: 'general',
        primaryAction: {
          label: 'Fix Highlighted Fields',
          onClick: () => setError(null)
        }
      });
      return false;
    }

    setFieldErrors({});
    setError(null);
    return true;
  };

  const validateAllSteps = (): boolean => {
    for (let s = 1; s <= 4; s++) {
      if (!validateStep(s)) {
        setStep(s);
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep(step)) return;

    // When advancing from Step 2, check for duplicate email beforehand
    if (step === 2) {
      setCheckingEmail(true);
      setError(null);
      try {
        const cleanEmail = formData.email.toLowerCase().trim();
        const existingSnap = await getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail)));
        if (!existingSnap.empty) {
          setFieldErrors(prev => ({ ...prev, email: 'This email is already registered.' }));
          setError({
            title: 'Account Already Exists',
            message: `An account with ${cleanEmail} is already registered with FaithTrack. You can sign in directly to your account.`,
            type: 'duplicate',
            field: 'email',
            targetStep: 2,
            primaryAction: {
              label: 'Sign In to Existing Account',
              onClick: onSwitchToLogin,
              icon: <LogIn className="w-3.5 h-3.5" />
            },
            secondaryAction: {
              label: 'Use Another Email',
              onClick: () => {
                setError(null);
                setFieldErrors({});
              }
            }
          });
          setCheckingEmail(false);
          return;
        }
      } catch (err) {
        console.warn('Email pre-check notice:', err);
      } finally {
        setCheckingEmail(false);
      }
    }

    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setFieldErrors({});
    setStep(prev => Math.max(1, prev - 1));
  };

  const executeRegistration = async () => {
    if (!validateAllSteps()) return;

    setLoading(true);
    setError(null);
    setCurrentStage('VALIDATING');

    try {
      const skillsArray = formData.skills
        ? formData.skills.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      // Perform atomic signUp with stage-by-stage callback
      const newMember = await signUp(
        {
          ...formData,
          skills: skillsArray
        },
        (stage: string) => {
          setCurrentStage(stage as RegistrationStage);
        }
      );

      setCurrentStage('COMPLETED');

      // Keep celebration modal mounted
      if (onRegistrationInitiated) {
        onRegistrationInitiated();
      }

      setCreatedMembershipNumber(newMember.membershipNumber);
      setStep(5); // Complete celebration screen
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      console.error('Registration submission rejected:', err);

      const errCode = err?.code || '';
      const errMsg = err?.message || '';
      const isDuplicate = errCode === 'auth/email-already-in-use' || errMsg.includes('already exists');
      const isWeakPass = errCode === 'auth/weak-password' || errMsg.includes('at least 8 characters');
      const isInvalidEmail = errCode === 'auth/invalid-email' || errMsg.includes('invalid') && errMsg.includes('email');
      const isPermission = errCode === 'permission-denied' || errMsg.includes('permission');
      const isNetwork = errCode === 'unavailable' || errCode === 'auth/network-request-failed' || errMsg.includes('network') || errMsg.includes('connection');
      const isTxFail = errCode === 'firestore/transaction-failed' || errMsg.includes('transaction') || errMsg.includes('atomic');

      if (isDuplicate) {
        setError({
          title: 'Account Already Exists',
          message: `The email address "${formData.email}" is already registered in the FaithTrack Cathedral roster. You can sign in directly.`,
          type: 'duplicate',
          field: 'email',
          targetStep: 2,
          primaryAction: {
            label: 'Sign In to Existing Account',
            onClick: onSwitchToLogin,
            icon: <LogIn className="w-3.5 h-3.5" />
          },
          secondaryAction: {
            label: 'Change Email Address',
            onClick: () => {
              setStep(2);
              setError(null);
            }
          }
        });
        setStep(2);
        setFieldErrors(prev => ({ ...prev, email: 'This email is already registered.' }));
      } else if (isWeakPass) {
        setError({
          title: 'Password Too Weak',
          message: 'Your chosen password must contain at least 8 characters with a mix of letters and numbers for sanctuary portal safety.',
          type: 'weak_password',
          field: 'password',
          targetStep: 3,
          primaryAction: {
            label: 'Adjust Password',
            onClick: () => {
              setStep(3);
              setError(null);
            }
          }
        });
        setStep(3);
        setFieldErrors(prev => ({ ...prev, password: 'Password must contain at least 8 characters.' }));
      } else if (isInvalidEmail) {
        setError({
          title: 'Invalid Email Address',
          message: `The address "${formData.email}" is not formatted properly. Please verify the username and domain.`,
          type: 'invalid_email',
          field: 'email',
          targetStep: 2,
          primaryAction: {
            label: 'Correct Email Address',
            onClick: () => {
              setStep(2);
              setError(null);
            }
          }
        });
        setStep(2);
        setFieldErrors(prev => ({ ...prev, email: 'Please enter a valid email format.' }));
      } else if (isTxFail) {
        setError({
          title: 'Atomic Database Transaction Aborted',
          message: 'Unable to simultaneously record your user and member profiles in the church directory. The transaction was safely rolled back to prevent partial or corrupted records.',
          type: 'transaction',
          primaryAction: {
            label: 'Retry Registration',
            onClick: () => executeRegistration(),
            icon: <RotateCcw className="w-3.5 h-3.5" />
          }
        });
      } else if (isPermission) {
        setError({
          title: 'Database Access Restricted',
          message: 'Database security policies prevented writing the member document. Please check your network or contact church administrators.',
          type: 'permission',
          primaryAction: {
            label: 'Retry Registration',
            onClick: () => executeRegistration(),
            icon: <RotateCcw className="w-3.5 h-3.5" />
          }
        });
      } else if (isNetwork) {
        setError({
          title: 'Network Connection Interrupted',
          message: 'Unable to reach the church servers. Your connection dropped during the registration transaction. No partial data was saved.',
          type: 'network',
          primaryAction: {
            label: 'Retry Registration',
            onClick: () => executeRegistration(),
            icon: <RotateCcw className="w-3.5 h-3.5" />
          }
        });
      } else {
        setError({
          title: 'Registration Error',
          message: errMsg || 'Unable to complete your registration at this time. Please verify all details and try again.',
          type: 'general',
          primaryAction: {
            label: 'Retry Registration',
            onClick: () => executeRegistration(),
            icon: <RotateCcw className="w-3.5 h-3.5" />
          }
        });
      }
    } finally {
      setLoading(false);
      setCurrentStage('IDLE');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeRegistration();
  };

  const stepsList = [
    { num: 1, title: 'Personal' },
    { num: 2, title: 'Contact' },
    { num: 3, title: 'Church' },
    { num: 4, title: 'Emergency' }
  ];

  // Calculate current granular loading progress percentage
  const activeStageIndex = REGISTRATION_STAGES.findIndex(s => s.id === currentStage);
  const currentProgressWeight = activeStageIndex >= 0 
    ? REGISTRATION_STAGES[activeStageIndex].weight 
    : (currentStage === 'COMPLETED' ? 100 : 10);

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-xl p-6 sm:p-8 border-slate-200/80 shadow-lg relative overflow-hidden">
        {/* Top Header & Navigation */}
        {step < 5 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold shadow-xs">
                  FT
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">Member Registration</h2>
                  <p className="text-xs text-slate-500">Step {step} of 4</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                disabled={loading}
              >
                Sign In Instead
              </button>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="grid grid-cols-4 gap-2">
              {stepsList.map((s) => {
                const isActive = s.num === step;
                const isPassed = s.num < step;
                return (
                  <div key={s.num} className="flex flex-col gap-1">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        isPassed
                          ? 'bg-emerald-600'
                          : isActive
                          ? 'bg-emerald-500'
                          : 'bg-slate-200'
                      }`}
                    />
                    <span
                      className={`text-[11px] font-medium transition-colors ${
                        isActive
                          ? 'text-emerald-700 font-bold'
                          : isPassed
                          ? 'text-slate-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actionable Error Banner with Direct Remediation Triggers */}
        {error && (
          <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-3 animate-in fade-in duration-200 shadow-xs">
            <div className="flex items-start gap-3">
              {error.type === 'transaction' || error.type === 'permission' ? (
                <div className="p-1.5 bg-rose-100 rounded-xl shrink-0 text-rose-700">
                  <Database className="w-4 h-4" />
                </div>
              ) : error.type === 'network' ? (
                <div className="p-1.5 bg-rose-100 rounded-xl shrink-0 text-rose-700">
                  <WifiOff className="w-4 h-4" />
                </div>
              ) : error.type === 'duplicate' ? (
                <div className="p-1.5 bg-amber-100 rounded-xl shrink-0 text-amber-800">
                  <User className="w-4 h-4" />
                </div>
              ) : (
                <div className="p-1.5 bg-rose-100 rounded-xl shrink-0 text-rose-700">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}

              <div className="flex-1">
                <p className="font-bold text-rose-950 text-sm mb-0.5">{error.title}</p>
                <p className="leading-relaxed text-rose-800 text-xs">{error.message}</p>
              </div>
            </div>

            {(error.primaryAction || error.secondaryAction) && (
              <div className="pt-2 border-t border-rose-200/60 flex flex-wrap items-center justify-end gap-2">
                {error.secondaryAction && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={error.secondaryAction.onClick}
                    className="text-xs bg-white"
                  >
                    {error.secondaryAction.label}
                  </Button>
                )}
                {error.primaryAction && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={error.primaryAction.icon}
                    onClick={error.primaryAction.onClick}
                    className="text-xs"
                  >
                    {error.primaryAction.label}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Granular Multi-Stage Loading Widget */}
        {loading && (
          <div className="mb-6 p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl shadow-xs space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Registration in Progress
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 font-mono">
                {currentProgressWeight}%
              </span>
            </div>

            {/* Smooth Progress Bar */}
            <div className="w-full bg-emerald-200/60 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${currentProgressWeight}%` }}
              />
            </div>

            {/* Granular Task Checklist */}
            <div className="space-y-2 pt-1">
              {REGISTRATION_STAGES.map((stg, idx) => {
                const isCompleted = activeStageIndex > idx || currentStage === 'COMPLETED';
                const isCurrent = currentStage === stg.id;

                return (
                  <div key={stg.id} className="flex items-start gap-2.5 text-xs transition-colors">
                    <div className="mt-0.5 shrink-0">
                      {isCompleted ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center animate-spin">
                          <Loader2 className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-[9px] font-mono">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold transition-colors ${
                        isCompleted 
                          ? 'text-slate-800' 
                          : isCurrent 
                          ? 'text-emerald-950 font-bold' 
                          : 'text-slate-400'
                      }`}>
                        {stg.label}
                      </p>
                      {isCurrent && (
                        <p className="text-[11px] text-emerald-700 leading-tight mt-0.5 animate-pulse">
                          {stg.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 1: Personal Information */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name *"
                placeholder="e.g. John"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                error={fieldErrors.firstName}
                disabled={loading}
                required
              />
              <Input
                label="Middle Name (Optional)"
                placeholder="e.g. Oluwaseun"
                value={formData.middleName}
                onChange={(e) => handleChange('middleName', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Last Name *"
                placeholder="e.g. Adebayo"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                error={fieldErrors.lastName}
                disabled={loading}
                required
              />
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  disabled={loading}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15 outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Date of Birth *"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                error={fieldErrors.dateOfBirth}
                disabled={loading}
                required
              />
              <Input
                label="Profile Photo URL (Optional)"
                placeholder="https://images.unsplash.com/..."
                value={formData.photoUrl}
                onChange={(e) => handleChange('photoUrl', e.target.value)}
                disabled={loading}
                helperText="Paste direct URL to your portrait photo"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="lg"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={handleNext}
                className="w-full sm:w-auto"
                disabled={loading}
              >
                Continue to Contact
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Contact Information */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone Number *"
                type="tel"
                placeholder="e.g. +234 802 345 6789"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                leftIcon={<Phone className="w-4 h-4" />}
                error={fieldErrors.phone}
                disabled={loading || checkingEmail}
                required
              />
              <Input
                label="Email Address *"
                type="email"
                placeholder="e.g. john.adebayo@faithtrack.church"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                error={fieldErrors.email}
                disabled={loading || checkingEmail}
                required
              />
            </div>

            <Input
              label="Residential Address *"
              placeholder="e.g. 14 Grace Sanctuary Way"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              leftIcon={<MapPin className="w-4 h-4" />}
              error={fieldErrors.address}
              disabled={loading || checkingEmail}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="City *"
                placeholder="e.g. Ikeja"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                error={fieldErrors.city}
                disabled={loading || checkingEmail}
                required
              />
              <Input
                label="State *"
                placeholder="e.g. Lagos"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                error={fieldErrors.state}
                disabled={loading || checkingEmail}
                required
              />
              <Input
                label="Country *"
                placeholder="Nigeria"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                disabled={loading || checkingEmail}
                required
              />
            </div>

            <div className="pt-4 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={handleBack}
                disabled={loading || checkingEmail}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                loading={checkingEmail}
                icon={!checkingEmail && <ArrowRight className="w-4 h-4" />}
                onClick={handleNext}
                disabled={loading}
              >
                {checkingEmail ? 'Verifying email...' : 'Continue to Church Info'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Church Information & Password */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                  Primary Department *
                </label>
                <select
                  value={formData.departmentName}
                  onChange={(e) => handleChange('departmentName', e.target.value)}
                  disabled={loading}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15 outline-none"
                >
                  {INITIAL_DEPARTMENTS.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                  <option value="General Congregation">General Congregation</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                  Fellowship / Cell Group *
                </label>
                <select
                  value={formData.groupName}
                  onChange={(e) => handleChange('groupName', e.target.value)}
                  disabled={loading}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15 outline-none"
                >
                  {INITIAL_GROUPS.map(g => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Occupation (Optional)"
                placeholder="e.g. Software Engineer / Accountant"
                value={formData.occupation}
                onChange={(e) => handleChange('occupation', e.target.value)}
                leftIcon={<Briefcase className="w-4 h-4" />}
                disabled={loading}
              />
              <Input
                label="Skills or Talents (Optional)"
                placeholder="e.g. Audio mixing, Teaching, Music"
                value={formData.skills}
                onChange={(e) => handleChange('skills', e.target.value)}
                leftIcon={<Sparkles className="w-4 h-4" />}
                disabled={loading}
                helperText="Separate multiple talents with commas"
              />
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Account Security Credentials
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Password *"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  error={fieldErrors.password}
                  disabled={loading}
                  required
                />
                <Input
                  label="Confirm Password *"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  error={fieldErrors.confirmPassword}
                  disabled={loading}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 hover:text-slate-600 focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={handleNext}
                disabled={loading}
              >
                Continue to Emergency Contact
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Emergency Contact & Submission */}
        {step === 4 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl text-xs text-amber-800">
              For pastoral care and member safety, please provide a family member or trusted emergency contact.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Emergency Contact Name *"
                placeholder="e.g. Mary Adebayo (Spouse / Parent)"
                value={formData.emergencyName}
                onChange={(e) => handleChange('emergencyName', e.target.value)}
                leftIcon={<HeartHandshake className="w-4 h-4" />}
                error={fieldErrors.emergencyName}
                disabled={loading}
                required
              />
              <Input
                label="Emergency Contact Phone *"
                type="tel"
                placeholder="e.g. +234 803 987 6543"
                value={formData.emergencyPhone}
                onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                leftIcon={<Phone className="w-4 h-4" />}
                error={fieldErrors.emergencyPhone}
                disabled={loading}
                required
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-slate-800">Registration Review:</p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <p>Full Name: <span className="text-slate-900 font-medium">{formData.firstName} {formData.lastName}</span></p>
                <p>Email: <span className="text-slate-900 font-medium">{formData.email}</span></p>
                <p>Department: <span className="text-slate-900 font-medium">{formData.departmentName}</span></p>
                <p>Fellowship: <span className="text-slate-900 font-medium">{formData.groupName}</span></p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                icon={!loading && <CheckCircle2 className="w-4 h-4" />}
                disabled={loading}
              >
                {loading ? 'Executing Atomic Registration...' : 'Complete Registration'}
              </Button>
            </div>
          </form>
        )}

        {/* STEP 5: Registration Complete Celebration */}
        {step === 5 && (
          <div className="text-center py-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-900">Welcome to the Family! 🎉</h3>
              <p className="text-sm text-slate-600 mt-1 max-w-sm mx-auto">
                Your member account has been atomically registered and synchronized in the church database.
              </p>
            </div>

            {/* Generated Membership Card Preview */}
            <div className="max-w-xs mx-auto bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 text-white p-5 rounded-3xl shadow-xl text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold tracking-widest text-emerald-300 uppercase">FAITHTRACK</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-emerald-100">Member</span>
              </div>
              <p className="text-base font-bold tracking-tight">
                {formData.firstName} {formData.lastName}
              </p>
              <p className="text-xs text-emerald-200 mt-0.5">{formData.departmentName}</p>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-300/80 block uppercase">Membership ID</span>
                  <span className="text-sm font-mono font-bold">{createdMembershipNumber || 'FT-2026-ACTIVE'}</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Church className="w-4 h-4 text-emerald-200" />
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full max-w-xs mx-auto"
              onClick={onRegisteredSuccess}
            >
              Go to My Dashboard
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
