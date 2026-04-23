
let STATE = {
    user: { email: "guest@neuroscan", is_doctor: true },
    token: "guest_token",
    currentReport: null,
    reportsMap: {}
};

document.addEventListener('DOMContentLoaded', () => {
    updateNav();
    navigate('dashboard');
});

function updateNav() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        navLinks.innerHTML = `
            <span style="margin-right: 1rem; color: var(--text-muted)">${t('welcome')}</span>
            <a href="#" onclick="navigate('dashboard')">${t('dashboard')}</a>
        `;
    }
}

function navigate(page, data = null) {
    const main = document.getElementById('main-content');
    if (!main) return;

    const Home = `
        <section class="hero">
            <h1>Advanced Brain Tumor Detection</h1>
            <p>AI-powered precision for faster diagnosis.</p>
            <button class="btn-primary" onclick="navigate('dashboard')">Go to Dashboard</button>
        </section>
    `;

    if (page === 'home') main.innerHTML = Home;
    else if (page === 'dashboard') renderDashboard(main);
    else if (page === 'report') renderReport(main, data);
}

async function renderDashboard(container) {
    let reports = [];
    try {
        reports = await API.getReports(STATE.token);
        if (!Array.isArray(reports)) reports = [];
    } catch (err) {
        console.error("Failed to fetch reports:", err);
        container.innerHTML = `<div style="padding: 2rem; color: #ef4444;"><h3>Connection Error</h3><p>Could not connect to server: ${err.message}. Ensure backend is running.</p></div>`;
        return;
    }

    STATE.reportsMap = reports.reduce((acc, r) => { acc[r.id] = r; return acc; }, {});

    let uploadSection = '';
    if (STATE.user.is_doctor) {
        uploadSection = `
            <div class="card">
                <h3>${t('new_analysis')}</h3>
                <form onsubmit="handleUpload(event)">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label>${t('patient_name')}</label>
                            <input type="text" id="p-name" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label>${t('age')}</label>
                            <input type="number" id="p-age" class="form-input" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>${t('gender')}</label>
                        <select id="p-gender" class="form-input">
                            <option value="Male">${t('male')}</option>
                            <option value="Female">${t('female')}</option>
                            <option value="Other">${t('other')}</option>
                        </select>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label>${t('email')}</label>
                            <input type="email" id="p-email" class="form-input" placeholder="patient@example.com">
                        </div>
                        <div class="form-group">
                            <label>${t('phone')}</label>
                            <input type="tel" id="p-phone" class="form-input" placeholder="+1234567890">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>${t('mri_scan')}</label>
                        <input type="file" id="mri-file" class="form-input" accept="image/*" required>
                    </div>
                    <div class="form-group">
                        <label>${t('symptoms')}</label>
                        <textarea id="symptoms" class="form-input" placeholder="${t('symptoms')}..."></textarea>
                    </div>
                     <div class="form-group">
                        <label>${t('notes')}</label>
                        <textarea id="notes" class="form-input" placeholder="${t('notes')}..."></textarea>
                    </div>
                    <button type="submit" class="btn-primary">${t('start_analysis')}</button>
                    <div id="upload-status" style="margin-top: 1rem; color: var(--primary);"></div>
                </form>
            </div>
        `;
    }

    const reportsList = reports.map(r => {
        const isTumor = r.prediction_label !== 'No Tumor';
        let borderColor = '#22c55e';
        let badgeClass = 'badge-success';

        if (isTumor) {
            badgeClass = 'badge-danger';
            if (r.prediction_label.includes('Glioma')) borderColor = '#ef4444';
            else if (r.prediction_label.includes('Meningioma')) borderColor = '#f97316';
            else if (r.prediction_label.includes('Pituitary')) borderColor = '#a855f7';
            else borderColor = '#ef4444';
        }

        return `
        <div class="card" style="margin: 0; cursor: pointer; transition: 0.2s; border-left: 5px solid ${borderColor}; position: relative;" onclick='viewReport(${r.id})'>
            <h4>${t('report')} #${r.id}</h4>
            <p style="color: var(--text-muted)">${new Date(r.created_at).toLocaleDateString()}</p>
            <div style="margin-top: 1rem;">
                <span class="badge ${badgeClass}">${r.prediction_label}</span>
                <span class="badge" style="background: rgba(255,255,255,0.1)">${(r.confidence_score * 100).toFixed(1)}% ${t('confidence')}</span>
            </div>
            <button onclick="deleteReport(event, ${r.id})" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.2rem; z-index: 100;">🗑️</button>
        </div>
    `;
    }).join('');

    container.innerHTML = `
        <div style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
            <h1 style="margin-bottom: 2rem;">${t('dashboard')}</h1>
            ${uploadSection}
            
            <h3 style="margin: 3rem 0 1.5rem;">${t('recent_reports')}</h3>
            <div class="report-grid">
                ${reportsList.length ? reportsList : `<p style="color: var(--text-muted)">${t('no_reports')}</p>`}
            </div>
        </div>
    `;
}

