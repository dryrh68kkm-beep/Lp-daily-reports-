# LP Daily Report — Big C Hyper Sainoi

ฟอร์มออฟไลน์สำหรับกรอกสรุปงานประจำวัน (กะเช้า/กะบ่าย) ของทีม Loss Prevention แล้วส่งเข้า LINE ได้ทันทีในคลิกเดียว

## ใช้งานยังไง

1. เปิดไฟล์ `lp-daily-report.html` ด้วย Safari หรือ Chrome (**ห้ามเปิดผ่าน in-app browser ของ LINE** เพราะปุ่มส่งเข้า LINE จะไม่ทำงาน)
2. เลือกกะ กรอกวันที่ ชื่อผู้รายงาน แล้วติ๊กสถานะแต่ละรายการ
3. กด **ส่งเข้า LINE** — แอป LINE จะเปิดขึ้นมาพร้อมข้อความสำเร็จรูป เลือกแชท/กลุ่มแล้วกดส่ง

## ติดตั้งแบบไม่ต้องผ่าน LINE ทุกครั้ง

แนะนำเปิดไฟล์ด้วย Safari/Chrome ครั้งแรก แล้วกด "เพิ่มไปยังหน้าจอโฮม" เก็บเป็นไอคอนแอปไว้ในเครื่องได้เลย

## หมายเหตุด้านเทคนิค

- ไฟล์เดียวจบ (HTML + CSS + JS ในไฟล์เดียว) ไม่ต้องมี server ไม่ต้องต่อเน็ต ทำงานออฟไลน์ได้ 100%
- ปุ่ม "ส่งเข้า LINE" ใช้ LINE Share Link (`https://line.me/R/msg/text/`) ไม่มีการเก็บหรือส่งข้อมูลไปที่เซิร์ฟเวอร์ใดๆ ทั้งสิ้น

---

## ตั้งค่าปุ่ม "ส่งอัตโนมัติเข้ากลุ่ม" (ไม่ต้องกดซ้ำในแอป LINE)

ต้องมี LINE Official Account + Cloudflare Worker เป็นตัวกลาง (ไฟล์ `line-worker.js` ในโฟลเดอร์นี้) เพื่อไม่ให้ Token หลุดไปอยู่ในหน้าเว็บ ทำตามลำดับนี้:

### Phase 1 — สร้าง LINE Official Account

1. ไปที่ https://manager.line.biz/ → สร้างบัญชี Official Account (เลือกแพ็กเกจฟรี)
2. เข้า **LINE Developers Console** (https://developers.line.biz/console/) → เลือก Provider/Channel ที่สร้างขึ้น → แท็บ **Messaging API**
3. กด **Issue** ที่ช่อง Channel access token (long-lived) → คัดลอกเก็บไว้ (ใช้ในขั้นถัดไป)
4. ใน LINE Official Account Manager → ตั้งค่า → **Response settings** → ปิด "Greeting messages" และ "Auto-response messages" (กันบอทตอบกวนในกลุ่ม) และเปิด "Allow bot to join group chats"

### Phase 2 — Deploy Cloudflare Worker

1. สมัคร/ล็อกอิน https://dash.cloudflare.com/ (ฟรี) → เมนู **Workers & Pages** → **Create** → **Create Worker**
2. ตั้งชื่อ เช่น `lp-line-relay` → Deploy (ใช้โค้ด default ไปก่อน)
3. กด **Edit code** → ลบโค้ดเดิมทั้งหมด → วางเนื้อหาไฟล์ `line-worker.js` แทน → **Deploy**
4. กลับไปที่หน้า Worker → **Settings** → **Variables and Secrets** → เพิ่ม:
   - `LINE_CHANNEL_ACCESS_TOKEN` = Token จาก Phase 1 ข้อ 3
   - `FORM_SECRET` = ตั้งรหัสลับเอง (สุ่มพิมพ์อะไรก็ได้ยาวๆ)
   - `LINE_GROUP_ID` = ใส่ค่าอะไรไปก่อนชั่วคราว (จะได้ค่าจริงใน Phase 3) เช่น `pending`
5. จด **Worker URL** ไว้ (หน้าตาแบบ `https://lp-line-relay.<ชื่อบัญชี>.workers.dev`)

### Phase 3 — ผูก Webhook แล้วดึง Group ID

1. กลับไปที่ LINE Developers Console → แท็บ Messaging API → ช่อง **Webhook URL** ใส่ `https://<Worker URL ของคุณ>/webhook` → กด **Verify** (ควรขึ้น Success) → เปิด **Use webhook**
2. เพิ่มเพื่อน LINE OA นี้ (สแกน QR code ในหน้า Console) แล้วเชิญเข้ากลุ่ม LINE ที่จะใช้ส่งรายงานประจำวัน
3. พิมพ์ข้อความอะไรก็ได้ในกลุ่มนั้น → บอทจะตอบกลับทันทีว่า **"Group ID: Cxxxxxxxxxxxxxxxx..."**
4. คัดลอก Group ID นั้น → กลับไปที่ Cloudflare Worker → Settings → แก้ค่า `LINE_GROUP_ID` เป็นค่าที่ได้ → Save
5. ลบข้อความ Group ID ออกจากกลุ่มได้ถ้าไม่อยากให้ค้างอยู่

### Phase 4 — ผูกฟอร์มเข้ากับ Worker

เปิดไฟล์ `lp-daily-report.html` ด้วยโปรแกรมแก้ไขข้อความ หาบรรทัดนี้ใกล้ท้ายไฟล์:

```js
const WORKER_URL = "https://REPLACE-WITH-YOUR-WORKER-URL.workers.dev";
const FORM_SECRET = "REPLACE-WITH-YOUR-SECRET";
```

แก้เป็นค่าจริงจาก Phase 2 (Worker URL และ FORM_SECRET) → บันทึกไฟล์ → push ขึ้น GitHub ใหม่อีกครั้ง

ทดสอบโดยเปิดฟอร์ม กรอกข้อมูล แล้วกดปุ่ม **"ส่งเข้ากลุ่มทันที (ไม่ต้องกดซ้ำ)"** — ถ้าตั้งค่าถูกต้อง ข้อความจะเข้ากลุ่ม LINE ทันทีโดยไม่ต้องเปิดแอป LINE เลย

**ข้อควรระวัง:** `FORM_SECRET` ยังฝังอยู่ในหน้าเว็บอยู่ดี (เพราะเป็นไฟล์สาธารณะบน GitHub) ใครเห็นโค้ดก็เอาไปยิงเข้ากลุ่มได้ ถ้าเป็นห่วงเรื่องนี้ แนะนำตั้ง repo เป็น **Private** และเปลี่ยน `FORM_SECRET` เป็นระยะๆ ได้ตลอดเวลาโดยไม่กระทบส่วนอื่น (แก้ที่ Worker + ไฟล์ HTML พร้อมกัน)
