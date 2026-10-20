/**
 * Standard Firestore Error Handler conforming to the Firebase Integration Skill.
 */

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  authCurrentUser?: {
    uid?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerData?: Array<{ providerId?: string | null; email?: string | null }>;
  } | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: authCurrentUser?.uid ?? null,
      email: authCurrentUser?.email ?? null,
      emailVerified: authCurrentUser?.emailVerified ?? null,
      isAnonymous: authCurrentUser?.isAnonymous ?? null,
      tenantId: authCurrentUser?.tenantId ?? null,
      providerInfo:
        authCurrentUser?.providerData?.map((p) => ({
          providerId: p.providerId ?? null,
          email: p.email ?? null,
        })) || [],
    },
  };

  console.error('[Firestore Error Details]:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}
