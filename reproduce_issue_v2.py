import sys
import os
import cv2
import numpy as np
import torch
import io
from PIL import Image

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from backend.ml_service import BrainTumorModel
except ImportError:
    # Try importing directly if running from backend dir
    sys.path.append(os.getcwd())
    from ml_service import BrainTumorModel

def test_image(image_path):
    print(f"Testing image: {image_path}")
    service = BrainTumorModel()
    
    with open(image_path, "rb") as f:
        image_bytes = f.read()
    
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    prediction = service.predict(image_bytes)
    
    print("\n--- Prediction Results ---")
    print(f"Label: {prediction['label']}")
    print(f"Confidence: {prediction['confidence']}")
    print(f"BBox: {prediction['bbox']}")
    print(f"Tumor Size: {prediction['tumor_size']}")
    
    # Manually debug detect_tumor_region logic
    # We need to access internal methods to debug step-by-step if bbox is None
    if prediction['bbox'] is None and prediction['label'] == 'Tumor Detected':
        print("\n[DEBUG] Investigating BBox Failure...")
        img_tensor = service.transforms(img).unsqueeze(0).to(service.device)
        with torch.no_grad():
            features = service.feature_extractor(img_tensor)
            features_np = features.cpu().numpy()[0]
            
        heatmap = service.generate_heatmap(features_np, service.svm_model.coef_, 1)
        print(f"Heatmap Max Value: {heatmap.max()}")
        print(f"Heatmap Mean Value: {heatmap.mean()}")
        
        # Simulate detect_tumor_region
        w_img, h_img = img.size
        heatmap_resized = cv2.resize(heatmap, (w_img, h_img))
        heatmap_vis = np.uint8(255 * heatmap_resized)
        
        # Otsu
        thresh_val, thresh = cv2.threshold(heatmap_vis, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        print(f"Otsu Threshold: {thresh_val}")
        
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        print(f"Contours Found: {len(contours)}")
        
        if contours:
            c = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(c)
            area_ratio = (w * h) / (w_img * h_img)
            print(f"Max Contour: x={x}, y={y}, w={w}, h={h}")
            print(f"Area Ratio: {area_ratio:.5f} (Threshold: 0.005)")
            
            if (w * h) > (w_img * h_img * 0.005):
                print("PASS: Contour meets threshold.")
            else:
                print("FAIL: Contour too small.")
        else:
            print("FAIL: No contours found.")

if __name__ == "__main__":
    # Use the absolute path to the user's uploaded image
    img_path = r"C:/Users/faiza/.gemini/antigravity/brain/10442fc0-c65e-4f6c-bdef-640d554aa9d2/uploaded_image_1768327562472.png"
    if os.path.exists(img_path):
        test_image(img_path)
    else:
        print(f"File not found: {img_path}")
