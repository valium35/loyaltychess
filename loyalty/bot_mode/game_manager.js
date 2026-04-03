// game_manager.js - ORKESTRA ŞEFİ
import { GameCore } from './core/game_core.js';
import { Renderer } from './ui/renderer.js';
import { PlayerController } from './controllers/player_controller.js';
import { BotController } from './controllers/bot_controller.js';
import { EventSystem } from './core/event_system.js'; // <--- BU EKSİKTİ!

export const GameManager = {
    // 1. OYUNU BAŞLAT
    init() {
        console.log("LoyaltyChess Başlatılıyor...");
        
        GameCore.init();
        PlayerController.init();
        BotController.init();
        this.setupListeners();
        Renderer.render();
    },

    // 2. HABERLEŞME AĞINI KUR
    setupListeners() {
        // Tıklama/Parlatma haberi
        window.addEventListener('triggerRender', (e) => {
            Renderer.render(e.detail); 
        });

        // Hamle bittiğinde
        window.addEventListener('moveExecuted', (e) => {
            Renderer.render(); 

            // POLİSE HABER VER
            EventSystem.add({ type: 'moveExecuted', detail: e.detail || {} });
        });

        window.addEventListener('handleLogic', (e) => {
            // Gelecek mantıklar için
        });
    } // setupListeners bitti
}; // GameManager NESNESİ BURADA KAPANMALI! <--- BURASI HATALIYDI

// Sayfa yüklendiğinde şefi sahneye çağır!
window.onload = () => {
    GameManager.init();
};