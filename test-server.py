import os
import sys
import requests
from dotenv import load_dotenv

# Load configuration from .env file
load_dotenv()

def test_gemini():
    print("\n-------------------------------------------------------------")
    print(" 🛠️  MENGUJI INTEGRASI GOOGLE GEMINI AI (PYTHON)...")
    print("-------------------------------------------------------------")
    
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key or api_key.strip() == "" or "your-api-key" in api_key.lower() or "AQ.Ab8RN6L" in api_key:
        print("❌ WARNING: Environment variable GEMINI_API_KEY belum dikonfigurasi / menggunakan token dummy default.")
        print("💡 LiveClass offline cognitive fallback engine akan aktif secara otomatis saat dijalankan.")
        return False

    models_to_try = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash"
    ]
    
    success = False
    for model in models_to_try:
        try:
            print(f"👉 Menghubungi model '{model}'...")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            
            body = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"text": "Hello world, response with one short sentence in Indonesian language."}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 100
                }
            }
            
            headers = {"Content-Type": "application/json"}
            resp = requests.post(url, json=body, headers=headers, timeout=15)
            
            if resp.status_code == 429:
                print(f"⚠️ Model {model} terkena limit harian (Quota 429). Mencoba model alternatif...")
                continue
                
            resp.raise_for_status()
            res_data = resp.json()
            
            candidates = res_data.get("candidates", [])
            if candidates:
                text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if text:
                    print(f"✅ Selesai! Model {model} merespon: '{text.strip()}'")
                    success = True
                    break
            
            print(f"❌ Respon kosong dari model {model}.")
        except Exception as e:
            print(f"❌ Kesalahan pada model {model}: {e}")
            
    return success


def test_local_server():
    print("\n-------------------------------------------------------------")
    print(" 📡 MENGUJI KONEKSI SERVER LOCAL HOST (PORT 3000)...")
    print("-------------------------------------------------------------")
    
    local_url = "http://localhost:3000/api/session/check-duplicate?username=test_check_system"
    try:
        resp = requests.get(local_url, timeout=5)
        if resp.status_code == 200:
            print("✅ SUKSES: Server lokal Port 3000 merespon dengan baik!")
            print(f"📦 Payload Response: {resp.json()}")
            return True
        else:
            print(f"❌ GAGAL: Server merespon dengan status code {resp.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ GAGAL KONEKSI: Server local belum dinyalakan atau tidak berjalan di port 3000.")
        print("💡 Nyalakan server Python lewat terminal dengan perintah: python server.py")
    except Exception as e:
        print(f"❌ Kesalahan Transmisi: {e}")
        
    return False


def main():
    print("======================================================================")
    print("  LIVECLASS ACADEMIC APP - PYTHON SYSTEM DIAGNOSTIC KIT")
    print("======================================================================")
    
    # Test local backend server connection
    server_ok = test_local_server()
    
    # Test Google Gemini AI integration
    gemini_ok = test_gemini()
    
    print("\n======================================================================")
    print("  HASIL RINGKASAN DIAGNOSTIK:")
    print("======================================================================")
    print(f"  - Server Sesi Lokal: {'🟢 AKTIF & AMAN' if server_ok else '🔴 OFFLINE / KONEKSI TERPUTUS'}")
    print(f"  - Integrasi Cloud AI: {'🟢 BERHASIL / ONLINE' if gemini_ok else '🟡 COGNITIVE FALLBACK ENGINE AKTIF'}")
    print("======================================================================\n")


if __name__ == "__main__":
    main()
