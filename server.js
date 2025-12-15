// server.js - Eczaneme Danış Backend (ANLAŞMALI VE NÖBETÇİ AYRIMLI FİNAL)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// --- AYARLAR ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 1. MONGODB BAĞLANTISI ---
const mongoURI = 'mongodb://127.0.0.1:27017/eczanedanis';

mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 5000
})
.then(() => {
    console.log("--------------------------------------------------");
    console.log("✅ BAŞARILI: Veritabanı bağlantısı kuruldu!");
    console.log("--------------------------------------------------");
})
.catch((err) => {
    console.error("❌ HATA: MongoDB'ye bağlanılamadı.");
    console.error("ÇÖZÜM: 'MongoDB Server' servisinin açık olduğundan emin olun.");
});

// --- 2. VERİ MODELLERİ ---
const ForumSchema = new mongoose.Schema({
    topic: String,
    text: String,
    answer: { type: String, default: null },
    status: { type: String, default: 'pending' }, // 'pending' veya 'answered'
    pharmacist: { type: String, default: null },
    date: { type: Date, default: Date.now }
});

const ForumPost = mongoose.model('ForumPost', ForumSchema);

// --- 3. ECZANE VERİLERİ ---

// A. ANLAŞMALI ECZANELER (SABİT LİSTE - SADECE ELİF ECZANESİ)
const partnerPharmacies = [
    { 
        name: "Elif Eczanesi", 
        lat: 38.5055, 
        lon: 27.0458, 
        address: "Balatçık Mah. 8911. Sk No:12, Çiğli/İzmir (Katip Çelebi Üniv. Yanı)", 
        status: "ANLAŞMALI", 
        isOpen: true,
        type: "partner"
    }
];

// B. NÖBETÇİ HAVUZU (ÇİĞLİ VE ÇEVRESİ - GÜNLÜK DEĞİŞEN)
const dutyPool = [
    { name: "Mavi Eczanesi", lat: 38.4861, lon: 27.0557, address: "Ataşehir Mah. Nazım Hikmet Ran Blv. Çiğli" },
    { name: "Eczane Yenikent", lat: 38.5040, lon: 27.0576, address: "Egekent, 8819. Sk. No:55, Çiğli" },
    { name: "Eczane Eylül", lat: 38.5182, lon: 27.0554, address: "Evka-5, 8928. Sk. No:7, Çiğli" },
    { name: "Eczane Park", lat: 38.4950, lon: 27.0400, address: "Küçük Çiğli, Anadolu Cd., Çiğli" },
    { name: "Eczane Hayat", lat: 38.4600, lon: 27.2100, address: "Bornova Merkez (Alternatif)" },
    { name: "Eczane Şifa", lat: 38.4500, lon: 27.1000, address: "Karşıyaka Çarşı, Karşıyaka" },
    { name: "Eczane Merkez", lat: 38.4900, lon: 27.0600, address: "Çiğli Meydan, İstasyon Altı" },
    { name: "Eczane Çağdaş", lat: 38.5100, lon: 27.0500, address: "Egekent Girişi, Çiğli" },
    { name: "Eczane Umut", lat: 38.4800, lon: 27.0700, address: "Sasalı Yolu, Çiğli" },
    { name: "Eczane Doğa", lat: 38.4850, lon: 27.0550, address: "Ataşehir 2. Etap, Çiğli" },
    { name: "Eczane Ege", lat: 38.4920, lon: 27.0650, address: "Çiğli Devlet Hastanesi Karşısı" },
    { name: "Eczane Sağlık", lat: 38.5050, lon: 27.0450, address: "Balatçık Mah. Çiğli" },
    { name: "Eczane Atakent", lat: 38.4750, lon: 27.0900, address: "Atakent Tramvay Durağı" },
    { name: "Eczane Mavişehir", lat: 38.4650, lon: 27.0850, address: "Mavişehir AVM Yanı" },
    { name: "Eczane Harmandalı", lat: 38.5200, lon: 27.0300, address: "Harmandalı Meydan" }
];

// --- GÜNLÜK ROTASYON ALGORİTMASI ---
function getDailyDutyPharmacies() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    // Her gün farklı bir başlangıç noktası seç
    const startIndex = dayOfYear % dutyPool.length;
    
    // O gün için 3 tane eczane seç
    let dailyList = [];
    for(let i = 0; i < 3; i++) {
        let index = (startIndex + i) % dutyPool.length;
        let p = { ...dutyPool[index] };
        p.status = "AÇIK (Nöbetçi)";
        p.isOpen = true;
        p.type = "duty";
        dailyList.push(p);
    }
    return dailyList;
}

