import * as THREE from 'three';

class CameraController {
    constructor(camera, renderer) {
        this.camera = camera;
        this.renderer = renderer;
        this.controls = null;
        this.isMoving = false;
        this.setupControls();
    }

    setupControls() {
        // Спроба використати OrbitControls з CDN або локальної установки
        try {
            // Перевіряємо чи є OrbitControls доступні
            if (window.THREE && window.THREE.OrbitControls) {
                this.controls = new window.THREE.OrbitControls(this.camera, this.renderer.domElement);
            } else {
                // Завантажуємо OrbitControls динамічно
                this.loadOrbitControls();
            }
        } catch (error) {
            console.warn('OrbitControls not available, using basic controls');
            this.createBasicControls();
        }
    }

    async loadOrbitControls() {
        try {
            // Додаємо OrbitControls через CDN
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js';
            script.onload = () => {
                if (window.THREE && window.THREE.OrbitControls) {
                    this.controls = new window.THREE.OrbitControls(this.camera, this.renderer.domElement);
                    this.setupOrbitControls();
                } else {
                    this.createBasicControls();
                }
            };
            script.onerror = () => {
                console.warn('Failed to load OrbitControls from CDN');
                this.createBasicControls();
            };
            document.head.appendChild(script);
        } catch (error) {
            this.createBasicControls();
        }
    }

    setupOrbitControls() {
        if (this.controls && this.controls.enableDamping !== undefined) {
            // Налаштування для природного управління
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.enableZoom = true;
            this.controls.enableRotate = true;
            this.controls.enablePan = true;

            // Обмеження відстані
            this.controls.maxDistance = 500;
            this.controls.minDistance = 10;

            // Налаштування швидкості
            this.controls.rotateSpeed = 1.0;
            this.controls.zoomSpeed = 1.2;
            this.controls.panSpeed = 0.8;

            // Інвертуємо управління для природного відчуття
            this.controls.mouseButtons = {
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN
            };

            // Налаштування для правильного напрямку обертання
            this.controls.screenSpacePanning = false;
            this.controls.minPolarAngle = 0; // radians
            this.controls.maxPolarAngle = Math.PI; // radians
        }
    }

    createBasicControls() {
        // Створюємо власні базові контроли
        this.controls = {
            enabled: true,
            enableZoom: true,
            enableRotate: true,
            enablePan: true,
            target: new THREE.Vector3(0, 0, 0),
            update: () => {},
            dispose: () => {}
        };

        // Додаємо базову функціональність миші
        this.setupBasicMouseControls();
    }

    setupBasicMouseControls() {
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;
        let phi = Math.PI / 2; // Початковий кут
        let theta = 0;
        const radius = this.camera.position.length();

        const onMouseDown = (event) => {
            if (!this.controls.enabled) return;
            isMouseDown = true;
            mouseX = event.clientX;
            mouseY = event.clientY;
        };

        const onMouseMove = (event) => {
            if (!isMouseDown || !this.controls.enabled) return;

            const deltaX = event.clientX - mouseX;
            const deltaY = event.clientY - mouseY;

            // Виправляємо напрямки - тепер все працює природно
            theta += deltaX * 0.01;  // Змінили з -= на +=
            phi -= deltaY * 0.01;    // Змінили з += на -=

            // Обмежуємо вертикальний кут
            phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);

            this.camera.position.set(x, y, z);
            this.camera.lookAt(this.controls.target);

            mouseX = event.clientX;
            mouseY = event.clientY;
        };

        const onMouseUp = () => {
            isMouseDown = false;
        };

        const onWheel = (event) => {
            if (!this.controls.enabled || !this.controls.enableZoom) return;

            // Виправляємо зум - тепер колесо вперед наближає
            const scale = event.deltaY > 0 ? 1.1 : 0.9;
            this.camera.position.multiplyScalar(scale);

            // Обмежуємо відстань
            const distance = this.camera.position.length();
            if (distance > 500) {
                this.camera.position.normalize().multiplyScalar(500);
            } else if (distance < 10) {
                this.camera.position.normalize().multiplyScalar(10);
            }
        };

