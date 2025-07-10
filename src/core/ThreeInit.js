import * as THREE from 'three';

class ThreeInit {
    constructor(mountRef) {
        this.mountRef = mountRef;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = null;
        this.mouse = null;
    }

    init() {
        const width = this.mountRef.current.clientWidth;
        const height = this.mountRef.current.clientHeight;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 300, 0);
        this.camera.rotation.set(-Math.PI / 2, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.mountRef.current.appendChild(this.renderer.domElement);

        // Raycaster for clicks
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Lighting
        const sunLight = new THREE.PointLight(0xffffff, 10000, 300);
        sunLight.position.set(0, 0, 0);
        this.scene.add(sunLight);

        // Create starfield
        this.createStarfield();

        return {
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer,
            raycaster: this.raycaster,
            mouse: this.mouse
        };
    }

    createStarfield() {
        const stars = new THREE.BufferGeometry();
        const starPositions = [];
        const starColors = [];

        for (let i = 0; i < 5000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            starPositions.push(x, y, z);

            const color = new THREE.Color();
            color.setHSL(Math.random(), 0.5, 0.5);
            starColors.push(color.r, color.g, color.b);
        }

        stars.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        stars.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

        const starMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        const starField = new THREE.Points(stars, starMaterial);
        this.scene.add(starField);
    }

    handleResize() {
        const width = this.mountRef.current.clientWidth;
        const height = this.mountRef.current.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.mountRef.current && this.renderer) {
            this.mountRef.current.removeChild(this.renderer.domElement);
        }
    }
}

export default ThreeInit;