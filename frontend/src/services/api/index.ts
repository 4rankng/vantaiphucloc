import * as sandboxClient from '@/services/sandbox/sandboxClient'

// When VITE_USE_SANDBOX is 'false', swap this with a real Axios-based client
export const apiClient = sandboxClient
