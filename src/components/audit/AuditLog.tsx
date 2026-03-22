'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Tables } from '@/types/database.types';

interface AuditLogProps {
  coproprieteId: string;
}

type AuditEntry = Tables<'journal_audit'> & {
  profiles?: Tables<'profiles'>;
};

const PAGE_SIZE = 20;

export function AuditLog({ coproprieteId }: AuditLogProps) {
  const t = useTranslations('audit');
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('journal_audit')
      .select('*, profiles:user_id(nom, prenom)')
      .eq('copropriete_id', coproprieteId)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (data) {
      setEntries(data as unknown as AuditEntry[]);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
  }, [coproprieteId, page]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  if (loading && entries.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (entries.length === 0) {
    return <p className="text-muted-foreground text-center py-8">{t('noEntries')}</p>;
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('date')}</TableHead>
            <TableHead>{t('user')}</TableHead>
            <TableHead>{t('action')}</TableHead>
            <TableHead>{t('details')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap">
                {new Date(entry.created_at).toLocaleString()}
              </TableCell>
              <TableCell>
                {(entry as any).profiles?.prenom} {(entry as any).profiles?.nom}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{entry.action}</Badge>
                <span className="ml-2 text-muted-foreground text-sm">
                  {entry.entity_type}
                </span>
              </TableCell>
              <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                {entry.details ? JSON.stringify(entry.details) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          ←
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page + 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore}
        >
          →
        </Button>
      </div>
    </div>
  );
}
