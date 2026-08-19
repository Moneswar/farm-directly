import React, { useState, useEffect } from 'react';
import { Mic, MicOff, X, Volume2 } from 'lucide-react';

export const VoiceSearch: React.FC<{ isOpen: boolean; onClose: () => void; onSearch: (query: string) => void }> = ({
  isOpen,
  onClose,
  onSearch,
}) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setListening(false);
      setTranscript('');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setTranscript('Voice search is not supported on this browser. Try Chrome/Edge or type manually.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onstart = () => setListening(true);
    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const text = event.results[current][0].transcript;
      setTranscript(text);
    };
    recognition.onend = () => setListening(false);

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
    }

    return () => {
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1.2rem' }}>Voice Assistant</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ margin: '2rem 0' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: listening ? 'var(--danger-light)' : 'var(--primary-light)',
              color: listening ? 'var(--danger)' : 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justify: 'center',
              boxShadow: listening ? '0 0 0 12px rgba(239, 68, 68, 0.2)' : '0 0 0 12px rgba(16, 185, 129, 0.2)',
              transition: 'all 0.3s ease',
            }}
          >
            {listening ? <Mic size={36} /> : <MicOff size={36} />}
          </div>
          <p style={{ marginTop: '1.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {listening ? 'Listening... Speak "Organic Tomatoes" or "Honey"...' : 'Click submit or try again'}
          </p>
        </div>

        <div style={{ padding: '1rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', minHeight: '60px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Volume2 size={18} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontStyle: 'italic', color: transcript ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {transcript || 'Say something...'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!transcript}
            onClick={() => {
              onSearch(transcript);
              onClose();
            }}
          >
            Search Now
          </button>
        </div>
      </div>
    </div>
  );
};
