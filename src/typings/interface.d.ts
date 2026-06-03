

interface Result {
  code?: number;
  msg?: string;
  ts: number;
}

// Request response parameters (including data)
interface ResultData<T = any> extends Result {
  data: T;
}

declare namespace Login {
  interface sendCodeReq {
    email: string;
  }

  type loginReq =
    | {
        email: string;
        phone_number?: never;
        verify_code: string;
      }
    | {
        email?: never;
        phone_number: string;
        verify_code: string;
      };
}

declare namespace User {
  interface Info {
    BridgeWalletId: string;
    VirtualAccountId: string;
    CreatedAt: string;
    CustomerId: string;
    Email: string;
    Id: number;
    KycId: string;
    KycStatus: string;
    Status: number;
    Phone: string;
    Avatar: string;
  }
}
