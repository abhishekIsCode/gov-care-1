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
  }
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
}

export interface Patient {
  id: string;
  healthId: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  medicalHistory?: string;
  requestedTreatment?: string;
  doctorId: string;
  status: 'Pending' | 'Admitted' | 'Discharged';
  enrolledAt: string;
}
