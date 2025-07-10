import { useEffect } from 'react';
import getStarfield from '../core/getStarfield';

const Starfield = ({ scene }) => {
    useEffect(() => {
        if (scene) {
            const starfield = getStarfield(5000);
            scene.add(starfield);

            return () => {
                scene.remove(starfield);
                starfield.geometry.dispose();
                starfield.material.dispose();
            };
        }
    }, [scene]);

    return null;
};

export default Starfield;