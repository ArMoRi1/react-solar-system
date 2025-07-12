import * as THREE from 'three';
import Planet from './Planet';

class PlanetUtils {
    constructor(scene) {
        this.scene = scene;
        this.planets = [];
        this.planetInstances = [];
        this.asteroidBelt = null;
        this.originalMaterials = new Map();
        this.focusedPlanet = null;
        this.invisibleClickPlane = null;
        this.orbitsVisible = true; // Додаємо стан для орбіт
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

        // Створюємо невидиму площину для детекції кліків поза планетами
        this.createInvisibleClickPlane();
    }

    createInvisibleClickPlane() {
        // Велика невидима площина для ловлення кліків поза планетами
        const geometry = new THREE.PlaneGeometry(2000, 2000);
        const material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
        this.invisibleClickPlane = new THREE.Mesh(geometry, material);
        this.invisibleClickPlane.position.set(0, 0, -500); // Позаду всіх об'єктів
        this.invisibleClickPlane.userData.isClickPlane = true;
        this.scene.add(this.invisibleClickPlane);
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
        // Повертаємо планети + невидиму площину для raycaster
        const allObjects = [...this.planets];
        if (this.invisibleClickPlane && this.focusedPlanet) {
            allObjects.push(this.invisibleClickPlane);
        }
        return allObjects;
    }

    // Нова функція для перемикання видимості орбіт
    toggleOrbits(visible) {
        this.orbitsVisible = visible;
        this.planetInstances.forEach(planetInstance => {
            const orbitRing = planetInstance.getOrbitRing();
            if (orbitRing) {
                orbitRing.visible = visible;
            }
        });
    }

    // Функція для повної ізоляції планети
    focusOnPlanet(selectedPlanetName) {
        this.focusedPlanet = selectedPlanetName;

        this.planetInstances.forEach(planetInstance => {
            const planetMesh = planetInstance.getPlanetMesh();
            const planetName = planetInstance.getName();
            const orbitRing = planetInstance.getOrbitRing();

            if (planetName !== selectedPlanetName) {
                // Повністю ховаємо інші планети
                planetMesh.visible = false;

                // Ховаємо орбіти інших планет
                if (orbitRing) {
                    orbitRing.visible = false;
                }

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

                // Показуємо орбіту обраної планети тільки якщо орбіти включені
                if (orbitRing) {
                    orbitRing.visible = this.orbitsVisible;
                }

                // Її кільця теж видимі (для Сатурна/Урана)
                if (planetInstance.planetOrbit) {
                    planetInstance.planetOrbit.children.forEach(child => {
                        if (child !== planetMesh && child.material) {
                            // Показуємо кільця планети
                            if (child.geometry && child.geometry.type === 'RingGeometry') {
                                if (child.material.map) { // Має текстуру = кільце планети
                                    child.visible = true;
                                } else { // Немає текстури = орбітальна лінія (не використовується більше)
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

        // Показуємо невидиму площину для кліків
        if (this.invisibleClickPlane) {
            this.invisibleClickPlane.visible = true;
        }
    }

    // Функція для показу всіх планет назад
    showAllPlanets() {
        this.focusedPlanet = null;

        this.planetInstances.forEach(planetInstance => {
            const planetMesh = planetInstance.getPlanetMesh();
            const orbitRing = planetInstance.getOrbitRing();

            // Відновлюємо видимість всіх планет
            planetMesh.visible = true;

            // Відновлюємо видимість орбіт згідно з поточним станом
            if (orbitRing) {
                orbitRing.visible = this.orbitsVisible;
            }

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

        // Ховаємо невидиму площину
        if (this.invisibleClickPlane) {
            this.invisibleClickPlane.visible = false;
        }
    }

    // Перевіряємо, чи є планета в фокусі
    isFocused() {
        return this.focusedPlanet !== null;
    }

    getFocusedPlanet() {
        return this.focusedPlanet;
    }

    getOrbitsVisible() {
        return this.orbitsVisible;
    }

    dispose() {
        this.planetInstances.forEach(planet => {
            planet.dispose();
        });
        this.planetInstances = [];
        this.planets = [];
        this.originalMaterials.clear();
        this.focusedPlanet = null;

        if (this.asteroidBelt) {
            this.scene.remove(this.asteroidBelt);
            this.asteroidBelt = null;
        }

        if (this.invisibleClickPlane) {
            this.scene.remove(this.invisibleClickPlane);
            this.invisibleClickPlane = null;
        }
    }
}

export default PlanetUtils;