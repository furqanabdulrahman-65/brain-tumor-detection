import os
import requests

ICON_URL = "https://cdn-icons-png.flaticon.com/512/3063/3063176.png"
ASSETS_DIR = os.path.join(os.path.dirname(__file__), "frontend", "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)

def download_file(url, filename):
    response = requests.get(url)
    if response.status_code == 200:
        filepath = os.path.join(ASSETS_DIR, filename)
        with open(filepath, 'wb') as f:
            f.write(response.content)
        print(f"Downloaded {filename}")
    else:
        print(f"Failed to download {filename}: {response.status_code}")

if __name__ == "__main__":
    download_file(ICON_URL, "icon-192.png")
    download_file(ICON_URL, "icon-512.png")
