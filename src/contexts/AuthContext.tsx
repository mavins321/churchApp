import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  reload
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, Member, UserRole, AccountStatus } from '../types';
import { generateMembershipNumber } from '../lib/utils';
import { seedDatabaseIfEmpty, INITIAL_DEPARTMENTS, INITIAL_GROUPS } from '../lib/seedData';
import { handleFirestoreError, OperationType, testFirestoreConnection } from '../lib/errorHandling';

export type PortalLoginMode = 'member' | 'admin';

interface SignInResult {
  role: UserRole;
  emailVerified: boolean;
  accountStatus: AccountStatus;
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  member: Member | null;
  role: UserRole;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  loginModePreference: PortalLoginMode;
  setLoginModePreference: (mode: PortalLoginMode) => void;
  loading: boolean;
  signIn: (email: string, pass: string, portalMode?: PortalLoginMode) => Promise<SignInResult>;
  signUp: (data: any, onProgress?: (stage: string) => void) => Promise<Member>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshAuthState: () => Promise<SignInResult>;
  updateMemberProfile: (updates: Partial<Member>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeRole = (rawRole: unknown): UserRole => {
  if (rawRole === 'super_admin') return 'super_admin';
  if (rawRole === 'admin') return 'admin';
  return 'member';
};

const resolveAccountStatus = (
  userStatus?: unknown,
  memberStatus?: unknown
): AccountStatus => {
  if (userStatus === 'suspended' || memberStatus === 'suspended') return 'suspended';
  if (userStatus === 'pending' || memberStatus === 'pending') return 'pending';
  return 'active';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [role, setRole] = useState<UserRole>('member');
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('active');
  const [loginModePreference, setLoginModePreference] = useState<PortalLoginMode>('member');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Fetch user profile, verified role, and member record strictly from Firebase/Firestore
  const fetchUserDataByUid = async (
    user: FirebaseUser
  ): Promise<{ role: UserRole; accountStatus: AccountStatus; profile: UserProfile | null; memberData: Member | null }> => {
    const uid = user.uid;
    const fallbackEmail = (user.email || '').toLowerCase().trim();
    const fallbackName = user.displayName || 'Church Member';

    const userRef = doc(db, 'users', uid);
    const memberQuery = query(collection(db, 'members'), where('userId', '==', uid));

    let userSnap;
    try {
      userSnap = await getDocFromServer(userRef);
    } catch {
      userSnap = await getDoc(userRef);
    }

    let memberSnap;
    try {
      memberSnap = await getDocs(memberQuery);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'members');
    }

    let verifiedRole: UserRole = 'member';
    let activeProfile: UserProfile | null = null;

    if (userSnap.exists()) {
      const uData = userSnap.data() as UserProfile;
      verifiedRole = normalizeRole(uData.role);
      activeProfile = { ...uData, role: verifiedRole };
    } else {
      // Any user missing a Firestore role record always defaults strictly to 'member' and 'pending'
      const now = new Date().toISOString();
      const newProfile: UserProfile = {
        uid,
        email: fallbackEmail,
        role: 'member',
        status: 'pending',
        displayName: fallbackName,
        createdAt: now,
        updatedAt: now
      };
      try {
        await setDoc(userRef, newProfile);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
      }
      activeProfile = newProfile;
      verifiedRole = 'member';
    }

    let activeMember: Member | null = null;
    if (memberSnap && !memberSnap.empty) {
      activeMember = { id: memberSnap.docs[0].id, ...memberSnap.docs[0].data() } as Member;
    } else {
      const now = new Date().toISOString();
      const nameParts = fallbackName.split(' ');
      const firstName = nameParts[0] || 'Church';
      const lastName = nameParts.slice(1).join(' ') || 'Member';
      const memberId = `mem_${uid.substring(0, 10)}`;
      const defaultStatus: AccountStatus = activeProfile?.status || 'pending';

      const defaultMember: Member = {
        id: memberId,
        userId: uid,
        membershipNumber: generateMembershipNumber(),
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        gender: 'Other',
        dateOfBirth: '1995-01-01',
        phone: '+234 800 000 0000',
        email: fallbackEmail,
        address: 'FaithTrack Cathedral Area',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        departmentName: 'Choir & Worship',
        groupName: 'Grace Cell Fellowship',
        membershipDate: now.split('T')[0],
        emergencyName: 'Family Contact',
        emergencyPhone: '+234 800 000 0001',
        status: defaultStatus,
        createdAt: now,
        updatedAt: now
      };

      try {
        await setDoc(doc(db, 'members', memberId), defaultMember);
        activeMember = defaultMember;
      } catch {
        // Non-fatal if user is not yet verified/created via transaction
      }
    }

    const resolvedStatus = resolveAccountStatus(activeProfile?.status, activeMember?.status);

    setUserProfile(activeProfile);
    setMember(activeMember);
    setRole(verifiedRole);
    setAccountStatus(resolvedStatus);

    return {
      role: verifiedRole,
      accountStatus: resolvedStatus,
      profile: activeProfile,
      memberData: activeMember
    };
  };

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      if (!user) {
        setFirebaseUser(null);
        setUserProfile(null);
        setMember(null);
        setRole('member');
        setEmailVerified(false);
        setAccountStatus('active');
        setLoading(false);
        return;
      }

      try {
        setFirebaseUser(user);
        setEmailVerified(Boolean(user.emailVerified));

        const result = await fetchUserDataByUid(user);
        if (!isMounted) return;

        // Default initial portal preference to admin when verified active admin signs in on refresh
        if (result.role === 'admin' || result.role === 'super_admin') {
          setLoginModePreference((prev) => (prev === 'member' ? 'admin' : prev));
          if (user.emailVerified && result.accountStatus === 'active') {
            seedDatabaseIfEmpty().catch(() => {});
          }
        } else {
          setLoginModePreference('member');
        }
      } catch (err) {
        console.error('Auth state verification error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await fetchUserDataByUid(auth.currentUser);
    }
  };

  const refreshAuthState = async (): Promise<SignInResult> => {
    const current = auth.currentUser;
    if (!current) {
      throw new Error('No authenticated user session found. Please sign in.');
    }
    await reload(current);
    // Force token refresh so Firestore rules see updated email_verified claim immediately
    await current.getIdToken(true);
    const verified = Boolean(current.emailVerified);
    setFirebaseUser(current);
    setEmailVerified(verified);

    const data = await fetchUserDataByUid(current);
    return {
      role: data.role,
      emailVerified: verified,
      accountStatus: data.accountStatus
    };
  };

  const resendVerificationEmail = async (): Promise<void> => {
    const current = auth.currentUser;
    if (!current) {
      throw new Error('Please sign in first to resend your verification email.');
    }
    try {
      await sendEmailVerification(current);
    } catch (err: any) {
      if (err?.code === 'auth/too-many-requests') {
        throw new Error('Too many verification emails sent recently. Please wait a few minutes and check your inbox/spam folder.');
      }
      throw new Error(err?.message || 'Unable to send verification email. Please try again shortly.');
    }
  };

  const signIn = async (
    email: string,
    pass: string,
    portalMode: PortalLoginMode = 'member'
  ): Promise<SignInResult> => {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !pass) {
      throw new Error('Please enter both your email address and password.');
    }

    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation') {
        throw new Error('Email/Password authentication is not enabled in Firebase Authentication. Please enable it in the Firebase Console.');
      }
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        throw new Error('Invalid email or password. Please verify your credentials and try again.');
      }
      if (err.code === 'auth/user-disabled') {
        throw new Error('This authentication account has been disabled. Please contact church administration.');
      }
      if (err.code === 'auth/too-many-requests') {
        throw new Error('Too many failed sign-in attempts. Please wait a few minutes or reset your password.');
      }
      if (err.code === 'auth/network-request-failed') {
        throw new Error('Network connection error. Please check your internet connection and try again.');
      }
      throw new Error(err.message || 'Unable to sign in. Please check your credentials.');
    }

    await reload(cred.user);
    await cred.user.getIdToken(true);
    const isEmailVerified = Boolean(cred.user.emailVerified);

    const fetched = await fetchUserDataByUid(cred.user);

    // Enforce Admin Portal authorization strictly via Firebase/Firestore role
    if (portalMode === 'admin' && fetched.role !== 'admin' && fetched.role !== 'super_admin') {
      await fbSignOut(auth);
      setFirebaseUser(null);
      setUserProfile(null);
      setMember(null);
      setRole('member');
      setEmailVerified(false);
      setAccountStatus('active');
      throw new Error('Access denied: This account does not have Administrator privileges. Please use Member Sign In.');
    }

    setFirebaseUser(cred.user);
    setEmailVerified(isEmailVerified);
    setLoginModePreference(portalMode);

    return {
      role: fetched.role,
      emailVerified: isEmailVerified,
      accountStatus: fetched.accountStatus
    };
  };

  const signUp = async (formData: any, onProgress?: (stage: string) => void): Promise<Member> => {
    onProgress?.('VALIDATING');
    const {
      email,
      password,
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth,
      photoUrl,
      phone,
      address,
      city,
      state,
      country,
      departmentId,
      departmentName,
      groupId,
      groupName,
      occupation,
      skills,
      emergencyName,
      emergencyPhone
    } = formData;

    const cleanEmail = email.toLowerCase().trim();
    const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();
    const now = new Date().toISOString();

    onProgress?.('CREATING_AUTH');
    let userCred;
    try {
      userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-in-use') {
        const error: any = new Error('An account with this email address already exists. Please sign in.');
        error.type = 'auth';
        error.code = 'auth/email-already-in-use';
        throw error;
      }
      if (authErr.code === 'auth/weak-password') {
        const error: any = new Error('Password must contain at least 8 characters.');
        error.type = 'auth';
        error.code = 'auth/weak-password';
        throw error;
      }
      if (authErr.code === 'auth/invalid-email') {
        const error: any = new Error('The email address format is invalid. Please check and try again.');
        error.type = 'auth';
        error.code = 'auth/invalid-email';
        throw error;
      }
      if (authErr.code === 'auth/operation-not-allowed') {
        const error: any = new Error('Email/Password sign-up is disabled in Firebase Console. Please contact church administration.');
        error.type = 'auth';
        error.code = 'auth/operation-not-allowed';
        throw error;
      }
      throw authErr;
    }

    const uid = userCred.user.uid;

    try {
      await updateProfile(userCred.user, {
        displayName: fullName,
        photoURL: photoUrl?.trim() || undefined
      });
      await sendEmailVerification(userCred.user);
    } catch (profileErr) {
      console.warn('Profile/verification email notice:', profileErr);
    }

    // All self-registrations strictly default to 'member' and 'pending' account activation
    const assignedRole: UserRole = 'member';
    const initialStatus: AccountStatus = 'pending';

    const resolvedDeptId = departmentId || INITIAL_DEPARTMENTS.find(d => d.name === departmentName)?.id || '';
    const resolvedGroupId = groupId || INITIAL_GROUPS.find(g => g.name === groupName)?.id || '';

    const userProfileData: UserProfile = {
      uid,
      email: cleanEmail,
      role: assignedRole,
      status: initialStatus,
      displayName: fullName,
      photoURL: photoUrl?.trim() || '',
      createdAt: now,
      updatedAt: now
    };

    const memberId = `mem_${uid.substring(0, 10)}`;
    const membershipNumber = generateMembershipNumber();

    const newMember: Member = {
      id: memberId,
      userId: uid,
      membershipNumber,
      firstName: firstName.trim(),
      middleName: middleName?.trim() || '',
      lastName: lastName.trim(),
      fullName,
      gender: gender || 'Other',
      dateOfBirth: dateOfBirth || '1995-01-01',
      photoUrl: photoUrl?.trim() || '',
      phone: phone.trim(),
      email: cleanEmail,
      address: address?.trim() || '',
      city: city?.trim() || 'Lagos',
      state: state?.trim() || 'Lagos',
      country: country?.trim() || 'Nigeria',
      departmentId: resolvedDeptId,
      departmentName: departmentName || 'Choir & Worship',
      groupId: resolvedGroupId,
      groupName: groupName || 'Grace Cell Fellowship',
      membershipDate: now.split('T')[0],
      occupation: occupation?.trim() || '',
      skills: Array.isArray(skills)
        ? skills
        : skills
        ? String(skills)
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [],
      emergencyName: emergencyName?.trim() || 'Emergency Contact',
      emergencyPhone: emergencyPhone?.trim() || phone.trim(),
      status: initialStatus,
      createdAt: now,
      updatedAt: now
    };

    onProgress?.('SAVING_DIRECTORY');
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', uid);
        const memberRef = doc(db, 'members', memberId);

        const userSnap = await transaction.get(userRef);
        if (userSnap.exists()) {
          throw new Error('User account already exists in directory.');
        }

        const memberSnap = await transaction.get(memberRef);
        if (memberSnap.exists()) {
          throw new Error('Member profile record already exists.');
        }

        transaction.set(userRef, userProfileData);
        transaction.set(memberRef, newMember);
      });
    } catch (writeErr: any) {
      // Rollback newly created Firebase Auth user so no orphaned Auth record remains
      try {
        await userCred.user.delete();
      } catch (delErr) {
        console.warn('Failed to roll back orphaned Auth user:', delErr);
      }

      const error: any = new Error(
        writeErr.code === 'permission-denied'
          ? 'Database permission error: Unable to record your member profile. Please contact church administration.'
          : writeErr.code === 'unavailable'
          ? 'Database connection unavailable: Please check your internet connection.'
          : writeErr.message || 'Atomic database transaction failed while creating your member profile.'
      );
      error.type = 'firestore';
      error.code = writeErr.code || 'firestore/transaction-failed';
      throw error;
    }

    onProgress?.('FINALIZING');

    setFirebaseUser(userCred.user);
    setEmailVerified(Boolean(userCred.user.emailVerified));
    setUserProfile(userProfileData);
    setMember(newMember);
    setRole(assignedRole);
    setAccountStatus(initialStatus);
    setLoginModePreference('member');

    return newMember;
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    }
    setFirebaseUser(null);
    setUserProfile(null);
    setMember(null);
    setRole('member');
    setEmailVerified(false);
    setAccountStatus('active');
    setLoginModePreference('member');
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (err: any) {
      if (err.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      if (err.code === 'auth/user-not-found') {
        throw new Error('No registered account was found with this email address.');
      }
      if (err.code === 'auth/too-many-requests') {
        throw new Error('Too many password reset requests. Please wait a few minutes before trying again.');
      }
      if (err.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      throw new Error(err.message || 'Unable to send password reset email. Please try again.');
    }
  };

  const updateMemberProfile = async (updates: Partial<Member>) => {
    if (!member) return;
    const { status: _ignoredStatus, userId: _ignoredUid, membershipNumber: _ignoredNum, id: _ignoredId, ...safeUpdates } = updates as any;
    try {
      const now = new Date().toISOString();
      const updated = { ...member, ...safeUpdates, updatedAt: now };
      await updateDoc(doc(db, 'members', member.id), {
        ...safeUpdates,
        updatedAt: now
      });
      setMember(updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `members/${member.id}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        member,
        role,
        emailVerified,
        accountStatus,
        loginModePreference,
        setLoginModePreference,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        resendVerificationEmail,
        refreshAuthState,
        updateMemberProfile,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
