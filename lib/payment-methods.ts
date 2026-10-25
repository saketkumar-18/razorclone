// Client-safe payment method constants (no server imports)
export const TEST_CARDS = [
  { number: "4100 2800 0000 1007", network: "Visa", type: "Debit", sub: "Consumer" },
  { number: "5555 5100 0008 1006", network: "Mastercard", type: "Credit", sub: "Business" },
  { number: "5180 2872 0009 1001", network: "Mastercard", type: "Prepaid", sub: "Consumer" },
  { number: "6527 6589 0000 1005", network: "RuPay", type: "Credit", sub: "Consumer" },
  { number: "3608 280009 1007", network: "Diners", type: "Credit", sub: "Consumer" },
  { number: "3402 560004 01007", network: "Amex", type: "Credit", sub: "Consumer" },
];

export const NETBANKING_BANKS = [
  "HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank",
  "Kotak Mahindra Bank", "Punjab National Bank", "Bank of Baroda", "IndusInd Bank",
];

export const WALLETS = ["PhonePe", "Paytm", "Google Pay", "Amazon Pay", "Mobikwik", "Freecharge"];

export const EMI_BANKS = ["HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", "SBI Card"];

export const PAYMENT_METHODS = {
  card: { label: "Card", banks: [] as string[] },
  upi: { label: "UPI", banks: [] as string[] },
  netbanking: { label: "Netbanking", banks: NETBANKING_BANKS },
  wallet: { label: "Wallet", banks: WALLETS },
  emi: { label: "EMI", banks: EMI_BANKS },
  qr: { label: "QR", banks: [] as string[] },
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;
