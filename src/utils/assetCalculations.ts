import { FixedAsset, AssetCategory } from '../types';

export interface DepreciationScheduleRow {
  yearNumber: number;
  yearLabel: string;
  startDate: string;
  endDate: string;
  startingBookValue: number;
  depreciationExpense: number;
  accumulatedDepreciation: number;
  endingBookValue: number;
  isCurrentYear?: boolean;
}

export interface CalculatedAssetMetrics {
  depreciableCost: number;
  annualDepreciation: number;
  monthlyDepreciation: number;
  dailyDepreciation: number;
  elapsedDays: number;
  elapsedMonths: number;
  elapsedYears: number;
  remainingYears: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  depreciationPercentage: number;
  isFullyDepreciated: boolean;
  schedule: DepreciationScheduleRow[];
}

export const ASSET_CATEGORY_INFO: Record<AssetCategory, { labelAr: string; labelEn: string; icon: string; color: string; defaultUsefulLife: number }> = {
  vehicles: { labelAr: 'سيارات ووسائل نقل', labelEn: 'Vehicles & Transport', icon: 'Car', color: 'blue', defaultUsefulLife: 5 },
  real_estate: { labelAr: 'عقارات ومباني', labelEn: 'Real Estate & Buildings', icon: 'Building2', color: 'emerald', defaultUsefulLife: 20 },
  equipment: { labelAr: 'معدات وآلات مصنع', labelEn: 'Equipment & Machinery', icon: 'Wrench', color: 'amber', defaultUsefulLife: 8 },
  computers: { labelAr: 'أجهزة ومعدات تقنية', labelEn: 'Computers & IT', icon: 'Laptop', color: 'purple', defaultUsefulLife: 4 },
  furniture: { labelAr: 'أثاث وتجهيزات مكتبية', labelEn: 'Furniture & Fixtures', icon: 'Armchair', color: 'pink', defaultUsefulLife: 7 },
  other: { labelAr: 'أصول ثابتة أخرى', labelEn: 'Other Fixed Assets', icon: 'Box', color: 'slate', defaultUsefulLife: 5 },
};

/**
 * Computes exact real-time depreciation metrics for a single fixed asset.
 */
export function calculateAssetMetrics(asset: FixedAsset, targetDateStr?: string): CalculatedAssetMetrics {
  const purchaseCost = Number(asset.purchaseCost) || 0;
  const salvageValue = Math.min(purchaseCost, Number(asset.salvageValue) || 0);
  const usefulLifeYears = Math.max(1, Number(asset.usefulLifeYears) || 1);
  const depreciableCost = Math.max(0, purchaseCost - salvageValue);

  const purchaseDate = new Date(asset.purchaseDate || Date.now());
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();

  // Calculate elapsed time
  const timeDiffMs = Math.max(0, targetDate.getTime() - purchaseDate.getTime());
  const elapsedDays = Math.floor(timeDiffMs / (1000 * 60 * 60 * 24));
  const elapsedYears = elapsedDays / 365.25;
  const elapsedMonths = elapsedDays / 30.4375;
  const remainingYears = Math.max(0, usefulLifeYears - elapsedYears);

  let annualDepreciation = 0;
  let accumulatedDepreciation = 0;

  if (asset.depreciationMethod === 'declining_balance') {
    // Double Declining Balance Method (200% rate)
    const rate = 2 / usefulLifeYears;
    let currentBookVal = purchaseCost;
    let totalAccDep = 0;
    const fullYearsPassed = Math.floor(elapsedYears);
    const fractionOfYear = elapsedYears - fullYearsPassed;

    for (let i = 0; i < fullYearsPassed; i++) {
      if (currentBookVal <= salvageValue) break;
      let yearlyDep = currentBookVal * rate;
      if (currentBookVal - yearlyDep < salvageValue) {
        yearlyDep = currentBookVal - salvageValue;
      }
      totalAccDep += yearlyDep;
      currentBookVal -= yearlyDep;
    }

    if (currentBookVal > salvageValue && fractionOfYear > 0) {
      let partialDep = (currentBookVal * rate) * fractionOfYear;
      if (currentBookVal - partialDep < salvageValue) {
        partialDep = currentBookVal - salvageValue;
      }
      totalAccDep += partialDep;
    }

    accumulatedDepreciation = Math.min(depreciableCost, totalAccDep);
    annualDepreciation = (purchaseCost * rate);
  } else {
    // Straight-Line Depreciation Method (الافتراضي - القسط الثابت)
    annualDepreciation = depreciableCost / usefulLifeYears;
    accumulatedDepreciation = Math.min(depreciableCost, annualDepreciation * elapsedYears);
  }

  const monthlyDepreciation = annualDepreciation / 12;
  const dailyDepreciation = annualDepreciation / 365.25;
  const currentBookValue = Math.max(salvageValue, purchaseCost - accumulatedDepreciation);
  const depreciationPercentage = depreciableCost > 0 ? (accumulatedDepreciation / depreciableCost) * 100 : 0;
  const isFullyDepreciated = currentBookValue <= salvageValue || depreciationPercentage >= 99.9;

  // Generate Year-by-Year Depreciation Schedule
  const schedule: DepreciationScheduleRow[] = [];
  let bookVal = purchaseCost;
  let accDep = 0;
  const startYear = purchaseDate.getFullYear();
  const currentYearNum = targetDate.getFullYear();

  for (let y = 1; y <= usefulLifeYears; y++) {
    const yearLabel = `السنة ${y} (${startYear + y - 1})`;
    const startingBookValue = bookVal;
    let exp = 0;

    if (asset.depreciationMethod === 'declining_balance') {
      const rate = 2 / usefulLifeYears;
      exp = startingBookValue * rate;
      if (startingBookValue - exp < salvageValue) {
        exp = Math.max(0, startingBookValue - salvageValue);
      }
    } else {
      exp = depreciableCost / usefulLifeYears;
      if (startingBookValue - exp < salvageValue) {
        exp = Math.max(0, startingBookValue - salvageValue);
      }
    }

    accDep += exp;
    bookVal = Math.max(salvageValue, startingBookValue - exp);

    schedule.push({
      yearNumber: y,
      yearLabel,
      startDate: `${startYear + y - 1}-01-01`,
      endDate: `${startYear + y - 1}-12-31`,
      startingBookValue,
      depreciationExpense: exp,
      accumulatedDepreciation: accDep,
      endingBookValue: bookVal,
      isCurrentYear: (startYear + y - 1) === currentYearNum,
    });
  }

  return {
    depreciableCost,
    annualDepreciation,
    monthlyDepreciation,
    dailyDepreciation,
    elapsedDays,
    elapsedMonths,
    elapsedYears,
    remainingYears,
    accumulatedDepreciation,
    currentBookValue,
    depreciationPercentage,
    isFullyDepreciated,
    schedule,
  };
}