// --- 4. YETKİLİ KİŞİLER VE AI ---
const authorizedPharmacists = [
    { gln: "8680001234567", name: "Ecz. Irmak", pharmacy: "Elif Eczanesi" },
    { gln: "8681112223334", name: "Ecz. Mehmet", pharmacy: "Şifa Eczanesi" }
];

const aiKnowledgeBase = [
    { keywords: ["merhaba", "selam", "günaydın"], response: "Merhaba! Ben Eczaneme Danış asistanıyım. Size nasıl yardımcı olabilirim?" },
    { keywords: ["baş", "ağrı", "migren"], response: "Baş ağrısı için bol su içmeyi ve dinlenmeyi ihmal etmeyin. Eğer şiddetliyse Parasetamol grubu ilaçlar için eczacınıza danışın." },
    { keywords: ["halsiz", "yorgun", "enerji"], response: "Yorgunluk için B12 ve Magnezyum değerlerinize baktırmanız önerilir. Vitamin testimizi çözdünüz mü?" },
    { keywords: ["grip", "nezle", "soğuk"], response: "Soğuk algınlığında C vitamini, Çinko takviyesi ve bol sıvı tüketimi önemlidir." },
    { keywords: ["uyku", "uyuyamıyorum"], response: "Uyku düzeni için Melatonin desteği veya Melisa çayı önerilebilir." },
    { keywords: ["nöbetçi", "eczane"], response: "Ana sayfadaki 'Nöbetçi Eczaneler' haritasından size en yakın açık eczaneyi görebilirsiniz." },
    { keywords: ["vitamin", "takviye"], response: "Hangi vitamini almanız gerektiğini öğrenmek için 'Vitamin Testi' menüsünü kullanabilirsiniz." }
];

// --- 5. API ENDPOINTLERİ ---

// A. Anlaşmalı Eczaneleri Getir
app.get('/api/pharmacies/partners', (req, res) => {
    res.json(partnerPharmacies);
});

// B. Nöbetçi Eczaneleri Getir (Otomatik Rotasyonlu)
app.get('/api/pharmacies/duty', (req, res) => {
    const dutyList = getDailyDutyPharmacies();
    res.json(dutyList);
});

// C. Eczacı Girişi (Login)
app.post('/api/login', (req, res) => {
    const { gln } = req.body;
    const pharmacist = authorizedPharmacists.find(p => p.gln === gln);
    
    if (pharmacist) {
        res.json({ success: true, user: pharmacist });
    } else {
        res.json({ success: false, message: "Yetkisiz GLN Numarası! Lütfen ruhsat numaranızı kontrol edin." });
    }
});

// D. AI Chat
app.post('/api/chat', (req, res) => {
    const userMessage = req.body.message.toLowerCase();
    let reply = "Bu konuyu tam anlayamadım. Dilerseniz sorunuzu 'Topluluk Forumu' kısmından gerçek eczacımıza sorabilirsiniz.";
    
    for (let item of aiKnowledgeBase) {
        if (item.keywords.some(key => userMessage.includes(key))) {
            reply = item.response;
            break;
        }
    }
    res.json({ reply: reply });
});

// E. Forum: Soru Sor
app.post('/api/forum/ask', async (req, res) => {
    try {
        const newPost = new ForumPost({
            topic: req.body.topic,
            text: req.body.text,
            user: "Misafir"
        });
        await newPost.save();
        res.json({ success: true, message: "Soru kaydedildi" });
    } catch (error) {
        res.status(500).json({ error: "Kayıt hatası" });
    }
});

// F. Forum: Listele
app.get('/api/forum/list', async (req, res) => {
    try {
        const posts = await ForumPost.find().sort({ date: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: "Veri çekme hatası" });
    }
});

// G. Admin: Cevapla
app.post('/api/admin/answer', async (req, res) => {
    try {
        const { id, answer, pharmacist } = req.body;
        await ForumPost.findByIdAndUpdate(id, {
            answer: answer,
            status: 'answered',
            pharmacist: pharmacist || 'Eczacı'
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Güncelleme hatası" });
    }
});

// --- SUNUCUYU BAŞLAT ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 SUNUCU ÇALIŞIYOR: http://localhost:${PORT}`);
});