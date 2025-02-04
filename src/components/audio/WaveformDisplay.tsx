
import React, { useRef, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformDisplayProps {
  onWaveSurferInit: (wavesurfer: WaveSurfer) => void;
}

const WaveformDisplay = ({ onWaveSurferInit }: WaveformDisplayProps) => {
  const waveformRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (waveformRef.current) {
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4a5568',
        progressColor: '#7aa2f7',
        cursorColor: '#bb9af7',
        cursorWidth: 2,
        height: 100,
        normalize: true,
      });

      onWaveSurferInit(wavesurfer);

      return () => {
        wavesurfer.destroy();
      };
    }
  }, [onWaveSurferInit]);

  return <div ref={waveformRef} className="relative z-10" />;
};

export default WaveformDisplay;
