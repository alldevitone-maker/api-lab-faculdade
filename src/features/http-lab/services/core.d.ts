import type { GeneratedRequest, LabRequest, LabResponse, ValidationMessage } from '../models/request';
interface AuditResult { total: number; passed: number; failures: unknown[]; invalidCases?: number }
interface LabCore {
  METHODS: LabRequest['method'][];
  FORMATS: LabRequest['format'][];
  allowsBody(method: string): boolean;
  validate(state: LabRequest): { errors: ValidationMessage[]; warnings: string[] };
  generate(state: LabRequest): GeneratedRequest;
  simulate(method: string, forcedStatus: number): LabResponse | null;
  newDatabase(): Record<string, Record<string, unknown>[]>;
  simulateRequest(state: LabRequest, database: Record<string, Record<string, unknown>[]>): LabResponse;
  audit(): AuditResult;
}
export const ApiLabCore: LabCore;
