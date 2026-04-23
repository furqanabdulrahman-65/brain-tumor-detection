# NeuroScan AI - Technology Stack & Tools Inventory

## 💻 Programming Languages
**Primary:**
- **Python (v3.9+)**: The core backbone of the entire backend, AI processing, and server logic.
- **JavaScript (ES6+)**: The engine for all frontend interactivity, 3D visualization, and client-side logic.
- **HTML5**: The semantic structure of the application interface.
- **CSS3**: The styling language used to create the advanced "Glassmorphism" and responsive design.

**Secondary / Scripting:**
- **Batch Scripting** (`.bat`): Used for Windows automation (starting servers, environment setup).
- **SQL**: Used via SQLite for querying the local patient & report database.
- **Markdown**: Used for all project documentation.

---

## 🛠️ Frameworks & Libraries (Big Tools)
### Backend (AI & Server)
- **FastAPI**: The high-performance web framework used to build the REST API endpoints.
- **PyTorch**: The deep learning framework powering the **EfficientNetV2** feature extractor.
- **Scikit-Learn**: The machine learning library used for the **SVM (Support Vector Machine)** classifier.
- **TensorFlow / Keras**: Used for the secondary consensus models (Swin Transformer & CoAtNet).
- **OpenCV (cv2)**: The computer vision library used for image preprocessing, thresholding, and advanced analytics (contours, sizing).
- **NumPy**: The fundamental package for all numerical computation and matrix operations.
- **Pillow (PIL)**: Python Imaging Library for basic image file handling and format conversion.

### Frontend (UI & Viz)
- **Three.js**: The powerful 3D library used to render the **Holographic Brain** and tumor visualizations in the browser.
- **Chart.js**: Used for rendering the "Diagnosis Trends" and analytics graphs.
- **html2pdf.js**: The tool that converts the HTML diagnostic report into a downloadable PDF file.

---

## ⚙️ Small Utilities & Modules
- **Uvicorn**: An ASGI web server implementation to run the FastAPI app.
- **Joblib**: Used for efficient serializing/loading of the SVM model files.
- **Timm (PyTorch Image Models)**: A library providing the pre-trained EfficientNet architecture.
- **Pydantic**: Used for strict data validation and schema definition in the API.
- **SQLAlchemy**: The ORM (Object Relational Mapper) used to interact with the database in Pythonic code.
- **Bcrypt**: Used for secure password hashing and verification.
- **Python-Multipart**: Required for handling file uploads (MRI images) in FastAPI.
- **Google Fonts API**: Feeds the specific typography (Inter, Outfit, JetBrains Mono).
- **UI Avatars API**: Generates dynamic user avatars based on names.

---

## 🗃️ Databases & Storage
- **SQLite**: A lightweight, serverless relational database engine used for storing persistent data (no external server required).
- **Local File System**: Used for storing the raw MRI image uploads (`/assets/uploads`) and generated PDF reports (`/assets/reports`).

---

## 🔧 Development Environment
- **VS Code**: The Integrated Development Environment (IDE) likely used for writing code.
- **Virtualenv (venv)**: Used to create an isolated Python environment to manage dependencies.
