#include "../xps.h"

int http_process_request_line(xps_http_req_t *http_req, xps_buffer_t *buff)
{
    int error = xps_http_parse_request_line(http_req, buff);
    if (error != OK)
        return error;
    http_req->request_line = str_from_ptrs(http_req->request_line_start, http_req->request_line_end);
    http_req->method = str_from_ptrs(http_req->method_start, http_req->method_end);
    http_req->uri = str_from_ptrs(http_req->uri_start, http_req->uri_end);
    http_req->http_version = str_from_ptrs(http_req->http_major, http_req->http_minor);

    http_req->schema = (http_req->schema_start != NULL) ? str_from_ptrs(http_req->schema_start, http_req->schema_end) : NULL;
    http_req->host = (http_req->host_start != NULL) ? str_from_ptrs(http_req->host_start, http_req->host_end) : NULL;
    http_req->path = (http_req->path_start != NULL) ? str_from_ptrs(http_req->path_start, http_req->path_end) : NULL;
    http_req->pathname = (http_req->pathname_start != NULL) ? str_from_ptrs(http_req->pathname_start, http_req->pathname_end) : NULL;

    http_req->port = -1;
    if (http_req->port_start != NULL && http_req->port_end != NULL)
    {
        char *port_str = str_from_ptrs(http_req->port_start, http_req->port_end);
        http_req->port = atoi(port_str);
        free(port_str);
    }
    else
    {
        if (http_req->schema != NULL && strcmp(http_req->schema, "https") == 0)
            http_req->port = 443;
        else
            http_req->port = 80;
    }

    printf("REQUEST LINE: %s", http_req->request_line);
    printf("METHOD: %s\n", http_req->method);
    printf("URI: %s\n", http_req->uri);
    printf("SCHEMA: %s\n", http_req->schema != NULL ? http_req->schema : "");
    printf("HOST: %s\n", http_req->host != NULL ? http_req->host : "");
    printf("PORT: %d\n", http_req->port);
    printf("PATH: %s\n", http_req->path != NULL ? http_req->path : "");
    printf("PATHNAME: %s\n", http_req->pathname != NULL ? http_req->pathname : "");
    printf("HTTP VERSION: %s\n", http_req->http_version);

    return OK;
}

int http_process_headers(xps_http_req_t *http_req, xps_buffer_t *buff)
{
    assert(http_req != NULL);
    assert(buff != NULL);

    /*initialize headers list of http_req*/
    vec_init(&http_req->headers);
    http_req->headers.length = 0;
    int error;
    while (1)
    {
        http_req->header_key_start = NULL;
        http_req->header_key_end = NULL;
        http_req->header_val_start = NULL;
        http_req->header_val_end = NULL;
        error = xps_http_parse_header_line(http_req, buff);
        if (error == E_FAIL || error == E_AGAIN)
            break;
        if (error == OK || error == E_NEXT)
        {
            if (http_req->header_key_start == NULL)
                return OK;
            /* Alloc memory for new header*/
            /*assign key,val from their corresponding start and end pointers*/
            /*push this header into headers list of http_req*/
            /*if error is E_NEXT continue*/
            xps_keyval_t *header = malloc(sizeof(xps_keyval_t));
            if (header == NULL)
            {
                logger(LOG_ERROR, "http_process_headers()", "malloc() failed for header");
                return E_FAIL;
            }
            header->key = str_from_ptrs(http_req->header_key_start, http_req->header_key_end);
            header->val = str_from_ptrs(http_req->header_val_start, http_req->header_val_end);
            vec_push(&http_req->headers, header);
            if (error == E_NEXT)
                continue;
        }

        printf("\n\nHEADERS\n");
        for (int i = 0; i < http_req->headers.length; i++)
        {
            xps_keyval_t *header = http_req->headers.data[i];
            printf("%s: %s\n", header->key, header->val);
        }
        printf("\n");

        return OK;
    }
    /*error occurs, thus iterate through header list, free each header*/
    for (int i = 0; i < http_req->headers.length; i++)
    {
        xps_keyval_t *header = http_req->headers.data[i];
        free(header->key);
        free(header->val);
        free(header);
    }
    /*deinitialize headers list*/
    vec_deinit(&http_req->headers);
    return E_FAIL;
}

