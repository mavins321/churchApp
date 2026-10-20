import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, writeBatch, runTransaction } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, Member, UserRole } from '../types';
import { generateMembershipNumber } from '../lib/utils';
import { seedDatabaseIfEmpty, INITIAL_DEPARTMENTS, INITIAL_GROUPS } from '../lib/seedData';

interface AuthContextType {
  firebaseUser: FirebaseUser | { uid: string; email: string | null; displayName: string | null } | null;
  userProfile: UserProfile | null;
  member: Member | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (data: any, onProgress?: (stage: string) => void) => Promise<Member>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateMemberProfile: (updates: Partial<Member>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchRoleForDemo: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'faithtrack_session_uid';

// Helper for secure SHA-256 password hashing
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [role, setRole] = useState<UserRole>('member');
  const [loading, setLoading] = useState(true);

  // Initialize seed data if needed
  useEffect(() => {
    seedDatabaseIfEmpty().catch(console.error);
  }, []);

  // Fetch user profile and member document by UID
  const fetchUserDataByUid = async (uid: string, fallbackEmail: string = '', fallbackName: string = '') => {
    try {
      // 1. Fetch user doc
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      let currentRole: UserRole = 'member';
      if (userSnap.exists()) {
        const uData = userSnap.data() as UserProfile;
        setUserProfile(uData);
        currentRole = uData.role || 'member';
        setRole(currentRole);
      } else {
        // Create default user profile
        const newProfile: UserProfile = {
          uid: uid,
          email: fallbackEmail,
          role: 'member',
          displayName: fallbackName || 'Church Member',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
        setRole('member');
      }

      // 2. Fetch member doc
      const memberQuery = query(collection(db, 'members'), where('userId', '==', uid));
      const memberSnap = await getDocs(memberQuery);

      if (!memberSnap.empty) {
        const mData = { id: memberSnap.docs[0].id, ...memberSnap.docs[0].data() } as Member;
        setMember(mData);
      } else {
        // If no member record exists yet
        const nameParts = (fallbackName || 'Church Member').split(' ');
        const firstName = nameParts[0] || 'Church';
        const lastName = nameParts.slice(1).join(' ') || 'Member';
        const memberId = `mem_${uid.substring(0, 8)}`;
        const memNum = generateMembershipNumber();

        const defaultMember: Member = {
          id: memberId,
          userId: uid,
          membershipNumber: memNum,
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
          membershipDate: new Date().toISOString().split('T')[0],
          emergencyName: 'Family Contact',
          emergencyPhone: '+234 800 000 0001',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'members', memberId), defaultMember);
        setMember(defaultMember);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Listen to Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (isMounted) {
          setFirebaseUser(user);
          localStorage.setItem(LOCAL_STORAGE_KEY, user.uid);
          await fetchUserDataByUid(user.uid, user.email || '', user.displayName || '');
          setLoading(false);
        }
      } else {
        // If Firebase Auth has no user, check persistent local storage session
        const storedUid = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedUid) {
          try {
            const userSnap = await getDoc(doc(db, 'users', storedUid));
            if (userSnap.exists()) {
              const uData = userSnap.data() as UserProfile;
              if (isMounted) {
                setFirebaseUser({
                  uid: storedUid,
                  email: uData.email,
                  displayName: uData.displayName
                });
                await fetchUserDataByUid(storedUid, uData.email, uData.displayName);
              }
            } else {
              localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
          } catch (e) {
            console.error('Session restore error:', e);
          }
        }
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
    if (firebaseUser?.uid) {
      await fetchUserDataByUid(firebaseUser.uid, firebaseUser.email || '', firebaseUser.displayName || '');
    }
  };

  const signIn = async (email: string, pass: string) => {
    const cleanEmail = email.toLowerCase().trim();

    // 1. Try Firebase Auth sign-in first
    let authUser: any = null;
    let authFailedWithProviderDisabled = false;

    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      authUser = cred.user;
    } catch (err: any) {
      if (
        err.code === 'auth/operation-not-allowed' || 
        err.code === 'auth/admin-restricted-operation' ||
        err.message?.includes('operation-not-allowed')
      ) {
        authFailedWithProviderDisabled = true;
      } else if (err.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        // Check Firestore database before giving up
        authFailedWithProviderDisabled = true;
      } else {
        authFailedWithProviderDisabled = true;
      }
    }

    if (authUser) {
      setFirebaseUser(authUser);
      localStorage.setItem(LOCAL_STORAGE_KEY, authUser.uid);
      await fetchUserDataByUid(authUser.uid, authUser.email || '', authUser.displayName || '');
      return;
    }

    // 2. Fallback to Firestore authenticated credentials
    if (authFailedWithProviderDisabled) {
      const userQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const userSnap = await getDocs(userQuery);

      if (userSnap.empty) {
        throw new Error('We could not find an account with that email. Please check your email or register.');
      }

      const userDoc = userSnap.docs[0];
      const userData = userDoc.data();
      const enteredHash = await hashPassword(pass);

      // Verify password hash if present
      if (userData.passwordHash && userData.passwordHash !== enteredHash) {
        throw new Error('Incorrect password. Please try again.');
      }

      const uid = userDoc.id;
      const syntheticUser = {
        uid,
        email: cleanEmail,
        displayName: userData.displayName || 'Member'
      };

      setFirebaseUser(syntheticUser);
      localStorage.setItem(LOCAL_STORAGE_KEY, uid);
      await fetchUserDataByUid(uid, cleanEmail, userData.displayName || '');
      return;
    }

    throw new Error('Unable to sign in. Please verify your email and password.');
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

    // 1. Check if an account with this email already exists in Firestore
    onProgress?.('CHECKING_EMAIL');
    try {
      const existingSnap = await getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail)));
      if (!existingSnap.empty) {
        const error: any = new Error('An account with this email address already exists. Please log in.');
        error.type = 'auth';
        error.code = 'auth/email-already-in-use';
        throw error;
      }
    } catch (checkErr: any) {
      if (checkErr.code === 'auth/email-already-in-use' || checkErr.message?.includes('already exists')) {
        throw checkErr;
      }
      console.warn('Pre-check email query notice:', checkErr);
    }

