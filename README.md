# عدة التركيبات - نظام متابعة خروج ورجوع العدة والمعدات
> **Tool Tracking System for Installation & Field Teams**
> تطبيق ويب متكامل باللغة العربية (RTL) مصمم للموبايل أولاً لمتابعة خروج ورجوع عدة التركيبات عبر المواقع والفنيين، وإدارة الدواليب وحركات النقل والتنبيه بالعدة المتأخرة.

---

## 📑 فهرس المحتويات (Table of Contents)

1. [المميزات الرئيسية](#-المميزات-الرئيسية)
2. [هيكل المشروع ومحتويات الملفات](#-هيكل-المشروع)
3. [التشغيل محلياً (Local Development)](#-التشغيل-محليا-local-development)
4. [خطوات الرفع على GitHub](#-خطوات-الرفع-على-github)
5. [خطوات النشر على Vercel](#-خطوات-النشر-على-vercel)
6. [خطوات النشر على Firebase](#-خطوات-النشر-على-firebase)
7. [المتغيرات البيئية (Environment Variables)](#-المتغيرات-البيئية)
8. [بيانات الدخول الافتراضية](#-بيانات-الدخول-الافتراضية)

---

## 🚀 المميزات الرئيسية

- **واجهة عربية بالكامل ومصممة للموبايل أولاً (RTL):** خط Cairo واضح وأزرار لمس مريحة للاستخدام الميداني بيد واحدة.
- **تسجيل خروج فوري (Checkout):** اختيار الفني أو فريق العمل، وتحديد الموقع أو إضافة موقع جديد فوراً، مع زر مشاركة مباشر لرسالة منسقة على WhatsApp.
- **تسجيل رجوع العدة (Return):** استعراض عدة كل موقع، وتأكيد اكتمال الأطقم أو تسجيل النواقص في السجل.
- **نقل مباشر بين المواقع (Transfer):** تحويل العدة من موقع لآخر مباشرة دون العودة للمخزن.
- **لوحة متابعة حية (Live Dashboard):** تنبيه بالعدة المتأخرة (أكثر من 7 أيام)، وإحصائيات فورية حسب الدواليب (1، 2، 3) وحسب المواقع وحسب الفنيين.
- **سجل حركات دائم (Audit Trail):** توثيق كل حركة مع التاريخ والوقت والفنيين غير قابل للحذف.
- **تصدير واستيراد Excel / CSV:** تصدير واستيراد كشوفات العدة والفنيين والمواقع بترميز UTF-8 BOM لفتح الحروف العربية في Excel بنقرة واحدة.
- **جاهز للرفع على GitHub و Vercel و Firebase.**

---

## 📁 هيكل المشروع

```text
├── api/
│   └── index.ts                 # نقطة تشغيل Vercel Serverless Functions
├── data/
│   └── db.json                  # قاعدة البيانات المركزية المحلية (JSON Database)
├── src/
│   ├── components/
│   │   ├── AdminManagementView.tsx  # لوحة إدارة العدة والمواقع والفنيين والإعدادات
│   │   ├── BottomNav.tsx            # شريط التنقل السفلي للهواتف
│   │   ├── CheckoutView.tsx         # شاشة خروج العدة
│   │   ├── DashboardView.tsx        # لوحة المتابعة والتنبيهات
│   │   ├── HomeHubView.tsx          # الشاشة الرئيسية
│   │   ├── Navbar.tsx               # الشريط العلوي
│   │   ├── PinModal.tsx             # نافذة الرقم السري للفنيين
│   │   ├── ReturnView.tsx           # شاشة رجوع العدة للمخزن
│   │   ├── ToolDossierModal.tsx     # فحص تاريخ العدة الكامل
│   │   ├── TransferView.tsx         # شاشة النقل بين المواقع
│   │   └── WhatsAppShareModal.tsx   # نافذة مشاركة إذن الخروج عبر واتساب
│   ├── services/
│   │   ├── api.ts                   # عميل الاتصال بواجهات Express API
│   │   └── firebase.ts              # إعدادات اتصال Firebase Firestore
│   ├── utils/
│   │   ├── csv.ts                   # تصدير واستيراد CSV/Excel مع UTF-8 BOM
│   │   └── formatters.ts            # تنسيق التواريخ وصياغة رسائل الواتساب
│   ├── App.tsx                      # المكون الرئيسي للتطبيق
│   ├── index.css                    # استايلات Tailwind CSS وخط Cairo
│   ├── main.tsx                     # نقطة دخول React
│   ├── seedData.ts                  # بيانات تجريبية جاهزة
│   ├── serverApp.ts                 # تطبيق Express وجميع الـ API Endpoints
│   └── types.ts                     # تعريفات TypeScript
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions لاختبار البناء والفحص التلقائي
├── .env.example                 # نموذج المتغيرات البيئية
├── .firebaserc                  # إعداد مشروع Firebase
├── .gitignore                   # تجاهل ملفات node_modules و dist و secrets
├── firebase.json                # إعدادات النشر على Firebase Hosting & Firestore
├── firestore.rules              # قواعد حماية قاعدة بيانات Firestore
├── firestore.indexes.json       # فهارس Firestore
├── vercel.json                  # إعدادات التوجيه والنشر على Vercel
├── package.json                 # الحزم وأوامر التشغيل
├── tsconfig.json                # إعدادات TypeScript
└── vite.config.ts               # إعدادات Vite
```

---

## 💻 التشغيل محلياً (Local Development)

### 1. تثبيت الحزم:
```bash
npm install
```

### 2. تشغيل السيرفر المحلي:
```bash
npm run dev
```
سيفتح التطبيق على الرابط: `http://localhost:3000`

### 3. بناء المشروع للإنتاج:
```bash
npm run build
```

---

## 🐙 خطوات الرفع على GitHub

لرفع المشروع على حسابك في GitHub، اتبع الأوامر التالية من سطر الأوامر (Terminal) في مجلد المشروع:

```bash
# 1. تهيئة مستودع Git محلي
git init

# 2. إضافة جميع الملفات
git add .

# 3. حفظ أول Commit
git commit -m "Initial commit: عدة التركيبات كامل وشغال"

# 4. ضبط الفرع الرئيسي ليصبح main
git branch -M main

# 5. ربط المستودع المحلي بمستودعك على GitHub (استبدل الرابط برابط مستودعك الخاص)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# 6. رفع الملفات إلى GitHub
git push -u origin main
```

> **ملاحظة:** ملف `.github/workflows/ci.yml` المرفق سيقوم تلقائياً باختبار بناء المشروع وفحصه مع كل Push على GitHub.

---

## ▲ خطوات النشر على Vercel

تم تجهيز ملف `vercel.json` ومجلد `api/index.ts` ليعمل التطبيق كـ Full-Stack على Vercel (واجهة React SPA + واجهات Express كـ Serverless Functions) بدون أي تعديل.

### الطريقة الأولى: من خلال موقع Vercel (الأسهل والأفضل):
1. افتح [vercel.com](https://vercel.com) وسجل دخولك بحسابك في GitHub.
2. اضغط على **Add New...** ثم اختر **Project**.
3. اختر المستودع الخاص بك الذي رفعته على GitHub واضغط **Import**.
4. تأكد من الإعدادات التلقائية:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. اضغط **Deploy**.
6. مبروك! سيتم نشر التطبيق وسيعمل على رابط خاص مثل: `https://your-app.vercel.app`.

### الطريقة الثانية: من خلال Vercel CLI:
```bash
# تثبيت أداة Vercel عالمياً
npm install -g vercel

# تسجيل الدخول والنشر
vercel
```

---

## 🔥 خطوات النشر على Firebase

تم إعداد ملفات `firebase.json` و `.firebaserc` و `firestore.rules` لتسهيل النشر على Firebase Hosting و Firestore.

### الخطوات:
1. قم بتثبيت أداة Firebase CLI إذا لم تكن مثبتة لديك:
   ```bash
   npm install -g firebase-tools
   ```

2. سجل الدخول إلى حسابك في Google / Firebase:
   ```bash
   firebase login
   ```

3. اربط المشروع بمشروعك في Firebase:
   ```bash
   firebase use --add
   ```
   *(اختر مشروع Firebase الخاص بك من القائمة)*

4. قم ببناء ملفات الإنتاج للتطبيق:
   ```bash
   npm run build
   ```

5. نشر التطبيق على Firebase Hosting و Firestore:
   ```bash
   firebase deploy
   ```

6. ستحصل على رابط النشر النهائي على Firebase، مثل: `https://your-project-id.web.app`.

---

## 🔑 المتغيرات البيئية (Environment Variables)

إذا كنت ترغب بربط Firebase Firestore مباشرة بدلاً من قاعدة بيانات السيرفر، يمكنك إضافة هذه المتغيرات في ملف `.env` محلياً أو في لوحة تحكم Vercel / Firebase:

```env
PORT=3000
NODE_ENV=production

# إعدادات Firebase الاختيارية
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-app"
VITE_FIREBASE_STORAGE_BUCKET="your-app.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
```

---

## 🔒 بيانات الدخول الافتراضية

- **الفنيين:** يدخلون مباشرة باختيار أسمائهم دون الحاجة لحساب أو إيميل.
- **لوحة المسؤول (Admin):**
  - كلمة المرور الافتراضية: `admin123`
  - يمكن تغيير كلمة المرور في أي وقت من تبويب **«إعدادات النظام»** داخل لوحة الإدارة.
