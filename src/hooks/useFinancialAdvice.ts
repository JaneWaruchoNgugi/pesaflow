import { useMemo } from 'react';
import { getInvestmentAdvice } from '../utils/calculations';

export const useFinancialAdvice = (monthlyIncome: number) => {
  const advice = useMemo(() => getInvestmentAdvice(monthlyIncome), [monthlyIncome]);
  return { advice };
};
