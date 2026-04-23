import torch
import os
try:
    from efficientnet_pytorch import EfficientNet
except ImportError:
    print("efficientnet_pytorch not installed")
    exit(1)

model_path = "backend/efficientnet_feature_extractor.pth"
if not os.path.exists(model_path):
    print(f"Model not found at {model_path}")
    exit(1)

print("Attempting to load with efficientnet_pytorch.EfficientNet.from_name('efficientnet-b4')...")
try:
    model = EfficientNet.from_name('efficientnet-b4')
    state_dict = torch.load(model_path, map_location='cpu')
    
    # efficientnet_pytorch uses slightly different keys usually, let's see.
    # If the pth is a full model save (not state_dict), we rely on torch.load
    
    if isinstance(state_dict, dict) and 'state_dict' in state_dict:
        state_dict = state_dict['state_dict']
        
    # Check for wrapping
    if all(k.startswith('module.') for k in state_dict.keys()):
        state_dict = {k[7:]: v for k, v in state_dict.items()}
        
    missing, unexpected = model.load_state_dict(state_dict, strict=True)
    if not missing and not unexpected:
        print("SUCCESS! Loaded strictly with efficientnet_pytorch.")
    else:
        print(f"Loaded with mismatches: Missing: {len(missing)}, Unexpected: {len(unexpected)}")
        print(f"Example Missing: {missing[:5]}")
        print(f"Example Unexpected: {unexpected[:5]}")
        
except Exception as e:
    print(f"Failed: {e}")
