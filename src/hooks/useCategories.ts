import { useEffect, useState } from 'react';
import type { Category } from '../types';
import { fetchCategories } from '../lib/blog/categoriesRepo';

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetchCategories()
      .then(c => { if (alive) setCategories(c); })
      .catch(() => { /* empty hub is a valid state */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return { categories, loading };
};
