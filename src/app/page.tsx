'use client';

import { useEffect } from 'react';

export default function RootPage() {
  useEffect(() => {
    window.location.href = '/fr/copros/';
  }, []);

  return null;
}
