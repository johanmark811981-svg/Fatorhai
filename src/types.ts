export type TransactionType = 'expense' | 'income' | 'transfer';

export type ExpenseScope = 'business' | 'personal';

export type PaymentMethod = 'cash' | 'card' | 'apple_pay' | 'bank_transfer' | 'stc_pay';

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  budgetLimit?: number;
  isPersonal?: boolean;
}

export interface Account {
  id: string;
  nameAr: string;
  nameEn: string;
  accountNumber?: string;
  type: 'bank' | 'cash' | 'card' | 'wallet';
  balance: number;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  title: string;
  description?: string;
  amount: number; // Base currency amount
  type: TransactionType;
  categoryId: string;
  accountId: string;
  toAccountId?: string; // For transfers
  date: string; // ISO date format YYYY-MM-DD
  paymentMethod: PaymentMethod;
  notes?: string;
  vendorOrClient?: string;
  receiptImage?: string;
  tags?: string[];
  scope?: ExpenseScope; // 'business' or 'personal'
  currency?: string; // e.g. 'SAR', 'USD', 'EUR'
  exchangeRate?: number; // exchange rate against base currency
  foreignAmount?: number; // original foreign amount
}

export type DebtType = 'i_owe' | 'owed_to_me'; // i_owe = دين علي, owed_to_me = مستحق لي
export type DebtStatus = 'pending' | 'partially_paid' | 'paid';

export interface Debt {
  id: string;
  personName: string;
  phone?: string;
  amount: number;
  paidAmount: number;
  currency?: string; // e.g. "ر.س", "$", "AED", "KWD", "EUR", "EGP", "SAR"
  type: DebtType;
  startDate: string;
  dueDate?: string;
  status: DebtStatus;
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  description: string; // Arabic name
  descriptionEn?: string; // English name
  quantity: number;
  unit: string;
  unitPrice: number;
  discount?: number;
  taxRate: number; // e.g. 15 for 15% VAT
  taxAmount?: number;
  total: number;
  barcode?: string;
}

export interface Product {
  id: string;
  name: string; // Arabic name
  nameEn?: string; // English name
  barcode: string;
  unit: string; // e.g. "حبة", "كرتون", "كيلو"
  price: number;
  isTaxInclusive: boolean;
  category?: string;
  stock?: number;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  taxNumber?: string;
  nationalAddress?: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: 'simplified' | 'standard';
  zatcaPhase?: 'phase1' | 'phase2';
  uuid?: string;
  invoiceHash?: string;
  ecdsaSignature?: string;
  ecdsaPublicKey?: string;
  cryptographicStamp?: string;
  icv?: number;
  pih?: string;
  clearanceStatus?: 'cleared' | 'reported' | 'pending';
  customerId?: string;
  customerName: string;
  customerTaxNumber?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerEmail?: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  status: 'paid' | 'pending' | 'overdue';
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  monthlyLimit: number;
  period: string; // e.g. "2026-07"
}

export type Currency = 'SAR' | 'AED' | 'KWD' | 'QAR' | 'USD' | 'EUR' | 'EGP';

export type AppTheme = 'desert' | 'titanium' | 'dark' | 'silver' | 's24_titanium' | 's24_black' | 's24_violet' | 's24_yellow' | 'dynamic_smart';

export type DeviceFrameMode = 's24_ultra' | 'iphone' | 'desktop' | 'fullscreen';

export interface AppSettings {
  currency: Currency;
  currencySymbol: string;
  language: 'ar' | 'en';
  theme: AppTheme;
  showiPhoneFrame: boolean;
  deviceFrameMode?: DeviceFrameMode;
  enableSoundEffects: boolean;
  companyName: string;
  companyNameEn?: string;
  customAppName?: string;
  customAppIconUrl?: string;
  companyVatNumber: string;
  companyPhone: string;
  companyNationalAddress?: string;
  companyCommercialRegister?: string;
  bankIban?: string;
  bankName?: string;
  bankAccountName?: string;
  companyEmail?: string;
  companyLogoUrl?: string;
  enableSecurityLock: boolean;
  securityPin?: string;
  adminPin?: string;
  sharedPin?: string;
  enableSharedPin?: boolean;
  webhookUrl?: string;
  enableWebhook?: boolean;
  invoiceFooterNote?: string;
  travelMode?: boolean;
  travelCurrency?: string;
  exchangeRates?: Record<string, number>;
}

export type ContractType = 'rent' | 'service' | 'subscription' | 'other';
export type ContractStatus = 'active' | 'expiring_soon' | 'expired' | 'renewed' | 'cancelled';

export interface Contract {
  id: string;
  title: string;
  vendorName: string;
  type: ContractType;
  startDate: string;
  endDate: string;
  amount?: number;
  renewalNoticeDays: number; // e.g. alert 30 days before
  status: ContractStatus;
  notes?: string;
  autoRenew?: boolean;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  createdAt: string;
  permissions?: string[];
  verified?: boolean;
  verificationCode?: string;
}

export interface ReceiptVoucher {
  id: string;
  voucherNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  customerName: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  receivedBy?: string;
}

export interface Unit {
  id: string;
  name: string;
}

export type AssetCategory = 'vehicles' | 'real_estate' | 'equipment' | 'computers' | 'furniture' | 'other';
export type DepreciationMethod = 'straight_line' | 'declining_balance';

export interface FixedAsset {
  id: string;
  name: string;
  assetCode?: string; // e.g., AST-001
  category: AssetCategory;
  purchaseDate: string; // ISO YYYY-MM-DD
  purchaseCost: number; // Cost price
  salvageValue: number; // Scrap / residual value
  usefulLifeYears: number; // Useful life in years
  depreciationMethod: DepreciationMethod;
  notes?: string;
  location?: string;
  status: 'active' | 'sold' | 'disposed';
  createdAt: string;
}

export interface AppData {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  invoices: Invoice[];
  debts: Debt[];
  contracts: Contract[];
  products: Product[];
  customers: Customer[];
  assets?: FixedAsset[];
  units?: Unit[];
  receiptVouchers?: ReceiptVoucher[];
  settings: AppSettings;
}
