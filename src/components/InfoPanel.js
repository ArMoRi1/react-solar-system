import React, { useState, useEffect } from 'react';
import NasaService from '../services/NasaService';

const DetailedInfoPanel = ({ showInfo, selectedPlanet, infoPosition }) => {
    const [planetData, setPlanetData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (showInfo && selectedPlanet) {
            loadPlanetData(selectedPlanet);
        }
    }, [showInfo, selectedPlanet]);

    const loadPlanetData = async (planetName) => {
        setLoading(true);
        setError(null);

        try {
            const data = await NasaService.getPlanetInfo(planetName);
            setPlanetData(data);
        } catch (err) {
            setError('Failed to load planet information');
            console.error('Error loading planet data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!showInfo || !selectedPlanet) return null;

    return (
        <>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .loading-spinner {
                    animation: spin 1s linear infinite;
                }
            `}</style>

            <div style={{
                position: 'fixed',
                right: '200px',
                top: '0',
                bottom: '0',
                width: '500px',
                background: 'rgba(0,0,0,0.95)',
                color: 'white',
                border: 'none',
                borderLeft: '1px solid rgba(255,255,255,0.2)',
                borderRight: '1px solid rgba(255,255,255,0.2)',
                zIndex: 1000,
                overflowY: 'auto',
                boxShadow: '-8px 0 32px rgba(0,0,0,0.8)',
                transform: showInfo ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.3s ease'
            }}>
                {loading ? (
                    <div style={{
                        padding: '40px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '20px'
                    }}>
                        <div
                            className="loading-spinner"
                            style={{
                                width: '40px',
                                height: '40px',
                                border: '3px solid rgba(255,255,255,0.3)',
                                borderTop: '3px solid #007AFF',
                                borderRadius: '50%'
                            }}
                        ></div>
                        <p>Loading NASA data...</p>
                    </div>
                ) : error ? (
                    <div style={{
                        padding: '40px',
                        textAlign: 'center',
                        color: '#FF3B30'
                    }}>
                        <p>⚠️ {error}</p>
                        <button
                            onClick={() => loadPlanetData(selectedPlanet)}
                            style={{
                                marginTop: '20px',
                                padding: '10px 20px',
                                background: '#007AFF',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            Retry
                        </button>
                    </div>
                ) : planetData ? (
                    <div style={{ padding: '0' }}>
                        {/* Header з зображенням */}
                        {planetData.imageUrl && (
                            <div style={{
                                height: '200px',
                                backgroundImage: `url(${planetData.imageUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                borderRadius: '12px 12px 0 0',
                                position: 'relative'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    bottom: '0',
                                    left: '0',
                                    right: '0',
                                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                                    padding: '20px',
                                    borderRadius: '0 0 0 0'
                                }}>
                                    <h2 style={{
                                        margin: '0',
                                        fontSize: '24px',
                                        fontWeight: 'bold'
                                    }}>
                                        {planetData.title}
                                    </h2>
                                </div>
                            </div>
                        )}

                        {/* Основний контент */}
                        <div style={{ padding: '20px' }}>
                            {!planetData.imageUrl && (
                                <h2 style={{
                                    margin: '0 0 20px 0',
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                                    paddingBottom: '10px'
                                }}>
                                    {planetData.title}
                                </h2>
                            )}

                            {/* Опис */}
                            <div style={{ marginBottom: '25px' }}>
                                <p style={{
                                    margin: '0',
                                    lineHeight: '1.6',
                                    fontSize: '16px',
                                    color: 'rgba(255,255,255,0.9)'
                                }}>
                                    {planetData.description}
                                </p>
                            </div>

                            {/* Факти */}
                            {planetData.facts && planetData.facts.length > 0 && (
                                <div style={{ marginBottom: '25px' }}>
                                    <h3 style={{
                                        margin: '0 0 15px 0',
                                        fontSize: '18px',
                                        color: '#007AFF'
                                    }}>
                                        🔬 Key Facts
                                    </h3>
                                    <ul style={{
                                        margin: '0',
                                        padding: '0',
                                        listStyle: 'none'
                                    }}>
                                        {planetData.facts.map((fact, index) => (
                                            <li key={index} style={{
                                                padding: '8px 0',
                                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                                fontSize: '14px',
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '10px'
                                            }}>
                                                <span style={{
                                                    color: '#007AFF',
                                                    fontSize: '16px',
                                                    lineHeight: '1'
                                                }}>•</span>
                                                <span>{fact}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* APOD секція */}
                            {planetData.apod && (
                                <div style={{ marginBottom: '25px' }}>
                                    <h3 style={{
                                        margin: '0 0 15px 0',
                                        fontSize: '18px',
                                        color: '#34C759'
                                    }}>
                                        🌌 NASA Image of the Day
                                    </h3>
                                    {planetData.apod.url && (
                                        <img
                                            src={planetData.apod.url}
                                            alt={planetData.apod.title}
                                            style={{
                                                width: '100%',
                                                height: '150px',
                                                objectFit: 'cover',
                                                borderRadius: '8px',
                                                marginBottom: '10px'
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    )}
                                    <p style={{
                                        margin: '0',
                                        fontSize: '12px',
                                        color: 'rgba(255,255,255,0.7)',
                                        fontStyle: 'italic'
                                    }}>
                                        {planetData.apod.title}
                                    </p>
                                </div>
                            )}

                            {/* NASA посилання */}
                            {planetData.nasaUrl && (
                                <div style={{ marginTop: '20px' }}>
                                    <a
                                        href={planetData.nasaUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 20px',
                                            background: 'linear-gradient(135deg, #007AFF, #005CBB)',
                                            color: 'white',
                                            textDecoration: 'none',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.transform = 'translateY(-2px)';
                                            e.target.style.boxShadow = '0 4px 12px rgba(0,122,255,0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.transform = 'translateY(0)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    >
                                        🚀 Learn More on NASA.gov
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>
        </>
    );
};

export default DetailedInfoPanel;