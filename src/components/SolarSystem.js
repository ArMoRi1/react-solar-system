import React, { Component } from 'react';
import ThreeInit from '../core/ThreeInit';
import CameraController from '../core/CameraController';
import PlanetUtils from './PlanetUtils';
import InfoPanel from './InfoPanel';
import solarSystemData from '../data/solarSystem.json';

class SolarSystem extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isAnimationRunning: true,
            animationSpeed: 1,
            is3DMode: false,
            showInfo: false,
            selectedPlanet: null,
            infoPosition: { x: 0, y: 0 },
            tooltipVisible: false,
            tooltipText: '',
            tooltipPosition: { x: 0, y: 0 }
        };

        this.mountRef = React.createRef();
        this.threeInit = null;
        this.cameraController = null;
        this.planetUtils = null;
        this.frameId = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = null;
        this.mouse = null;
    }

    componentDidMount() {
        // Експортуємо функцію для CameraController
        window.setAnimationRunning = (value) => {
            this.setState({ isAnimationRunning: value });
        };

        this.initializeThreeJS();
        this.createSolarSystem();
        this.animate();
        this.setupEventListeners();
    }

    componentWillUnmount() {
        this.cleanup();
    }

    initializeThreeJS() {
        this.threeInit = new ThreeInit(this.mountRef);
        const { scene, camera, renderer, raycaster, mouse } = this.threeInit.init();

        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.raycaster = raycaster;
        this.mouse = mouse;

        this.cameraController = new CameraController(camera, renderer);
        this.planetUtils = new PlanetUtils(scene);

        // Встановлюємо початковий вигляд після ініціалізації
        setTimeout(() => {
            this.switchView(this.state.is3DMode ? '3d' : '2d');
        }, 100);
    }

    createSolarSystem() {
        // Create all planets from data
        this.planetUtils.createPlanetsFromData(solarSystemData.planets);

        // Create asteroid belt
        const asteroidBeltData = solarSystemData.asteroidBelt;
        this.planetUtils.createAsteroidBelt(
            asteroidBeltData.innerRadius,
            asteroidBeltData.outerRadius,
            asteroidBeltData.numAsteroids
        );
    }

    switchView(mode) {
        if (this.cameraController && solarSystemData.cameraPositions) {
            this.cameraController.switchView(mode, solarSystemData.cameraPositions);
        }
    }

    moveToObject(planetName) {
        const planet = this.planetUtils.getPlanetByName(planetName);
        if (planet) {
            this.setState({ isAnimationRunning: false });
            this.cameraController.moveToObject(planet);
        }
    }

    setupEventListeners() {
        this.renderer.domElement.addEventListener('click', this.handleClick);
        this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
        this.renderer.domElement.addEventListener('mouseout', this.handleMouseOut);
        window.addEventListener('resize', this.handleResize);
    }

    handleClick = (event) => {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.planetUtils.getAllPlanets());

        if (intersects.length > 0) {
            const selectedPlanet = intersects[0].object;
            const planetName = selectedPlanet.userData.planetName;

            if (planetName) {
                if (this.state.showInfo && this.state.selectedPlanet === planetName) {
                    this.setState({ showInfo: false, selectedPlanet: null });
                } else {
                    this.setState({
                        showInfo: true,
                        selectedPlanet: planetName,
                        infoPosition: {
                            x: event.clientX + 20,
                            y: event.clientY + 20
                        }
                    });
                }
                this.moveToObject(planetName);
            }
        } else {
            this.setState({ showInfo: false, selectedPlanet: null });
        }
    };

    handleMouseMove = (event) => {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.planetUtils.getAllPlanets(), true);

        if (intersects.length > 0) {
            const selectedPlanet = intersects[0].object;
            const planetName = selectedPlanet.userData.planetName;

            if (planetName) {
                this.setState({
                    tooltipVisible: true,
                    tooltipText: planetName,
                    tooltipPosition: {
                        x: event.clientX,
                        y: event.clientY - 40
                    }
                });
            }
        } else {
            this.setState({ tooltipVisible: false });
        }
    };

    handleMouseOut = () => {
        this.setState({ tooltipVisible: false });
    };

    handleResize = () => {
        this.threeInit.handleResize();
    };

    animate = () => {
        this.frameId = requestAnimationFrame(this.animate);

        if (this.state.isAnimationRunning) {
            this.planetUtils.animatePlanets(this.state.animationSpeed);
        }

        this.cameraController.update();
        this.renderer.render(this.scene, this.camera);
    };

    cleanup() {
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
        }
        if (this.planetUtils) {
            this.planetUtils.dispose();
        }
        if (this.cameraController) {
            this.cameraController.dispose();
        }
        if (this.threeInit) {
            this.threeInit.dispose();
        }
        window.removeEventListener('resize', this.handleResize);
    }

    handleViewModeChange = (event) => {
        const is3DMode = event.target.checked;
        this.setState({ is3DMode });
        this.switchView(is3DMode ? '3d' : '2d');
    };

    handleAnimationToggle = () => {
        this.setState(prevState => ({
            isAnimationRunning: !prevState.isAnimationRunning
        }));
    };

    handleSpeedChange = (event) => {
        this.setState({ animationSpeed: parseFloat(event.target.value) });
    };

    handlePlanetClick = (planetName) => {
        this.moveToObject(planetName);
        this.setState({
            showInfo: true,
            selectedPlanet: planetName,
            infoPosition: { x: 20, y: 100 }
        });
    };

    getPlanetInfo() {
        const planetInfo = {};
        solarSystemData.planets.forEach(planet => {
            planetInfo[planet.name] = planet.info;
        });
        return planetInfo;
    }

    render() {
        const {
            isAnimationRunning,
            animationSpeed,
            is3DMode,
            showInfo,
            selectedPlanet,
            infoPosition,
            tooltipVisible,
            tooltipText,
            tooltipPosition
        } = this.state;

        const planetInfo = this.getPlanetInfo();

        return (
            <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000', display: 'flex' }}>
                {/* Left Planet Navigation Panel */}
                <div style={{
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    width: '250px',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.9)',
                    color: 'white',
                    padding: '20px',
                    zIndex: 1000,
                    overflowY: 'auto',
                    borderRight: '1px solid rgba(255,255,255,0.2)'
                }}>
                    <h2 style={{
                        margin: '0 0 20px 0',
                        fontSize: '18px',
                        textAlign: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.3)',
                        paddingBottom: '10px'
                    }}>
                        🌌 Solar System
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {solarSystemData.planets.map(planet => (
                            <button
                                key={planet.name}
                                onClick={() => this.handlePlanetClick(planet.name)}
                                style={{
                                    background: selectedPlanet === planet.name
                                        ? 'rgba(255,255,255,0.2)'
                                        : 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    color: 'white',
                                    padding: '12px 15px',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    textAlign: 'left',
                                    transition: 'all 0.3s ease',
                                    width: '100%'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(255,255,255,0.25)';
                                    e.target.style.transform = 'translateX(5px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = selectedPlanet === planet.name
                                        ? 'rgba(255,255,255,0.2)'
                                        : 'rgba(255,255,255,0.1)';
                                    e.target.style.transform = 'translateX(0)';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '16px' }}>
                                        {planet.name === 'Sun' ? '☀️' :
                                            planet.name === 'Mercury' ? '☿️' :
                                                planet.name === 'Venus' ? '♀️' :
                                                    planet.name === 'Earth' ? '🌍' :
                                                        planet.name === 'Mars' ? '♂️' :
                                                            planet.name === 'Jupiter' ? '♃' :
                                                                planet.name === 'Saturn' ? '♄' :
                                                                    planet.name === 'Uranus' ? '♅' :
                                                                        planet.name === 'Neptune' ? '♆' : '🪐'}
                                    </span>
                                    <span>{planet.name}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Control Panel */}
                <div style={{
                    position: 'fixed',
                    right: 0,
                    top: 0,
                    width: '200px',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.9)',
                    color: 'white',
                    padding: '20px',
                    zIndex: 1000,
                    overflowY: 'auto',
                    borderLeft: '1px solid rgba(255,255,255,0.2)'
                }}>
                    <h3 style={{
                        margin: '0 0 20px 0',
                        fontSize: '16px',
                        textAlign: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.3)',
                        paddingBottom: '10px'
                    }}>
                        🎛️ Controls
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* View Mode Toggle */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>
                                Camera Mode
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={is3DMode}
                                    onChange={this.handleViewModeChange}
                                    style={{ transform: 'scale(1.2)' }}
                                />
                                <span>{is3DMode ? '3D View' : '2D View'}</span>
                            </label>
                        </div>

                        {/* Animation Toggle */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>
                                Animation
                            </label>
                            <button
                                onClick={this.handleAnimationToggle}
                                style={{
                                    background: isAnimationRunning
                                        ? 'rgba(0,255,0,0.2)'
                                        : 'rgba(255,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    color: 'white',
                                    padding: '8px 15px',
                                    cursor: 'pointer',
                                    borderRadius: '6px',
                                    width: '100%',
                                    fontSize: '14px'
                                }}
                            >
                                {isAnimationRunning ? '⏸️ Pause' : '▶️ Play'}
                            </button>
                        </div>

                        {/* Speed Control */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>
                                Speed: {animationSpeed}x
                            </label>
                            <input
                                type="range"
                                min="0.1"
                                max="5"
                                step="0.1"
                                value={animationSpeed}
                                onChange={this.handleSpeedChange}
                                style={{
                                    width: '100%',
                                    appearance: 'none',
                                    height: '4px',
                                    borderRadius: '2px',
                                    background: 'rgba(255,255,255,0.3)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* 3D Scene */}
                <div
                    ref={this.mountRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        cursor: 'grab',
                        marginLeft: '250px',
                        marginRight: '200px'
                    }}
                />

                {/* Planet Info Panel */}
                <InfoPanel
                    showInfo={showInfo}
                    selectedPlanet={selectedPlanet}
                    planetInfo={planetInfo}
                    infoPosition={infoPosition}
                />

                {/* Tooltip */}
                {tooltipVisible && (
                    <div style={{
                        position: 'absolute',
                        left: tooltipPosition.x,
                        top: tooltipPosition.y,
                        background: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: '3px',
                        fontSize: '12px',
                        pointerEvents: 'none',
                        zIndex: 1000
                    }}>
                        {tooltipText}
                    </div>
                )}
            </div>
        );
    }
}

export default SolarSystem;