
import sys
import os
import cv2
import numpy as np
from PIL import Image

# Add current dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml_service import MLService

def test_analysis():
    print("Initializing ML Service...")
    service = MLService()
    
    # Create a dummy tumor image (black with white circle)
    img = Image.new('RGB', (224, 224), color='black')
    pixels = img.load()
    for x in range(100, 150):
        for y in range(100, 150):
            pixels[x, y] = (255, 255, 255)
            
    print("Testing prediction on dummy tumor image...")
    try:
        # We assume clean env, so manual call
        # Mocking the model part since we might not have weights loaded or want to rely on them
        # Just testing analyze_tumor_features
        
        bbox = {"x": 0.4, "y": 0.4, "w": 0.2, "h": 0.2}
        analytics = service.analyze_tumor_features(img, bbox)
        print(f"Analytics Result: {analytics}")
        
        if not analytics or analytics.get("morphology") == "Unknown":
            print("FAILED: Analytics returned Unknown or None")
        else:
            print("SUCCESS: Analytics calculated")
            
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_analysis()
