'use client';

import Link from 'next/link';
import { ShoppingBag, Zap, Globe, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';
import { Suspense } from 'react';

export default function UpgradePage() {
  return (
    <Suspense fallback={<div className="flex h-screen bg-[#0a0a0a]" />}>
      <SidebarLayout>
        <div className="flex-1 overflow-y-auto bg-[#0a0a0a] text-white p-4 md:p-12">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                حول متجرك إلى ذكاء اصطناعي
              </h1>
              <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-light">
                انضم إلى منظومة Vibe AI واجعل عملائك يجدون منتجاتك، أسعارك، وموقعك الجغرافي عبر محادثة ذكية واحدة.
              </p>
            </div>

            {/* Pricing Grid */}
            <div className="grid md:grid-cols-2 gap-8 pt-8">
              {/* Free Plan */}
              <div className="bg-[#111111] border border-white/5 p-8 rounded-3xl relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold">حساب المستخدم</h3>
                    <p className="text-gray-500 text-sm">للمتصفحين والباحثين</p>
                  </div>
                  <div className="text-4xl font-bold">مجاناً</div>
                  <ul className="space-y-4 text-gray-400 text-sm">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                      تصفح قائمة التسوق الموحدة
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                      البحث عن المتاجر القريبة
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                      استشارات شراء ذكية
                    </li>
                  </ul>
                </div>
              </div>

              {/* Merchant Plan */}
              <div className="bg-indigo-600/5 border-2 border-indigo-500/50 p-8 rounded-3xl relative overflow-hidden group hover:bg-indigo-600/10 transition-all">
                <div className="absolute top-0 right-0 bg-indigo-500 text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl">
                  الأكثر مبيعاً
                </div>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-indigo-400">حساب التاجر (Vibe Partner)</h3>
                    <p className="text-indigo-300/60 text-sm">لأصحاب المتاجر والمشاريع</p>
                  </div>
                  <div className="text-4xl font-bold flex items-baseline gap-1">
                    $29 <span className="text-sm font-normal text-gray-400">/شهرياً</span>
                  </div>
                  <ul className="space-y-4 text-gray-300 text-sm">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      إضافة متجر ببيانات جغرافية (Google Maps)
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      عرض منتجاتك في "قائمة التسوق"
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ربط موقعك الإلكتروني المباشر
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      توجيه الذكاء الاصطناعي للمشترين القريبين منك
                    </li>
                  </ul>
                  <button className="w-full py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                    ابدأ الآن كشريك
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Features Detail */}
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="p-6 space-y-3">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <h4 className="font-bold">توجيه جيو-ذكي</h4>
                <p className="text-gray-500 text-xs leading-relaxed">الـ AI يدفع العملاء لباب متجرك بناءً على موقعهم الجغرافي.</p>
              </div>
              <div className="p-6 space-y-3">
                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto text-purple-400">
                  <Globe className="w-6 h-6" />
                </div>
                <h4 className="font-bold">روابط مباشرة</h4>
                <p className="text-gray-500 text-xs leading-relaxed">كل توصية تتضمن رابط متجرك الإلكتروني لزيادة مبيعاتك.</p>
              </div>
              <div className="p-6 space-y-3">
                <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto text-pink-400">
                  <Zap className="w-6 h-6" />
                </div>
                <h4 className="font-bold">ميزة التفضيل</h4>
                <p className="text-gray-500 text-xs leading-relaxed">منتجاتك تظهر أولاً كـ "خيار موصى به" عند سؤال المستخدمين.</p>
              </div>
            </div>
          </div>
        </div>
      </SidebarLayout>
    </Suspense>
  );
}
