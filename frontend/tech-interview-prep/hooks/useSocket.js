// hooks/useSocket.js
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function useSocket(url) {
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io(url, {
      transports: ['websocket'], // optional, but recommended
    });

    socketRef.current.on('connect', () => {
      console.log('Connected:', socketRef.current.id);
    });

    socketRef.current.on('my_response', (data) => {
      console.log('Received from server:', data);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [url]);

  return socketRef;
}

