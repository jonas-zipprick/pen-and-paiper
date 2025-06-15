export type Tab = 'uploader' | 'streamer';
export type UploadStatus = 'idle' | 'loading' | 'success' | 'error';
export type SocketStatus = 'Connecting' | 'Connected' | 'Disconnected' | 'Error';
export type RecordingStatus = 'idle' | 'permission-pending' | 'recording' | 'stopped' | 'error';