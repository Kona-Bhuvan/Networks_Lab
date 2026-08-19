#include <arpa/inet.h>
#include <errno.h>
#include <netinet/in.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/epoll.h>
#include <sys/socket.h>
#include <unistd.h>

#define PORT 8080
#define BUFF_SIZE 10000
#define MAX_ACCEPT_BACKLOG 5
#define MAX_EPOLL_EVENTS 10
#define UPSTREAM_PORT 3000
#define MAX_SOCKS 10

int listen_sock_fd, epoll_fd;
struct epoll_event events[MAX_EPOLL_EVENTS];
int route_table[MAX_SOCKS][2], route_table_size = 0;

int create_loop()
{
    return epoll_create1(0);
}

void loop_attach(int epoll_fd, int fd, int events)
{
    struct epoll_event event;
    event.events = events;
    event.data.fd = fd;
    epoll_ctl(epoll_fd, EPOLL_CTL_ADD, fd, &event);
}

void loop_detach(int epoll_fd, int fd)
{
    epoll_ctl(epoll_fd, EPOLL_CTL_DEL, fd, NULL);
}

int create_server()
{
    int listen_sock_fd = socket(AF_INET, SOCK_STREAM, 0);

    int opt = 1;
    setsockopt(listen_sock_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in server_addr;
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(PORT);

    bind(listen_sock_fd, (struct sockaddr *)&server_addr, sizeof(server_addr));

    listen(listen_sock_fd, MAX_ACCEPT_BACKLOG);

    printf("[INFO] Server listening on port %d\n", PORT);
    return listen_sock_fd;
}

int connect_upstream()
{
    int upstream_sock_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (upstream_sock_fd < 0)
    {
        perror("upstream socket creation failed");
        return -1;
    }

    struct sockaddr_in upstream_addr;
    memset(&upstream_addr, 0, sizeof(upstream_addr));
    upstream_addr.sin_family = AF_INET;

    upstream_addr.sin_addr.s_addr = inet_addr("127.0.0.1");
    upstream_addr.sin_port = htons(UPSTREAM_PORT);

    if (connect(upstream_sock_fd, (struct sockaddr *)&upstream_addr, sizeof(upstream_addr)) < 0)
    {
        perror("connect to upstream failed");
        close(upstream_sock_fd);
        return -1;
    }

    return upstream_sock_fd;
}

void remove_route(int idx)
{
    int client_fd = route_table[idx][0];
    int upstream_fd = route_table[idx][1];

    loop_detach(epoll_fd, client_fd);
    loop_detach(epoll_fd, upstream_fd);

    close(client_fd);
    close(upstream_fd);

    for (int i = idx; i < route_table_size - 1; i++)
    {
        route_table[i][0] = route_table[i + 1][0];
        route_table[i][1] = route_table[i + 1][1];
    }
    route_table_size--;
}

void accept_connection(int listen_sock_fd)
{
    struct sockaddr_in client_addr;
    socklen_t client_addr_len = sizeof(client_addr);
    int conn_sock_fd = accept(listen_sock_fd, (struct sockaddr *)&client_addr, &client_addr_len);

    if (route_table_size >= MAX_SOCKS)
    {
        fprintf(stderr, "[WARN] Maximum routing capacity reached, rejecting connection...\n");
        close(conn_sock_fd);
        return;
    }

    int upstream_sock_fd = connect_upstream();
    if (upstream_sock_fd < 0)
    {
        close(conn_sock_fd);
        return;
    }

    route_table[route_table_size][0] = conn_sock_fd;
    route_table[route_table_size][1] = upstream_sock_fd;
    route_table_size += 1;

    loop_attach(epoll_fd, conn_sock_fd, EPOLLIN);
    loop_attach(epoll_fd, upstream_sock_fd, EPOLLIN);
}

void handle_client(int conn_sock_fd)
{
    char buff[BUFF_SIZE];
    ssize_t read_n = recv(conn_sock_fd, buff, sizeof(buff) - 1, 0);
    buff[read_n] = '\0';

    int route_idx = -1;
    for (int i = 0; i < route_table_size; i++)
    {
        if (route_table[i][0] == conn_sock_fd)
        {
            route_idx = i;
            break;
        }
    }

    if (read_n <= 0)
    {
        if (route_idx != -1)
            remove_route(route_idx);
        return;
    }

    printf("[CLIENT MESSAGE]\n%s\n", buff);

    if (route_idx == -1)
        return;

    int upstream_sock_fd = route_table[route_idx][1];
    int bytes_written = 0;
    int message_len = read_n;

    while (bytes_written < message_len)
    {
        int n = send(upstream_sock_fd, buff + bytes_written, message_len - bytes_written, 0);
        if (n <= 0)
        {
            remove_route(route_idx);
            return;
        }
        bytes_written += n;
    }
}

void handle_upstream(int upstream_sock_fd)
{
    char buff[BUFF_SIZE];
    ssize_t read_n = recv(upstream_sock_fd, buff, sizeof(buff), 0);

    int route_idx = -1;
    for (int i = 0; i < route_table_size; i++)
    {
        if (route_table[i][1] == upstream_sock_fd)
        {
            route_idx = i;
            break;
        }
    }

    if (read_n <= 0)
    {
        if (route_idx != -1)
            remove_route(route_idx);
        return;
    }

    if (route_idx == -1)
        return;

    int conn_sock_fd = route_table[route_idx][0];
    int bytes_written = 0;
    int message_len = read_n;

    while (bytes_written < message_len)
    {
        int n = send(conn_sock_fd, buff + bytes_written, message_len - bytes_written, 0);
        if (n <= 0)
        {
            remove_route(route_idx);
            return;
        }
        bytes_written += n;
    }
}

int is_client_socket(int fd)
{
    for (int j = 0; j < route_table_size; j++)
    {
        if (route_table[j][0] == fd)
            return 1;
    }
    return 0;
}

int is_upstream_socket(int fd)
{
    for (int j = 0; j < route_table_size; j++)
    {
        if (route_table[j][1] == fd)
            return 1;
    }
    return 0;
}

void loop_run(int epoll_fd)
{
    while (1)
    {
        printf("[DEBUG] Epoll wait\n");

        int n_ready_fds = epoll_wait(epoll_fd, events, MAX_EPOLL_EVENTS, -1);

        for (int i = 0; i < n_ready_fds; i++)
        {
            int curr_fd = events[i].data.fd;
            if (curr_fd == listen_sock_fd)
            {
                accept_connection(listen_sock_fd);
            }
            else if (is_client_socket(curr_fd))
            {
                handle_client(curr_fd);
            }
            else if (is_upstream_socket(curr_fd))
            {
                handle_upstream(curr_fd);
            }
        }
    }
}

int main()
{
    listen_sock_fd = create_server();
    epoll_fd = create_loop();

    loop_attach(epoll_fd, listen_sock_fd, EPOLLIN);

    loop_run(epoll_fd);

    close(listen_sock_fd);
    close(epoll_fd);
    return 0;
}