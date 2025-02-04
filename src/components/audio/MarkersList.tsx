
import React from 'react';

interface MarkersListProps {
  markers: number[];
}

const MarkersList = ({ markers }: MarkersListProps) => {
  if (markers.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">分割点列表:</h3>
      <div className="grid grid-cols-4 gap-2">
        {markers.map((time, index) => (
          <div key={index} className="p-2 bg-muted rounded">
            {time.toFixed(2)}s
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarkersList;
