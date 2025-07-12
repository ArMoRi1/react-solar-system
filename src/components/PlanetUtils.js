import * as THREE from 'three';
import Planet from './Planet';

class PlanetUtils {
    constructor(scene) {
        this.scene = scene;
        this.planets = [];
        this.planetInstances = [];
        this.asteroidBelt = null;
        this.originalMaterials = new Map(); // Зберігаємо оригінальні матеріали
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

            // Зберігаємо оригінальний матеріал
            const planetMesh = planet.getPlanetMesh();
            this.originalMaterials.set(planetMesh, planetMesh.material.clone());
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
        // Повертаємо тільки видимі планети для raycaster
        return this.planets.filter(planet => planet.visible);
    }

    // Нова функція для фокусування на планеті
    focusOnPlanet(selectedPlanetName) {
        this.planetInstances.forEach(planetInstance => {
            const planetMesh = planetInstance.getPlanetMesh();
            const planetName = planetInstance.getName();

            if (planetName !== selectedPlanetName) {
                // Повністю ховаємо інші планети
                planetMesh.visible = false;

                // Також ховаємо все орбітальне оточення інших планет
                if (planetInstance.planetOrbit) {
                    planetInstance.planetOrbit.children.forEach(child => {
                        if (child !== planetMesh) {
                            child.visible = false;
                        }
                    });
                }
            } else {
                // Обрана планета повністю видима
                planetMesh.visible = true;

                // Її кільця теж видимі (для Сатурна/Урана)
                if (planetInstance.planetOrbit) {
                    planetInstance.planetOrbit.children.forEach(child => {
                        if (child !== planetMesh && child.material) {
                            // Показуємо кільця планети, але ховаємо орбітальні лінії
                            if (child.geometry && child.geometry.type === 'RingGeometry') {
                                // Це кільце планети (Сатурн/Уран) - показуємо
                                if (child.material.map) { // Має текстуру = кільце планети
                                    child.visible = true;
                                } else { // Немає текстури = орбітальна лінія
                                    child.visible = false;
                                }
                            } else {
                                child.visible = false;
                            }
                        }
                    });
                }
            }
        });

        // Повністю ховаємо пояс астероїдів
        if (this.asteroidBelt) {
            this.asteroidBelt.visible = false;
        }
    }

    // Функція для показу всіх планет назад
    showAllPlanets() {
        this.planetInstances.forEach(planetInstance => {
            const planetMesh = planetInstance.getPlanetMesh();

            // Відновлюємо видимість всіх планет
            planetMesh.visible = true;

            // Відновлюємо видимість орбітальних кілець та інших об'єктів
            if (planetInstance.planetOrbit) {
                planetInstance.planetOrbit.children.forEach(child => {
                    child.visible = true;
                });
            }
        });

        // Відновлюємо пояс астероїдів
        if (this.asteroidBelt) {
            this.asteroidBelt.visible = true;
        }
    }

    dispose() {
        this.planetInstances.forEach(planet => {
            planet.dispose();
        });
        this.planetInstances = [];
        this.planets = [];
        this.originalMaterials.clear();

        if (this.asteroidBelt) {
            this.scene.remove(this.asteroidBelt);
            this.asteroidBelt = null;
        }
    }
}

export default PlanetUtils;