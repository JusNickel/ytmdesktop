import music from './forge.music.config.mts';
import youtube from './forge.youtube.config.mts';

export default process.env.YTMD_VARIANT === 'youtube' ? youtube : music;
