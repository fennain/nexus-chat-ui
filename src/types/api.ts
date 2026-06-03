export interface Result {
  code?: number;
  msg?: string;
  error?: string;
  ts: number;
  hasMore?: boolean;
}

export interface ResultData<T = any> extends Result {
  data: T;
}
