// --- AUDIO MANAGER ---
const audioManager = {
    ctx: null, masterGain: null, bgOsc: [], isPlaying: false, melodyInterval: null,
    init: function() {
        if(this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime); 
        this.playAmbience();
        this.isPlaying = true;
        this.updateIcon();
    },
    toggle: function() {
        if(!this.ctx) { this.init(); return; }
        if(this.ctx.state === 'suspended') {
            this.ctx.resume(); this.isPlaying = true;
            if(!this.melodyInterval) this.playAmbience();
        } else if(this.isPlaying) {
            this.masterGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
            this.isPlaying = false;
            clearInterval(this.melodyInterval);
            this.melodyInterval = null;
        } else {
            this.masterGain.gain.exponentialRampToValueAtTime(0.3, this.ctx.currentTime + 0.5);
            this.isPlaying = true;
            if(!this.melodyInterval) this.playAmbience();
        }
        this.updateIcon();
    },
    updateIcon: function() {
        const btn = document.getElementById('audio-toggle');
        const icon = document.getElementById('audio-icon');
        if(this.isPlaying) {
            btn.classList.add('is-playing');
            icon.setAttribute('data-lucide', 'volume-2');
        } else {
            btn.classList.remove('is-playing');
            icon.setAttribute('data-lucide', 'volume-x');
        }
        lucide.createIcons();
    },
    playClick: function() {
        if(!this.ctx || !this.isPlaying) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.masterGain);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
        osc.start(); osc.stop(this.ctx.currentTime + 0.05);
    },
    playAmbience: function() {
        const padNotes = [130.81, 164.81, 196.00, 246.94, 293.66]; 
        this.bgOsc = [];
        padNotes.forEach(f => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain); gain.connect(this.masterGain);
            osc.type = 'sine'; osc.frequency.value = f;
            osc.detune.value = (Math.random() - 0.5) * 4;
            const lfo = this.ctx.createOscillator();
            lfo.frequency.value = 0.1 + Math.random() * 0.1; 
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 0.02; 
            lfo.connect(lfoGain); lfoGain.connect(gain.gain);
            lfo.start();
            gain.gain.value = 0.03; 
            osc.start(); this.bgOsc.push(osc); 
        });
        if(this.melodyInterval) clearInterval(this.melodyInterval);
        this.melodyInterval = setInterval(() => {
            if(!this.isPlaying) return;
            this.playSweetNote();
        }, 2000 + Math.random() * 3000); 
    },
    playSweetNote: function() {
        if(!this.ctx) return;
        const scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; 
        const note = scale[Math.floor(Math.random() * scale.length)];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.masterGain);
        osc.type = 'sine'; osc.frequency.value = note;
        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.1); 
        gain.gain.exponentialRampToValueAtTime(0.001, now + 4.0); 
        osc.start(now); osc.stop(now + 4.0);
    }
};

// --- THREE JS ---
const threeJS = {
    scene: null, camera: null, renderer: null, mesh: null,
    targetRotationX: 0, targetRotationY: 0,
    init: function(shapeType = 'torus') {
        const container = document.getElementById('canvas-container');
        if(!container) return; // Skip if no canvas on this page

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);
        this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.z = 6;
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        container.addEventListener('mousemove', (e) => {
            const rect = container.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            this.targetRotationY = x * 0.5; 
            this.targetRotationX = y * 0.5; 
        });
        
        container.addEventListener('mouseleave', () => {
            this.targetRotationX = 0; this.targetRotationY = 0;
        });

        this.updateShape(shapeType);
        this.animate();
        new ResizeObserver(() => this.resize()).observe(container);
    },
    resize: function() {
        const container = document.getElementById('canvas-container');
        if (!container || !this.renderer) return;
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
    },
    updateShape: function(type) {
        if(this.mesh) this.scene.remove(this.mesh);
        let geo;
        if(type === 'sphere') geo = new THREE.SphereGeometry(1.2, 16, 16);
        else if(type === 'cone') geo = new THREE.ConeGeometry(1, 2, 16);
        else if(type === 'icosahedron') geo = new THREE.IcosahedronGeometry(1.3, 0);
        else geo = new THREE.TorusKnotGeometry(1.0, 0.3, 100, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.15 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.scene.add(this.mesh);
    },
    animate: function() {
        requestAnimationFrame(this.animate.bind(this));
        if(this.mesh) {
            this.mesh.rotation.x += 0.005;
            this.mesh.rotation.y += 0.005;
            this.mesh.rotation.x += 0.05 * (this.targetRotationX - this.mesh.rotation.x * 0.1); 
            this.mesh.rotation.y += 0.05 * (this.targetRotationY - this.mesh.rotation.y * 0.1);
        }
        this.renderer.render(this.scene, this.camera);
    }
};

// --- MODAL & UI LOGIC ---
const app = {
    openModal: function(title, desc, tag, year, img) {
        audioManager.playClick();
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-desc').textContent = desc;
        document.getElementById('modal-tag').textContent = tag;
        document.getElementById('modal-year').textContent = year;
        document.getElementById('modal-img').src = img;
        document.getElementById('project-modal').classList.remove('hide');
    },
    closeModal: function() {
        audioManager.playClick();
        document.getElementById('project-modal').classList.add('hide');
    }
};

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    
    // Audio initializers
    document.addEventListener('click', () => {
        if(!audioManager.ctx) audioManager.init();
    }, { once: true });

    document.querySelectorAll('a, button, .sidebar-link, .project-card').forEach(el => {
        el.addEventListener('click', () => audioManager.playClick());
    });

    // Scroll Spy for Wiki Layout
    window.addEventListener('scroll', () => {
        const sections = ['intro', 'biography', 'projects', 'references'];
        const navLinks = document.querySelectorAll('.sidebar-link');
        let current = '';
        sections.forEach(section => {
            const element = document.getElementById(section);
            if (element && scrollY >= element.offsetTop - 150) {
                current = section;
            }
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') && link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    });
});