import * as THREE from 'three';

class CameraController {
    constructor(camera, renderer) {
        this.camera = camera;
        this.renderer = renderer;
        this.controls = null;
        this.isMovingCamera = false;
        this.setupControls();

        // Встановлюємо початкову ціль
        this.controls.target.set(0, 0, 0);
        this.camera.lookAt(this.controls.target);
    }

    setupControls() {
        // Створюємо власні контроли, що імітують поведінку OrbitControls
        this.controls = {
            enabled: false, // Початково вимкнені (для 2D режиму)
            enableZoom: true,
            zoomSpeed: 5,
            minDistance: 5,
            maxDistance: 500,
            target: new THREE.Vector3(0, 0, 0),
            update: () => {},
            dispose: () => {}
        };

        // Додаємо контроли миші
        this.setupMouseControls();
    }

    setupMouseControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        const spherical = new THREE.Spherical();
        spherical.setFromVector3(this.camera.position.clone().sub(this.controls.target));

        const onMouseDown = (event) => {
            if (!this.controls.enabled) return;
            isDragging = true;
            previousMousePosition = { x: event.clientX, y: event.clientY };
        };

        const onMouseMove = (event) => {
            if (!isDragging || !this.controls.enabled) return;

            const deltaMove = {
                x: event.clientX - previousMousePosition.x,
                y: event.clientY - previousMousePosition.y
            };

            // Виправляємо напрямки для природного управління
            const deltaRotationQuaternion = new THREE.Quaternion()
                .setFromEuler(new THREE.Euler(
                    -deltaMove.y * 0.01,  // Змінили знак для вертикального руху
                    -deltaMove.x * 0.01,  // Змінили знак для горизонтального руху
                    0,
                    'XYZ'
                ));

            const currentPosition = this.camera.position.clone().sub(this.controls.target);
            currentPosition.applyQuaternion(deltaRotationQuaternion);

            // Обмежуємо відстань
            const distance = currentPosition.length();
            if (distance > this.controls.maxDistance) {
                currentPosition.normalize().multiplyScalar(this.controls.maxDistance);
            } else if (distance < this.controls.minDistance) {
                currentPosition.normalize().multiplyScalar(this.controls.minDistance);
            }

            this.camera.position.copy(this.controls.target).add(currentPosition);
            this.camera.lookAt(this.controls.target);

            previousMousePosition = { x: event.clientX, y: event.clientY };
        };

        const onMouseUp = () => {
            isDragging = false;
        };

        const onWheel = (event) => {
            if (!this.controls.enabled || !this.controls.enableZoom) return;

            event.preventDefault();

            // Виправляємо зум - колесо вперед наближає
            const scale = event.deltaY > 0 ? 1.1 : 0.9;
            const direction = this.camera.position.clone().sub(this.controls.target);
            direction.multiplyScalar(scale);

            // Обмежуємо відстань
            const distance = direction.length();
            if (distance > this.controls.maxDistance) {
                direction.normalize().multiplyScalar(this.controls.maxDistance);
            } else if (distance < this.controls.minDistance) {
                direction.normalize().multiplyScalar(this.controls.minDistance);
            }

            this.camera.position.copy(this.controls.target).add(direction);
        };

        this.renderer.domElement.addEventListener('mousedown', onMouseDown);
        this.renderer.domElement.addEventListener('mousemove', onMouseMove);
        this.renderer.domElement.addEventListener('mouseup', onMouseUp);
        this.renderer.domElement.addEventListener('wheel', onWheel);

        // Зберігаємо для cleanup
        this.mouseEvents = { onMouseDown, onMouseMove, onMouseUp, onWheel };
    }

    // Точна копія switchView з оригіналу
    switchView(mode, cameraPositions) {
        if (!cameraPositions || !cameraPositions[mode]) {
            console.error(`Camera position for mode "${mode}" not found`);
            return;
        }

        this.isMovingCamera = true;
        const targetPosition = new THREE.Vector3(...cameraPositions[mode].position);
        const targetRotation = new THREE.Euler(...cameraPositions[mode].rotation);

        // Create current position point (точно як в оригіналі)
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
            if (!this.isMovingCamera) {
                // Вмикаємо controls тільки для 3D режиму (як в оригіналі)
                if (this.controls) {
                    this.controls.enabled = mode === '3d';
                }
                return;
            }

            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const ease = progress * (2 - progress); // Ease function for smoother transition

            // Interpolate position (точно як в оригіналі)
            this.camera.position.lerpVectors(currentPosition.position, targetPosition, ease);

            // Interpolate rotation (angles in Euler) (точно як в оригіналі)
            this.camera.rotation.x = THREE.MathUtils.lerp(currentPosition.rotation.x, targetRotation.x, ease);
            this.camera.rotation.y = THREE.MathUtils.lerp(currentPosition.rotation.y, targetRotation.y, ease);
            this.camera.rotation.z = THREE.MathUtils.lerp(currentPosition.rotation.z, targetRotation.z, ease);

            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            } else {
                this.isMovingCamera = false;
                // Вмикаємо controls тільки для 3D режиму (як в оригіналі)
                if (this.controls) {
                    this.controls.enabled = mode === '3d';
                    if (this.controls.update) this.controls.update();
                }
            }
        };

        animateCamera();
    }

    // Оновлений moveToObject для центрування об'єкта з урахуванням інтерфейсу
    moveToObject(object, stopAnimation = true) {
        if (!object) return;

        // Зупиняємо анімацію як в оригіналі
        if (stopAnimation && window.setAnimationRunning) {
            window.setAnimationRunning(false);
        }

        if (this.isMovingCamera) {
            this.isMovingCamera = false;
            return;
        }

        this.isMovingCamera = true;
        const objectRadius = object.geometry.parameters.radius;

        // Розраховуємо позицію камери з урахуванням перекриття інформаційною панеллю
        const distance = objectRadius * 4;

        // Зміщуємо камеру так, щоб об'єкт був зліва від центру сцени
        // Це компенсує перекриття інформаційною панеллю справа
        const offset = new THREE.Vector3(distance * 1.3, distance * 0.3, distance * 1.1);

        const duration = 1500;
        const startCameraPos = this.camera.position.clone();
        const startTime = Date.now();

        if (this.controls) {
            this.controls.enabled = false;
        }

        const animate = () => {
            if (!this.isMovingCamera) {
                this.isMovingCamera = false;
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

            // Зміщуємо позицію камери, щоб об'єкт був лівіше від центру
            const targetCameraPosition = new THREE.Vector3()
                .copy(worldPosition)
                .add(offset);

            // Створюємо точку, на яку дивиться камера (трохи лівіше від об'єкта)
            const lookAtTarget = new THREE.Vector3()
                .copy(worldPosition)
                .add(new THREE.Vector3(-objectRadius * 0.8, 0, 0)); // Зміщуємо точку фокусу лівіше

            this.camera.position.lerpVectors(startCameraPos, targetCameraPosition, ease);
            this.camera.lookAt(lookAtTarget); // Дивимося на зміщену точку

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isMovingCamera = false;
                if (this.controls) {
                    this.controls.enabled = true;
                    if (this.controls.target) {
                        this.controls.target.copy(lookAtTarget);
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

        // Очищуємо event listeners
        if (this.mouseEvents) {
            const element = this.renderer.domElement;
            element.removeEventListener('mousedown', this.mouseEvents.onMouseDown);
            element.removeEventListener('mousemove', this.mouseEvents.onMouseMove);
            element.removeEventListener('mouseup', this.mouseEvents.onMouseUp);
            element.removeEventListener('wheel', this.mouseEvents.onWheel);
        }
    }
}

export default CameraController;