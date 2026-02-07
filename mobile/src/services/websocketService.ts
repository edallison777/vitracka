import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

interface WebSocketMessage {
    type: string;
    payload: any;
    timestamp: number;
    messageId: string;
}

interface AgentInteraction {
    agentType: 'concierge' | 'coach' | 'safety' | 'medical' | 'progress' | 'nutrition' | 'gamification';
    request: any;
    response?: any;
    timestamp: number;
    sessionId: string;
}

type WebSocketEventHandler = (message: WebSocketMessage) => void;
type ConnectionStatusHandler = (status: 'connected' | 'disconnected' | 'connecting' | 'error') => void;

class WebSocketService {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000; // Start with 1 second
    private maxReconnectDelay = 30000; // Max 30 seconds
    private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map();
    private connectionStatusHandlers: ConnectionStatusHandler[] = [];
    private isConnecting = false;
    private shouldReconnect = true;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private sessionId: string = '';

    private readonly WS_URL = __DEV__
        ? 'ws://localhost:3000/ws'
        : 'wss://api.vitracka.com/ws';

    constructor() {
        this.generateSessionId();
        this.setupAppStateListener();
    }

    private generateSessionId(): void {
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    private setupAppStateListener(): void {
        AppState.addEventListener('change', this.handleAppStateChange);
    }

    private handleAppStateChange = (nextAppState: AppStateStatus): void => {
        if (nextAppState === 'active' && !this.ws) {
            // App came to foreground, reconnect if needed
            this.connect();
        } else if (nextAppState === 'background') {
            // App went to background, maintain connection but reduce activity
            this.stopHeartbeat();
        }
    };

    async connect(): Promise<void> {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            return;
        }

        this.isConnecting = true;
        this.notifyConnectionStatus('connecting');

        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (!token) {
                this.isConnecting = false;
                this.notifyConnectionStatus('error');
                throw new Error('No authentication token available');
            }

            const wsUrl = `${this.WS_URL}?token=${encodeURIComponent(token)}&sessionId=${this.sessionId}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = this.handleOpen;
            this.ws.onmessage = this.handleMessage;
            this.ws.onclose = this.handleClose;
            this.ws.onerror = this.handleError;

        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.isConnecting = false;
            this.notifyConnectionStatus('error');
            this.scheduleReconnect();
            throw error; // Re-throw the error for proper test handling
        }
    }

    private handleOpen = (): void => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.notifyConnectionStatus('connected');
        this.startHeartbeat();
    };

    private handleMessage = (event: { data: string }): void => {
        try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.processMessage(message);
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    };

    private handleClose = (event: { code: number; reason: string }): void => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.ws = null;
        this.isConnecting = false;
        this.stopHeartbeat();
        this.notifyConnectionStatus('disconnected');

        if (this.shouldReconnect && event.code !== 1000) {
            // Don't reconnect if it was a normal closure
            this.scheduleReconnect();
        }
    };

    private handleError = (error: Event): void => {
        console.error('WebSocket error:', error);
        this.notifyConnectionStatus('error');
    };

    private processMessage(message: WebSocketMessage): void {
        const handlers = this.eventHandlers.get(message.type) || [];
        handlers.forEach(handler => {
            try {
                handler(message);
            } catch (error) {
                console.error('Error in WebSocket message handler:', error);
            }
        });
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);

        console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

        setTimeout(() => {
            if (this.shouldReconnect) {
                this.connect();
            }
        }, delay);
    }

    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.send('heartbeat', { timestamp: Date.now() });
            }
        }, 30000); // Send heartbeat every 30 seconds
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private notifyConnectionStatus(status: 'connected' | 'disconnected' | 'connecting' | 'error'): void {
        this.connectionStatusHandlers.forEach(handler => {
            try {
                handler(status);
            } catch (error) {
                console.error('Error in connection status handler:', error);
            }
        });
    }

    send(type: string, payload: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not connected, message not sent:', type);
            return;
        }

        const message: WebSocketMessage = {
            type,
            payload,
            timestamp: Date.now(),
            messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
        };

        this.ws.send(JSON.stringify(message));
    }

    // Agent interaction methods
    async sendAgentRequest(agentType: AgentInteraction['agentType'], request: any): Promise<string> {
        const interactionId = `interaction_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        this.send('agent_request', {
            interactionId,
            agentType,
            request,
            sessionId: this.sessionId
        });

        return interactionId;
    }

    // Event subscription methods
    on(eventType: string, handler: WebSocketEventHandler): void {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType)!.push(handler);
    }

    off(eventType: string, handler: WebSocketEventHandler): void {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    onConnectionStatus(handler: ConnectionStatusHandler): void {
        this.connectionStatusHandlers.push(handler);
    }

    offConnectionStatus(handler: ConnectionStatusHandler): void {
        const index = this.connectionStatusHandlers.indexOf(handler);
        if (index > -1) {
            this.connectionStatusHandlers.splice(index, 1);
        }
    }

    disconnect(): void {
        this.shouldReconnect = false;
        this.stopHeartbeat();

        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
    }

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    getSessionId(): string {
        return this.sessionId;
    }
}

export const websocketService = new WebSocketService();