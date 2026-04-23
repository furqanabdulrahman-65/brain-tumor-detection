🧠 Brain Tumor Detection System

An AI-powered web application that detects and classifies brain tumors from MRI scans using deep learning models, along with an interactive frontend dashboard and diagnostic tools.

🚀 Features
🧠 Tumor Detection using CNN-based models
📊 Heatmap Visualization for model interpretability
📝 Automated Report Generation (PDF)
💬 AI Chat Assistant for medical insights
🌐 Responsive Web Interface (Mobile + Desktop)
📈 Analytics Dashboard for insights
🏗️ Tech Stack
🔹 Backend
Python
Flask / FastAPI
TensorFlow / Keras
PyTorch (EfficientNet / Swin models)
🔹 Frontend
HTML, CSS, JavaScript
Custom UI with responsive design
🔹 Tools & Others
OpenCV
NumPy, Pandas
PDF Generation
REST APIs
📁 Project Structure
brain-tumor-detection/
│
├── backend/
│   ├── models/                # ML models (not pushed)
│   ├── chat_service.py       # AI chat logic
│   ├── app.py                # Main backend server
│   └── utils/                # Helper functions
│
├── frontend/
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
│
├── .gitignore
├── README.md
└── requirements.txt
⚙️ Setup Instructions
🔹 1. Clone the repository
git clone https://github.com/furqanabdulrahman-65/brain-tumor-detection.git
cd brain-tumor-detection
🔹 2. Create virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
🔹 3. Install dependencies
pip install -r requirements.txt
🔹 4. Set environment variables

Create a .env file:

GROQ_API_KEY=your_api_key_here
🔹 5. Run backend
python backend/app.py
🔹 6. Open frontend

Open:

frontend/index.html
🧪 How It Works
User uploads MRI scan
Image is preprocessed
Model predicts tumor presence
Heatmap highlights affected region
Report is generated automatically
📊 Models Used
EfficientNet (Feature Extraction)
Swin Transformer (Classification)

⚠️ Note: Model files are not included due to size limits.

🔐 Security Notes
API keys are stored in .env
Sensitive data is not pushed to GitHub
⚠️ Limitations
Not a substitute for professional medical diagnosis
Model accuracy depends on dataset quality
📌 Future Improvements
Deploy on cloud (AWS / Render)
Add user authentication
Improve model accuracy
Real-time diagnosis
👨‍💻 Author

Furqan Abdul Rahman

AI Developer | Web Developer
⭐ Contribute

Feel free to fork, improve, and submit pull requests!

📜 License

This project is for educational and research purposes