        this.renderer.domElement.addEventListener('mousedown', onMouseDown);
        this.renderer.domElement.addEventListener('mousemove', onMouseMove);
        this.renderer.domElement.addEventListener('mouseup', onMouseUp);
        this.renderer.domElement.addEventListener('wheel', onWheel);

        // Зберігаємо посилання для cleanup
        this.mouseControls = {
            onMouseDown,
            onMouseMove,
            onMouseUp,
            onWheel
        };
    }

    switchView(mode, cameraPositions) {
        if (!cameraPositions || !cameraPositions[mode]) {
            console.error(`Camera position for mode "${mode}" not found`);
            return;
        }

        this.isMoving = true;
        const targetPosition = new THREE.Vector3(...cameraPositions[mode].position);
        const targetRotation = new THREE.Euler(...cameraPositions[mode].rotation);

        const currentPosition = {
            position: this.camera.position.clone(),
            rotation: this.camera.rotation.clone()
        };

        const duration = 1000;
        const startTime = Date.now();

        if (this.controls) {
            this.controls.enabled = false;
        }

        const animateCamera = () => {
            if (!this.isMoving) {
                if (this.controls) {
                    this.controls.enabled = mode === '3d';
                }
                return;
            }

            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const ease = progress * (2 - progress);

            this.camera.position.lerpVectors(currentPosition.position, targetPosition, ease);
            this.camera.rotation.x = THREE.MathUtils.lerp(currentPosition.rotation.x, targetRotation.x, ease);
            this.camera.rotation.y = THREE.MathUtils.lerp(currentPosition.rotation.y, targetRotation.y, ease);
            this.camera.rotation.z = THREE.MathUtils.lerp(currentPosition.rotation.z, targetRotation.z, ease);

            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            } else {
                this.isMoving = false;
                if (this.controls) {
                    this.controls.enabled = mode === '3d';
                    if (this.controls.update) this.controls.update();
                }
            }
        };

        animateCamera();
    }

    moveToObject(object) {
        if (!object) return;

        if (this.isMoving) {
            this.isMoving = false;
            return;
        }

        this.isMoving = true;
        const objectRadius = object.geometry.parameters.radius;
        const distance = objectRadius * 8;
        const offset = new THREE.Vector3(distance, distance * 0.5, distance);

        const duration = 1500;
        const startCameraPos = this.camera.position.clone();
        const startTime = Date.now();

        if (this.controls) {
            this.controls.enabled = false;
        }

        const animate = () => {
            if (!this.isMoving) {
                this.isMoving = false;
                if (this.controls) {
                    this.controls.enabled = true;
                }
                return;
            }

            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const ease = progress * (2 - progress);

            const worldPosition = new THREE.Vector3();
            object.getWorldPosition(worldPosition);

            const currentTargetPosition = new THREE.Vector3()
                .copy(worldPosition)
                .add(offset);

            this.camera.position.lerpVectors(startCameraPos, currentTargetPosition, ease);
            this.camera.lookAt(worldPosition);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isMoving = false;
                if (this.controls) {
                    this.controls.enabled = true;
                    if (this.controls.target) {
                        this.controls.target.copy(worldPosition);
                    }
                    if (this.controls.update) this.controls.update();
                }
            }
        };

        animate();
    }

    update() {
        if (this.controls && this.controls.update) {
            this.controls.update();
        }
    }

    dispose() {
        if (this.controls && this.controls.dispose) {
            this.controls.dispose();
        }

        // Очищуємо базові контроли миші якщо вони є
        if (this.mouseControls) {
            const element = this.renderer.domElement;
            element.removeEventListener('mousedown', this.mouseControls.onMouseDown);
            element.removeEventListener('mousemove', this.mouseControls.onMouseMove);
            element.removeEventListener('mouseup', this.mouseControls.onMouseUp);
            element.removeEventListener('wheel', this.mouseControls.onWheel);
        }
    }
}

export default CameraController;