class NasaService {
    constructor() {
        this.apiKey = 'DEMO_KEY'; // Безкоштовний ключ для тестування
        this.baseUrl = 'https://api.nasa.gov';

        // Кешуємо дані щоб не робити багато запитів
        this.cache = new Map();
    }

    async getPlanetInfo(planetName) {
        // Перевіряємо кеш
        if (this.cache.has(planetName)) {
            return this.cache.get(planetName);
        }

        try {
            // Спробуємо отримати APOD (Astronomy Picture of the Day) пов'язане з планетою
            const apodData = await this.getRelatedAPOD(planetName);

            // Додаємо статичні NASA дані як fallback
            const planetData = this.getStaticPlanetData(planetName);

            const combinedData = {
                ...planetData,
                apod: apodData,
                lastUpdated: new Date().toISOString()
            };

            // Кешуємо результат
            this.cache.set(planetName, combinedData);
            return combinedData;

        } catch (error) {
            console.warn(`NASA API error for ${planetName}:`, error);
            // Повертаємо статичні дані як fallback
            const fallbackData = this.getStaticPlanetData(planetName);
            this.cache.set(planetName, fallbackData);
            return fallbackData;
        }
    }

    async getRelatedAPOD(planetName) {
        try {
            // Отримуємо випадкову APOD картинку
            const response = await fetch(
                `${this.baseUrl}/planetary/apod?api_key=${this.apiKey}&count=1`
            );

            if (!response.ok) throw new Error('APOD API failed');

            const data = await response.json();
            return data[0];
        } catch (error) {
            console.warn('APOD API failed:', error);
            return null;
        }
    }

