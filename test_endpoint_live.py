import requests
import io
from PIL import Image

# Create dummy image
img = Image.new('RGB', (224, 224), color = 'red')
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='JPEG')
img_bytes = img_byte_arr.getvalue()

url = 'http://127.0.0.1:8000/api/predict'
files = {'file': ('test.jpg', img_bytes, 'image/jpeg')}
data = {
    'patient_name': 'Test User',
    'age': 25,
    'gender': 'Male'
}

print(f"Sending request to {url}...")
try:
    response = requests.post(url, files=files, data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Request Failed: {e}")
