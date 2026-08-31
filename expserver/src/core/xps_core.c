#include "../xps.h"

xps_core_t *xps_core_create()
{
    xps_core_t *core = malloc(sizeof(xps_core_t));
    if (core == NULL)
    {
        logger(LOG_ERROR, "xps_core_create()", "malloc() failed for 'core'");
        return NULL;
    }

    xps_loop_t *loop = xps_loop_create(core);
    if (loop == NULL)
    {
        logger(LOG_ERROR, "xps_core_create()", "xps_loop_create() failed");
        free(core);
        return NULL;
    }

    // Init values
    core->loop = loop;
    core->n_null_listeners = 0;
    vec_init(&(core->listeners));
    core->n_null_connections = 0;
    vec_init(&(core->connections));

    logger(LOG_DEBUG, "xps_core_create()", "created core");

    return core;
}

void xps_core_destroy(xps_core_t *core)
{
    assert(core != NULL);

    // Destroy connections
    for (int i = 0; i < core->connections.length; i++)
    {
        xps_connection_t *connection = core->connections.data[i];
        if (connection != NULL)
            xps_connection_destroy(connection); // modification of xps_connection_destroy() will be look at later
    }
    vec_deinit(&(core->connections));

    /* destory all the listeners and de-initialize core->listeners */
    for (int i = 0; i < core->listeners.length; i++)
    {
        xps_listener_t *listener = core->listeners.data[i];
        if (listener != NULL)
            xps_listener_destroy(listener); // modification of xps_listener_destroy() will be look at later
    }
    vec_deinit(&(core->listeners));

    /* destory loop attached to core */
    if (core->loop != NULL)
    {
        xps_loop_destroy(core->loop);
        core->loop = NULL;
    }

    /* free core instance */
    free(core);

    logger(LOG_DEBUG, "xps_core_destroy()", "destroyed core");
}

void xps_core_start(xps_core_t *core)
{
    assert(core != NULL);

    logger(LOG_DEBUG, "xps_start()", "starting core");

    /* create listeners from port 8001 to 8004 */
    for (u_int port = 8001; port <= 8004; port++)
    {
        const char *host = "0.0.0.0";
        xps_listener_t *listener = xps_listener_create(core, host, port);
        if (listener == NULL)
        {
            logger(LOG_ERROR, "xps_start()", "xps_listener_create() failed for port %d", port);
            continue;
        }
        logger(LOG_INFO, "xps_start()", "listener created for port %d", port);
    }

    /* run loop instance using xps_loop_run() */
    xps_loop_run(core->loop);
}