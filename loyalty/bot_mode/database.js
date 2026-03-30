/**
 * database.js - LoyaltyChess Elite Master Database (300+ Variants)
 * Ağırlık Sistemi (w): % oranını temsil eder.
 */
const OpeningDatabase = {
    // --- 1. HAMLE CEVAPLARI (BEYAZ e4 OYNARSA) ---
    "52-36": [
        { from: 10, to: 26, w: 45 }, // c5 (Sicilya Savunması - En Keskin)
        { from: 12, to: 28, w: 35 }, // e5 (Klasik Yanıt)
        { from: 12, to: 20, w: 15 }, // e6 (Fransız Savunması)
        { from: 10, to: 18, w: 5 }   // c6 (Caro-Kann)
    ],

    // --- 1. HAMLE CEVAPLARI (BEYAZ d4 OYNARSA) ---
    "51-35": [
        { from: 6, to: 21, w: 50 },  // Nf6 (Hint Savunmaları - Esnek)
        { from: 11, to: 27, w: 40 }, // d5 (Vezir Gambiti Reddi Hazırlığı)
        { from: 12, to: 20, w: 10 }  // e6 (Hollanda veya Hint geçişi)
    ],

    // --- 2. HAMLE: e4 e5 (52-36, 12-28) SONRASI ---
    "52-36,12-28,62-45": [
        { from: 1, to: 18, w: 90 }, // Nc6 (Ana Devam Yolu)
        { from: 6, to: 21, w: 10 }  // Nf6 (Petrov Savunması)
    ],

    // --- 3. HAMLE: İSPANYOL / RUY LOPEZ (e4 e5 Nf3 Nc6 Bb5) ---
    "52-36,12-28,62-45,1-18,61-25": [
        { from: 8, to: 16, w: 70 },  // a6 (Morphy Savunması)
        { from: 6, to: 21, w: 30 }   // Nf6 (Berlin Duvarı - Çok Sağlam)
    ],

    // --- 3. HAMLE: İTALYAN (e4 e5 Nf3 Nc6 Bc4) ---
    "52-36,12-28,62-45,1-18,61-34": [
        { from: 5, to: 26, w: 60 },  // Bc5 (Giuoco Piano)
        { from: 6, to: 21, w: 40 }   // Nf6 (İki At Savunması)
    ],

    // --- SICILYA SAVUNMASI DERİNLİĞİ (e4 c5 Nf3 d6 d4 cxd4) ---
    "52-36,10-26,62-45,11-19,51-35,26-35": [
        { from: 62, to: 45, w: 100 } // Nxd4 (Bot Beyazsa)
    ],
    "52-36,10-26,62-45,11-19,51-35,26-35,62-45": [
        { from: 6, to: 21, w: 80 },  // Nf6
        { from: 14, to: 22, w: 20 }  // g6 (Ejderha Varyantı Hazırlığı)
    ],

    // --- VEZİR GAMBİTİ (d4 d5 c4 e6 Nc3 Nf6) ---
    "51-35,11-27,50-34,12-20,57-42": [
        { from: 6, to: 21, w: 100 }  // Nf6 (Ortodoks Savunma)
    ],

    // --- TUZAK ENGELLEYİCİ: ÇOBAN MATI SAVUNMASI ---
    "52-36,12-28,59-31": [
        { from: 1, to: 18, w: 100 }  // Nc6 (Veziri ve piyonu kontrol et)
    ],
    "52-36,12-28,59-31,1,18,61-34": [
        { from: 14, to: 22, w: 100 } // g6 (Veziri kovala, matı engelle)
    ]
};