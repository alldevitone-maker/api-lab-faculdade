export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type OutputFormat = 'http' | 'curl' | 'fetch';
export interface KeyValue { key: string; value: string }
export interface LabRequest {
  method: HttpMethod;
  format: OutputFormat;
  base: string;
  resource: string;
  id: string;
  queries: KeyValue[];
  headerKey: string;
  headerValue: string;
  auth: string;
  body: string;
}
export interface LabResponse {
  status: number;
  statusText: string;
  body: unknown;
  headers?: Record<string, string>;
  hint?: string;
}
export interface ValidationMessage { field: string; message: string }
export interface GeneratedRequest {
  ok: boolean;
  errors: ValidationMessage[];
  warnings: string[];
  output: string;
  url: string;
}
