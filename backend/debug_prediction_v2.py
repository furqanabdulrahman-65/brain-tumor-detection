
import os
import sys
import glob
from ml_service import ml_service

# Find latest image
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "assets", "uploads")
list_of_files = glob.glob(os.path.join(UPLOAD_DIR, "*")) 
if not list_of_files:
    print("No files found!")
    sys.exit(1)

# Filter out generated files
original_files = [f for f in list_of_files if "crop_" not in f and "heatmap_" not in f and "annotated_" not in f]
if not original_files:
     print("No original files found")
     sys.exit(0)

latest_file = max(original_files, key=os.path.getctime)
print(f"Testing Latest File: {latest_file}")

with open(latest_file, "rb") as f:
    data = f.read()

# Run Prediction
print("-" * 30)
result = ml_service.predict(data)
print("-" * 30)
print("FINAL RESULT:")
print(result)
