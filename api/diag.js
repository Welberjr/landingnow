// Endpoint TEMPORARIO de diagnostico. Remover depois de validar.
module.exports = async function handler(req, res) {
  const out = { env: {}, supabase: null, groq: null };

  out.env = {
    SUPABASE_URL_len: (process.env.SUPABASE_URL || '').length,
    SUPABASE_ANON_len: (process.env.SUPABASE_ANON_KEY || '').length,
    GROQ_len: (process.env.GROQ_API_KEY || '').length,
    ANTHROPIC_len: (process.env.ANTHROPIC_API_KEY || '').length,
    ZAPI_INSTANCE_len: (process.env.ZAPI_INSTANCE_ID || '').length,
  };

  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/lia_conversas?select=phone&limit=1`, {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
    });
    out.supabase = { status: r.status, ok: r.ok };
  } catch (e) {
    out.supabase = { erro: String(e && e.message ? e.message : e) };
  }

  try {
    const r = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    });
    out.groq = { status: r.status, ok: r.ok };
  } catch (e) {
    out.groq = { erro: String(e && e.message ? e.message : e) };
  }

  res.status(200).json(out);
};
