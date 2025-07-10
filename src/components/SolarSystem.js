import React, { Component } from 'react';
import * as THREE from 'three';

class SolarSystem extends Component {
    componentDidMount() {
        // 1. Сцена
        this.scene = new THREE.Scene();

        // 2. Камера
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.mount.clientWidth / this.mount.clientHeight,
            0.1,
            1000
        );
        this.camera.position.z = 50;

        // 3. Рендерер
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.mount.clientWidth, this.mount.clientHeight);
        this.mount.appendChild(this.renderer.domElement);

        // 4. Додати базове світло
        const light = new THREE.PointLight(0xffffff, 1);
        light.position.set(0, 0, 0);
        this.scene.add(light);

        // 5. Сфера (тимчасова замість Сонця або планети)
        const geometry = new THREE.SphereGeometry(5, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const sun = new THREE.Mesh(geometry, material);
        this.scene.add(sun);

        // 6. Запустити анімацію
        this.animate();
    }

    componentWillUnmount() {
        cancelAnimationFrame(this.frameId);
        this.renderer.dispose();
    }

    animate = () => {
        this.frameId = requestAnimationFrame(this.animate);
        this.renderer.render(this.scene, this.camera);
    };

    render() {
        return (
            <div
                ref={(ref) => (this.mount = ref)}
                style={{ width: '100vw', height: '100vh' }}
            />
        );
    }
}

export default SolarSystem;