xps_buffer_t *xps_http_req_serialize(xps_http_req_t *http_req)
{
    assert(http_req != NULL);

    /* Serialize headers into a buffer headers_str*/
    xps_buffer_t *headers_str = xps_http_serialize_headers(&http_req->headers);
    
    size_t final_len = strlen(http_req->request_line) + 1 + headers_str->len + 1; /*Calculate length for final buffer*/
    /*Create instance for final buffer*/
    xps_buffer_t *buff = xps_buffer_create(final_len, 0, NULL);

    /*Copy everything to final buffer*/
    memcpy(buff->pos, http_req->request_line, strlen(http_req->request_line));
    buff->pos += strlen(http_req->request_line);
    /*similarly copy "\n", headers_str, "\n"*/
    memcpy(buff->pos, "\n", 1);
    buff->pos += 1;
    memcpy(buff->pos, headers_str->data, headers_str->len);
    buff->pos += headers_str->len;
    memcpy(buff->pos, "\n", 1);
    buff->pos += 1;

    /*destroy headers_str buffer*/
    xps_buffer_destroy(headers_str);
    return buff;
}

/*Reads the raw HTTP request data from buff, creates an xps_http_req_t structure to hold the deserialized data, populates it by processing the request line and headers as discussed above, and returns the structure. The parser state is initialized to RL_START before processing begins.
 */
xps_http_req_t *xps_http_req_create(xps_core_t *core, xps_buffer_t *buff, int *error)
{
    /*assert*/
    assert(core != NULL);
    assert(buff != NULL);

    *error = E_FAIL;
    /* Alloc memory for http_req instance*/
    xps_http_req_t *http_req = malloc(sizeof(xps_http_req_t));
    if (http_req == NULL)
    {
        logger(LOG_ERROR, "xps_http_req_create()", "malloc() failed for http_req");
        return NULL;
    }
    memset(http_req, 0, sizeof(xps_http_req_t));
    /*Set initial parser state*/
    http_req->parser_state = RL_START;

    /*Process request line and handle possible errors*/
    *error = http_process_request_line(http_req, buff);
    if (*error != OK)
    {
        free(http_req);
        return NULL;
    }
    /*Process headers and handle possible errors*/
    *error = http_process_headers(http_req, buff);
    if (*error != OK)
    {
        free(http_req);
        return NULL;
    }
    // Header length
    http_req->header_len = (size_t)(buff->pos - buff->data);
    // Body length is retrieved from header Content-Length
    http_req->body_len = 0;
    const char *body_len_str = xps_http_get_header(&http_req->headers, "Content-Length");
    if (body_len_str != NULL)
    {
        http_req->body_len = atoi(body_len_str);
    }
    *error = OK;
    return http_req;
}

void xps_http_req_destroy(xps_core_t *core, xps_http_req_t *http_req)
{
    assert(http_req != NULL);
    /*Frees memory allocated for various components of the HTTP request line(request line, method,etc)*/
    free(http_req->request_line);
    free(http_req->method);
    free(http_req->uri);
    free(http_req->schema);
    free(http_req->host);
    free(http_req->path);
    free(http_req->pathname);
    /*iterate through the headers list of http_req and free the memory*/
    for (int i = 0; i < http_req->headers.length; i++)
    {
        xps_keyval_t *header = http_req->headers.data[i];
        free(header->key);
        free(header->val);
        free(header);
    }
    /*de-intialize the headers list*/
    vec_deinit(&http_req->headers);
    /*free http_req*/
    free(http_req);
}