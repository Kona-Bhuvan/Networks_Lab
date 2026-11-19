#include "xps.h"
#include <string.h>

xps_cliargs_t *cliargs = NULL;
xps_config_t *config = NULL;
xps_core_t *core = NULL;

void sigint_handler(int signum);
int core_create(xps_config_t *config);
void core_destroy(xps_core_t *core);
void listener_connection_handler(void *ptr);
void test_gzip(int level, char *output_file);

int main(int argc, char *argv[])
{
    signal(SIGINT, sigint_handler);
    cliargs = xps_cliargs_create(argc, argv);

    if (cliargs == NULL)
    {
        logger(LOG_ERROR, "main()", "xps_cliargs_create() failed");
        exit(EXIT_FAILURE);
    }

    config = xps_config_create(cliargs->config_path);
    if (config == NULL)
    {
        logger(LOG_ERROR, "main()", "xps_config_create() failed");
        xps_cliargs_destroy(cliargs);
        exit(EXIT_FAILURE);
    }

    if (core_create(config) != 0)
    {
        logger(LOG_ERROR, "main()", "core_create() failed");
        xps_config_destroy(config);
        xps_cliargs_destroy(cliargs);
        exit(EXIT_FAILURE);
    }

    // test_gzip(1, "output1.gz");
    // test_gzip(6, "output6.gz");
    // test_gzip(9, "output9.gz");

    xps_core_start(core);

    return 0;
}

int core_create(xps_config_t *config)
{
    assert(config != NULL);

    core = xps_core_create(config);
    if (core == NULL)
    {
        logger(LOG_ERROR, "core_create()", "xps_core_create() failed");
        return E_FAIL;
    }

    for (int i = 0; i < config->_all_listeners.length; i++)
    {
        xps_config_listener_t *config_listener = (xps_config_listener_t *)config->_all_listeners.data[i];
        if (config_listener == NULL)
            continue;

        xps_listener_t *listener = xps_listener_create(config_listener->host, config_listener->port);
        if (listener == NULL)
        {
            logger(LOG_ERROR, "core_create()", "xps_listener_create() failed for %s:%d", config_listener->host, config_listener->port);
            xps_core_destroy(core);
            return E_FAIL;
        }
        listener->core = core;

        int dup_fd = dup(listener->sock_fd);
        if (dup_fd < 0)
        {
            logger(LOG_ERROR, "core_create()", "dup() failed for listener %s:%d", config_listener->host, config_listener->port);
            xps_listener_destroy(listener);
            xps_core_destroy(core);
            return E_FAIL;
        }

        xps_listener_t *dup_listener = malloc(sizeof(xps_listener_t));
        if (dup_listener == NULL)
        {
            logger(LOG_ERROR, "core_create()", "malloc() failed for dup_listener");
            close(dup_fd);
            xps_listener_destroy(listener);
            xps_core_destroy(core);
            return E_FAIL;
        }
        dup_listener->core = core;
        dup_listener->host = config_listener->host;
        dup_listener->port = config_listener->port;
        dup_listener->sock_fd = dup_fd;

        if (xps_loop_attach(core->loop, dup_fd, EPOLLIN | EPOLLET, dup_listener, listener_connection_handler, NULL, NULL) != 0)
        {
            logger(LOG_ERROR, "core_create()", "xps_loop_attach() failed for listener %s:%d", config_listener->host, config_listener->port);
            close(dup_fd);
            free(dup_listener);
            xps_listener_destroy(listener);
            xps_core_destroy(core);
            return E_FAIL;
        }

        vec_push(&(core->listeners), dup_listener);

        close(listener->sock_fd);
        free(listener);

        logger(LOG_INFO, "core_create()", "Server listening on http://%s:%d", config_listener->host, config_listener->port);
    }

    return 0;
}

void core_destroy(xps_core_t *core)
{
    assert(core != NULL);

    xps_core_destroy(core);
}

