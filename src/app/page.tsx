'use client';

import { useState, useRef, useEffect } from 'react';
import { useAgentConnection } from '@/hooks/useAgentConnection';
import styles from './page.module.css';

export default function Home() {
  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [agentName, setAgentName] = useState('Your Agent');
  const [connectionStatus, setConnectionStatus] = useState('');
  const [message, setMessage] = useState('');
  
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const streamVideoRef = useRef<HTMLVideoElement>(null);
  const idleVideoRef = useRef<HTMLVideoElement>(null);
  
  const {
    connect,
    speak,
    isStreamReady,
    isStreamPlaying,
    isFluent,
    peerConnection,
    streamId,
    sessionId
  } = useAgentConnection({
    onConnectionChange: setIsConnected,
    onAgentNameChange: setAgentName,
    onConnectionStatusChange: setConnectionStatus,
    streamVideoRef,
    idleVideoRef
  });

  // Web Speech API implementation
  const [isRecognizing, setIsRecognizing] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleRecognition = () => {
    if (!recognitionRef.current) return;

    if (isRecognizing) {
      recognitionRef.current.stop();
      setIsRecognizing(false);
    } else {
      if (textAreaRef.current) {
        textAreaRef.current.value = '';
      }
      recognitionRef.current.start();
      setIsRecognizing(true);
    }
  };

  const resetRecognition = () => {
    setIsRecognizing(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'en_US';

    recognition.onend = () => {
      setIsRecognizing(false);
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript;
          if (textAreaRef.current) {
            textAreaRef.current.value += transcript;
          }
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleStart = async () => {
    setShowStartOverlay(false);
    document.body.classList.remove('blurred');
    await connect();
  };

  const handleSendMessage = () => {
    if (textAreaRef.current && isStreamReady) {
      const message = textAreaRef.current.value.trim();
      if (message) {
        speak(message);
        textAreaRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSpeechToggle = () => {
    toggleRecognition();
  };

  useEffect(() => {
    if (isRecognizing) {
      resetRecognition();
    }
  }, [isRecognizing, resetRecognition]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <img 
            src="https://studio.d-id.com/assets/did_logo_dark-17fd213e.svg" 
            alt="D-ID Logo" 
            className={styles.logo}
          />
          Agents 2.0 API Demo
        </h1>
      </header>

      {showStartOverlay && (
        <div className={styles.startOverlay}>
          <div className={styles.startContent}>
            <h2>D-ID Agent'a Bağlan</h2>
            <p>Konuşmaya başlamak için aşağıdaki butona tıklayın</p>
            <button 
              className={styles.startButton}
              onClick={handleStart}
            >
              Başla
            </button>
          </div>
        </div>
      )}

      <div className={`${styles.mainContainer} ${showStartOverlay ? styles.hidden : ''}`}>
        <div className={styles.agentHeader}>
          <span className={styles.agentName}>{agentName}</span>
          <span className={styles.connectionStatus}>{connectionStatus}</span>
        </div>

        <div className={styles.videoWrapper}>
          <video 
            ref={streamVideoRef}
            loop 
            playsInline 
            className={styles.video}
            style={{ opacity: 0 }}
            onLoadStart={() => console.log('Stream video load start')}
            onLoadedData={() => console.log('Stream video loaded data')}
            onCanPlay={() => console.log('Stream video can play')}
            onPlay={() => console.log('Stream video playing')}
            onError={(e) => console.log('Stream video error:', e)}
          />
          <video 
            ref={idleVideoRef}
            autoPlay 
            loop 
            playsInline 
            className={styles.video}
            style={{ opacity: 1 }}
            onLoadStart={() => console.log('Idle video load start')}
            onLoadedData={() => console.log('Idle video loaded data')}
            onCanPlay={() => console.log('Idle video can play')}
            onPlay={() => console.log('Idle video playing')}
          />
        </div>

        <div className={styles.inputsContainer}>
          <div className={styles.mainInput}>
            <textarea
              ref={textAreaRef}
              placeholder="Write something to speak."
              className={styles.textArea}
              onKeyPress={handleKeyPress}
              autoFocus
            />
            <button
              className={`${styles.roundButton} ${styles.speechButton}`}
              onClick={handleSpeechToggle}
              disabled={!isStreamReady}
              title="Speech to Text - Web Speech API (MDN)"
            >
              {isRecognizing ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path stroke="white" strokeWidth="1.5" d="M7 8a5 5 0 0 1 10 0v3a5 5 0 0 1-10 0V8Z"/>
                  <path stroke="white" strokeLinecap="round" strokeWidth="1.5" d="M11 8h2M10 11h4M20 10v1a8 8 0 1 1-16 0v-1M12 19v3"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path stroke="currentColor" strokeWidth="1.5" d="M7 8a5 5 0 0 1 10 0v3a5 5 0 0 1-10 0V8Z"/>
                  <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M11 8h2M10 11h4M20 10v1a8 8 0 1 1-16 0v-1M12 19v3"/>
                </svg>
              )}
            </button>
            <button
              className={`${styles.roundButton} ${styles.actionButton}`}
              onClick={handleSendMessage}
              disabled={!isStreamReady}
              title="Send Message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="27" viewBox="0 0 26 27" fill="none">
                <path d="M10.8753 20.9288L15.8809 18.3172C20.2537 16.0357 22.4402 14.895 22.4402 13.0885C22.4402 11.2821 20.2537 10.1413 15.8809 7.85984L10.8753 5.24821C7.34598 3.40683 5.58133 2.48614 4.5583 2.76876C3.58508 3.03761 2.82497 3.83076 2.56732 4.84629C2.29649 5.91381 3.17881 7.75518 4.94346 11.4379C5.16215 11.8943 5.60928 12.198 6.09829 12.2003L14.0891 12.2391C14.5386 12.2413 14.9014 12.6234 14.8993 13.0925C14.8972 13.5616 14.531 13.9401 14.0815 13.9379L6.21975 13.8997C5.68076 13.8971 5.1845 14.2361 4.94346 14.7391C3.17882 18.4218 2.29648 20.2632 2.56732 21.3307C2.82497 22.3463 3.58507 23.1394 4.5583 23.4083C5.58133 23.6909 7.34599 22.7702 10.8753 20.9288Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {!isConnected && !showStartOverlay && (
        <div className={styles.disconnectedContainer}>
          <h2>{agentName} Disconnected</h2>
          <br />
          <h3>Want to continue where we left off?</h3>
          <br />
          <button 
            className={styles.reconnectButton}
            onClick={handleStart}
            title="Connect to a new WebRTC Session"
          >
            Let's continue
          </button>
        </div>
      )}
    </div>
  );
}