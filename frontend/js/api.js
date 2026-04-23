// Auto-detect API URL
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.API_URL = 'http://127.0.0.1:8004';
} else {
    // Production/Ngrok: Use current origin to avoid Mixed Content/CORS issues
    window.API_URL = window.location.origin;
}
const API_URL = window.API_URL;

class API {
    static async predict(token, file, symptoms, notes, patient_name, age, gender, email, phone) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('symptoms', symptoms);
        formData.append('notes', notes);
        formData.append('patient_name', patient_name);
        formData.append('age', age);
        formData.append('gender', gender);
        if (email) formData.append('email', email);
        if (phone) formData.append('phone', phone);

        const response = await fetch(`${API_URL}/api/predict`, {
            method: 'POST',
            headers: {
                'ngrok-skip-browser-warning': 'true'
            },
            body: formData
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Analysis failed');
        }
        return response.json();
    }

    static async getReports(token) {
        const response = await fetch(`${API_URL}/api/reports`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
        return response.json();
    }

    static async chat(message) {
        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ content: message, is_bot: false, timestamp: new Date() })
        });
        return response.json();
    }

    static async deleteReport(token, reportId) {
        const response = await fetch(`${API_URL}/api/reports/${reportId}`, {
            method: 'DELETE',
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to delete report');
        }
        return true;
    }
}
