import fs from 'fs';
import path from 'path';

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId?: string;
}

let cachedConfig: FirebaseAppletConfig | null = null;

function getFirebaseConfig(): FirebaseAppletConfig {
  if (cachedConfig) return cachedConfig;
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const raw = fs.readFileSync(configPath, 'utf-8');
  cachedConfig = JSON.parse(raw) as FirebaseAppletConfig;
  return cachedConfig;
}

function getFirestoreBaseUrl(): string {
  const cfg = getFirebaseConfig();
  const dbId = cfg.firestoreDatabaseId || '(default)';
  return `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${dbId}/documents`;
}

export interface VerifiedTokenUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

/**
 * Verifies a Firebase ID token against Google Identity Toolkit REST API.
 * Throws if invalid, expired, or email not verified.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedTokenUser> {
  const cfg = getFirebaseConfig();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(cfg.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    }
  );

  if (!res.ok) {
    throw new Error('Invalid or expired authentication token.');
  }

  const data = (await res.json()) as {
    users?: Array<{ localId: string; email?: string; emailVerified?: boolean; disabled?: boolean }>;
  };

  const user = data.users?.[0];
  if (!user || user.disabled) {
    throw new Error('Authenticated account not found or disabled.');
  }

  return {
    uid: user.localId,
    email: (user.email || '').toLowerCase(),
    emailVerified: Boolean(user.emailVerified)
  };
}

// Firestore Value converters
function fromFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in val) {
    const out: Record<string, any> = {};
    const fields = val.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = fromFirestoreValue(v);
    }
    return out;
  }
  return null;
}

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function decodeDoc<T = Record<string, any>>(docObj: any): (T & { id: string }) | null {
  if (!docObj || !docObj.name) return null;
  const parts = String(docObj.name).split('/');
  const id = parts[parts.length - 1];
  const fields = docObj.fields || {};
  const data: Record<string, any> = { id };
  for (const [k, v] of Object.entries(fields)) {
    data[k] = fromFirestoreValue(v);
  }
  return data as T & { id: string };
}

export async function fsGetDoc<T = Record<string, any>>(
  collectionName: string,
  docId: string,
  idToken: string
): Promise<(T & { id: string }) | null> {
  const url = `${getFirestoreBaseUrl()}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` }
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore GET ${collectionName}/${docId} failed (${res.status}): ${errText}`);
  }
  const json = await res.json();
  return decodeDoc<T>(json);
}

export async function fsListCollection<T = Record<string, any>>(
  collectionName: string,
  idToken: string,
  pageSize = 300
): Promise<Array<T & { id: string }>> {
  const url = `${getFirestoreBaseUrl()}/${encodeURIComponent(collectionName)}?pageSize=${pageSize}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore LIST ${collectionName} failed (${res.status}): ${errText}`);
  }
  const json = (await res.json()) as { documents?: any[] };
  return (json.documents || []).map(d => decodeDoc<T>(d)).filter(Boolean) as Array<T & { id: string }>;
}

export async function fsQueryWhereEqual<T = Record<string, any>>(
  collectionName: string,
  fieldPath: string,
  value: string | boolean | number,
  idToken: string
): Promise<Array<T & { id: string }>> {
  const url = `${getFirestoreBaseUrl()}:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collectionName }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: 'EQUAL',
            value: toFirestoreValue(value)
          }
        }
      }
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore QUERY ${collectionName} failed (${res.status}): ${errText}`);
  }
  const rows = (await res.json()) as Array<{ document?: any }>;
  return rows.map(r => (r.document ? decodeDoc<T>(r.document) : null)).filter(Boolean) as Array<T & { id: string }>;
}

export async function fsSetDoc(
  collectionName: string,
  docId: string,
  data: Record<string, any>,
  idToken: string
): Promise<void> {
  const url = `${getFirestoreBaseUrl()}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`;
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore SET ${collectionName}/${docId} failed (${res.status}): ${errText}`);
  }
}

export async function fsPatchFields(
  collectionName: string,
  docId: string,
  data: Record<string, any>,
  idToken: string
): Promise<void> {
  const params = Object.keys(data)
    .filter(k => data[k] !== undefined)
    .map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join('&');
  const url = `${getFirestoreBaseUrl()}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}?${params}`;
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore PATCH ${collectionName}/${docId} failed (${res.status}): ${errText}`);
  }
}
