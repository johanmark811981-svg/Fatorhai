import { Account, AppSettings, Category, Invoice, Transaction, Debt, Contract, FixedAsset } from '../types';
import { DEFAULT_SETTINGS, INITIAL_ACCOUNTS, INITIAL_CATEGORIES, INITIAL_INVOICES, INITIAL_TRANSACTIONS, INITIAL_DEBTS, INITIAL_ASSETS } from '../data/initialData';
import { normalizeInvoiceList } from './formatters';

const STORAGE_KEYS = {
  SETTINGS: 'app_finance_settings_v1',
  TRANSACTIONS: 'app_finance_transactions_v1',
  ACCOUNTS: 'app_finance_accounts_v1',
  CATEGORIES: 'app_finance_categories_v1',
  INVOICES: 'app_finance_invoices_v1',
  DEBTS: 'app_finance_debts_v1',
  CONTRACTS: 'app_finance_contracts_v1',
  ASSETS: 'app_finance_assets_v1',
};

export function loadStoredData() {
  try {
    const settingsStr = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const transactionsStr = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const accountsStr = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    const categoriesStr = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    const invoicesStr = localStorage.getItem(STORAGE_KEYS.INVOICES);
    const debtsStr = localStorage.getItem(STORAGE_KEYS.DEBTS);
    const contractsStr = localStorage.getItem(STORAGE_KEYS.CONTRACTS);
    const assetsStr = localStorage.getItem(STORAGE_KEYS.ASSETS);

    let parsedSettings = settingsStr ? JSON.parse(settingsStr) : DEFAULT_SETTINGS;
    
    // Auto-upgrade for existing users
    if (parsedSettings.companyName === 'شركة الإنجاز الذكية للتجارة') {
      parsedSettings.companyName = 'كواليتي لينكس';
    }
    if (!parsedSettings.companyPhone) {
      parsedSettings.companyPhone = '0534239030';
    }

    return {
      settings: parsedSettings,
      transactions: transactionsStr ? JSON.parse(transactionsStr) : INITIAL_TRANSACTIONS,
      accounts: accountsStr ? JSON.parse(accountsStr) : INITIAL_ACCOUNTS,
      categories: categoriesStr ? JSON.parse(categoriesStr) : INITIAL_CATEGORIES,
      invoices: normalizeInvoiceList(invoicesStr ? JSON.parse(invoicesStr) : INITIAL_INVOICES),
      debts: debtsStr ? JSON.parse(debtsStr) : INITIAL_DEBTS,
      contracts: contractsStr ? JSON.parse(contractsStr) : [],
      assets: assetsStr ? JSON.parse(assetsStr) : INITIAL_ASSETS,
    };
  } catch (error) {
    console.error('Failed to load local storage data:', error);
    return {
      settings: DEFAULT_SETTINGS,
      transactions: INITIAL_TRANSACTIONS,
      accounts: INITIAL_ACCOUNTS,
      categories: INITIAL_CATEGORIES,
      invoices: INITIAL_INVOICES,
      debts: INITIAL_DEBTS,
      contracts: [],
      assets: INITIAL_ASSETS,
    };
  }
}

export function saveStoredData(data: {
  settings?: AppSettings;
  transactions?: Transaction[];
  accounts?: Account[];
  categories?: Category[];
  invoices?: Invoice[];
  debts?: Debt[];
  contracts?: Contract[];
  assets?: FixedAsset[];
}) {
  try {
    if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    if (data.transactions) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
    if (data.accounts) localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(data.accounts));
    if (data.categories) localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(data.categories));
    if (data.invoices) localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(data.invoices));
    if (data.debts) localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(data.debts));
    if (data.contracts) localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(data.contracts));
    if (data.assets) localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(data.assets));
  } catch (error) {
    console.error('Failed to save to local storage:', error);
  }
}

export function resetToSampleData() {
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  localStorage.removeItem(STORAGE_KEYS.ACCOUNTS);
  localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
  localStorage.removeItem(STORAGE_KEYS.INVOICES);
  localStorage.removeItem(STORAGE_KEYS.DEBTS);
  localStorage.removeItem(STORAGE_KEYS.CONTRACTS);
  localStorage.removeItem(STORAGE_KEYS.ASSETS);
  return {
    settings: DEFAULT_SETTINGS,
    transactions: INITIAL_TRANSACTIONS,
    accounts: INITIAL_ACCOUNTS,
    categories: INITIAL_CATEGORIES,
    invoices: INITIAL_INVOICES,
    debts: INITIAL_DEBTS,
    contracts: [],
    assets: INITIAL_ASSETS,
  };
}

export function exportBackupJSON(state: any) {
  const jsonStr = JSON.stringify(state, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finance_backup_iphone17_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
