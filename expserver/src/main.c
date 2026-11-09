#include "xps.h"

xps_cliargs_t *cliargs = NULL;
xps_config_t *config = NULL;
xps_core_t *core = NULL;

void sigint_handler(int signum);
int core_create(xps_config_t *config);
void core_destroy(xps_core_t *core);
void listener_connection_handler(void *ptr);

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
