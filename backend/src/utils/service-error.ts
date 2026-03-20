export class ServiceError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }
}
