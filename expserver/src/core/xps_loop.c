#include "../xps.h"

void handle_epoll_events(xps_loop_t *loop, int n_events);
bool handle_pipes(xps_loop_t *loop);
void filter_nulls(xps_core_t *core);

loop_event_t *loop_event_create(u_int fd, void *ptr, xps_handler_t read_cb, xps_handler_t write_cb, xps_handler_t close_cb)
{
    assert(ptr != NULL);

    // Alloc memory for 'event' instance
    loop_event_t *event = (loop_event_t*)malloc(sizeof(loop_event_t));
    if (event == NULL)
    {
        logger(LOG_ERROR, "event_create()", "malloc() failed for 'event'");
        return NULL;
    }

    /* set fd, ptr, read_cb fields of event */
    event->fd = fd;
    event->ptr = ptr;
    event->read_cb = read_cb;
    event->write_cb = write_cb;
    event->close_cb = close_cb;

    logger(LOG_DEBUG, "event_create()", "created event");

    return event;
}

void loop_event_destroy(loop_event_t *event)
{
    assert(event != NULL);

    free(event);

    logger(LOG_DEBUG, "event_destroy()", "destroyed event");
}

/**
 * Creates a new event loop instance associated with the given core.
 *
 * This function creates an epoll file descriptor, allocates memory for the xps_loop instance,
 * and initializes its values.
 *
 * @param core : The core instance to which the loop belongs
 * @return A pointer to the newly created loop instance, or NULL on failure.
 */
xps_loop_t *xps_loop_create(xps_core_t *core)
{
    assert(core != NULL);

    xps_loop_t *loop = malloc(sizeof(xps_loop_t));
    if (loop == NULL)
    {
        logger(LOG_ERROR, "loop_create()", "malloc() failed for 'loop'");
        return NULL;
    }

    int epoll_fd = epoll_create1(0);
    if (epoll_fd == -1)
    {
        logger(LOG_ERROR, "loop_create()", "epoll_create1() failed");
        free(loop);
        return NULL;
    }

    loop->core = core;
    loop->epoll_fd = epoll_fd;
    loop->n_null_events = 0;
    vec_init(&loop->events);

    logger(LOG_DEBUG, "loop_create()", "created loop instance");

    return loop;
}

/**
 * Destroys the given loop instance and releases associated resources.
 *
 * This function destroys all loop_event_t instances present in loop->events list,
 * closes the epoll file descriptor and releases memory allocated for the loop instance,
 *
 * @param loop The loop instance to be destroyed.
 */
void xps_loop_destroy(xps_loop_t *loop)
{
    assert(loop != NULL);

    close(loop->epoll_fd);
    for (int i = 0; i < loop->events.length; i++)
    {
        loop_event_t *event = loop->events.data[i];
        if (event != NULL)
            loop_event_destroy(event);
    }
    vec_deinit(&loop->events);

    free(loop);
}

/**
 * Attaches a FD to be monitored using epoll
 *
 * The function creates an intance of loop_event_t and attaches it to epoll.
 * Add the pointer to loop_event_t to the events list in loop
 *
 * @param loop : loop to which FD should be attached
 * @param fd : FD to be attached to epoll
 * @param event_flags : epoll event flags
 * @param ptr : Pointer to instance of xps_listener_t or xps_connection_t
 * @param read_cb : Callback function to be called on a read event
 * @param write_cb : Callback function to be called on a write event
 * @param close_cb : Callback function to be called on a close event
 * @return : OK on success and E_FAIL on error
 */
int xps_loop_attach(xps_loop_t *loop, u_int fd, int event_flags, void *ptr, xps_handler_t read_cb, xps_handler_t write_cb, xps_handler_t close_cb)
{
    assert(loop != NULL);
    assert(ptr != NULL);

    loop_event_t *event = loop_event_create(fd, ptr, read_cb, write_cb, close_cb);
    if (event == NULL)
    {
        logger(LOG_ERROR, "xps_loop_attach()", "loop_event_create() failed");
        return E_FAIL;
    }

    struct epoll_event epoll_event;
    epoll_event.events = event_flags;
    epoll_event.data.ptr = event;

    if (epoll_ctl(loop->epoll_fd, EPOLL_CTL_ADD, fd, &epoll_event) == -1)
    {
        logger(LOG_ERROR, "xps_loop_attach()", "epoll_ctl() failed");
        loop_event_destroy(event);
        return E_FAIL;
    }

    vec_push(&loop->events, event);
    return OK;
}

