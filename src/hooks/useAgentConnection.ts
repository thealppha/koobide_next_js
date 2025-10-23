'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface AgentConnectionProps {
  onConnectionChange: (connected: boolean) => void;
  onAgentNameChange: (name: string) => void;
  onConnectionStatusChange: (status: string) => void;
  streamVideoRef: React.RefObject<HTMLVideoElement | null>;
  idleVideoRef: React.RefObject<HTMLVideoElement | null>;
}

interface AgentConnectionReturn {
  connect: () => Promise<void>;
  speak: (message: string) => Promise<void>;
  isStreamReady: boolean;
  isStreamPlaying: boolean;
  isFluent: boolean;
  peerConnection: RTCPeerConnection | null;
  streamId: string | null;
  sessionId: string | null;
}

interface DIDApiConfig {
  key: string;
  url: string;
}

export const useAgentConnection = ({
  onConnectionChange,
  onAgentNameChange,
  onConnectionStatusChange,
  streamVideoRef,
  idleVideoRef
}: AgentConnectionProps): AgentConnectionReturn => {
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [isStreamPlaying, setIsStreamPlaying] = useState(false);
  const [isFluent, setIsFluent] = useState(false);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [apiConfig, setApiConfig] = useState<DIDApiConfig | null>(null);

  const agentId = 'v2_agt_08Ix5nLz';

  // Load API configuration
  useEffect(() => {
    const loadApiConfig = async () => {
      try {
        const response = await fetch('/api/config');
        const config = await response.json();
        setApiConfig(config);
      } catch (error) {
        console.error('Failed to load API config:', error);
      }
    };
    loadApiConfig();
  }, []);

  const fetchWithRetry = useCallback(async (url: string, options: RequestInit, retries = 3) => {
    try {
      const res = await fetch(url, options);
      if (!res.ok && retries > 0) {
        console.warn('Fetch failed, retrying...', url);
        await new Promise((r) => setTimeout(r, (Math.random() + 1) * 1000));
        return fetchWithRetry(url, options, retries - 1);
      }
      return res;
    } catch (err) {
      if (retries > 0) {
        console.warn('Fetch error, retrying...', url);
        await new Promise((r) => setTimeout(r, (Math.random() + 1) * 1000));
        return fetchWithRetry(url, options, retries - 1);
      }
      throw err;
    }
  }, []);

  const updateVideoDisplay = useCallback((stream: MediaStream | null, isPlaying: boolean) => {
    console.log('updateVideoDisplay called:', { isFluent, isStreamReady, isPlaying, hasStream: !!stream });
    
    if (!streamVideoRef.current || !idleVideoRef.current) {
      console.log('Video refs not available');
      return;
    }

    if (!isFluent) {
      const streamOpacity = isPlaying && isStreamReady ? 1 : 0;
      console.log('Non-fluent mode - setting opacities:', { streamOpacity });
      idleVideoRef.current.style.opacity = (1 - streamOpacity).toString();
      streamVideoRef.current.style.opacity = streamOpacity.toString();
      if (isPlaying && stream) {
        streamVideoRef.current.srcObject = stream;
        streamVideoRef.current.muted = !isStreamReady;
        if (streamVideoRef.current.paused) {
          streamVideoRef.current.play().catch((e) => console.log('Play error:', e));
        }
      }
    } else {
      console.log('Fluent mode - setting video display');
      idleVideoRef.current.style.opacity = '0';
      streamVideoRef.current.style.opacity = '1';
      streamVideoRef.current.muted = false;
      if (stream) {
        streamVideoRef.current.srcObject = stream;
        if (streamVideoRef.current.paused) {
          streamVideoRef.current.play().catch((e) => console.log('Play error:', e));
        }
      }
    }
  }, [isFluent, isStreamReady]);

  const stopStream = useCallback(() => {
    if (!streamVideoRef.current) return;
    const stream = streamVideoRef.current.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamVideoRef.current.srcObject = null;
    }
  }, [streamVideoRef]);

  const closeConnection = useCallback(() => {
    if (!peerConnection) return;
    try {
      peerConnection.close();
    } catch {}
    setPeerConnection(null);
    setIsStreamReady(false);
    setIsStreamPlaying(false);
  }, [peerConnection]);

  const connect = useCallback(async () => {
    if (!apiConfig) {
      console.error('API config not loaded');
      return;
    }

    console.log('Connecting to Agent...');
    onConnectionStatusChange('Connecting…');

    if (peerConnection?.connectionState === 'connected') return;

    // Clean up any existing connections or streams
    stopStream();
    closeConnection();

    try {
      // 1) Fetch Agent info
      console.log('Fetching agent info...');
      const resAgent = await fetch(`${apiConfig.url}/agents/${agentId}`, {
        method: 'GET',
        headers: { 
          Authorization: `Basic ${apiConfig.key}`, 
          'Content-Type': 'application/json' 
        }
      });
      
      if (!resAgent.ok) {
        throw new Error(`Failed to fetch agent info: ${resAgent.status} ${resAgent.statusText}`);
      }
      
      const agentData = await resAgent.json();
      onAgentNameChange(agentData.preview_name);
      console.log('Agent loaded:', agentData);

      // Create a new stream
      console.log('Creating stream session...');
      const streamOptions = { compatibility_mode: 'on', fluent: true };
      const resStream = await fetchWithRetry(`${apiConfig.url}/agents/${agentId}/streams`, {
        method: 'POST',
        headers: { 
          Authorization: `Basic ${apiConfig.key}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(streamOptions)
      });
      
      if (!resStream.ok) {
        throw new Error(`Failed to create stream: ${resStream.status} ${resStream.statusText}`);
      }
      
      const { id, session_id, offer, ice_servers, fluent } = await resStream.json();
      setStreamId(id);
      setSessionId(session_id);
      const isFluentMode = !!fluent;
      setIsFluent(isFluentMode);
      console.log('Stream created: ', id, '\nFluent mode:', isFluentMode);

      if (!fluent && streamVideoRef.current && idleVideoRef.current) {
        // Prep idle visuals for talk (non-fluent) avatars
        const videoWrapper = streamVideoRef.current.parentElement;
        if (videoWrapper) {
          videoWrapper.style.backgroundImage = `url(${agentData.presenter.thumbnail})`;
        }
        idleVideoRef.current.src = agentData.presenter.idle_video;
      }

      // Start the WebRTC connection
      console.log('Setting up WebRTC connection...');
      const RTCPeerConnectionCtor =
        window.RTCPeerConnection || (window as any).webkitRTCPeerConnection || (window as any).mozRTCPeerConnection;
      
      const newPeerConnection = new RTCPeerConnectionCtor({ iceServers: ice_servers });
      setPeerConnection(newPeerConnection);

      // Submit Network information (ICE candidates → API)
      newPeerConnection.addEventListener('icecandidate', (event) => {
        const body = event.candidate
          ? { 
              candidate: event.candidate.candidate, 
              sdpMid: event.candidate.sdpMid, 
              sdpMLineIndex: event.candidate.sdpMLineIndex 
            }
          : {};
        fetch(`${apiConfig.url}/agents/${agentId}/streams/${id}/ice`, {
          method: 'POST',
          headers: { 
            Authorization: `Basic ${apiConfig.key}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ session_id: session_id, ...body })
        });
        console.log('ICE candidate sent');
      });

      // Connection state changes
      newPeerConnection.addEventListener('connectionstatechange', () => {
        console.log('Peer connection state:', newPeerConnection.connectionState);
        if (newPeerConnection.connectionState === 'connecting') {
          onConnectionStatusChange('Connecting…');
        }
        if (newPeerConnection.connectionState === 'connected') {
          console.log('Connection established, setting stream ready');
          setIsStreamReady(true);
          onConnectionStatusChange('Connected');
          onConnectionChange(true);
        }
        if (newPeerConnection.connectionState === 'disconnected') {
          onConnectionChange(false);
        }
        if (newPeerConnection.connectionState === 'failed' || newPeerConnection.connectionState === 'closed') {
          stopStream();
          closeConnection();
        }
      });

      // Remote media → <video> + simple "playing" detection
      newPeerConnection.addEventListener('track', (event) => {
        console.log('Remote track received');
        const stream = event.streams[0];
        const [track] = stream.getVideoTracks();
        if (!track || !streamVideoRef.current) return;

        console.log('Setting video stream to element');
        streamVideoRef.current.srcObject = stream;
        streamVideoRef.current.muted = false; // Always unmute for fluent mode
        
        // For fluent mode, immediately show the video
        if (isFluentMode) {
          console.log('Fluent mode - showing video immediately');
          // Set video opacity directly for fluent mode
          if (streamVideoRef.current) {
            streamVideoRef.current.style.opacity = '1';
          }
          if (idleVideoRef.current) {
            idleVideoRef.current.style.opacity = '0';
          }
          // Set stream ready immediately for fluent mode
          setIsStreamReady(true);
          // Try to play the video after a short delay to avoid AbortError
          setTimeout(() => {
            if (streamVideoRef.current && streamVideoRef.current.paused) {
              streamVideoRef.current.play().catch((e) => console.log('Delayed play error:', e));
            }
          }, 100);
        }

        let lastBytes = 0;
        let lastPlayingState = false;
        const interval = setInterval(async () => {
          if (!newPeerConnection || newPeerConnection.connectionState === 'closed') {
            clearInterval(interval);
            return;
          }
          try {
            const receiver = newPeerConnection.getReceivers().find((r) => r.track === track);
            if (!receiver) return;
            const stats = await receiver.getStats();
            stats.forEach((report) => {
              if (report.type === 'inbound-rtp' && report.kind === 'video') {
                const nowPlaying = report.bytesReceived > lastBytes;
                if (nowPlaying !== lastPlayingState) {
                  setIsStreamPlaying(nowPlaying);
                  console.log('Stream playing state changed:', nowPlaying);
                  // For fluent mode, don't call updateVideoDisplay to avoid opacity changes
                  if (!isFluentMode) {
                    updateVideoDisplay(stream, nowPlaying);
                  }
                  lastPlayingState = nowPlaying;
                }
                lastBytes = report.bytesReceived;
              }
            });
          } catch {}
        }, 1000);
      });

      // Data channel - Fluent + Interrupt (Only for Premium+ Agents)
      const dc = newPeerConnection.createDataChannel('JanusDataChannel');
      dc.onmessage = (event) => {
        let msg = event.data;
        if (msg.includes('stream/started')) {
          console.log(msg);
          if (fluent) {
            const m = msg.match(/{.*}/);
            if (m) {
              const data = JSON.parse(m[0]);
              // Interrupt functionality is preserved but no UI button
            }
          }
        }
        if (msg.includes('stream/done')) {
          console.log(msg);
          if (fluent) {
            // Interrupt functionality is preserved but no UI button
          }
        }
      };

      await newPeerConnection.setRemoteDescription(offer);
      const answer = await newPeerConnection.createAnswer();
      await newPeerConnection.setLocalDescription(answer);

      // Send SDP answer (Start a WebRTC connection endpoint)
      console.log('Sending local SDP answer...');
      await fetch(`${apiConfig.url}/agents/${agentId}/streams/${id}/sdp`, {
        method: 'POST',
        headers: { 
          Authorization: `Basic ${apiConfig.key}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ answer, session_id: session_id })
      });

    } catch (error) {
      console.error('Connection failed:', error);
      onConnectionStatusChange('Connection failed');
      onConnectionChange(false);
    }
  }, [apiConfig, peerConnection, isStreamReady, stopStream, closeConnection, updateVideoDisplay, onConnectionChange, onAgentNameChange, onConnectionStatusChange, fetchWithRetry]);

  const speak = useCallback(async (message: string) => {
    if (!peerConnection || !isStreamReady || !apiConfig || !streamId || !sessionId) return;
    
    const val = message.trim();
    if (!val) return;
    
    console.log('Sending speak text:', val);
    await fetchWithRetry(`${apiConfig.url}/agents/${agentId}/streams/${streamId}`, {
      method: 'POST',
      headers: { 
        Authorization: `Basic ${apiConfig.key}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        script: { type: 'text', input: val }, 
        session_id: sessionId 
      })
    });
  }, [peerConnection, isStreamReady, apiConfig, streamId, sessionId, fetchWithRetry]);

  return {
    connect,
    speak,
    isStreamReady,
    isStreamPlaying,
    isFluent,
    peerConnection,
    streamId,
    sessionId
  };
};
