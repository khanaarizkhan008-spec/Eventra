/// <reference types="vite/client" />

declare module "@cashfreepayments/cashfree-js" {
  export interface Cashfree {
    checkout: (options: {
      paymentSessionId: string;
      redirectTarget?: "_self" | "_blank" | "_top" | "_modal";
    }) => Promise<{
      error?: { message?: string };
      redirect?: boolean;
      paymentDetails?: unknown;
    }>;
  }

  export function load(options: {
    mode: "sandbox" | "production";
  }): Promise<Cashfree | null>;
}

