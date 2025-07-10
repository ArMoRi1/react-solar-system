import * as THREE from 'three';
import Planet from './Planet';

class PlanetUtils {
    constructor(scene) {
        this.scene = scene;
        this.planets = [];
        this.planetInstances = [];
        this.asteroidBelt = null;
    }

    createAsteroid(position, radius) {
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const asteroid = new THREE.Mesh(geometry, material);
        asteroid.position.set(...position);
        return asteroid;
    }

    createAsteroidBelt(innerRadius, outerRadius, numAsteroids) {
        const asteroidBelt = new THREE.Object3D();
        for (let i = 0; i < numAsteroids; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const distance = innerRadius + Math.random() * (outerRadius - innerRadius);
            const x = distance * Math.cos(angle);
            const z = distance * Math.sin(angle);
            const y = (Math.random() - 0.5) * 2;
            const asteroid = this.createAsteroid([x, y, z], Math.random() * 0.3 + 0.1);
            asteroidBelt.add(asteroid);
        }
        this.scene.add(asteroidBelt);
        this.asteroidBelt = asteroidBelt;
        return asteroidBelt;
    }

    createPlanetsFromData(planetsData) {
        planetsData.forEach(planetData => {
            const planet = new Planet(this.scene, planetData);
            this.planetInstances.push(planet);
            this.planets.push(planet.getPlanetMesh());
        });
    }

    animatePlanets(speed) {
        this.planetInstances.forEach(planet => {
            planet.animate(speed);
        });

        if (this.asteroidBelt) {
            this.asteroidBelt.rotateY(0.0005 * speed);
        }
    }

    getPlanetByName(name) {
        const planetInstance = this.planetInstances.find(planet => planet.getName() === name);
        return planetInstance ? planetInstance.getPlanetMesh() : null;
    }

    getAllPlanets() {
        return this.planets;
    }

    dispose() {
        this.planetInstances.forEach(planet => {
            planet.dispose();
        });
        this.planetInstances = [];
        this.planets = [];

        if (this.asteroidBelt) {
            this.scene.remove(this.asteroidBelt);
            this.asteroidBelt = null;
        }
    }
}

export default PlanetUtils;