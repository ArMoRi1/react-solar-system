import React from 'react';

const InfoPanel = ({ showInfo, selectedPlanet, planetInfo, infoPosition }) => {
    if (!showInfo || !selectedPlanet || !planetInfo[selectedPlanet]) return null;

    return (
        <div style={{
            position: 'absolute',
            left: infoPosition.x,
            top: infoPosition.y,
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '15px',
            borderRadius: '5px',
            border: '1px solid white',
            maxWidth: '300px',
            zIndex: 1000
        }}>
            <h3 style={{ margin: '0 0 10px 0' }}>
                {selectedPlanet}
            </h3>
            <p style={{ margin: 0 }}>
                {planetInfo[selectedPlanet]}
            </p>
        </div>
    );
};

export default InfoPanel;