/**
 * Remove FD from epoll
 *
 * Find the instance of loop_event_t from loop->events that matches fd param
 * and detach FD from epoll. Destroy the loop_event_t instance and set the pointer
 * to NULL in loop->events list. Increment loop->n_null_events.
 *
 * @param loop : loop instnace from which to detach fd
 * @param fd : FD to be detached
 * @return : OK on success and E_FAIL on error
 */
int xps_loop_detach(xps_loop_t *loop, u_int fd)
{
    assert(loop != NULL);

    for (int i = 0; i < loop->events.length; i++)
    {
        loop_event_t *event = loop->events.data[i];
        if (event != NULL && event->fd == fd)
        {
            if (epoll_ctl(loop->epoll_fd, EPOLL_CTL_DEL, fd, NULL) == -1)
            {
                logger(LOG_ERROR, "xps_loop_detach()", "epoll_ctl() failed");
                return E_FAIL;
            }
            loop_event_destroy(event);
            loop->events.data[i] = NULL;
            loop->n_null_events++;
            return OK;
        }
    }
    return E_FAIL;
}

void xps_loop_run(xps_loop_t *loop)
{
    assert(loop != NULL);
    logger(LOG_DEBUG, "xps_loop_run()", "starting to run loop");

    while (1)
    {
        logger(LOG_DEBUG, "xps_loop_run()", "loop top");

        int timeout = handle_pipes(loop) ? 0 : -1;

        logger(LOG_DEBUG, "xps_loop_run()", "epoll waiting");

        int n_events = epoll_wait(loop->epoll_fd, loop->epoll_events, MAX_EPOLL_EVENTS, timeout);
        
        logger(LOG_DEBUG, "xps_loop_run()", "epoll wait over");

        if (n_events < 0)
            logger(LOG_ERROR, "xps_loop_run()", "epoll_wait() error");

        // Handle epoll events
        if (n_events > 0)
            handle_epoll_events(loop, n_events);

        // Filter NULLs from vec lists
        filter_nulls(loop->core);
    }
}

bool handle_pipes(xps_loop_t *loop)
{
    assert(loop != NULL);
    for (int i = 0; i < loop->core->pipes.length; i++)
    {
        xps_pipe_t *pipe = loop->core->pipes.data[i];
        if (pipe == NULL)
            continue;

        /*Destroy the pipe if it has no source and sink and continue*/
        if (pipe->source == NULL && pipe->sink == NULL)
        {
            logger(LOG_DEBUG, "handle_pipes", "pipe has no source and sink, destroying pipe");
            xps_pipe_destroy(pipe);
            continue;
        }
        if (pipe->source != NULL && pipe->source->ready && xps_pipe_is_writable(pipe))
        {
            pipe->source->handler_cb(pipe->source); // call connection_source_handler to write into  pipe
        }

        if (pipe->sink != NULL && pipe->sink->ready && xps_pipe_is_readable(pipe))
        {
            pipe->sink->handler_cb(pipe->sink); // call connection_sink_handler to read from pipe
        }

        if (pipe->source != NULL && pipe->sink == NULL)
        {
            pipe->source->active = false;
            pipe->source->close_cb(pipe->source);
        }

        if (pipe->sink != NULL && pipe->source == NULL && !xps_pipe_is_readable(pipe))
        {
            pipe->sink->active = false;
            pipe->sink->close_cb(pipe->sink);
        }
    }

    for (int i = 0; i < loop->core->pipes.length; i++)
    {
        xps_pipe_t *pipe = loop->core->pipes.data[i];
        if (pipe == NULL)
        {
            logger(LOG_DEBUG, "handle_pipes", "pipe is null");
            continue;
        }
        if (pipe->source != NULL && pipe->source->ready && xps_pipe_is_writable(pipe))
        {
            return true;
        }
        if (pipe->sink != NULL && pipe->sink->ready && xps_pipe_is_readable(pipe))
        {
            return true;
        }
        if (pipe->source != NULL && pipe->sink == NULL)
        {
            return true;
        }
        if (pipe->sink != NULL && pipe->source == NULL && !xps_pipe_is_readable(pipe))
        {
            return true;
        }
    }
    return false;
}

