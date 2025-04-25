import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => {
  return (
    <div className="connection-status mt-2">
      {isConnected ? (
        <small className="text-success">Connected to server</small>
      ) : (
        <small className="text-danger">Disconnected from server</small>
      )}
    </div>
  );
};

export default ConnectionStatus; 