import * as THREE from 'three';

class Planet {
    constructor(scene, planetData) {
        this.scene = scene;
        this.planetData = planetData;
        this.planet = null;
        this.planetOrbit = null;
        this.ring = null;
        this.orbitRing = null; // Додаємо окрему референс для орбітального кільця

        this.createPlanet();
    }

    createPlanet() {
        const { radius, texture, bumpMap, bumpScale, position, isSun, ring, name } = this.planetData;

        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const loader = new THREE.TextureLoader();

        const material = isSun
            ? new THREE.MeshBasicMaterial({ map: loader.load(texture) })
            : new THREE.MeshStandardMaterial({
                map: loader.load(texture),
                bumpMap: loader.load(bumpMap),
                bumpScale: bumpScale,
            });

        this.planet = new THREE.Mesh(geometry, material);
        this.planet.position.set(...position);
        this.planet.userData.planetName = name;

        this.planetOrbit = new THREE.Object3D();
        this.planetOrbit.add(this.planet);

        // Create orbit ring - виправлено для центрування навколо Сонця
        this.createOrbitRing(position);

        // Add ring if exists
        if (ring) {
            this.createPlanetRing(ring, position);
        }

        this.scene.add(this.planetOrbit);
    }

    createOrbitRing(position) {
        // Не створюємо орбіту для Сонця
        if (position[0] === 0 && position[1] === 0 && position[2] === 0) return;

        // Обчислюємо радіус орбіти відносно центру (0,0,0)
        const orbitRadius = Math.sqrt(position[0] * position[0] + position[2] * position[2]);

        const orbitGeometry = new THREE.RingGeometry(orbitRadius - 0.2, orbitRadius + 0.2, 128);
        const orbitMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            opacity: 0.08,
            transparent: true
        });
        this.orbitRing = new THREE.Mesh(orbitGeometry, orbitMaterial);
        this.orbitRing.rotation.x = Math.PI / 2; // Горизонтально
        this.orbitRing.position.set(0, 0, 0); // Центруємо навколо Сонця

        // Додаємо орбіту безпосередньо до сцени, а не до planetOrbit
        this.scene.add(this.orbitRing);
    }

    createPlanetRing(ringData, position) {
        const loader = new THREE.TextureLoader();
        const ringGeometry = new THREE.RingGeometry(ringData.innerRadius, ringData.outerRadius, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({
            map: loader.load(ringData.texture),
            side: THREE.DoubleSide,
            transparent: true,
            color: new THREE.Color(0x666666)
        });

        this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ring.rotation.x = ringData.texture.includes('uranus') ? 0 : Math.PI / 2;
        this.ring.position.set(...position);
        this.planetOrbit.add(this.ring);
    }

    animate(speed) {
        if (this.planetOrbit && this.planetData.orbitSpeed) {
            this.planetOrbit.rotateY(this.planetData.orbitSpeed * speed);
        }
    }

    getPlanetMesh() {
        return this.planet;
    }

    getOrbitRing() {
        return this.orbitRing;
    }

    getName() {
        return this.planetData.name;
    }

    dispose() {
        if (this.planetOrbit) {
            this.scene.remove(this.planetOrbit);
        }
        if (this.orbitRing) {
            this.scene.remove(this.orbitRing);
        }
    }
}

export default Planet;