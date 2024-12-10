type APIResponse<TData = any> =
  | {
    success: true;
    data: TData;
  }
  | APIError;

type APIError = {
  succees: false;
  message: string;
  errors?: string;
}

export type { APIError, APIResponse };