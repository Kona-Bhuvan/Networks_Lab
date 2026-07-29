import dotenv from 'dotenv'
import { DEV_NETOWRK, PROD_NETWORK } from './constants';


dotenv.config();

const HOST_PWD = process.env.HOST_PWD;

// database config
const POSTGRES_DB = process.env.POSTGRES_DB;
const POSTGRES_USER = process.env.POSTGRES_USER;
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD;
const POSTGRES_HOST = process.env.POSTGRES_HOST || '127.0.0.1';

const DEBUG = process.env.DEBUG == 'true'

const NETWORK_INTERFACE = DEBUG
    ? DEV_NETOWRK
    : PROD_NETWORK

const Config = {
    HOST_PWD,

    POSTGRES_DB,
    POSTGRES_HOST,
    POSTGRES_USER,
    POSTGRES_PASSWORD,

    DEBUG,
    NETWORK_INTERFACE,
}

export default Config;