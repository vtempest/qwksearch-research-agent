/**
 * React component that renders ChatMessageLoadingSkeleton within the ResearchAgent area of ResearchAgent.
 */
import QuantumWaveOrbital from 'quantum-sphere-loading-icon/react';


/**
 * Loading skeleton component for chat messages.
 * Renders a QuantumWaveOrbital animation while waiting for the AI response.
 * 
 * @returns {JSX.Element} The rendered loading skeleton
 */
const MessageBoxLoading = () => {
  return (
    <div style={{ height: '200px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <QuantumWaveOrbital
        autoRandomize={true}
        onSphereClick={() => console.log('Sphere clicked')}
        className="my-custom-class"
      />
    </div>
  );
};

export default MessageBoxLoading;
