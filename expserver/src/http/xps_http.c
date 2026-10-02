#include "../xps.h"

bool http_strcmp(u_char *str, const char *method, size_t length)
{
    for (size_t i = 0; i < length; i++)
    {
        if (str[i] != method[i])
            return false;
    }
    return true;
}

int xps_http_parse_request_line(xps_http_req_t *http_req, xps_buffer_t *buff)
{
    assert(http_req != NULL);
    assert(buff != NULL);

    /*get current parser state*/
    u_char *p_ch = buff->pos; // current buffer postion
    xps_http_parser_state_t parser_state = http_req->parser_state;
    u_char *p_end = buff->data + buff->len;

    for (; p_ch < p_end; p_ch++)
    {
        char ch = *p_ch;
        switch (parser_state)
        {
        case RL_START:
        {
            /*assign request_line_start, ignore CR and LF, fail if not upper case, assign method_start*/
            if (ch == CR || ch == LF)
            {
                break;
            }
            if ('A' <= ch && ch <= 'Z')
            {
                http_req->request_line_start = p_ch;
                http_req->method_start = p_ch;
            }
            else
                return E_FAIL;
            parser_state = RL_METHOD;
        }
        break;

        case RL_METHOD:
            if (ch == ' ')
            {
                size_t method_len = p_ch - http_req->method_start;
                if (method_len == 3 && http_strcmp(http_req->method_start, "GET", 3))
                    http_req->method_n = HTTP_GET;
                else if (method_len == 4 && http_strcmp(http_req->method_start, "HEAD", 4))
                    http_req->method_n = HTTP_HEAD;
                else if (method_len == 4 && http_strcmp(http_req->method_start, "POST", 4))
                    http_req->method_n = HTTP_POST;
                else if (method_len == 3 && http_strcmp(http_req->method_start, "PUT", 3))
                    http_req->method_n = HTTP_PUT;
                else if (method_len == 6 && http_strcmp(http_req->method_start, "DELETE", 6))
                    http_req->method_n = HTTP_DELETE;
                else if (method_len == 7 && http_strcmp(http_req->method_start, "OPTIONS", 7))
                    http_req->method_n = HTTP_OPTIONS;
                else if (method_len == 5 && http_strcmp(http_req->method_start, "TRACE", 5))
                    http_req->method_n = HTTP_TRACE;
                else if (method_len == 7 && http_strcmp(http_req->method_start, "CONNECT", 7))
                    http_req->method_n = HTTP_CONNECT;
                else
                    return E_FAIL;
                http_req->method_end = p_ch;
                parser_state = RL_SP_AFTER_METHOD;
            }
            break;

        case RL_SP_AFTER_METHOD:
            if (ch == '/')
            {
                /*assign start and end of schema,host,port and start of uri,path,pathname*/
                http_req->schema_start = NULL;
                http_req->schema_end = NULL;
                http_req->host_start = NULL;
                http_req->host_end = NULL;
                http_req->port_start = NULL;
                http_req->port_end = NULL;
                http_req->uri_start = p_ch;
                http_req->path_start = p_ch;
                http_req->pathname_start = p_ch;
                /*next state is RL_PATH*/
                parser_state = RL_PATH;
            }
            else
            {
                char c = ch | 0x20; // convert to lower case
                /*if lower case alphabets, assign start of schema and uri, next state is RL_SCHEMA*/
                if (c >= 'a' && c <= 'z')
                {
                    http_req->schema_start = p_ch;
                    http_req->uri_start = p_ch;
                    parser_state = RL_SCHEMA;
                }
                /*if not space(''), fails*/
                // if (ch != ' ')
                // {
                //     return E_FAIL;
                // }
            }
            break;

        case RL_SCHEMA:
            /*on lower case alphabets break ie schema can have lower case alphabets*/
            /*schema ends on ':' ,next state is RL_SCHEMA_SLASH*/
            /*fails on all other inputs*/
            if ('a' <= ch && ch <= 'z')
            {
                break;
            }
            else if (ch == ':')
            {
                http_req->schema_end = p_ch;
                parser_state = RL_SCHEMA_SLASH;
            }
            else
            {
                return E_FAIL;
            }
            break;

        case RL_SCHEMA_SLASH:
            /*on '/' assign next state, fails on all other inputs*/
            if (ch == '/')
                parser_state = RL_SCHEMA_SLASH_SLASH;
            else
                return E_FAIL;
            break;

        case RL_SCHEMA_SLASH_SLASH:
            /*on '/' - assign next state, for start of host assign next position, fails on all other inputs*/
            if (ch == '/')
            {
                http_req->host_start = p_ch + 1;
                parser_state = RL_HOST;
            }
            else
                return E_FAIL;
            break;

        case RL_HOST:
            /*host can have lower case alphabets, numbers, '-', '.' */
            /*on ':' - host ends, for start of port assign next position, next state is RL_PORT*/
            /*on '/' - host ends, assign start of path,pathname, end of port, next state is RL_PATH*/
            /*on ' ' - host ends, assign end of uri, start and end of port,path,pathname, next state is RL_VERSION_START*/
            /*on all other input, fails*/
            if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch == '-' || ch == '.')
            {
                break;
            }
            else if (ch == ':')
            {
                http_req->host_end = p_ch;
                http_req->port_start = p_ch + 1;
                parser_state = RL_PORT;
            }
            else if (ch == '/')
            {
                http_req->host_end = p_ch;
                http_req->port_start = NULL;
                http_req->port_end = NULL;
                http_req->path_start = p_ch;
                http_req->pathname_start = p_ch;
                parser_state = RL_PATH;
            }
            else if (ch == ' ')
            {
                http_req->host_end = p_ch;
                http_req->uri_end = p_ch;
                http_req->port_start = NULL;
                http_req->port_end = NULL;
                http_req->path_start = NULL;
                http_req->path_end = NULL;
                http_req->pathname_start = NULL;
                http_req->pathname_end = NULL;
                parser_state = RL_VERSION_START;
            }
            else
                return E_FAIL;
            break;

        case RL_PORT:
            /*port can only have numbers */
            /*on '/' - port ends, assign start of path,pathname, next state is RL_PATH*/
            /*on ' ' - port ends, assign end of uri, start and end of path,pathname, next state is RL_VERSION_START*/
            /*on all other input, fails*/
            if ('0' <= ch && ch <= '9')
                break;
            else if (ch == '/')
            {
                http_req->port_end = p_ch;
                http_req->path_start = p_ch;
                http_req->pathname_start = p_ch;
                parser_state = RL_PATH;
            }
            else if (ch == ' ')
            {
                http_req->port_end = p_ch;
                http_req->uri_end = p_ch;
                http_req->path_start = NULL;
                http_req->path_end = NULL;
                http_req->pathname_start = NULL;
                http_req->pathname_end = NULL;
                parser_state = RL_VERSION_START;
            }
            else
                return E_FAIL;
            break;

        case RL_PATH:
            /*on ' ' - path ends, assign end of path,pathname,uri next state is RL_VERSION_START*/
            /*on '?'or'&'or'='or'#' - assign end of path, next state is RL_PATHNAME*/
            /*on CR or LF, fails*/
            if (ch == ' ')
            {
                http_req->path_end = p_ch;
                http_req->pathname_end = p_ch;
                http_req->uri_end = p_ch;
                parser_state = RL_VERSION_START;
            }
            else if (ch == '?' || ch == '&' || ch == '=' || ch == '#')
            {
                http_req->path_end = p_ch;
                parser_state = RL_PATHNAME;
            }
            else if (ch == CR || ch == LF)
            {
                return E_FAIL;
            }
            break;

        case RL_PATHNAME:
            /*on ' ' - assign end of uri,pathname, next state is RL_VERSION_START*/
            /*on CR or LF, fails*/
            if (ch == ' ')
            {
                http_req->pathname_end = p_ch;
                http_req->uri_end = p_ch;
                parser_state = RL_VERSION_START;
            }
            else if (ch == CR || ch == LF)
            {
                return E_FAIL;
            }
            break;

        case RL_VERSION_START:
            /*can have space*/
            /*on 'H' - next state is RL_VERSION_H*/
            /*fails on all other input*/
            if (ch == ' ')
            {
                break;
            }
            else if (ch == 'H')
            {
                parser_state = RL_VERSION_H;
            }
            else
                return E_FAIL;
            break;

        case RL_VERSION_H:
            /*fill this*/
            if (ch == 'T')
            {
                parser_state = RL_VERSION_HT;
            }
            else
                return E_FAIL;
            break;

        case RL_VERSION_HT:
            /*fill this*/
            if (ch == 'T')
            {
                parser_state = RL_VERSION_HTT;
            }
            else
                return E_FAIL;
            break;

        case RL_VERSION_HTT:
            /*fill this*/
            if (ch == 'P')
            {
                parser_state = RL_VERSION_HTTP;
            }
            else
                return E_FAIL;
            break;

        case RL_VERSION_HTTP:
            /*fill this*/
            if (ch == '/')
            {
                parser_state = RL_VERSION_HTTP_SLASH;
            }
            else
                return E_FAIL;
            break;

        case RL_VERSION_HTTP_SLASH:
            /*on '1' - assign major, next state is RL_VERSION_MAJOR, fails on all other inputs*/
            if (ch == '1')
            {
                http_req->http_major = p_ch;
                parser_state = RL_VERSION_MAJOR;
            }
            else
                return E_FAIL;
            break;

        case RL_VERSION_MAJOR:
            /*fill ths*/
            if (ch == '.')
            {
                parser_state = RL_VERSION_DOT;
            }
            else
                return E_FAIL;
            break;

        case RL_VERSION_DOT:
            /*on '0' or '1' - assign minor to next position, next state is RL_VERSION_MINOR, fails on other inputs*/
            if (ch == '0' || ch == '1')
            {
                http_req->http_minor = p_ch + 1;
                parser_state = RL_VERSION_MINOR;
            }
            else
                return E_FAIL;
            break;

        case RL_VERSION_MINOR:
            if (ch == CR)
            {
                parser_state = RL_CR;
            }
            else if (ch == LF)
            {
                parser_state = RL_LF;
            }
            else
            {
                return E_FAIL;
            }
            break;

        case RL_CR:
            /*fill this*/
            if (ch == LF)
            {
                parser_state = RL_LF;
            }
            else
                return E_FAIL;
            break;

        case RL_LF:
            if (http_req->request_line_end == NULL)
            {
                http_req->request_line_end = p_ch;
            }
            http_req->parser_state = H_START;
            buff->pos = p_ch;
            return OK;

        default:
            logger(LOG_ERROR, "xps_http_parse_request_line()", "invalid parser state");
            return E_FAIL;
        }
    }

    logger(LOG_DEBUG, "xps_http_parse_request_line()", "request line parsing incomplete, waiting for more data");

    return E_AGAIN;
}

