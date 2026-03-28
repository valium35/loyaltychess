/**
 * database.js - LoyaltyChess Açılış Kitabı
 * Format: "önceki_hamleler_zinciri": [olasılık_dahilindeki_cevaplar]
 * İndeksler: e2(52), e4(36), e7(12), e5(28) vb.
 */
const OpeningDatabase = {
    // 1. Beyaz e4 (52-36) oynarsa -> Siyah e5 (12-28) veya c5 (10-26 - Sicilya)
    "52-36": [{from: 12, to: 28}, {from: 10, to: 26}],
    
    // 1. Beyaz d4 (51-35) oynarsa -> Siyah d5 (11-27) veya At f6 (6-21)
    "51-35": [{from: 11, to: 27}, {from: 6, to: 21}],
    
    // 2. Hamle Devam Yolları (Örn: e4 e5 sonrası Beyaz Af3(62-45) oynarsa)
    "52-36,12-28,62-45": [{from: 1, to: 18}], // Ac6 (Siyahın savunması)
    
    // 2. Hamle (Örn: d4 d5 sonrası Beyaz c4(50-34) oynarsa - Vezir Gambiti)
    "51-35,11-27,50-34": [{from: 12, to: 20}] // e6 (Reddedilmiş Vezir Gambiti)
};