
export const detectSilence = async (audioData: AudioBuffer, options: {
  sampleRate: number;
  threshold: number;
  minSilenceLength: number;
}) => {
  const { sampleRate, threshold, minSilenceLength } = options;
  const channels = audioData.getChannelData(0);
  const samplesPerSegment = Math.floor(sampleRate * 0.1);
  const silencePoints: number[] = [];
  let isSilent = false;
  let silenceStart = 0;
  
  for (let i = 0; i < channels.length; i += samplesPerSegment) {
    let currentSum = 0;
    const segmentEnd = Math.min(i + samplesPerSegment, channels.length);
    
    for (let j = i; j < segmentEnd; j++) {
      currentSum += Math.abs(channels[j]);
    }
    
    const averageAmplitude = currentSum / samplesPerSegment;
    const currentTime = (i / sampleRate);
    
    if (averageAmplitude < threshold && !isSilent) {
      isSilent = true;
      silenceStart = currentTime;
    } else if ((averageAmplitude >= threshold || i >= channels.length - samplesPerSegment) && isSilent) {
      isSilent = false;
      const silenceLength = currentTime - silenceStart;
      
      if (silenceLength >= minSilenceLength) {
        silencePoints.push(silenceStart + silenceLength / 2);
      }
    }
  }
  
  return silencePoints;
};

export const getSegmentColor = (index: number) => {
  const colors = ['#F2FCE2', '#FEF7CD', '#FEC6A1', '#E5DEFF', '#FFDEE2', '#FDE1D3', '#D3E4FD'];
  return colors[index % colors.length];
};