int xps_http_parse_header_line(xps_http_req_t *http_req, xps_buffer_t *buff)
{
    assert(http_req != NULL);
    assert(buff != NULL);

    u_char *p_ch = buff->pos;
    xps_http_parser_state_t parser_state = http_req->parser_state;
    u_char *p_end = buff->data + buff->len;

    for (; p_ch < p_end; p_ch++)
    {
        char ch = *p_ch;

        switch (parser_state)
        {
        case H_START:
            if (('a' <= ch && ch <= 'z') || ('A' <= ch && ch <= 'Z'))
            {
                http_req->header_key_start = p_ch;
                parser_state = H_NAME;
            }
            else
                return E_FAIL;
            break;

        case H_NAME:
            if (('a' <= ch && ch <= 'z') || ('A' <= ch && ch <= 'Z') ||
                ('0' <= ch && ch <= '9') || ch == '-')
            {
                break;
            }
            else if (ch == ':')
            {
                http_req->header_key_end = p_ch;
                parser_state = H_COLON;
            }
            else
                return E_FAIL;
            break;

        case H_COLON:
            if (ch == ' ')
            {
                parser_state = H_SP_AFTER_COLON;
            }
            else if (ch != CR && ch != LF)
            {
                http_req->header_val_start = p_ch;
                parser_state = H_VAL;
            }
            else
                return E_FAIL;
            break;

        case H_SP_AFTER_COLON:
            if (ch == ' ')
            {
                break;
            }
            else if (ch != CR && ch != LF)
            {
                http_req->header_val_start = p_ch;
                parser_state = H_VAL;
            }
            else
                return E_FAIL;
            break;

        case H_VAL:
            if (ch == CR || ch == LF)
            {
                http_req->header_val_end = p_ch;
                parser_state = (ch == CR) ? H_CR : H_LF;
            }
            break;

        case H_CR:
            if (ch == LF)
            {
                parser_state = H_LF;
            }
            else
            {
                return E_FAIL;
            }
            break;

        case H_LF:
            if (ch == LF)
            {
                parser_state = H_LF_LF;
            }
            else if (ch == CR)
            {
                parser_state = H_LF_CR;
            }
            else
            {
                buff->pos = p_ch;
                http_req->parser_state = H_START;
                return E_NEXT; // This header is done, repeat for the next
            }
            break;

        case H_LF_LF:
            buff->pos = p_ch;
            http_req->parser_state = H_START;
            return OK; // HTTP complete header section done

        case H_LF_CR:
            if (ch == LF)
            {
                buff->pos = p_ch;
                http_req->parser_state = H_START;
                return OK; // HTTP complete header section done
            }
            else
            {
                return E_FAIL;
            }
            break;

        default:
            return E_FAIL;
        }
    }

    logger(LOG_DEBUG, "xps_http_parse_header_line()", "header line parsing incomplete, waiting for more data");

    return E_AGAIN;
}

