# NeuroScan AI - feature Expansion Plan

## A. Report Page Enhancements (15 Features)

### Diagnostic & Visual Tools
1.  **Symmetry Analysis Overlay**
    *   **Concept:** Automatically mirrors the brain image and subtracts the left hemisphere from the right. High difference areas (asymmetries) are highlighted in neon yellow/purple, indicating potential anomalies.
    *   **Value:** Tumors often break brain symmetry.

2.  **Tumor Volume Estimator (Approximate)**
    *   **Concept:** Uses the bounding box and pixel density to estimate the localized mass size in $mm^2$ or $cm^3$ (assuming slice thickness).
    *   **Value:** Crucial for staging and tracking growth over time.

3.  **"Similar Case" Retrieval**
    *   **Concept:** "AI found 3 past cases with similar tumor signatures." Displays thumbnails of historical cases that the model found visually similar.
    *   **Value:** Helps doctors validate their diagnosis against precedent.

4.  **Tissue Segmentation Toggle**
    *   **Concept:** A filter that isolates Gray Matter vs White Matter vs CSF based on intensity thresholds.
    *   **Value:** Helps localize whether the tumor is in the cortex or deeper structures.

5.  **AI Radiologist Note Generator**
    *   **Concept:** A button that generates a text paragraph: *"The scan reveals a hyper-intense mass in the [Quadrant] region, approximately [Size] pixels wide..."*
    *   **Value:** Speeds up reporting for doctors.

### Clinical Data & Utility
6.  **DICOM Metadata Inspector**
    *   **Concept:** A slide-out panel showing scanner hardware details (Tesla rating, TE/TR times), Patient DOB, etc., parsed from headers.
    *   **Value:** Technical context for the image quality.

7.  **Z-Score Anomaly Map**
    *   **Concept:** Instead of a heatmap, shows a statistical deviation map. How much does this pixel differ from a "Average Healthy Brain"?
    *   **Value:** Highlights subtle anomalies that strictly "Tumor/No Tumor" classifiers might miss.

8.  **Automated Severity Grading (WHO Grade Prediction)**
    *   **Concept:** AI guesses if the texture looks Low Grade (I/II) or High Grade (III/IV) based on edge roughness and heterogeneity.
    *   **Value:** Early warning for aggressive progression.

9.  **Export to Medical Formats (NIfTI / High-Res PNG)**
    *   **Concept:** "Download for PACS" button that saves the annotated image in formats compatible with hospital systems, not just browser JPEGi.

10. **Blind Code Mode**
    *   **Concept:** A toggle to hide Patient Name/Details (Anonymization) for unbiased peer review or teaching usage.

### Interaction & Workflow
11. **Voice Dictation Module**
    *   **Concept:** "Start Recording" button to dictating clinical notes directly into the "Doctor's Notes" text area using Web Speech API.

12. **Smart Follow-Up Scheduler**
    *   **Concept:** Based on the diagnosis, suggests a next scan date (e.g., "Tumor Detected -> Suggest 3 months", "Clean -> Suggest 1 year").

13. **Secure Share Link**
    *   **Concept:** Generate a time-limited, password-protected URL to share this specific report with another specialist.

14. **Print-Optimized View**
    *   **Concept:** A CSS Mode that removes the dark mode, black backgrounds, and interactive buttons, rendering a clean black-on-white paper report.

15. **"Dispute Diagnosis" Feedback Loop**
    *   **Concept:** A "Flag Error" workflow. If AI is wrong, Doctor marks the correct region. This data is saved for future model retraining.

---

## B. Overall Project Major Features (5 Features)

### 1. Multi-Model Consensus (Ensemble)
*   **Description:** Run the image through **EfficientNet**, **ResNet50**, and **VisionTransformer (ViT)** simultaneously.
*   **UI:** Show a "Vote Count" (e.g., *2 Models say Tumor, 1 says Clean*).
*   **Why:** Drastically reduces false positives. If all 3 agree, confidence is nearly 100%.

### 2. Batch Processing Pipeline
*   **Description:** Allow uploading a ZIP file containing 500 scans.
*   **UI:** A new "High Throughput" dashboard that processes them in a queue and outputs a CSV summary + flagged folders for "Urgent" cases.
*   **Why:** Essential for screening centers processing hundreds of patients daily.

### 3. Patient Portal & Mobile App View
*   **Description:** A simplified, non-scary view for patients.
*   **Features:** Removes complex medical metrics. Shows "Status: Under Review" or "Action Required". Includes educational videos about MRI.
*   **Why:** Improves patient experience and reduces anxiety.

### 4. Real-Time Tele-Radiology (Collaboration)
*   **Description:** A "Live Session" mode. Two doctors on different computers view the same scan. When one zooms/draws a circle, the other sees it instantly (WebSockets).
*   **Why:** Enables remote second opinions and teaching hospitals.

### 5. Federated Learning Node (Privacy-First AI)
*   **Description:** A backend module that allows the system to learn from local data *without* sending patient images to a central cloud. It only sends weight updates.
*   **Why:** Critical for hospital privacy compliance (HIPAA/GDPR) while still improving the global AI model.
