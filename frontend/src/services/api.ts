import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

export interface ChatMessage {
  id: string;
  message: string;
  response: string;
  report?: BiasReport;
  timestamp: string;
}

export interface BiasReport {
  result: 'Bias' | 'Not Bias';
  explanation: string;
  howToFix: string;
}

export interface ChatHistory {
  chatId: string; // <-- Change to 'chatId'
  lastMessage: string; // <-- Change to 'lastMessage'
  createdAt: string;
}

export const authApi = {
  login: async (data: LoginRequest) => {
    const response = await api.post('/login', data);
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  },

  signup: async (data: SignupRequest) => {
    const response = await api.post('/signup', data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('authToken');
  },
};

export const chatApi = {
  getHistory: async (): Promise<ChatHistory[]> => {
    const response = await api.get('/api/history');
    return response.data;
  },

  newChat: async (): Promise<{ chatId: string }> => {
    const response = await api.post('/api/chat/new');
    return response.data;
  },

  sendMessage: async (chatId: string, message: string, fileUrl?: string) => {
    const response = await api.post('/api/chat', {
      chatId,
      message,
      fileUrl,
    });
    return response.data;
  },

  uploadFile: async (file: File): Promise<{ fileUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default api;
