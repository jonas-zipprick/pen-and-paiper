export const config = {
    assistantHttpUrl: `${location.protocol}//${location.host}/assistant/`,
    assistantWsUrl: `${location.protocol === 'http:' ? 'ws:' : 'wss:'}//${location.host}/assistant/ws`,
}