void filter_nulls(xps_core_t *core)
{
    /*check whether number of nulls in each of events, listeners, connections, pipes list
        exceeds DEFAULT_NULLS_THRESH and filter nulls using vec_filter_null() and set
        number of nulls in each list to 0*/
    if (core->loop->n_null_events > DEFAULT_NULLS_THRESH)
    {
        vec_filter_null(&core->loop->events);
        core->loop->n_null_events = 0;
    }
    if (core->n_null_listeners > DEFAULT_NULLS_THRESH)
    {
        vec_filter_null(&core->listeners);
        core->n_null_listeners = 0;
    }
    if (core->n_null_connections > DEFAULT_NULLS_THRESH)
    {
        vec_filter_null(&core->connections);
        core->n_null_connections = 0;
    }
    if (core->n_null_pipes > DEFAULT_NULLS_THRESH)
    {
        vec_filter_null(&core->pipes);
        core->n_null_pipes = 0;
    }
}

void handle_epoll_events(xps_loop_t *loop, int n_events)
{
    logger(LOG_DEBUG, "handle_epoll_events()", "handling %d events", n_events);

    for (int i = 0; i < n_events; i++)
    {
        logger(LOG_DEBUG, "handle_epoll_events()", "handling event no. %d", i + 1);
        /*Handle events as given in existing xps_loop_run()*/
        struct epoll_event curr_epoll_event = loop->epoll_events[i];
        loop_event_t *curr_event = curr_epoll_event.data.ptr;

        int curr_event_idx = -1;
        vec_find(&loop->events, curr_event, curr_event_idx);
        if (curr_event_idx == -1)
        {
            logger(LOG_DEBUG, "handle_epoll_events()", "event not found. skipping");
            continue;
        }

        if (curr_epoll_event.events & (EPOLLERR | EPOLLHUP))
        {
            logger(LOG_DEBUG, "handle_epoll_events()", "EVENT / error or hangup");
            if (curr_event->close_cb != NULL)
                curr_event->close_cb(curr_event->ptr);
            else
                logger(LOG_DEBUG, "handle_epoll_events()", "close_cb is NULL");
        }

        vec_find(&loop->events, curr_event, curr_event_idx);
        if (curr_event_idx == -1)
        {
            logger(LOG_DEBUG, "handle_epoll_events()", "event not found. skipping");
            continue;
        }

        if (curr_epoll_event.events & EPOLLIN)
        {
            logger(LOG_DEBUG, "handle_epoll_events()", "EVENT / read");
            if (curr_event->read_cb != NULL)
            {
                // Pass the ptr from loop_event_t as a parameter to the callback
                curr_event->read_cb(curr_event->ptr);
            }
            else
            {
                logger(LOG_DEBUG, "handle_epoll_events()", "read_cb is NULL");
            }
        }

        vec_find(&loop->events, curr_event, curr_event_idx);
        if (curr_event_idx == -1)
        {
            logger(LOG_DEBUG, "handle_epoll_events()", "event not found. skipping");
            continue;
        }

        if (curr_epoll_event.events & EPOLLOUT)
        {
            logger(LOG_DEBUG, "handle_epoll_events()", "EVENT / write");
            if (curr_event->write_cb != NULL)
                curr_event->write_cb(curr_event->ptr);
            else
                logger(LOG_DEBUG, "handle_epoll_events()", "write_cb is NULL");
        }
    }
}