async function handleUpload(e) {
    e.preventDefault();
    const file = document.getElementById('mri-file').files[0];
    const symptoms = document.getElementById('symptoms').value;
    const notes = document.getElementById('notes').value;
    const name = document.getElementById('p-name').value;
    const age = document.getElementById('p-age').value;
    const gender = document.getElementById('p-gender').value;
    const email = document.getElementById('p-email').value;
    const phone = document.getElementById('p-phone').value;

    if (!file) {
        alert('Please upload a file');
        return;
    }

    const statusDiv = document.getElementById('upload-status');
    statusDiv.innerText = 'Analyzing... Please wait.';

    try {
        const result = await API.predict(STATE.token, file, symptoms, notes, name, age, gender, email, phone);

        if (email || phone) {
            alert(`Analysis Complete. Notification logic triggered for ${email || ''} ${phone || ''}.`);
        }

        navigate('dashboard');
    } catch (err) {
        alert('Analysis failed: ' + err.message);
        statusDiv.innerText = '';
    }
}

function viewReport(reportId) {
    const report = STATE.reportsMap[reportId];
    if (report) {
        navigate('report', report);
    }
}

function renderReport(container, report) {
    container.innerHTML = `
        <div style="max-width: 1200px; margin: 0 auto; padding: 2rem; display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;">
            <div>
                <button onclick="navigate('dashboard')" class="no-print" style="background: none; border: none; color: var(--text-muted); cursor: pointer; margin-bottom: 1rem;">← ${t('back')}</button>
                
                <div id="report-pdf-content" class="card" style="margin-top: 0; background: var(--bg-card);">
                    
                    <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem; margin-bottom: 2rem;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <h1 style="margin: 0; font-size: 2rem; background: linear-gradient(to right, var(--primary), var(--primary-dark)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${t('app_name')}</h1>
                                <p style="color: var(--text-muted); margin: 0;">${t('report')}</p>
                            </div>
                            <div style="text-align: right;">
                                <span class="badge ${report.prediction_label === 'Tumor Detected' ? 'badge-danger' : 'badge-success'}" style="font-size: 1.2rem; padding: 0.5rem 1rem;">${report.prediction_label}</span>
                                <p style="color: var(--text-muted); margin-top: 0.5rem; font-size: 0.9rem;">Date: ${new Date().toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; flex-wrap: wrap; gap: 2rem; margin-bottom: 2rem; padding: 1.5rem; background: rgba(255,255,255,0.05); border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="flex: 1; min-width: 150px;">
                            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.25rem;">${t('patient_name')}</p>
                            <p style="font-size: 1.1rem; font-weight: 600;">${report.patient_name || 'Anonymous'}</p>
                        </div>
                        <div style="flex: 1; min-width: 120px;">
                            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.25rem;">${t('age')} / ${t('gender')}</p>
                            <p style="font-size: 1.1rem; font-weight: 600;">${report.age || 'N/A'} / ${report.gender || 'N/A'}</p>
                        </div>
                        <div style="flex: 1; min-width: 100px;">
                            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.25rem;">${t('id')}</p>
                            <p style="font-size: 1.1rem; font-weight: 600;">#${report.id}</p>
                        </div>
                        <div style="flex: 2; min-width: 250px;">
                            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.25rem;">${t('contact')}</p>
                            <div style="font-size: 1rem; font-weight: 500;">
                                ${report.email ? `<div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;"><span>📧</span> <span style="word-break: break-all;">${report.email}</span></div>` : ''}
                                ${report.phone ? `<div style="display: flex; align-items: center; gap: 0.5rem;"><span>📞</span> <span>${report.phone}</span></div>` : ''}
                                ${!report.email && !report.phone ? '<span style="color: var(--text-muted)">N/A</span>' : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                        <div>
                            <h4 style="color: var(--text-muted); margin-bottom: 0.5rem;">${t('mri_scan')}</h4>
                            
                            <!-- Diagnostic Toolbar -->
                            <div class="no-print" style="margin-bottom: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                <button class="tool-btn" onclick="window.diagnosticCanvas.setTool('pen')" title="Pen">🖊️</button>
                                <button class="tool-btn" onclick="window.diagnosticCanvas.setTool('ruler')" title="Ruler">📏</button>
                                <button class="tool-btn" onclick="window.diagnosticCanvas.setTool('roi')" title="ROI Analysis">🔍</button>
                                <button class="tool-btn" onclick="window.diagnosticCanvas.setTool('zoom')" title="Zoom/Pan">✋</button>
                                <button class="tool-btn" onclick="window.diagnosticCanvas.setTool('probe')" title="Pixel Probe">🧪</button>
                                <div style="width: 1px; background: rgba(255,255,255,0.2); margin: 0 4px;"></div>
                                <button class="tool-btn" onclick="window.diagnosticCanvas.setTool('thermal')" title="Thermal Vision">🔥</button>
                                <button class="tool-btn" onclick="window.diagnosticCanvas.setTool('edge')" title="Edge Detection">🧬</button>
                                <button class="tool-btn" onclick="window.diagnosticCanvas.setTool('invert')" title="Invert Colors">🌗</button>
                                <button class="tool-btn" onclick="window.diagnosticCanvas.setTool('none')" title="Reset">❌</button>
                            </div>

                            <!-- Diagnostic Container -->
                            <div id="diagnostic-container" style="position: relative; display: inline-block; width: 100%; overflow: hidden; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1);">
                                <img id="main-mri-image" src="${report.image_path}" style="width: 100%; display: block;" onload="if(window.diagnosticCanvas) window.diagnosticCanvas.resizeCanvas()">
                                <canvas id="diagnostic-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: auto; z-index: 5;"></canvas>
                                ${renderBBox(report.bbox)}
                            </div>
                            
                            <!-- ROI Histograms Panel -->
                            <div class="histogram-panel" style="display:none; margin-top:1rem; background:rgba(0,0,0,0.3); padding:1rem; border-radius:0.5rem; border:1px solid rgba(255,255,255,0.1);"></div>

                            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; text-align: center;">
                                ${report.prediction_label === 'Tumor Detected' ?
            (report.bbox ? 'Tumor region highlighted in green.' : 'Tumor detected (Visual localization unconfirmed).')
            : 'No anomalies detected.'}
                            </p>
                        </div>
                        
                        <div>
                            <h4 style="color: var(--text-muted); margin-bottom: 0.5rem;">${t('confidence')}</h4>
                            <div style="position: relative; width: 100%; height: 200px;">
                                <canvas id="confidenceChart"></canvas>
                            </div>
                            <div style="text-align: center; margin-top: 1rem; margin-bottom: 2rem;">
                                <h2 style="margin: 0; font-size: 2.5rem;">${(report.confidence_score * 100).toFixed(1)}%</h2>
                                <p style="color: var(--text-muted); margin: 0;">${t('model_accuracy')}</p>
                            </div>

                            <!-- 3D Viewer Card -->
                            <div class="card no-print" style="padding: 0; overflow: hidden; position: relative; min-height: 300px; background: #000;">
                                <div style="position: absolute; top: 10px; left: 10px; z-index: 10;">
                                    <span class="badge badge-neutral" style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2);">3D Hologram</span>
                                </div>
                                <div id="brain-3d-view" style="width: 100%; height: 300px;"></div>
                            </div>
                        </div>
                    </div>
                    
                    ${report.heatmap_image_path ? `
                    <div style="margin-bottom: 2rem; background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 0.5rem;">
                         <h3 style="margin-top: 0; color: #60a5fa;">🧠 ${t('ai_analysis')}</h3>
                         <p style="color: var(--text-muted); margin-bottom: 1rem;">This heatmap highlights the regions the AI focused on to make its prediction. Red areas indicate high attention.</p>
                         <img src="${report.heatmap_image_path}" style="width: 100%; max-width: 500px; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1);">
                    </div>
                    ` : ''}

                    <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 2rem 0;">

                    <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem;">
                        <div>
                            <h4 style="color: var(--text-muted); margin-bottom: 0.5rem;">${t('symptoms')}</h4>
                            <p style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 0.5rem; margin: 0;">${report.symptoms || 'None recorded.'}</p>
                        </div>
                        <div>
                            <h4 style="color: var(--text-muted); margin-bottom: 0.5rem;">${t('notes')}</h4>
                            <p style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 0.5rem; margin: 0;">${report.notes || 'No notes.'}</p>
                        </div>
                    </div>

                    <div style="margin-top: 3rem; pt-2; border-top: 1px solid rgba(255,255,255,0.1); text-align: center; color: var(--text-muted); font-size: 0.8rem;">
                        <p>${t('disclaimer')}</p>
                    </div>
                </div>
                
                <div style="text-align: right; margin-top: 1rem;" class="no-print">
                    <button onclick="downloadPDF(${report.id})" class="btn-primary" style="background: linear-gradient(135deg, #22c55e, #16a34a);">
                        📥 ${t('download_pdf')}
                    </button>
                </div>

            </div>
            
            <div class="no-print">
                <div class="card" style="margin-top: 2.5rem; height: calc(100vh - 200px); display: flex; flex-direction: column;">
                    <h3 style="margin-bottom: 1rem;">${t('dr_ai')}</h3>
                    <div id="chat-messages" class="chat-container">
                        <div class="chat-message chat-bot">
                            ${t('bot_greeting', { name: report.patient_name || 'Patient' })}
                        </div>
                    </div>
                    <div id="typing-indicator" class="typing-indicator">${t('analyzing')}</div>
                    <form onsubmit="handleChat(event)" style="display: flex; gap: 0.5rem;">
                        <input type="text" id="chat-input" class="form-input" placeholder="${t('ask_question')}" autocomplete="off">
                        <button type="submit" class="btn-primary" style="padding: 0.75rem 1rem;">${t('send')}</button>
                    </form>
                </div>
            </div>
        </div>
    `;

    renderChart(report);

    // Initialize Tools (After DOM update)
    setTimeout(() => {
        // 1. 3D Viewer
        if (typeof init3DViewer === 'function') {
            // Parse bbox if string
            let bboxVal = report.bbox;
            try { if (typeof bboxVal === 'string') bboxVal = JSON.parse(bboxVal); } catch (e) { }

            init3DViewer('brain-3d-view', report.image_path, report.prediction_label === 'Tumor Detected', bboxVal);
        }

        // 2. Diagnostic Tools
        if (typeof DiagnosticCanvas === 'function') {
            // Cleanup old instance if exists
            if (window.diagnosticCanvas) {
                // window.diagnosticCanvas.destroy(); // If method existed
            }
            window.diagnosticCanvas = new DiagnosticCanvas('diagnostic-canvas', 'main-mri-image', null, report.id);
        }
    }, 100);
}

function renderChart(report) {
    new Chart(document.getElementById('confidenceChart'), {
        type: 'doughnut',
        data: {
            labels: ['Confidence', 'Uncertainty'],
            datasets: [{
                data: [report.confidence_score * 100, 100 - (report.confidence_score * 100)],
                backgroundColor: [report.prediction_label === 'Tumor Detected' ? '#ef4444' : '#22c55e', 'rgba(255,255,255,0.1)'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8' } }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function downloadPDF(reportId) {
    const link = document.createElement('a');
    link.href = `${window.API_URL}/api/reports/${reportId}/pdf`;
    link.download = `NeuroScan_Report_${reportId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderBBox(bbox) {
    if (!bbox) return '';
    try {
        const box = (typeof bbox === 'string' && bbox !== 'None') ? JSON.parse(bbox) : bbox;
        if (!box) return '';
        return `
            <div style="
                position: absolute;
                left: ${box.x * 100}%;
                top: ${box.y * 100}%;
                width: ${box.w * 100}%;
                height: ${box.h * 100}%;
                border: 3px solid #00ff00;
                box-shadow: 0 0 10px #00ff00;
                pointer-events: none;
                z-index: 10;
            "></div>
        `;
    } catch (e) {
        console.error('Error parsing bbox', e);
        return '';
    }
}

async function handleChat(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    const container = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('typing-indicator');

    appendMessage(container, msg, 'user');
    input.value = '';
    scrollToBottom(container);

    typingIndicator.style.display = 'block';
    scrollToBottom(container);

    try {
        const res = await API.chat(msg);
        typingIndicator.style.display = 'none';
        appendMessage(container, res.content, 'bot');
    } catch (err) {
        typingIndicator.style.display = 'none';
        appendMessage(container, "Sorry, I couldn't connect. Please try again.", 'bot');
        console.error(err);
    }

    scrollToBottom(container);
}

async function deleteReport(e, id) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
        await API.deleteReport(STATE.token, id);
        navigate('dashboard');
    } catch (err) {
        alert("Failed to delete: " + err.message);
    }
}

function appendMessage(container, text, sender) {
    const div = document.createElement('div');
    div.className = `chat-message chat-${sender}`;
    const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    div.innerHTML = formattedText;
    container.appendChild(div);
}

function scrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
}
