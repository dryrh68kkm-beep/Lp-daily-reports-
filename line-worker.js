// LP LINE Relay — Cloudflare Worker
// หน้าที่: รับข้อความรายงานจากฟอร์ม แล้วส่งเข้า LINE กลุ่มแทน (เก็บ Token ไว้ฝั่ง server เท่านั้น)
//
// ต้องตั้งค่า Secrets ใน Cloudflare Dashboard > Settings > Variables:
//   LINE_CHANNEL_ACCESS_TOKEN  -> Token จาก LINE Developers Console (Messaging API)
//   LINE_GROUP_ID              -> Group ID (ได้จาก /webhook ด้านล่าง ดูวิธีใน README)
//   FORM_SECRET                -> รหัสลับที่คุณตั้งเอง (สุ่มอะไรก็ได้) ใช้จับคู่กับฟอร์ม HTML

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── Webhook: LINE จะยิงมาที่นี่ทุกครั้งที่มีคนพิมพ์ในกลุ่ม ──
    // ใช้ครั้งเดียวตอนตั้งค่า เพื่อดึง Group ID ออกมา (บอทจะตอบ Group ID กลับเข้ากลุ่มทันที)
    if (url.pathname === "/webhook" && request.method === "POST") {
      const body = await request.json();
      const events = body.events || [];
      for (const event of events) {
        const groupId = event.source && (event.source.groupId || event.source.roomId);
        if (groupId && event.replyToken) {
          await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
              replyToken: event.replyToken,
              messages: [{ type: "text", text: `Group ID: ${groupId}` }]
            })
          });
        }
      }
      return new Response("OK", { status: 200 });
    }

    // ── Push: ฟอร์ม HTML เรียกมาที่นี่เพื่อส่งรายงานเข้ากลุ่มจริง ──
    if (url.pathname === "/push" && request.method === "POST") {
      const auth = request.headers.get("Authorization");
      if (auth !== `Bearer ${env.FORM_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }

      let payload;
      try {
        payload = await request.json();
      } catch (e) {
        return new Response("Invalid JSON", { status: 400 });
      }

      const text = payload.text;
      if (!text) return new Response("Missing text", { status: 400 });

      const lineRes = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          to: env.LINE_GROUP_ID,
          messages: [{ type: "text", text }]
        })
      });

      if (!lineRes.ok) {
        const err = await lineRes.text();
        return new Response("LINE error: " + err, { status: 502 });
      }
      return new Response("Sent", { status: 200 });
    }

    return new Response("LP LINE relay is running", { status: 200 });
  }
};
