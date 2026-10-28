// Vercel Serverless Function: proxy agar browser dapat membaca respons Apps Script.
// Set environment variable APPS_SCRIPT_URL di Vercel (Production + Preview).
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });
  const target = process.env.APPS_SCRIPT_URL;
  if (!target) return res.status(500).json({ success: false, message: 'Environment variable APPS_SCRIPT_URL belum diatur.' });
  try {
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const upstream = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: payload, redirect: 'follow' });
    const text = await upstream.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { return res.status(502).json({ success: false, message: 'Respons backend bukan JSON. Periksa deployment Apps Script.' }); }
    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(502).json({ success: false, message: 'Backend tidak dapat dihubungi.' });
  }
}