    getStaticPlanetData(planetName) {
        const planetData = {
            Sun: {
                title: "The Sun - Our Star",
                description: "The Sun is a yellow dwarf star, a hot ball of glowing gases at the heart of our solar system. Its gravity holds the solar system together, keeping everything – from the biggest planets to the smallest particles of debris – in its orbit.",
                facts: [
                    "Temperature: 5,778 K (surface), 15 million K (core)",
                    "Age: ~4.6 billion years",
                    "Mass: 333,000 times Earth's mass",
                    "Composition: 73% hydrogen, 25% helium"
                ],
                nasaUrl: "https://science.nasa.gov/sun/",
                imageUrl: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=500&h=300&fit=crop"
            },
            Mercury: {
                title: "Mercury - The Swift Planet",
                description: "Mercury is the smallest planet in our solar system and the closest to the Sun. It has extreme temperature variations and no atmosphere to speak of. A day on Mercury lasts 59 Earth days.",
                facts: [
                    "Distance from Sun: 58 million km",
                    "Day length: 59 Earth days",
                    "Year length: 88 Earth days",
                    "Temperature: -173°C to 427°C"
                ],
                nasaUrl: "https://science.nasa.gov/mercury/",
                imageUrl: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=500&h=300&fit=crop"
            },
            Venus: {
                title: "Venus - Earth's Twin",
                description: "Venus is often called Earth's twin because it's similar in size and mass. However, it has a thick, toxic atmosphere that traps heat in a runaway greenhouse effect, making it the hottest planet in our solar system.",
                facts: [
                    "Surface temperature: 462°C",
                    "Atmospheric pressure: 90x Earth's",
                    "Day length: 243 Earth days (longer than its year!)",
                    "Atmosphere: 96% carbon dioxide"
                ],
                nasaUrl: "https://science.nasa.gov/venus/",
                imageUrl: "https://images.unsplash.com/photo-1614313913007-2b4ae8ce32d6?w=500&h=300&fit=crop"
            },
            Earth: {
                title: "Earth - Our Blue Marble",
                description: "Earth is the only known planet with life. It has liquid water, a protective atmosphere, and a suitable temperature range. Earth's unique combination of features makes it the perfect home for millions of species.",
                facts: [
                    "Age: 4.54 billion years",
                    "Surface: 71% water, 29% land",
                    "Atmosphere: 78% nitrogen, 21% oxygen",
                    "1 Moon: Luna"
                ],
                nasaUrl: "https://science.nasa.gov/earth/",
                imageUrl: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=500&h=300&fit=crop"
            },
            Mars: {
                title: "Mars - The Red Planet",
                description: "Mars is known as the Red Planet because of iron oxide (rust) on its surface. It has the largest volcano in the solar system (Olympus Mons) and evidence suggests it once had flowing water.",
                facts: [
                    "Day length: 24 hours 37 minutes",
                    "2 Moons: Phobos and Deimos",
                    "Largest volcano: Olympus Mons (21 km high)",
                    "Average temperature: -80°F (-62°C)"
                ],
                nasaUrl: "https://science.nasa.gov/mars/",
                imageUrl: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=500&h=300&fit=crop"
            },
            Jupiter: {
                title: "Jupiter - The Gas Giant",
                description: "Jupiter is the largest planet in our solar system. It's a gas giant with a Great Red Spot that's a storm larger than Earth. Jupiter acts like a vacuum cleaner, using its gravity to pull in asteroids and comets.",
                facts: [
                    "Mass: More than all other planets combined",
                    "Moons: 95+ known moons, including 4 large Galilean moons",
                    "Great Red Spot: Storm raging for 400+ years",
                    "Day length: 9 hours 56 minutes"
                ],
                nasaUrl: "https://science.nasa.gov/jupiter/",
                imageUrl: "https://images.unsplash.com/photo-1614313913007-2b4ae8ce32d6?w=500&h=300&fit=crop"
            },
            Saturn: {
                title: "Saturn - The Ringed Planet",
                description: "Saturn is famous for its prominent ring system, made of ice and rock particles. It's the least dense planet in our solar system – it would float in water if there were a bathtub big enough!",
                facts: [
                    "Rings: Made of ice and rock particles",
                    "Moons: 146+ known moons, including Titan",
                    "Density: 0.687 g/cm³ (less than water)",
                    "Hexagonal storm at north pole"
                ],
                nasaUrl: "https://science.nasa.gov/saturn/",
                imageUrl: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=500&h=300&fit=crop"
            },
            Uranus: {
                title: "Uranus - The Tilted Planet",
                description: "Uranus is unique because it rotates on its side, likely due to a collision with an Earth-sized object long ago. It's an ice giant with a faint ring system and 27 known moons.",
                facts: [
                    "Rotation: Tilted 98 degrees on its side",
                    "Composition: Water, methane, and ammonia ices",
                    "Rings: 13 known rings",
                    "Year length: 84 Earth years"
                ],
                nasaUrl: "https://science.nasa.gov/uranus/",
                imageUrl: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=500&h=300&fit=crop"
            },
            Neptune: {
                title: "Neptune - The Windy Planet",
                description: "Neptune is the most distant planet from the Sun and has the strongest winds in the solar system, reaching speeds of up to 2,100 km/h. It's an ice giant with a deep blue color due to methane in its atmosphere.",
                facts: [
                    "Wind speeds: Up to 2,100 km/h",
                    "Color: Deep blue from methane",
                    "Largest moon: Triton (orbits backwards)",
                    "Discovery: First planet found by mathematical prediction"
                ],
                nasaUrl: "https://science.nasa.gov/neptune/",
                imageUrl: "https://images.unsplash.com/photo-1614313913007-2b4ae8ce32d6?w=500&h=300&fit=crop"
            }
        };

        return planetData[planetName] || {
            title: planetName,
            description: "No detailed information available.",
            facts: [],
            nasaUrl: "",
            imageUrl: ""
        };
    }

    // Метод для отримання Mars Rover фотографій
    async getMarsRoverPhotos() {
        try {
            const response = await fetch(
                `${this.baseUrl}/mars-photos/api/v1/rovers/curiosity/photos?sol=1000&api_key=${this.apiKey}`
            );

            if (!response.ok) throw new Error('Mars API failed');

            const data = await response.json();
            return data.photos.slice(0, 5); // Повертаємо перші 5 фото
        } catch (error) {
            console.warn('Mars Rover API failed:', error);
            return [];
        }
    }

    // Очистити кеш
    clearCache() {
        this.cache.clear();
    }
}

const nasaService = new NasaService();
export default nasaService;