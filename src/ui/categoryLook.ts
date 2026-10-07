import type { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { CategoryKey, ExpenseCategory, TransactionType } from '@/domain/categories';

import { categoryColors, CATEGORY_TINT, withAlpha, type Palette, type Scheme } from './theme';

type IconName = ComponentProps<typeof Feather>['name'];

const EXPENSE_ICONS: Record<ExpenseCategory, IconName> = {
  food: 'coffee',
  transport: 'navigation',
  housing: 'home',
  bills: 'file-text',
  health: 'heart',
  shopping: 'shopping-bag',
  leisure: 'film',
  other: 'more-horizontal',
};

const INCOME_ICONS: Record<string, IconName> = {
  salary: 'briefcase',
  freelance: 'pen-tool',
  gifts: 'gift',
  other: 'plus-circle',
};

/** A category's icon and colors: its ink, and the tinted circle or tile behind it. */
export function categoryLook(
  type: TransactionType,
  key: CategoryKey,
  scheme: Scheme,
  colors: Palette,
): { icon: IconName; ink: string; tint: string } {
  if (type === 'income') {
    return { icon: INCOME_ICONS[key] ?? 'plus-circle', ink: colors.income, tint: colors.incomeSoft };
  }
  const ink = categoryColors[scheme][key as ExpenseCategory];
  return { icon: EXPENSE_ICONS[key as ExpenseCategory], ink, tint: withAlpha(ink, CATEGORY_TINT[scheme]) };
}
