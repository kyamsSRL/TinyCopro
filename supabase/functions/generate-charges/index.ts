// Edge Function: Generate monthly charges for all copropriétés
// Triggered on the 2nd of each month via cron (pg_cron or external scheduler)
// Call: POST /functions/v1/generate-charges

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    // Verify authorization (use service role or a secret header)
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();

    // Get all copropriétés that have active charges
    const { data: copros, error: coproError } = await supabase
      .from('charges_copro')
      .select('copropriete_id')
      .eq('is_active', true);

    if (coproError) {
      return new Response(JSON.stringify({ error: coproError.message }), { status: 500 });
    }

    // Deduplicate copro IDs
    const coproIds = [...new Set((copros || []).map((c: any) => c.copropriete_id))];

    const results: { copro_id: string; status: string }[] = [];

    for (const coproId of coproIds) {
      const { error } = await supabase.rpc('generate_monthly_charges', {
        p_copro_id: coproId,
        p_month: month,
        p_year: year,
      });

      results.push({
        copro_id: coproId as string,
        status: error ? `error: ${error.message}` : 'ok',
      });
    }

    return new Response(JSON.stringify({ month, year, results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
