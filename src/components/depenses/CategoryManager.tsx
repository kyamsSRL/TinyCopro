'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { useCoproContext } from '@/components/copro/CoproContext';
import { listCategories, addCategory, deleteCategory } from '@/services/depense';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Tables } from '@/types/database.types';

type Category = Tables<'categories_depenses'>;

export function CategoryManager() {
  const t = useTranslations('depenses');
  const tc = useTranslations('common');
  const { copro, isGestionnaire } = useCoproContext();

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!copro) return;
    setLoading(true);
    const { data } = await listCategories(copro.id);
    if (data) setCategories(data as Category[]);
    setLoading(false);
  }, [copro]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddCategory = async () => {
    if (!copro || !newCategoryName.trim()) return;
    setIsAdding(true);
    try {
      const { error } = await addCategory(copro.id, newCategoryName.trim());
      if (error) {
        toast.error(tc('error'));
      } else {
        toast.success(tc('success'));
        setNewCategoryName('');
        fetchCategories();
      }
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (category.is_global) return;
    try {
      const { error } = await deleteCategory(category.id);
      if (error) {
        toast.error(tc('error'));
      } else {
        toast.success(tc('success'));
        fetchCategories();
      }
    } catch {
      toast.error(tc('error'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  const globalCategories = categories.filter(c => c.is_global);
  const customCategories = categories.filter(c => !c.is_global);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">{t('categories')}</h3>
        <div className="flex flex-wrap gap-2">
          {globalCategories.map(cat => (
            <Badge key={cat.id} variant="secondary">
              {cat.nom}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-medium mb-3">{t('customCategories')}</h3>
        {customCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tc('noResults')}</p>
        ) : (
          <div className="space-y-2">
            {customCategories.map(cat => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span className="text-sm">{cat.nom}</span>
                {isGestionnaire && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDeleteCategory(cat)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isGestionnaire && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-medium mb-3">{t('addCategory')}</h3>
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder={t('addCategory')}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
              />
              <Button
                onClick={handleAddCategory}
                disabled={isAdding || !newCategoryName.trim()}
              >
                {isAdding ? '...' : tc('create')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
