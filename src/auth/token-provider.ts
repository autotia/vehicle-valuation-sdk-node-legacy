export interface TokenProvider {
  getToken(): Promise<string>;
  invalidate?(): void;
}
