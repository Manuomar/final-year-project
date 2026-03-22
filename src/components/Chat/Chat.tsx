import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';

interface Message {
  _id: string;
  swapId: string;
  sender: {
    _id: string;
    name: string;
    profilePhoto?: string;
  };
  receiver: {
    _id: string;
    name: string;
  };
  message: string;
  read: boolean;
  createdAt: string;
}

interface SwapInfo {
  _id: string;
  requester: { _id: string; name: string };
  recipient: { _id: string; name: string };
  skillOffered: { name: string; level: string };
  skillRequested: { name: string; level: string };
}

const Chat: React.FC = () => {
  const { user } = useAuth();
  const { swapId } = useParams<{ swapId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [swapInfo, setSwapInfo] = useState<SwapInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch chat messages and swap info
  useEffect(() => {
    const fetchChatData = async () => {
      try {
        setLoading(true);
        
        // Fetch swap info
        const swapResponse = await axios.get(`/api/swaps/my-requests`);
        const swap = swapResponse.data.swapRequests.find(
          (s: SwapInfo) => s._id === swapId
        );
        if (swap) {
          setSwapInfo(swap);
        }

        // Fetch messages
        const messagesResponse = await axios.get(`/api/chat/${swapId}`);
        setMessages(messagesResponse.data.messages);
      } catch (error) {
        console.error('Error fetching chat data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (swapId) {
      fetchChatData();
    }
  }, [swapId]);

  // Poll for new messages every 2 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/chat/${swapId}`);
        setMessages(response.data.messages);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [swapId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || sendingMessage) return;

    try {
      setSendingMessage(true);
      await axios.post(`/api/chat/${swapId}/send`, {
        message: inputValue
      });

      setInputValue('');

      // Fetch updated messages
      const response = await axios.get(`/api/chat/${swapId}`);
      setMessages(response.data.messages);
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert(error.response?.data?.error || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const otherUser = swapInfo ? (
    user?._id === swapInfo.requester._id ? swapInfo.recipient : swapInfo.requester
  ) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto h-[80vh] mt-5 flex flex-col bg-[#212121]">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/swaps')}
            className="hover:bg-blue-700 p-2 rounded transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">{otherUser?.name || 'Chat'}</h1>
            {swapInfo && (
              <p className="text-sm text-blue-100">
                {swapInfo.skillOffered.name} ↔ {swapInfo.skillRequested.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwnMessage = msg.sender._id === user?._id;
              return (
                <div
                  key={msg._id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isOwnMessage
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-gray-300 text-gray-900 rounded-bl-none'
                    }`}
                  >
                    <p className="break-words">{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-blue-200' : 'text-gray-600'
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sendingMessage}
          />
          <button
            type="submit"
            disabled={sendingMessage || !inputValue.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
