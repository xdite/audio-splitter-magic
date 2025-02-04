
import React, { useEffect, useRef } from 'react';
import { getSegmentColor } from '@/utils/audioProcessing';

interface WaveformDisplayProps {
  waveformRef: React.RefObject<HTMLDivElement>;
  markers: number[];
  duration: number;
}

const WaveformDisplay: React.FC<WaveformDisplayProps> = ({ waveformRef, markers, duration }) => {
  const resizeTimeoutRef = useRef<number>();

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      // Debounce resize events
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = window.setTimeout(() => {
        // Handle resize after debounce
        const entry = entries[0];
        if (entry && waveformRef.current) {
          // Force wavesurfer to redraw if needed
          const event = new Event('resize');
          window.dispatchEvent(event);
        }
      }, 250); // 250ms debounce
    });

    if (waveformRef.current) {
      resizeObserver.observe(waveformRef.current);
    }

    return () => {
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
      resizeObserver.disconnect();
    };
  }, []);

  const renderSegments = () => {
    if (markers.length === 0) return null;
    
    const segments = [];
    let startTime = 0;

    markers.forEach((marker, index) => {
      const width = ((marker - startTime) / duration) * 100;
      segments.push(
        <div
          key={`segment-${index}`}
          className="absolute top-0 bottom-0"
          style={{
            left: `${(startTime / duration) * 100}%`,
            width: `${width}%`,
            backgroundColor: getSegmentColor(index),
            opacity: 0.2,
            pointerEvents: 'none',
          }}
        />
      );
      startTime = marker;
    });

    const finalWidth = ((duration - startTime) / duration) * 100;
    segments.push(
      <div
        key={`segment-final`}
        className="absolute top-0 bottom-0"
        style={{
          left: `${(startTime / duration) * 100}%`,
          width: `${finalWidth}%`,
          backgroundColor: getSegmentColor(markers.length),
          opacity: 0.2,
          pointerEvents: 'none',
        }}
      />
    );

    return segments;
  };

  return (
    <div className="waveform-container relative">
      {renderSegments()}
      <div ref={waveformRef} className="relative z-10" />
      {markers.map((time, index) => (
        <div
          key={index}
          className="absolute top-0 h-full"
          style={{
            left: `${(time / duration) * 100}%`,
            zIndex: 20,
          }}
        >
          <div className="timeline-marker" />
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs">
            {time.toFixed(2)}s
          </div>
        </div>
      ))}
    </div>
  );
};

export default WaveformDisplay;
