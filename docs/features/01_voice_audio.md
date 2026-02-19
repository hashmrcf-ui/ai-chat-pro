# ميزة الصوت والمحادثة الصوتية (Voice & Audio)

## نظرة عامة
تحويل التطبيق إلى مساعد صوتي ذكي يدعم:
- **تحويل الصوت إلى نص (STT):** للإملاء وإرسال الرسائل الصوتية
- **تحويل النص إلى صوت (TTS):** لقراءة الردود بصوت طبيعي
- **المحادثة المباشرة (Voice Chat):** محادثة صوتية مباشرة مثل Siri/Alexa

---

## التقنيات المطلوبة

### 1. Speech-to-Text (STT)
**الخيارات:**
- **OpenAI Whisper API** (موصى به):
  - دقة عالية جداً للعربية والإنجليزية
  - سعر: $0.006 لكل دقيقة
  - API: `https://api.openai.com/v1/audio/transcriptions`
  
- **Web Speech API** (مجاني - متصفح):
  - لا يحتاج API
  - دقة متوسطة
  - يعمل فقط في Chrome/Edge

**الاختيار الموصى به:** Whisper API (دقة احترافية)

### 2. Text-to-Speech (TTS)
**الخيارات:**
- **ElevenLabs** (الأفضل للأصوات الطبيعية):
  - أصوات عربية وإنجليزية واقعية جداً
  - سعر: $0.30 لكل 1000 حرف
  - API: `https://api.elevenlabs.io/v1/text-to-speech`

- **OpenAI TTS API**:
  - 6 أصوات (Alloy, Echo, Fable, Onyx, Nova, Shimmer)
  - سعر: $0.015 لكل 1000 حرف
  - API: `https://api.openai.com/v1/audio/speech`

**الاختيار الموصى به:** OpenAI TTS (توازن بين الجودة والسعر)

---

## خطة التطبيق

### المرحلة 1: إضافة زر الميكروفون (STT)
**الملفات المطلوبة:**
1. `lib/audio/stt.ts` - دالة تسجيل الصوت وتحويله
2. `components/VoiceInput.tsx` - زر الميكروفون في واجهة الإدخال

**الكود المبدئي (`lib/audio/stt.ts`):**
```typescript
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'ar'); // Arabic

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: formData
  });

  const data = await response.json();
  return data.text;
}
```

### المرحلة 2: تشغيل الردود صوتياً (TTS)
**الملفات المطلوبة:**
1. `lib/audio/tts.ts` - دالة تحويل النص لصوت
2. `components/AudioPlayer.tsx` - مشغل صوت في فقاعة الرد

**الكود المبدئي (`lib/audio/tts.ts`):**
```typescript
export async function textToSpeech(text: string): Promise<Blob> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: 'nova',
      input: text,
      speed: 1.0
    })
  });

  return await response.blob();
}
```

### المرحلة 3: المحادثة الصوتية المباشرة
**استخدام Realtime API من OpenAI:**
- WebSocket connection للتحدث المباشر
- يستلزم خطة احترافية

---

## التكامل مع النظام الحالي

### في `app/page.tsx`:
1. إضافة زر ميكروفون بجانب زر الإدخال
2. عند الضغط: بدء تسجيل صوتي
3. عند الانتهاء: إرسال للـ STT API
4. ملء حقل الإدخال بالنص المحول

### في فقاعة الرد (Message Bubble):
1. إضافة زر "استمع" 🔊
2. عند الضغط: تحويل النص إلى صوت وتشغيله

---

## نموذج التسعير

| الخطة | الحد الشهري |
|-------|-------------|
| **Free** | 5 دقائق صوت (STT) + 1000 حرف (TTS) |
| **Pro** | 60 دقيقة صوت + 50,000 حرف |
| **Teams** | 300 دقيقة صوت + 200,000 حرف |
| **Enterprise** | غير محدود |

---

## الجدول الزمني للتنفيذ
- **الأسبوع 1:** STT (زر الميكروفون)
- **الأسبوع 2:** TTS (تشغيل الردود)
- **الأسبوع 3:** تحسين الواجهة وإضافة مؤشرات بصرية
- **الأسبوع 4:** اختبار شامل + دعم لغات إضافية

---

## المتطلبات البيئية (Environment Variables)
```env
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=... # (اختياري)
```

---

## ملاحظات إضافية
- يفضل ضغط الصوت قبل الإرسال لتوفير التكلفة
- استخدام Web Audio API لتسجيل عالي الجودة
- تخزين الصوتيات المولدة في cache لتجنب التكرار
