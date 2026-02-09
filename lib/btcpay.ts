import axios, { AxiosInstance } from 'axios';

interface BTCPayConfig {
  host: string; // e.g., "https://btcpay.example.com"
  apiKey: string; // BTCPay API key
  storeId: string; // BTCPay Store ID
}

interface CreateInvoiceRequest {
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
  checkout?: {
    redirectURL?: string;
    speedPolicy?: string;
  };
}

interface Invoice {
  id: string;
  checkoutLink: string;
  amount: string;
  currency: string;
  status: string;
  metadata?: Record<string, any>;
  payment?: {
    value: number;
    cryptoCode: string;
  };
}

interface Payout {
  id: string;
  destination: string;
  amount: string;
  paymentMethod: string;
  state: string;
  metadata?: Record<string, any>;
}

export class BTCPayClient {
  private config: BTCPayConfig;
  private client: AxiosInstance;

  constructor(config: BTCPayConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.host,
      headers: {
        'Authorization': `token ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create an invoice for deposits
   * @param amount Amount in USD
   * @param userId User ID for metadata
   * @param metadata Additional metadata
   * @returns Invoice data with checkout link
   */
  async createInvoice(
    amount: number,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<Invoice> {
    try {
      const response = await this.client.post(
        `/api/v1/stores/${this.config.storeId}/invoices`,
        {
          amount: amount.toString(),
          currency: 'USD',
          metadata: {
            userId,
            orderId: `deposit_${Date.now()}`,
            ...metadata
          },
          checkout: {
            redirectURL: `${process.env.NEXT_PUBLIC_SITE_URL}/profile?deposit=success`,
            speedPolicy: 'HighSpeed'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('BTCPay createInvoice error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create invoice');
    }
  }

  /**
   * Get invoice details by ID
   * @param invoiceId Invoice ID
   * @returns Invoice data
   */
  async getInvoice(invoiceId: string): Promise<Invoice> {
    try {
      const response = await this.client.get(
        `/api/v1/stores/${this.config.storeId}/invoices/${invoiceId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('BTCPay getInvoice error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get invoice');
    }
  }

  /**
   * Create a payout for withdrawals
   * @param destination Bitcoin address or Lightning invoice
   * @param amount Amount in BTC
   * @param userId User ID for metadata
   * @param paymentMethod Payment method (BTC-CHAIN or BTC-LightningNetwork)
   * @returns Payout data
   */
  async createPayout(
    destination: string,
    amount: number,
    userId: string,
    paymentMethod: 'BTC-CHAIN' | 'BTC-LightningNetwork' = 'BTC-CHAIN'
  ): Promise<Payout> {
    try {
      const response = await this.client.post(
        `/api/v1/stores/${this.config.storeId}/payouts`,
        {
          destination,
          amount: amount.toString(),
          paymentMethod,
          metadata: {
            userId,
            withdrawalId: `withdrawal_${Date.now()}`
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('BTCPay createPayout error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create payout');
    }
  }

  /**
   * Get payout details by ID
   * @param payoutId Payout ID
   * @returns Payout data
   */
  async getPayout(payoutId: string): Promise<Payout> {
    try {
      const response = await this.client.get(
        `/api/v1/stores/${this.config.storeId}/payouts/${payoutId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('BTCPay getPayout error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get payout');
    }
  }
}

// Singleton instance - lazy loaded to avoid build-time errors
let _btcpayClient: BTCPayClient | null = null;

export function getBTCPayClient(): BTCPayClient {
  if (!_btcpayClient) {
    const host = process.env.BTCPAY_HOST;
    const apiKey = process.env.BTCPAY_API_KEY;
    const storeId = process.env.BTCPAY_STORE_ID;

    if (!host || !apiKey || !storeId) {
      throw new Error('BTCPay Server configuration is incomplete. Please set BTCPAY_HOST, BTCPAY_API_KEY, and BTCPAY_STORE_ID environment variables.');
    }

    _btcpayClient = new BTCPayClient({
      host,
      apiKey,
      storeId
    });
  }

  return _btcpayClient;
}

// Backward compatibility export
export const btcpayClient = {
  get instance() {
    return getBTCPayClient();
  },
  createInvoice: (...args: Parameters<BTCPayClient['createInvoice']>) =>
    getBTCPayClient().createInvoice(...args),
  getInvoice: (...args: Parameters<BTCPayClient['getInvoice']>) =>
    getBTCPayClient().getInvoice(...args),
  createPayout: (...args: Parameters<BTCPayClient['createPayout']>) =>
    getBTCPayClient().createPayout(...args),
  getPayout: (...args: Parameters<BTCPayClient['getPayout']>) =>
    getBTCPayClient().getPayout(...args),
};
