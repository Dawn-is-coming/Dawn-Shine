// Cloudflare Pages Function —— 代理雨云实例状态，路径 /api/status
export async function onRequestGet({ env }) {
  const key = env.RAINYUN_API_KEY;
  if (!key) return json({ error: '未配置 RAINYUN_API_KEY 环境变量' }, 500);

  const id = env.RAINYUN_RGS_ID || '83287';
  let upstream;
  try {
    upstream = await fetch(`https://api.v2.rainyun.com/product/rgs/${id}/`, {
      headers: { 'x-api-key': key, 'Accept': 'application/json' },
    });
  } catch (e) {
    return json({ error: '请求雨云接口失败: ' + e.message }, 502);
  }

  const payload = await upstream.json().catch(() => null);
  if (!payload) return json({ error: '雨云返回了非 JSON 内容' }, 502);

  const d = payload.data || payload;
  const usage = d.UsageData || {};
  const egg = d.EggType && d.EggType.egg ? d.EggType.egg : {};

  return json({
    ok: true,
    status: d.Status ?? null,
    cpu: d.CPU ?? null,
    memory: d.Memory ?? null,
    base_disk: d.BaseDisk ?? null,
    data_disk: d.DataDisk ?? null,
    allocation: d.Allocation ?? null,
    init_date: d.InitDate ?? null,
    egg_title: egg.title ?? null,
    usage: {
      cpu: usage.CPU ?? null, mem: usage.Mem ?? null, mem_usage: usage.MemUsage ?? null,
      disk: usage.Disk ?? null, net_in: usage.NetIn ?? null, net_out: usage.NetOut ?? null,
      update_time: usage.UpdateTime ?? null,
    },
    nat: Array.isArray(d.NatList)
      ? d.NatList.map((n) => ({ port_in: n.PortIn, port_out: n.PortOut, port_type: n.PortType }))
      : [],
  }, 200);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=15' },
  });
}
