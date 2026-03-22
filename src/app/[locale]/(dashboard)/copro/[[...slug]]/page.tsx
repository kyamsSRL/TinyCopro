import { CoproCatchAllPageContent } from '@/components/pages/CoproCatchAllPage';

export async function generateStaticParams() {
  return [{ slug: [] }];
}

export default function CoproPage() {
  return <CoproCatchAllPageContent />;
}
