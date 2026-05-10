export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GROQ_API_KEY: string;
  FRONTEND_URL: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'ORGANIZATION' | 'MANAGER' | 'CLIENT';
  organization_id: string | null;
  is_ecp_verified: number;
  created_at: string;
}

export interface Document {
  id: number;
  user_id: string;
  organization_id: string | null;
  template_id: number | null;
  uuid: string;
  title: string;
  file_key: string;
  file_name: string;
  status: 'DRAFT' | 'CLOSED';
  org_signature: string | null;
  org_signed_at: string | null;
  client_fields: string; // JSON array
  manager_fields: string; // JSON object
  created_at: string;
}

export interface Template {
  id: number;
  organization_id: string;
  title: string;
  description: string;
  file_key: string;
  file_name: string;
  template_fields: string; // JSON string
  created_at: string;
}

export interface DocumentSignature {
  id: number;
  document_id: number;
  client_id: string | null;
  client_email: string;
  client_name: string;
  signature: string | null;
  signed_at: string;
}

// Hono context variable type
export type Variables = {
  user: User;
};
