import requests
import os

url = "http://127.0.0.1:8004/api/predict"
image_path = r"C:/Users/faiza/.gemini/antigravity/brain/c8ce86dd-99bf-4ff2-9d47-70311f2b6d10/uploaded_media_0_1769585953943.png"
# image_path = r"C:/Users/faiza/.gemini/antigravity/brain/c8ce86dd-99bf-4ff2-9d47-70311f2b6d10/uploaded_media_1_1769585953943.png"

if not os.path.exists(image_path):
    print(f"File not found: {image_path}")
    exit(1)

files = {'file': open(image_path, 'rb')}
data = {
    'patient_name': 'Test User',
    'age': 30,
    'gender': 'Male',
    'symptoms': 'None',
    'notes': 'Test upload'
}

try:
    print(f"Sending {image_path} to {url}...")
    response = requests.post(url, files=files, data=data)
    print(f"Status Code: {response.status_code}")
    print("Response JSON:")
    print(response.json())
except Exception as e:
    print(f"Error: {e}")
