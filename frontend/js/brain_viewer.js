// Store active animation loops and renderers to fully dispose them
const _brainViewerState = {}; // { containerId: { frameId, renderer, scene, controls, resizeObserver } }

function init3DViewer(containerId, imagePath, hasTumor, bbox) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // --- 1. ROBUST CLEANUP ---
    if (_brainViewerState[containerId]) {
        const state = _brainViewerState[containerId];

        // Stop Loop
        if (state.frameId) cancelAnimationFrame(state.frameId);

        // Stop Observer
        if (state.resizeObserver) state.resizeObserver.disconnect();

        // Dispose Controls
        if (state.controls) state.controls.dispose();

        // Dispose Three.js Resources
        if (state.scene) {
            state.scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }

        // Dispose Renderer
        if (state.renderer) {
            state.renderer.dispose();
            state.renderer.forceContextLoss();
            state.renderer.domElement = null;
        }

        // Clear State
        delete _brainViewerState[containerId];
    }

    // Clear DOM
    container.innerHTML = '';

    // --- 2. WAIT FOR DIMENSIONS (If hidden/collapsed) ---
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        // console.log(`[3DViewer] Waiting for dimensions on ${containerId}...`);
        const observer = new ResizeObserver(() => {
            if (container.offsetWidth > 0 && container.offsetHeight > 0) {
                observer.disconnect();
                // Avoid infinite loops by ensuring state is cleared first
                init3DViewer(containerId, imagePath, hasTumor, bbox);
            }
        });
        observer.observe(container);

        // Check manually shortly after (fallback for fast layout changes)
        setTimeout(() => {
            if (container.offsetWidth > 0 && !_brainViewerState[containerId]) {
                observer.disconnect();
                init3DViewer(containerId, imagePath, hasTumor, bbox);
            }
        }, 100);

        _brainViewerState[containerId] = { resizeObserver: observer };
        return;
    }

    // --- 3. INITIALIZE THREE.JS ---
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.02);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Append Canvas
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.0;

    // --- 4. CREATE SCENE CONTENT ---

    // Particles
    const particleCount = 4000;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    const colorHealthy = new THREE.Color(0xffffff); // White
    const colorActive = new THREE.Color(0x94a3b8); // Slate 400
    const colorCore = new THREE.Color(0x475569);   // Slate 600

    for (let i = 0; i < particleCount; i++) {
        let u = Math.random();
        let v = Math.random();
        let theta = 2 * Math.PI * u;
        let phi = Math.acos(2 * v - 1);
        let r = Math.pow(Math.random(), 0.4);

        let x = r * Math.sin(phi) * Math.cos(theta);
        let y = r * Math.sin(phi) * Math.sin(theta);
        let z = r * Math.cos(phi);

        // Shaping
        let side = x > 0 ? 1 : -1;
        x = Math.abs(x) * 0.9 + 0.05;
        x *= side;
        y *= 0.95;
        z *= 1.1;

        if (y < -0.5) { y *= 0.7; x *= 0.9; }

        positions.push(x * 2.3, y * 2.3, z * 2.3);

        let c = colorHealthy.clone();
        if (Math.abs(x) < 0.6) c.lerp(colorCore, 0.6);
        if (y > 0.5) c.lerp(colorActive, 0.5);
        colors.push(c.r, c.g, c.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Connecting Lines
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending
    });
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = [];
    // Reduced count for performance
    for (let i = 0; i < 200; i++) {
        const idx1 = Math.floor(Math.random() * particleCount) * 3;
        const idx2 = Math.floor(Math.random() * particleCount) * 3;
        const p1 = new THREE.Vector3(positions[idx1], positions[idx1 + 1], positions[idx1 + 2]);
        const p2 = new THREE.Vector3(positions[idx2], positions[idx2 + 1], positions[idx2 + 2]);
        if (p1.distanceTo(p2) < 1.2) {
            linePositions.push(p1.x, p1.y, p1.z);
            linePositions.push(p2.x, p2.y, p2.z);
        }
    }
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Tumor
    const tumorMeshes = [];

    if (hasTumor) {
        // Handle bounding box list
        let boxes = [];
        if (Array.isArray(bbox)) {
            boxes = bbox;
        } else if (bbox) {
            boxes = [bbox];
        } else {
            boxes = [{ x: 0.5, y: 0.5, w: 0.1, h: 0.1 }];
        }

        const tumorGeo = new THREE.SphereGeometry(0.4, 32, 32);
        const tumorMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthTest: false
        });

        boxes.forEach((box, i) => {
            const mesh = new THREE.Mesh(tumorGeo, tumorMat.clone());
            mesh.renderOrder = 999;

            const cx = box.x + box.w / 2;
            const cy = box.y + box.h / 2;
            const mapX = (cx - 0.5) * 3.5;
            const mapY = -(cy - 0.5) * 3.0; // Y-flip for screen coords
            const mapZ = 0.5 + (i * 0.1);

            mesh.position.set(mapX, mapY, mapZ);

            // Halo
            const halo = new THREE.Mesh(
                new THREE.SphereGeometry(0.6, 32, 32),
                new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.2, depthWrite: false })
            );
            mesh.add(halo);

            // Glitch Particles
            const tGeo = new THREE.BufferGeometry();
            const tPos = [];
            for (let k = 0; k < 300; k++) {
                tPos.push((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5));
            }
            tGeo.setAttribute('position', new THREE.Float32BufferAttribute(tPos, 3));
            const tMat = new THREE.PointsMaterial({ color: 0xffaa00, size: 0.04, transparent: true });
            const tParts = new THREE.Points(tGeo, tMat);
            mesh.add(tParts);

            scene.add(mesh);
            tumorMeshes.push(mesh);
        });
    }

    // --- 5. ANIMATION LOOP ---
    const animate = () => {
        // Validation check inside loop
        if (!document.getElementById(containerId)) {
            // Cancel self if removed from DOM
            cancelAnimationFrame(_brainViewerState[containerId].frameId);
            return;
        }

        const id = requestAnimationFrame(animate);
        if (_brainViewerState[containerId]) {
            _brainViewerState[containerId].frameId = id;
        }

        controls.update();

        const time = Date.now() * 0.001;
        material.size = 0.05 + Math.sin(time * 2) * 0.01;
        lines.material.opacity = 0.15 + Math.sin(time * 3) * 0.05;

        tumorMeshes.forEach((mesh, i) => {
            const offset = i * 2.0;
            const scale = 1.0 + Math.sin((time + offset) * 6) * 0.1;
            mesh.scale.set(scale, scale, scale);
            if (mesh.children.length > 0) {
                mesh.children[0].material.opacity = 0.3 + Math.sin((time + offset) * 6) * 0.15;
            }
        });

        renderer.render(scene, camera);
    };

    // Start
    const frameId = requestAnimationFrame(animate);

    // Save State
    _brainViewerState[containerId] = {
        frameId: frameId,
        renderer: renderer,
        scene: scene,
        controls: controls,
        resizeObserver: null // Not needed now, but good for window resizing
    };

    // Handle Window Resize (Global)
    const onWindowResize = () => {
        if (!document.getElementById(containerId)) return;
        const newW = container.offsetWidth;
        const newH = container.offsetHeight;
        if (newW > 0 && newH > 0) {
            camera.aspect = newW / newH;
            camera.updateProjectionMatrix();
            renderer.setSize(newW, newH);
        }
    };
    window.addEventListener('resize', onWindowResize);
}

// Expose to window
window.init3DViewer = init3DViewer;
