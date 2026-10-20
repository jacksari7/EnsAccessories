# ENS Accessories — Çalışan ilk sürüm (MVP)

Node.js 18+ gerektirir. Harici npm paketi yoktur.

## Başlatma

macOS/Linux:

```bash
export ADMIN_KEY='en-az-12-karakter-guclu-bir-anahtar'
export STORE_WHATSAPP='905551112233'  # Kendi işletme numaranız; örnek numarayı değiştirin
export STORE_EMAIL='siparis@ornek.com' # İleride bildirim entegrasyonu için
npm start
```

Windows PowerShell:

```powershell
$env:ADMIN_KEY='en-az-12-karakter-guclu-bir-anahtar'
$env:STORE_WHATSAPP='905551112233'
npm start
```

Tarayıcı: http://localhost:3000

## Mevcut
- Mobil uyumlu ENS mağazası, arama/kategori filtreleme, stok göstergesi.
- Sepet, paylaşılabilir önceden doldurulmuş sepet URL'si.
- Sipariş formu, sunucu tarafında fiyat/stok doğrulaması, eşzamanlı stok rezervasyonuna karşı sıraya alınmış kayıt işlemi.
- Sipariş kaydı ve stok azaltma; yönetici anahtarıyla korunan ürün ekleme, fiyat/stok güncelleme, sipariş listesi.
- WhatsApp sipariş mesajını hazırlayıp işletme numarasına yönlendirme.

## Yayın öncesi tamamlanması gerekenler
- **Kart ödemesi etkin değildir.** iyzico/PayTR vb. sağlayıcı ile sunucu tarafında ödeme oturumu, imzalı webhook ve başarılı ödeme sonrası stok/sipariş durumu gerekir. Kart bilgisi bu uygulamaya alınmaz.
- **E-posta/WhatsApp otomatik bildirimleri etkin değildir.** E-posta servis sağlayıcısı ve resmi WhatsApp Business API/izinli şablonlarla sunucu tarafında entegrasyon gerekir. Şu an WhatsApp'a *müşteri tarafından gönderilen* mesaj hazırlanır.
- Sipariş oluşturma stok ayırır; ödeme/WhatsApp tamamlanmazsa stok otomatik serbest bırakılmaz. Üretimde süreli rezervasyon, iptal/iade ve sipariş durumları eklenmelidir.
- JSON dosyaları tek sunuculu MVP içindir; üretimde PostgreSQL ve transaction/row-lock gerekir.
- Yönetici anahtarı demo çözümüdür; üretimde HTTPS, kullanıcı girişi, güçlü parola hash'i, oturum/cookie, CSRF, hız limiti, audit log ve erişim rolleri gerekir.
- Ürün görseli HTTPS URL veya base64 image data URI ile eklenebilir; üretimde güvenli dosya yükleme/depolama gerekir.
- KVKK, mesafeli satış, ön bilgilendirme, iade, kargo, iletişim ve işletme bilgileri gerçek bilgilerle eklenmelidir.

## Test
`npm run check` ve `node tests/smoke.js` (test geçici sunucu başlatır, test verilerini geçici dizinde değil kendi izole kopyasında kullanır).