void sigint_handler(int signum)
{
    printf("\n");
    logger(LOG_WARNING, "sigint_handler()", "SIGINT received");

    if (core != NULL)
    {
        core_destroy(core);
        core = NULL;
    }
    if (config != NULL)
    {
        xps_config_destroy(config);
        config = NULL;
    }
    if (cliargs != NULL)
    {
        xps_cliargs_destroy(cliargs);
        cliargs = NULL;
    }

    exit(EXIT_SUCCESS);
}

void test_gzip_input_handler(void *ptr)
{
    (void)ptr;
}

void test_gzip_input_close_handler(void *ptr)
{
    (void)ptr;
}

void test_gzip_output_handler(void *ptr)
{
    xps_pipe_sink_t *sink = ptr;
    FILE *output = sink->ptr;
    size_t length = sink->pipe->buff_list->len;
    xps_buffer_t *buffer = xps_pipe_sink_read(sink, length);

    if (buffer == NULL)
        return;

    fwrite(buffer->data, 1, buffer->len, output);
    xps_pipe_sink_clear(sink, length);
    xps_buffer_destroy(buffer);
}

void test_gzip_output_close_handler(void *ptr)
{
    (void)ptr;
}

void test_gzip(int level, char *output_file)
{
    FILE *input = fopen("../public/large.txt", "rb");
    FILE *output = fopen(output_file, "wb");
    xps_gzip_t *gzip = xps_gzip_create(level);
    xps_pipe_source_t *input_source;
    xps_pipe_sink_t *output_sink;
    xps_pipe_t *input_pipe;
    xps_pipe_t *output_pipe;
    u_char data[DEFAULT_BUFFER_SIZE];
    size_t length;

    if (input == NULL || output == NULL || gzip == NULL)
    {
        logger(LOG_ERROR, "test_gzip_pipeline()", "failed to initialize gzip test");
        return;
    }

    input_source = xps_pipe_source_create(gzip, test_gzip_input_handler, test_gzip_input_close_handler);
    output_sink = xps_pipe_sink_create(output, test_gzip_output_handler, test_gzip_output_close_handler);
    input_pipe = xps_pipe_create(core, DEFAULT_PIPE_BUFF_THRESH, input_source, gzip->sink);
    output_pipe = xps_pipe_create(core, DEFAULT_PIPE_BUFF_THRESH, gzip->source, output_sink);

    struct timespec start;
    struct timespec end;
    clock_gettime(CLOCK_MONOTONIC, &start);

    while ((length = fread(data, 1, sizeof(data), input)) > 0)
    {
        xps_buffer_t *buffer = xps_buffer_create(length, length, NULL);
        memcpy(buffer->data, data, length);
        xps_pipe_source_write(input_source, buffer);
        xps_buffer_destroy(buffer);

        gzip->sink->handler_cb(gzip->sink);
        if (gzip->source->ready)
        {
            gzip->source->handler_cb(gzip->source);
            test_gzip_output_handler(output_sink);
        }
    }

    gzip->sink->active = false;
    gzip->sink->close_cb(gzip->sink);
    gzip->source->handler_cb(gzip->source);
    test_gzip_output_handler(output_sink);

    xps_pipe_source_destroy(input_source);
    xps_pipe_sink_destroy(output_sink);
    xps_pipe_destroy(input_pipe);
    xps_pipe_destroy(output_pipe);
    fclose(input);
    fclose(output);

    clock_gettime(CLOCK_MONOTONIC, &end);

    struct stat input_stat;
    struct stat output_stat;

    stat("../public/large.txt", &input_stat);
    stat(output_file, &output_stat);

    double elapsed_ms =
        (end.tv_sec - start.tv_sec) * 1000.0 +
        (end.tv_nsec - start.tv_nsec) / 1000000.0;

    printf(
        "Level: %d | Original: %ld bytes | Compressed: %ld bytes | "
        "Ratio: %.2f%% | Time: %.3f ms\n",
        level,
        input_stat.st_size,
        output_stat.st_size,
        100.0 * output_stat.st_size / input_stat.st_size,
        elapsed_ms);

    logger(LOG_INFO, "test_gzip()", "created %s", output_file);
}