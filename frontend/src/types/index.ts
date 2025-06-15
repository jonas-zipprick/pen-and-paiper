export type Tab = 'uploader' | 'streamer';
export type UploadStatus = 'idle' | 'loading' | 'success' | 'error';
export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type RecordingStatus = 'idle' | 'permission-pending' | 'recording' | 'stopped' | 'error';