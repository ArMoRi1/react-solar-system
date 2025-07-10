import * as THREE from 'three';

class Planet {
    constructor(scene, planetData) {
        this.scene = scene;
        this.planetData = planetData;
        this.planet = null;
        this.planetOrbit = null;
        this.ring = null;

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

        // Create orbit ring
        this.createOrbitRing(position[0]);

        // Add ring if exists
        if (ring) {
            this.createPlanetRing(ring, position);
        }

        this.scene.add(this.planetOrbit);
    }

    createOrbitRing(orbitRadius) {
        if (orbitRadius === 0) return; // Don't create orbit for Sun

        const orbitGeometry = new THREE.RingGeometry(orbitRadius - 0.5, orbitRadius + 0.5, 64);
        const orbitMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            opacity: 0.05,
            transparent: true
        });
        const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbit.rotation.x = Math.PI / 2;
        this.planetOrbit.add(orbit);
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

    getName() {
        return this.planetData.name;
    }

    dispose() {
        if (this.planetOrbit) {
            this.scene.remove(this.planetOrbit);
        }
    }
}

export default Planet;