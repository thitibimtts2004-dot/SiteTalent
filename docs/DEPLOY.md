# คู่มือ Deploy SiteTalent (Firebase App Hosting + GitHub)

เว็บจะ deploy อัตโนมัติทุกครั้งที่ push ขึ้น branch `main` บน GitHub
และอ่านข้อมูลสดจาก Firestore ของโปรเจกต์ `sitetalent-b9bb5`

> ⚠️ **ไม่มีระบบล็อกอิน** — ใครได้ลิงก์ก็เห็นข้อมูลรายบุคคล (ชื่อ · รหัส · บริษัท) ทั้งหมด
> แชร์ลิงก์เฉพาะทีมที่เกี่ยวข้องเท่านั้น

---

## ตั้งค่าครั้งแรก (ทำครั้งเดียว · ประมาณ 15 นาที)

### 1. เปิด Blaze plan
1. เข้า <https://console.firebase.google.com> → เลือกโปรเจกต์ **sitetalent-b9bb5**
2. มุมล่างซ้าย กด **Upgrade** → เลือก **Blaze (จ่ายตามการใช้งาน)** → ผูกบัญชีเรียกเก็บเงิน
3. แนะนำตั้ง **Budget alert** (เช่น 300 บาท/เดือน) ให้แจ้งเตือนทางอีเมล
   - การใช้งานระดับทีม HR น่าจะอยู่ในโควต้าฟรี เพราะ server ปิดตัวเองเมื่อไม่มีคนใช้ (`minInstances: 0`)

### 2. สร้าง App Hosting backend และเชื่อม GitHub
1. เมนูซ้าย **Build → App Hosting** → กด **Get started**
2. **Region**: เลือก `asia-southeast1` (สิงคโปร์ · ใกล้ไทยที่สุด)
3. **Connect to GitHub** → ติดตั้ง/อนุญาต Firebase GitHub app → เลือก repo **thitibimtts2004-dot/SiteTalent**
4. **Root directory**: `/` · **Live branch**: `main` · เปิด **Automatic rollouts**
5. **Backend name**: `sitetalent` → กด **Finish and deploy**
6. รอ build ครั้งแรกประมาณ 5–10 นาที ได้ลิงก์หน้าตาประมาณ
   `https://sitetalent--sitetalent-b9bb5.asia-southeast1.hosted.app`

### 3. ให้สิทธิ์ server อ่าน Firestore
เว็บใช้สิทธิ์ของ server เอง (ไม่ต้องอัปโหลดไฟล์กุญแจลับ) ถ้าเปิดเว็บแล้วแถบด้านบนขึ้นสีเหลือง
"เชื่อมต่อฐานข้อมูลไม่ได้" หรือหน้าเว็บ error ให้ทำข้อนี้:
1. เข้า <https://console.cloud.google.com/iam-admin/iam?project=sitetalent-b9bb5>
2. หาบัญชี `firebase-app-hosting-compute@sitetalent-b9bb5.iam.gserviceaccount.com`
3. กดรูปดินสอ → **Add another role** → **Cloud Datastore Viewer** (อ่านอย่างเดียว) → Save
4. กลับไป App Hosting → **Rollouts** → **Create rollout** (deploy ซ้ำ 1 ครั้ง)

---

## ใช้งานประจำ

| ต้องการ | ทำอย่างไร |
|---|---|
| อัปเดตหน้าเว็บ/โค้ด | `git push` ขึ้น `main` → Firebase deploy ให้อัตโนมัติ (~5 นาที) |
| อัปเดตข้อมูลพนักงาน | รัน `npm run import` บนเครื่อง (ต้องมี `.env` + ไฟล์ service account) → ข้อมูลใน Firestore เปลี่ยน → เว็บแสดงข้อมูลใหม่เอง ไม่ต้อง deploy |
| ดู log / error | App Hosting → backend `sitetalent` → **Logs** |
| ย้อนกลับเวอร์ชันก่อน | App Hosting → **Rollouts** → เลือกเวอร์ชันเก่า → **Roll back** |

## ไฟล์ที่เกี่ยวข้อง
- `apphosting.yaml` — ขนาด server (ปิดตัวเองเมื่อไม่มีคนใช้ · สูงสุด 2 instance)
- `lib/firebaseAdmin.ts` — บน App Hosting ใช้สิทธิ์ของ server อัตโนมัติ · บนเครื่องใช้ไฟล์ตาม `FIREBASE_SERVICE_ACCOUNT_PATH`
- ไฟล์ลับ (`.env`, `.env.local`, `serviceAccount*.json`) อยู่ใน `.gitignore` — **ห้าม commit**
