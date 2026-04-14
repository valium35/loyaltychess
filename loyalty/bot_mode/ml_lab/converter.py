import chess.pgn
import json
import os

# Adresleri 'raw string' (r"...") olarak tanımlıyoruz ki hata vermesin
input_path = r"C:\Users\murat\Desktop\loyaltychess\loyalty\bot_mode\ml_lab\açılışlar.pgn"
output_path = r"C:\Users\murat\Desktop\loyaltychess\loyalty\bot_mode\ml_lab\opening_book.json"

def convert():
    if not os.path.exists(input_path):
        print(f"❌ Dosya bulunamadı: {input_path}")
        return

    openings_dict = {}
    
    with open(input_path, "r", encoding="utf-8") as f:
        print("🔄 PGN'ler JSON'a çevriliyor...")
        while True:
            game = chess.pgn.read_game(f)
            if game is None:
                break
            
            name = game.headers.get("Opening", f"Acilis_{len(openings_dict) + 1}")
            
            moves_list = []
            for move in game.mainline_moves():
                moves_list.append(move.uci())
                if len(moves_list) >= 12:
                    break
            
            if moves_list:
                openings_dict[name] = moves_list

    with open(output_path, "w", encoding="utf-8") as out:
        json.dump(openings_dict, out, indent=4, ensure_ascii=False)
    
    print(f"✅ İşlem Tamam! {len(openings_dict)} adet açılış kaydedildi.")

if __name__ == "__main__":
    convert()