    // 2. Generate unique UID and Membership number
    let uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    // 3. Try Firebase Auth create user (if enabled)
    onProgress?.('CREATING_AUTH');
    let newlyCreatedAuthUser: any = null;
    try {
      const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      uid = userCred.user.uid;
      newlyCreatedAuthUser = userCred.user;
      await updateProfile(userCred.user, { displayName: fullName, photoURL: photoUrl || undefined });
      setFirebaseUser(userCred.user);
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-in-use') {
        const error: any = new Error('An account with this email address already exists. Please log in.');
        error.type = 'auth';
        error.code = 'auth/email-already-in-use';
        throw error;
      } else if (authErr.code === 'auth/weak-password') {
        const error: any = new Error('Password must contain at least 8 characters.');
        error.type = 'auth';
        error.code = 'auth/weak-password';
        throw error;
      } else if (authErr.code === 'auth/invalid-email') {
        const error: any = new Error('The email address format is invalid. Please check and try again.');
        error.type = 'auth';
        error.code = 'auth/invalid-email';
        throw error;
      }
      // If operation-not-allowed or admin-restricted, proceed seamlessly with Firestore storage
      setFirebaseUser({
        uid,
        email: cleanEmail,
        displayName: fullName
      });
    }

    // Determine initial role (admin demo email gets admin role)
    const assignedRole: UserRole = cleanEmail.includes('admin') ? 'admin' : 'member';

    // Resolve departmentId and groupId if available
    const resolvedDeptId = departmentId || INITIAL_DEPARTMENTS.find(d => d.name === departmentName)?.id || '';
    const resolvedGroupId = groupId || INITIAL_GROUPS.find(g => g.name === groupName)?.id || '';

    // 4. Prepare User document
    const userProfileData: UserProfile = {
      uid,
      email: cleanEmail,
      role: assignedRole,
      displayName: fullName,
      photoURL: photoUrl?.trim() || '',
      createdAt: now,
      updatedAt: now
    };

    // 5. Prepare Member document (captures Step 1, Step 2, Step 3, Step 4)
    const memberId = `mem_${uid.substring(0, 10)}`;
    const membershipNumber = generateMembershipNumber();

    const newMember: Member = {
      id: memberId,
      userId: uid,
      membershipNumber,
      // Step 1: Personal Information
      firstName: firstName.trim(),
      middleName: middleName?.trim() || '',
      lastName: lastName.trim(),
      fullName,
      gender: gender || 'Other',
      dateOfBirth: dateOfBirth || '1995-01-01',
      photoUrl: photoUrl?.trim() || '',
      // Step 2: Contact Information
      phone: phone.trim(),
      email: cleanEmail,
      address: address?.trim() || '',
      city: city?.trim() || 'Lagos',
      state: state?.trim() || 'Lagos',
      country: country?.trim() || 'Nigeria',
      // Step 3: Church Information
      departmentId: resolvedDeptId,
      departmentName: departmentName || 'Choir & Worship',
      groupId: resolvedGroupId,
      groupName: groupName || 'Grace Cell Fellowship',
      membershipDate: now.split('T')[0],
      occupation: occupation?.trim() || '',
      skills: Array.isArray(skills) ? skills : (skills ? String(skills).split(',').map((s: string) => s.trim()).filter(Boolean) : []),
      // Step 4: Emergency Contact
      emergencyName: emergencyName?.trim() || 'Emergency Contact',
      emergencyPhone: emergencyPhone?.trim() || phone.trim(),
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    // 6. Perform Atomic ACID Transaction to write both 'users' and 'members' collections
    onProgress?.('SAVING_DIRECTORY');
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', uid);
        const memberRef = doc(db, 'members', memberId);

        // Transaction reads must happen before transaction writes
        const userSnap = await transaction.get(userRef);
        if (userSnap.exists()) {
          throw new Error('User account already exists in directory.');
        }

        const memberSnap = await transaction.get(memberRef);
        if (memberSnap.exists()) {
          throw new Error('Member profile record already exists.');
        }

        // Atomic writes within transaction
        transaction.set(userRef, {
          ...userProfileData,
          passwordHash
        });
        transaction.set(memberRef, newMember);
      });
    } catch (writeErr: any) {
      console.error('Firestore atomic transaction rejected:', writeErr);

      // Rollback newly created Auth user to avoid orphaned Auth record
      if (newlyCreatedAuthUser) {
        try {
          await newlyCreatedAuthUser.delete();
          console.log('Successfully rolled back Firebase Auth account after database transaction failure');
        } catch (delErr) {
          console.warn('Failed to delete orphaned Auth user:', delErr);
        }
      }

      const error: any = new Error(
        writeErr.code === 'permission-denied'
          ? 'Database permission error: Unable to record your member profile. Please contact church administration.'
          : writeErr.code === 'unavailable'
          ? 'Database connection unavailable: The server could not be reached. Please check your internet connection.'
          : writeErr.message || 'Atomic database transaction failed: Could not record user and member profiles in church directory.'
      );
      error.type = 'firestore';
      error.code = writeErr.code || 'firestore/transaction-failed';
      throw error;
    }

    onProgress?.('FINALIZING');

    // Save session in localStorage so the user remains signed in
    localStorage.setItem(LOCAL_STORAGE_KEY, uid);

    setUserProfile(userProfileData);
    setMember(newMember);
    setRole(assignedRole);

    return newMember;
  };

  const signOut = async () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    try {
      await fbSignOut(auth);
    } catch {
      // quiet catch
    }
    setFirebaseUser(null);
    setUserProfile(null);
    setMember(null);
    setRole('member');
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const userQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const snap = await getDocs(userQuery);
    if (snap.empty) {
      throw new Error('No registered account was found with this email address.');
    }
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch {
      // If Firebase Auth email delivery is not configured, we still confirm for privacy/security
    }
  };

  const updateMemberProfile = async (updates: Partial<Member>) => {
    if (!member) return;
    try {
      const now = new Date().toISOString();
      const updated = { ...member, ...updates, updatedAt: now };
      await updateDoc(doc(db, 'members', member.id), {
        ...updates,
        updatedAt: now
      });
      setMember(updated);
    } catch (err) {
      console.error('Error updating profile:', err);
      throw new Error('Failed to update profile information.');
    }
  };

  const switchRoleForDemo = async (newRole: UserRole) => {
    if (!firebaseUser?.uid) return;
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      setRole(newRole);
      if (userProfile) {
        setUserProfile({ ...userProfile, role: newRole });
      }
    } catch (e) {
      console.error('Role switch failed:', e);
      setRole(newRole);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        member,
        role,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateMemberProfile,
        refreshProfile,
        switchRoleForDemo
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
