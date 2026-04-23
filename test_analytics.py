import requests
import io
import os

image_path = "test_ann.jpg"
if not os.path.exists(image_path):
    print("test_ann.jpg not found, using dummy")
    from PIL import Image
    img = Image.new('RGB', (224, 224), color = 'white')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()
else:
    with open(image_path, "rb") as f:
        img_bytes = f.read()

url = 'http://127.0.0.1:8004/api/predict'
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
    print("Raw Response:", response.text)
except Exception as e:
    print(f"Request Failed: {e}")
