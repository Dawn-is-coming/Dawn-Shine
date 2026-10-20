// Cloudflare Pages Function —— 雨云 RGS 监控时间序列，路径 /api/monitor
// 拉取最近 1 小时的 CPU / 内存 / 网络 / 磁盘数据，供前端画无轴迷你折线
export async function onRequestGet({ env }) {
  const key = env.RAINYUN_API_KEY;
  if (!key) return json({ error: '未配置 RAINYUN_API_KEY 环境变量' }, 500);

  const id = env.RAINYUN_RGS_ID || '83287';
  const now = Math.floor(Date.now() / 1000);
  const start = now - 3600; // 最近 1 小时

  let upstream;
  try {
    upstream = await fetch(
      `https://api.v2.rainyun.com/product/rgs/${id}/monitor?start_date=${start}&end_date=${now}`,
      { headers: { 'x-api-key': key, Accept: 'application/json' } },
    );
  } catch (e) {
    return json({ error: '请求雨云接口失败: ' + e.message }, 502);
  }

  const payload = await upstream.json().catch(() => null);
  if (!payload) return json({ error: '雨云返回了非 JSON 内容' }, 502);

  const data = payload.data || {};
  const cols = Array.isArray(data.Columns) ? data.Columns : [];
  const rows = Array.isArray(data.Values) ? data.Values : [];

  const idx = {};
  cols.forEach((c, i) => (idx[c] = i));

  const pick = (name) => rows.map((r) => (idx[name] == null ? null : r[idx[name]]));

  const series = {
    time: pick('time'),
    cpu: pick('cpu'),
    mem: pick('mem'),
    netin: pick('netin'),
    netout: pick('netout'),
    diskin: pick('diskread'),
    diskout: pick('diskwrite'),
  };

  return json({ ok: true, series }, 200);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=20',
    },
  });
}
