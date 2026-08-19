import React, { useState } from 'react';
import { MessageSquare, Send, X, Bot, User } from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

export const SupportChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: 'Hello! I am your FarmDirect AI Support Assistant. How can I assist with your order or farmer queries today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Simulate response
    setTimeout(() => {
      let botResponse = 'Thank you for reaching out! Our support team and farmer relations manager are reviewing your query.';
      const lower = input.toLowerCase();
      if (lower.includes('order') || lower.includes('track')) {
        botResponse = 'You can track live order status in the "My Orders" tab with real-time GPS step updates.';
      } else if (lower.includes('refund') || lower.includes('cancel')) {
        botResponse = 'For immediate cancellations or refunds, please provide your Order ID (e.g. #ORD-98214) or contact our 24x7 helpline.';
      } else if (lower.includes('farmer') || lower.includes('organic')) {
        botResponse = 'All farmers on FarmDirect are 100% verified with soil and pesticide compliance testing.';
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: botResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 800);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
          zIndex: 999,
          transition: 'transform 0.2s ease',
        }}
        title="24/7 FarmDirect Customer Support"
      >
        <MessageSquare size={26} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '24px',
            width: '360px',
            height: '480px',
            backgroundColor: 'var(--bg-card-solid)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 999,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '1rem', background: 'var(--bg-sidebar)', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={20} style={{ color: '#10b981' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>FarmDirect Live Assistant</div>
                <div style={{ fontSize: '0.725rem', color: '#9ca3af' }}>Instant Help & Support</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ color: '#ffffff' }}><X size={20} /></button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '12px',
                  backgroundColor: m.sender === 'user' ? 'var(--primary)' : 'var(--bg-primary)',
                  color: m.sender === 'user' ? '#ffffff' : 'var(--text-primary)',
                  fontSize: '0.85rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                }}
              >
                <div>{m.text}</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.7, textAlign: 'right', marginTop: '2px' }}>{m.time}</div>
              </div>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{ padding: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="form-input"
              style={{ borderRadius: 'var(--radius-pill)', fontSize: '0.85rem' }}
            />
            <button type="submit" className="btn btn-primary" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
