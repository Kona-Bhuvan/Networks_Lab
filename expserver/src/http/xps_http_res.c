#include "../xps.h"

xps_http_res_t *xps_http_res_create(xps_core_t *core, u_int code)
{
    assert(core != NULL);

    xps_http_res_t *http_res = malloc(sizeof(xps_http_res_t));
    if (http_res == NULL)
    {
        logger(LOG_ERROR, "xps_http_res_create()", "failed to alloc memory for http_res, malloc() returned NULL");
        return NULL;
    }
    vec_init(&http_res->headers);
    http_res->body = xps_buffer_create(DEFAULT_PIPE_BUFF_THRESH, 0, NULL);
    if (http_res->body == NULL)
    {
        vec_deinit(&http_res->headers);
        free(http_res);
        return NULL;
    }

    if (code == HTTP_OK)
    {
        snprintf(http_res->response_line, sizeof(http_res->response_line), "HTTP/1.1 200 OK");
    }
    else if (code == HTTP_BAD_REQUEST)
    {
        snprintf(http_res->response_line, sizeof(http_res->response_line), "HTTP/1.1 400 Bad Request");
    }
    else if (code == HTTP_FORBIDDEN)
    {
        snprintf(http_res->response_line, sizeof(http_res->response_line), "HTTP/1.1 403 Forbidden");
    }
    else if (code == HTTP_NOT_FOUND)
    {
        snprintf(http_res->response_line, sizeof(http_res->response_line), "HTTP/1.1 404 Not Found");
    }
    else if (code == HTTP_INTERNAL_SERVER_ERROR)
    {
        snprintf(http_res->response_line, sizeof(http_res->response_line), "HTTP/1.1 500 Internal Server Error");
    }
    else
    {
        logger(LOG_ERROR, "xps_http_res_create()", "invalid http response code %u", code);
        xps_buffer_destroy(http_res->body);
        vec_deinit(&http_res->headers);
        free(http_res);
        return NULL;
    }

    time_t now = time(NULL);
    struct tm *tm_info = gmtime(&now);
    tm_info->tm_hour += 5;
    tm_info->tm_min += 30;
    mktime(tm_info);
    char time_buf[30];
    strftime(time_buf, sizeof(time_buf), "%a, %d %b %Y %H:%M:%S IST", tm_info);
    if (xps_http_set_header(&http_res->headers, "Date", time_buf) != OK ||
        xps_http_set_header(&http_res->headers, "Server", SERVER_NAME) != OK ||
        xps_http_set_header(&http_res->headers, "Access-Control-Allow-Origin", "*") != OK)
    {
        xps_http_res_destroy(http_res);
        return NULL;
    }

    return http_res;
}

void xps_http_res_destroy(xps_http_res_t *http_res)
{
    assert(http_res != NULL);

    for (int i = 0; i < http_res->headers.length; i++)
    {
        xps_keyval_t *header = http_res->headers.data[i];
        if (header != NULL)
        {
            free(header->key);
            free(header->val);
            free(header);
        }
    }
    vec_deinit(&http_res->headers);

    xps_buffer_destroy(http_res->body);
    free(http_res);
}

xps_buffer_t *xps_http_res_serialize(xps_http_res_t *http_res)
{
    assert(http_res != NULL);

    // Serialize headers
    xps_buffer_t *headers_str = xps_http_serialize_headers(&http_res->headers);
    if (headers_str == NULL)
    {
        logger(LOG_ERROR, "xps_http_res_serialize()", "failed to serialize headers");
        return NULL;
    }

    // Calculate length for final buffer
    size_t final_len = strlen(http_res->response_line) + 2 + headers_str->len + 2 + http_res->body->len;

    // Create instance for final buffer
    xps_buffer_t *buff = xps_buffer_create(final_len, final_len, NULL);
    if (buff == NULL)
    {
        logger(LOG_ERROR, "xps_http_res_serialize()", "failed to create buffer instance");
        xps_buffer_destroy(headers_str);
        return NULL;
    }

    // Copy everything
    /* copy response line */
    memcpy(buff->pos, http_res->response_line, strlen(http_res->response_line));
    buff->pos += strlen(http_res->response_line);
    *(buff->pos++) = '\r';
    *(buff->pos++) = '\n';
    /* copy headers */
    memcpy(buff->pos, headers_str->data, headers_str->len);
    buff->pos += headers_str->len;
    *(buff->pos++) = '\r';
    *(buff->pos++) = '\n';
    /* copy response body*/
    memcpy(buff->pos, http_res->body->data, http_res->body->len);

    xps_buffer_destroy(headers_str);

    return buff;
}

void xps_http_res_set_body(xps_http_res_t *http_res, xps_buffer_t *buff)
{
    assert(http_res != NULL);
    assert(buff != NULL);

    xps_buffer_destroy(http_res->body);
    http_res->body = buff;

    char content_length[20];
    sprintf(content_length, "%zu", buff->len);
    xps_http_set_header(&http_res->headers, "Content-Length", content_length);
}