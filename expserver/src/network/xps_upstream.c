#include "../xps.h"

xps_connection_t *xps_upstream_create(xps_core_t *core, const char *host, u_int port)
{
    /* validate parameter */
    assert(core != NULL);
    assert(host != NULL);
    assert(port > 0 && port <= 65535);

    /* create a socket and connect to host and port to upstream using xps_getaddrinfo and connect function */
    // Create socket instance
    int upstream_sock_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (upstream_sock_fd < 0)
    {
        logger(LOG_ERROR, "xps_upstream_create()", "socket() failed");
        return NULL;
    }

    // Setup listener address
    struct addrinfo *addr_info = xps_getaddrinfo(host, port);
    if (addr_info == NULL)
    {
        logger(LOG_ERROR, "xps_upstream_create()", "xps_getaddrinfo() failed");
        perror("Error message");
        close(upstream_sock_fd);
        return NULL;
    }
    
    // Connect
    int connect_error = connect(upstream_sock_fd, addr_info->ai_addr, addr_info->ai_addrlen);
    if (connect_error != 0)
    {
        logger(LOG_ERROR, "xps_upstream_create()", "connect() failed");
        perror("Error message");
        close(upstream_sock_fd);
        return NULL;
    }

    freeaddrinfo(addr_info);

    if (make_socket_non_blocking(upstream_sock_fd) != OK)
    {
        close(upstream_sock_fd);
        return NULL;
    }

    /* create a connection to upstream with core and sock_fd*/
    xps_connection_t *connection = xps_connection_create(core, upstream_sock_fd);
    if (connection == NULL)
    {
        logger(LOG_ERROR, "xps_upstream_create()", "xps_connection_create() failed");
        close(upstream_sock_fd);
        return NULL;
    }

    logger(LOG_INFO, "xps_upstream_create()", "created upstream connection to %s:%d", host, port);
    
    return connection;
}