/**
 * Calculates aggregate asset statistics across active assets
 */
export function calculateAssetsSummary(assets: FixedAsset[], targetDateStr?: string) {
  const activeAssets = (assets || []).filter(a => a.status !== 'disposed');

  let totalPurchaseCost = 0;
  let totalSalvageValue = 0;
  let totalAccumulatedDepreciation = 0;
  let totalNetBookValue = 0;
  let totalAnnualDepreciation = 0;
  let totalMonthlyDepreciation = 0;

  const categoryMap: Record<AssetCategory, { count: number; cost: number; accumDep: number; netBookValue: number; annualDep: number }> = {
    vehicles: { count: 0, cost: 0, accumDep: 0, netBookValue: 0, annualDep: 0 },
    real_estate: { count: 0, cost: 0, accumDep: 0, netBookValue: 0, annualDep: 0 },
    equipment: { count: 0, cost: 0, accumDep: 0, netBookValue: 0, annualDep: 0 },
    computers: { count: 0, cost: 0, accumDep: 0, netBookValue: 0, annualDep: 0 },
    furniture: { count: 0, cost: 0, accumDep: 0, netBookValue: 0, annualDep: 0 },
    other: { count: 0, cost: 0, accumDep: 0, netBookValue: 0, annualDep: 0 },
  };

  activeAssets.forEach(asset => {
    const metrics = calculateAssetMetrics(asset, targetDateStr);
    totalPurchaseCost += Number(asset.purchaseCost) || 0;
    totalSalvageValue += Number(asset.salvageValue) || 0;
    totalAccumulatedDepreciation += metrics.accumulatedDepreciation;
    totalNetBookValue += metrics.currentBookValue;
    totalAnnualDepreciation += metrics.annualDepreciation;
    totalMonthlyDepreciation += metrics.monthlyDepreciation;

    const cat = asset.category || 'other';
    if (categoryMap[cat]) {
      categoryMap[cat].count += 1;
      categoryMap[cat].cost += Number(asset.purchaseCost) || 0;
      categoryMap[cat].accumDep += metrics.accumulatedDepreciation;
      categoryMap[cat].netBookValue += metrics.currentBookValue;
      categoryMap[cat].annualDep += metrics.annualDepreciation;
    }
  });

  const categoryTotals = (Object.keys(ASSET_CATEGORY_INFO) as AssetCategory[]).map(catKey => ({
    category: catKey,
    info: ASSET_CATEGORY_INFO[catKey],
    ...categoryMap[catKey]
  }));

  return {
    totalAssetsCount: activeAssets.length,
    totalPurchaseCost,
    totalSalvageValue,
    totalAccumulatedDepreciation,
    totalNetBookValue,
    totalAnnualDepreciation,
    totalMonthlyDepreciation,
    overallDepreciationPercent: totalPurchaseCost > 0 ? (totalAccumulatedDepreciation / totalPurchaseCost) * 100 : 0,
    categoryTotals,
  };
}
