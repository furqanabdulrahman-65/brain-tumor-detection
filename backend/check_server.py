import requests
try:
    print("Checking server...")
    r = requests.get("http://127.0.0.1:8004/docs", timeout=5)
    print(f"Status: {r.status_code}")
except Exception as e:
    print(f"Error: {e}")
