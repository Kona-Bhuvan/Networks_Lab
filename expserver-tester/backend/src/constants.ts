export const LOCALHOST = '127.0.0.1';

export const TESTER_PORT = 6969;

export const WEBSOCKET_PORT = 6970;

export const SERVER_PORT_TEMP = 8080;

export const SERVER_PORTS_FINAL = [8001, 8002, 8003, 8004];

export const FILE_EXECUTABLE_PERMS = 0o755;

export const NUM_STAGES = 5;

export const TERMINAL_MAX_LIMIT = 10000;

export const IMAGE_NAME = 'expserver-tester-image';

export const WORKDIR = '/usr/src/app';

export const PUBLIC_DIR = '/usr/src/public';

export const DEV_NETOWRK = 'eXpServer-network-dev';

export const PROD_NETWORK = 'eXpServer-network-prod';

/**
 * error types
 * prepend http_
 */
export enum ErrorTypes {
    VALIDATION_ERROR = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    SERVER_ERROR = 500
};