const char *xps_http_get_header(vec_void_t *headers, const char *key)
{
    assert(headers != NULL);
    assert(key != NULL);

    for (int i = 0; i < headers->length; i++)
    {
        xps_keyval_t *header = headers->data[i];
        if (strcasecmp(header->key, key) == 0)
        {
            return header->val;
        }
    }

    logger(LOG_DEBUG, "xps_http_get_header()", "header not found");

    return NULL;
}

xps_buffer_t *xps_http_serialize_headers(vec_void_t *headers)
{
    assert(headers != NULL);

    xps_buffer_t *buff = xps_buffer_create(DEFAULT_PIPE_BUFF_THRESH, 0, NULL);
    buff->data[0] = '\0';
    for (int i = 0; i < headers->length; i++)
    {
        /*get required length to store a header*/
        xps_keyval_t *header = headers->data[i];
        size_t header_str_len = strlen(header->key) + strlen(header->val) + 5; // +5 for ':', ' ', '\r', '\n' and '\0'
        char header_str[header_str_len];
        sprintf(header_str, "%s: %s\n", header->key, header->val);
        if ((buff->size - buff->len) < header_str_len)
        {                                                     // buffer is small
            u_char *new_data = realloc(buff, 2 * buff->size); /*realloc() buffer to twice size*/
            /*handle error*/
            if (new_data == NULL)
            {
                return NULL;
            }
            /*update buff->data and buff->size*/
            buff->data = new_data;
            buff->size *= 2;
        }
        strcat(buff->data, header_str);
        buff->len = strlen(buff->data);
    }

    logger(LOG_DEBUG, "xps_http_serialize_headers()", "serialized headers into buffer");

    return buff;
}