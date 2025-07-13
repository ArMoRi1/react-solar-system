import React, { Component } from 'react';
import ThreeInit from '../core/ThreeInit';
import CameraController from '../core/CameraController';
import PlanetUtils from './PlanetUtils';
import DetailedInfoPanel from './InfoPanel';
import solarSystemData from '../data/solarSystem.json';
import * as THREE from 'three';

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
            tooltipPosition: { x: 0, y: 0 },
            showAxes: false, // Додаємо стан для осей
            showOrbits: true, // Додаємо стан для орбіт
            infoPanelOpen: false, // Додаємо стан для керування панеллю
            isMobile: window.innerWidth <= 768, // Додаємо детекцію мобільного
            leftPanelOpen: false, // Стан лівої панелі для мобільного
            rightPanelOpen: false // Стан правої панелі для мобільного
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
        this.axesHelper = null; // Додаємо референс для осей

        // Додаємо змінні для відстеження перетягування
        this.isDragging = false;
        this.mouseStartPosition = { x: 0, y: 0 };
        this.dragThreshold = 5; // пікселі - мінімальна відстань для визначення перетягування
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

        // Додаємо слухач для зміни розміру екрану
        window.addEventListener('resize', this.handleResize);
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

        // Створюємо координатні осі
        this.createAxes();

        // Встановлюємо початковий вигляд після ініціалізації
        setTimeout(() => {
            this.switchView(this.state.is3DMode ? '3d' : '2d');
        }, 100);
    }

    createAxes() {
        // Створюємо координатні осі XYZ
        this.axesHelper = new THREE.AxesHelper(100); // Розмір осей - 100 одиниць
        this.axesHelper.visible = this.state.showAxes;
        this.scene.add(this.axesHelper);
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

        // Встановлюємо початковий стан орбіт
        this.planetUtils.toggleOrbits(this.state.showOrbits);
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
            // Передаємо стан інформаційної панелі в камеру
            this.cameraController.moveToObject(planet, true, this.state.showInfo);
        }
    }

    setupEventListeners() {
        this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
        this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
        this.renderer.domElement.addEventListener('mouseup', this.handleMouseUp);
        this.renderer.domElement.addEventListener('mouseout', this.handleMouseOut);
        window.addEventListener('resize', this.handleResize);
    }

    handleMouseDown = (event) => {
        this.isDragging = false;
        this.mouseStartPosition = { x: event.clientX, y: event.clientY };
    };

    handleMouseUp = (event) => {
        // Обчислюємо відстань від початкової позиції
        const deltaX = event.clientX - this.mouseStartPosition.x;
        const deltaY = event.clientY - this.mouseStartPosition.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Якщо відстань менше порогу - це клік, інакше - перетягування
        if (distance < this.dragThreshold) {
            this.handleClick(event);
        }

        this.isDragging = false;
    };

    handleClick = (event) => {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.planetUtils.getAllPlanets());

        if (intersects.length > 0) {
            const selectedObject = intersects[0].object;

            // Перевіряємо, чи це клік по невидимій площині (означає клік у порожньому місці)
            if (selectedObject.userData.isClickPlane) {
                // Клік у порожнє місце - повертаємося до загального виду
                this.setState({
                    showInfo: false,
                    selectedPlanet: null,
                    infoPanelOpen: false
                });
                this.planetUtils.showAllPlanets();
                this.handleResetCamera();
                return;
            }

            // Це клік по планеті
            const planetName = selectedObject.userData.planetName;

            if (planetName) {
                // Перевіряємо, чи клікнули на ту ж планету що вже в фокусі
                if (this.planetUtils.isFocused() && this.planetUtils.getFocusedPlanet() === planetName) {
                    // Якщо це та сама планета - повертаємося до загального виду
                    this.setState({
                        showInfo: false,
                        selectedPlanet: null,
                        infoPanelOpen: false
                    });
                    this.planetUtils.showAllPlanets();
                    this.handleResetCamera(); // Повертаємо камеру до початкової позиції
                } else {
                    // Якщо це нова планета - фокусуємося на ній
                    this.setState({
                        showInfo: true,
                        selectedPlanet: planetName,
                        infoPanelOpen: true, // Автоматично відкриваємо панель
                        infoPosition: {
                            x: event.clientX + 20,
                            y: event.clientY + 20
                        }
                    });
                    this.planetUtils.focusOnPlanet(planetName);
                    this.moveToObject(planetName);
                }
            }
        } else {
            // Клік не по жодному об'єкту - повертаємося до загального виду
            this.setState({
                showInfo: false,
                selectedPlanet: null,
                infoPanelOpen: false
            });
            this.planetUtils.showAllPlanets();
            this.handleResetCamera();
        }
    };

    handleMouseMove = (event) => {
        // Перевіряємо, чи почалося перетягування
        if (this.mouseStartPosition.x !== 0 || this.mouseStartPosition.y !== 0) {
            const deltaX = event.clientX - this.mouseStartPosition.x;
            const deltaY = event.clientY - this.mouseStartPosition.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > this.dragThreshold) {
                this.isDragging = true;
            }
        }

        // Tooltip logic - показуємо тільки якщо не перетягуємо
        if (!this.isDragging) {
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.planetUtils.getAllPlanets(), true);

            if (intersects.length > 0) {
                const selectedObject = intersects[0].object;
                const planetName = selectedObject.userData.planetName;

                // Показуємо tooltip тільки для планет, не для невидимої площини
                if (planetName && !selectedObject.userData.isClickPlane) {
                    this.setState({
                        tooltipVisible: true,
                        tooltipText: planetName,
                        tooltipPosition: {
                            x: event.clientX,
                            y: event.clientY - 40
                        }
                    });
                } else {
                    this.setState({ tooltipVisible: false });
                }
            } else {
                this.setState({ tooltipVisible: false });
            }
        } else {
            // Ховаємо tooltip під час перетягування
            this.setState({ tooltipVisible: false });
        }
    };

    handleMouseOut = () => {
        this.setState({ tooltipVisible: false });
        this.isDragging = false;
        this.mouseStartPosition = { x: 0, y: 0 };
    };

    handleResize = () => {
        this.threeInit.handleResize();

        // Оновлюємо стан мобільного пристрою
        const isMobile = window.innerWidth <= 768;
        if (isMobile !== this.state.isMobile) {
            this.setState({
                isMobile,
                leftPanelOpen: false,
                rightPanelOpen: false
            });
        }
    };

    // Функції для керування панелями на мобільному
    handleLeftPanelToggle = () => {
        this.setState(prevState => ({
            leftPanelOpen: !prevState.leftPanelOpen,
            rightPanelOpen: false // Закриваємо праву панель
        }));
    };

    handleRightPanelToggle = () => {
        this.setState(prevState => ({
            rightPanelOpen: !prevState.rightPanelOpen,
            leftPanelOpen: false // Закриваємо ліву панель
        }));
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

        // Очищуємо нові event listeners
        if (this.renderer && this.renderer.domElement) {
            this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
            this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove);
            this.renderer.domElement.removeEventListener('mouseup', this.handleMouseUp);
            this.renderer.domElement.removeEventListener('mouseout', this.handleMouseOut);
        }
    }

    handleViewModeChange = () => {
        const is3DMode = !this.state.is3DMode;
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

    // Функція для перемикання інформаційної панелі
    handleInfoPanelToggle = () => {
        this.setState(prevState => ({
            infoPanelOpen: !prevState.infoPanelOpen
        }));
    };

    // Нова функція для перемикання орбіт
    handleOrbitsToggle = () => {
        const showOrbits = !this.state.showOrbits;
        this.setState({ showOrbits });

        if (this.planetUtils) {
            this.planetUtils.toggleOrbits(showOrbits);
        }
    };

    // Нова функція для перемикання осей
    handleAxesToggle = () => {
        const showAxes = !this.state.showAxes;
        this.setState({ showAxes });

        if (this.axesHelper) {
            this.axesHelper.visible = showAxes;
        }
    };

    handleResetCamera = () => {
        // Переключаємо в 2D режим
        this.setState({
            is3DMode: false,
            showInfo: false,
            selectedPlanet: null,
            infoPanelOpen: false
        });

        // Показуємо всі об'єкти назад
        this.planetUtils.showAllPlanets();

        // Повертаємо до початкової позиції через switchView
        this.switchView('2d');
    };

    handlePlanetClick = (planetName) => {
        // Перевіряємо, чи це та сама планета що вже в фокусі
        if (this.planetUtils.isFocused() && this.planetUtils.getFocusedPlanet() === planetName) {
            // Якщо це та сама планета - повертаємося до загального виду
            this.setState({
                showInfo: false,
                selectedPlanet: null,
                is3DMode: false,
                infoPanelOpen: false
            });
            this.planetUtils.showAllPlanets();
            this.handleResetCamera();
            return;
        }

        // Інакше фокусуємося на новій планеті
        this.setState({
            showInfo: true,
            selectedPlanet: planetName,
            infoPanelOpen: true, // Автоматично відкриваємо панель
            infoPosition: { x: 20, y: 100 },
            is3DMode: true
        });

        // Фокусуємося на планеті (повністю ховаємо інші)
        this.planetUtils.focusOnPlanet(planetName);

        // Рухаємо камеру до планети
        const planet = this.planetUtils.getPlanetByName(planetName);
        if (planet) {
            this.setState({ isAnimationRunning: false });
            this.cameraController.moveToObject(planet, true, true);

            // Вмикаємо 3D контроли після руху камери
            setTimeout(() => {
                if (this.cameraController.controls) {
                    this.cameraController.controls.enabled = true;
                }
            }, 1600);
        }
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
            tooltipPosition,
            showAxes,
            showOrbits,
            infoPanelOpen,
            isMobile,
            leftPanelOpen,
            rightPanelOpen
        } = this.state;

        return (
            <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000', display: 'flex' }}>
                {/* Mobile floating buttons */}
                {isMobile && (
                    <>
                        {/* Left panel toggle button */}
                        <button
                            onClick={this.handleLeftPanelToggle}
                            style={{
                                position: 'fixed',
                                left: '20px',
                                top: '20px',
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                background: leftPanelOpen ? 'rgba(0,122,255,0.9)' : 'rgba(0,0,0,0.8)',
                                border: '2px solid rgba(255,255,255,0.3)',
                                color: 'white',
                                fontSize: '20px',
                                zIndex: 1003,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                            }}
                        >
                            🌌
                        </button>

                        {/* Right panel toggle button */}
                        <button
                            onClick={this.handleRightPanelToggle}
                            style={{
                                position: 'fixed',
                                right: '20px',
                                top: '20px',
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                background: rightPanelOpen ? 'rgba(0,122,255,0.9)' : 'rgba(0,0,0,0.8)',
                                border: '2px solid rgba(255,255,255,0.3)',
                                color: 'white',
                                fontSize: '20px',
                                zIndex: 1003,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                            }}
                        >
                            🎛️
                        </button>
                    </>
                )}

                {/* Left Planet Navigation Panel */}
                <div style={{
                    position: 'fixed',
                    left: isMobile ? (leftPanelOpen ? '0' : '-280px') : '0',
                    top: '0',
                    width: isMobile ? '280px' : '250px',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.95)',
                    color: 'white',
                    padding: '20px',
                    zIndex: 1000,
                    overflowY: 'auto',
                    borderRight: '1px solid rgba(255,255,255,0.2)',
                    transition: 'left 0.3s ease',
                    boxShadow: isMobile ? '4px 0 12px rgba(0,0,0,0.5)' : 'none'
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
                                onClick={() => {
                                    this.handlePlanetClick(planet.name);
                                    if (isMobile) this.setState({ leftPanelOpen: false });
                                }}
                                style={{
                                    background: selectedPlanet === planet.name
                                        ? 'rgba(255,255,255,0.2)'
                                        : 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    color: 'white',
                                    padding: isMobile ? '16px 15px' : '12px 15px',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    fontSize: isMobile ? '16px' : '14px',
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: isMobile ? '18px' : '14px', width: '20px', textAlign: 'center' }}>
                                        {planet.name === 'Sun' ? '⚡' :
                                            planet.name === 'Mercury' ? '◐' :
                                                planet.name === 'Venus' ? '◯' :
                                                    planet.name === 'Earth' ? '●' :
                                                        planet.name === 'Mars' ? '◉' :
                                                            planet.name === 'Jupiter' ? '◎' :
                                                                planet.name === 'Saturn' ? '⬡' :
                                                                    planet.name === 'Uranus' ? '◈' :
                                                                        planet.name === 'Neptune' ? '◆' : '○'}
                                    </span>
                                    <span>{planet.name}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3D Scene */}
                <div
                    ref={this.mountRef}
                    style={{
                        width: isMobile
                            ? '100vw'
                            : (showInfo && infoPanelOpen)
                                ? 'calc(100vw - 750px)'
                                : 'calc(100vw - 450px)',
                        height: '100%',
                        cursor: this.isDragging ? 'grabbing' : 'grab',
                        marginLeft: isMobile ? '0' : '250px',
                        marginRight: isMobile ? '0' : '200px',
                        transition: 'all 0.3s ease'
                    }}
                />

                {/* Mobile overlay - закриває панелі при кліку */}
                {isMobile && (leftPanelOpen || rightPanelOpen) && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            background: 'rgba(0,0,0,0.5)',
                            zIndex: 999,
                            cursor: 'pointer'
                        }}
                        onClick={() => this.setState({ leftPanelOpen: false, rightPanelOpen: false })}
                    />
                )}

                {/* Info Panel Toggle Button */}
                {showInfo && !isMobile && (
                    <div style={{
                        position: 'fixed',
                        right: infoPanelOpen ? '700px' : '200px', // Позиція кнопки
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 1002,
                        transition: 'right 0.3s ease'
                    }}>
                        <button
                            onClick={this.handleInfoPanelToggle}
                            style={{
                                background: 'rgba(0,0,0,0.8)',
                                border: '1px solid rgba(255,255,255,0.3)',
                                color: 'white',
                                width: '40px',
                                height: '80px',
                                cursor: 'pointer',
                                borderRadius: infoPanelOpen ? '8px 0 0 8px' : '8px 0 0 8px',
                                fontSize: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease',
                                boxShadow: '-2px 0 8px rgba(0,0,0,0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(0,0,0,0.9)';
                                e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(0,0,0,0.8)';
                                e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                            }}
                        >
                            {infoPanelOpen ? '›' : '‹'}
                        </button>
                    </div>
                )}

                {/* Planet Info Panel */}
                <DetailedInfoPanel
                    showInfo={showInfo && (isMobile ? true : infoPanelOpen)}
                    selectedPlanet={selectedPlanet}
                    infoPosition={infoPosition}
                    isMobile={isMobile}
                />

                {/* Right Control Panel */}
                <div style={{
                    position: 'fixed',
                    right: isMobile ? (rightPanelOpen ? '0' : '-280px') : '0',
                    top: '0',
                    width: isMobile ? '280px' : '200px',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.95)',
                    color: 'white',
                    padding: '20px',
                    zIndex: 1001,
                    overflowY: 'auto',
                    borderLeft: '1px solid rgba(255,255,255,0.2)',
                    transition: 'right 0.3s ease',
                    boxShadow: isMobile ? '-4px 0 12px rgba(0,0,0,0.5)' : 'none'
                }}>
                    <h3 style={{
                        margin: '0 0 20px 0',
                        fontSize: isMobile ? '18px' : '16px',
                        textAlign: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.3)',
                        paddingBottom: '10px'
                    }}>
                        🎛️ Controls
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '25px' : '20px' }}>
                        {/* View Mode Toggle */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: isMobile ? '14px' : '12px' }}>
                                Camera Mode
                            </label>
                            <div
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    height: isMobile ? '45px' : '35px',
                                    background: is3DMode ? '#007AFF' : '#333',
                                    borderRadius: isMobile ? '22.5px' : '17.5px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.3s ease',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '3px'
                                }}
                                onClick={this.handleViewModeChange}
                            >
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '3px',
                                        left: is3DMode ? 'calc(50% + 1px)' : '3px',
                                        width: 'calc(50% - 4px)',
                                        height: isMobile ? '39px' : '29px',
                                        background: '#fff',
                                        borderRadius: isMobile ? '19.5px' : '14.5px',
                                        transition: 'left 0.3s ease',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: isMobile ? '14px' : '12px',
                                        fontWeight: 'bold',
                                        color: '#333'
                                    }}
                                >
                                    {is3DMode ? '3D' : '2D'}
                                </div>

                                {/* Labels */}
                                <div style={{
                                    position: 'absolute',
                                    left: '0',
                                    width: '50%',
                                    textAlign: 'center',
                                    fontSize: isMobile ? '12px' : '11px',
                                    color: !is3DMode ? 'transparent' : 'rgba(255,255,255,0.8)',
                                    fontWeight: '500',
                                    pointerEvents: 'none'
                                }}>
                                    2D
                                </div>
                                <div style={{
                                    position: 'absolute',
                                    right: '0',
                                    width: '50%',
                                    textAlign: 'center',
                                    fontSize: isMobile ? '12px' : '11px',
                                    color: is3DMode ? 'transparent' : 'rgba(255,255,255,0.8)',
                                    fontWeight: '500',
                                    pointerEvents: 'none'
                                }}>
                                    3D
                                </div>
                            </div>
                        </div>

                        {/* Animation Toggle */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: isMobile ? '14px' : '12px' }}>
                                Animation Control
                            </label>
                            <div
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    height: isMobile ? '45px' : '35px',
                                    background: isAnimationRunning ? '#34C759' : '#FF3B30',
                                    borderRadius: isMobile ? '22.5px' : '17.5px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.3s ease',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '3px'
                                }}
                                onClick={this.handleAnimationToggle}
                            >
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '3px',
                                        left: isAnimationRunning ? 'calc(50% + 1px)' : '3px',
                                        width: 'calc(50% - 4px)',
                                        height: isMobile ? '39px' : '29px',
                                        background: '#fff',
                                        borderRadius: isMobile ? '19.5px' : '14.5px',
                                        transition: 'left 0.3s ease',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: isMobile ? '16px' : '12px',
                                        fontWeight: 'bold',
                                        color: '#333'
                                    }}
                                >
                                    {isAnimationRunning ? '▸' : '◼'}
                                </div>

                                {/* Labels */}
                                <div style={{
                                    position: 'absolute',
                                    left: '0',
                                    width: '50%',
                                    textAlign: 'center',
                                    fontSize: isMobile ? '12px' : '11px',
                                    color: !isAnimationRunning ? 'transparent' : 'rgba(255,255,255,0.8)',
                                    fontWeight: '500',
                                    pointerEvents: 'none'
                                }}>
                                    Pause
                                </div>
                                <div style={{
                                    position: 'absolute',
                                    right: '0',
                                    width: '50%',
                                    textAlign: 'center',
                                    fontSize: isMobile ? '12px' : '11px',
                                    color: isAnimationRunning ? 'transparent' : 'rgba(255,255,255,0.8)',
                                    fontWeight: '500',
                                    pointerEvents: 'none'
                                }}>
                                    Play
                                </div>
                            </div>
                        </div>

                        {/* Axes Toggle - Нова кнопка */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: isMobile ? '14px' : '12px' }}>
                                Coordinate Axes
                            </label>
                            <div
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    height: isMobile ? '45px' : '35px',
                                    background: showAxes ? '#9C27B0' : '#333',
                                    borderRadius: isMobile ? '22.5px' : '17.5px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.3s ease',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '3px'
                                }}
                                onClick={this.handleAxesToggle}
                            >
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '3px',
                                        left: showAxes ? 'calc(50% + 1px)' : '3px',
                                        width: 'calc(50% - 4px)',
                                        height: isMobile ? '39px' : '29px',
                                        background: '#fff',
                                        borderRadius: isMobile ? '19.5px' : '14.5px',
                                        transition: 'left 0.3s ease',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: isMobile ? '14px' : '12px',
                                        fontWeight: 'bold',
                                        color: '#333'
                                    }}
                                >
                                    {showAxes ? 'XYZ' : '○'}
                                </div>

                                {/* Labels */}
                                <div style={{
                                    position: 'absolute',
                                    left: '0',
                                    width: '50%',
                                    textAlign: 'center',
                                    fontSize: isMobile ? '12px' : '11px',
                                    color: !showAxes ? 'transparent' : 'rgba(255,255,255,0.8)',
                                    fontWeight: '500',
                                    pointerEvents: 'none'
                                }}>
                                    Hide
                                </div>
                                <div style={{
                                    position: 'absolute',
                                    right: '0',
                                    width: '50%',
                                    textAlign: 'center',
                                    fontSize: isMobile ? '12px' : '11px',
                                    color: showAxes ? 'transparent' : 'rgba(255,255,255,0.8)',
                                    fontWeight: '500',
                                    pointerEvents: 'none'
                                }}>
                                    Show
                                </div>
                            </div>
                        </div>

                        {/* Orbits Toggle - Нова кнопка для орбіт */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: isMobile ? '14px' : '12px' }}>
                                Planet Orbits
                            </label>
                            <div
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    height: isMobile ? '45px' : '35px',
                                    background: showOrbits ? '#00BCD4' : '#333',
                                    borderRadius: isMobile ? '22.5px' : '17.5px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.3s ease',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '3px'
                                }}
                                onClick={this.handleOrbitsToggle}
                            >
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '3px',
                                        left: showOrbits ? 'calc(50% + 1px)' : '3px',
                                        width: 'calc(50% - 4px)',
                                        height: isMobile ? '39px' : '29px',
                                        background: '#fff',
                                        borderRadius: isMobile ? '19.5px' : '14.5px',
                                        transition: 'left 0.3s ease',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: isMobile ? '16px' : '12px',
                                        fontWeight: 'bold',
                                        color: '#333'
                                    }}
                                >
                                    {showOrbits ? '◯' : '○'}
                                </div>

                                {/* Labels */}
                                <div style={{
                                    position: 'absolute',
                                    left: '0',
                                    width: '50%',
                                    textAlign: 'center',
                                    fontSize: isMobile ? '12px' : '11px',
                                    color: !showOrbits ? 'transparent' : 'rgba(255,255,255,0.8)',
                                    fontWeight: '500',
                                    pointerEvents: 'none'
                                }}>
                                    Hide
                                </div>
                                <div style={{
                                    position: 'absolute',
                                    right: '0',
                                    width: '50%',
                                    textAlign: 'center',
                                    fontSize: isMobile ? '12px' : '11px',
                                    color: showOrbits ? 'transparent' : 'rgba(255,255,255,0.8)',
                                    fontWeight: '500',
                                    pointerEvents: 'none'
                                }}>
                                    Show
                                </div>
                            </div>
                        </div>

                        {/* Speed Control */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: isMobile ? '14px' : '12px' }}>
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
                                    height: isMobile ? '8px' : '4px',
                                    appearance: 'none',
                                    borderRadius: isMobile ? '4px' : '2px',
                                    background: 'rgba(255,255,255,0.3)',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {/* Reset Camera */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: isMobile ? '14px' : '12px' }}>
                                Camera Reset
                            </label>
                            <button
                                onClick={() => {
                                    this.handleResetCamera();
                                    if (isMobile) this.setState({ rightPanelOpen: false });
                                }}
                                style={{
                                    background: 'rgba(255,165,0,0.2)',
                                    border: '1px solid rgba(255,165,0,0.5)',
                                    color: '#FFA500',
                                    padding: isMobile ? '15px 10px' : '10px',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    width: '100%',
                                    fontSize: isMobile ? '14px' : '12px',
                                    fontWeight: '500',
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(255,165,0,0.3)';
                                    e.target.style.borderColor = '#FFA500';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'rgba(255,165,0,0.2)';
                                    e.target.style.borderColor = 'rgba(255,165,0,0.5)';
                                }}
                            >
                                <span style={{ fontSize: isMobile ? '16px' : '14px' }}>⟲</span>
                                Reset View
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tooltip */}
                {tooltipVisible && !this.isDragging && (
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