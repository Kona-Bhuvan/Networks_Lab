# Stage 0: Setup

### GNU Debugger

```bash
gcc -g list_demo.c -o list_demo
```

```bash
gdb ./list_demo
```

### eXpServer Tester

```bash
npm run start
```

---

# Stage 1: TCP Server

### Server

```bash
gcc tcp_server.c -o tcp_server
```

```bash
./tcp_server
```

### Client

```bash
nc localhost 8080
```

---

# Stage 2: TCP Client

### Server

```bash
gcc tcp_server.c -o tcp_server
```

```bash
./tcp_server
```

### Client

```bash
gcc tcp_client.c -o tcp_client
```

```bash
./tcp_client
```

### Multi Client

```bash
gcc tcp_multi_client.c -o tcp_multi_client
```

```bash
./tcp_multi_client
```

---

# Stage 3: UDP with Multi-threading 

### Server

```bash
gcc udp_server.c -o udp_server -pthread
```

```bash
./udp_server
```

### Client

```bash
nc -u localhost 8080
```

### Client

```bash
gcc udp_client.c -o udp_client
```

```bash
./udp_client
```

---

# Stage 4: Linux epoll

### Server

```bash
gcc tcp_server.c -o tcp_server
```

```bash
./tcp_server
```

### Client

```bash
gcc tcp_client.c -o tcp_client
```

```bash
./tcp_client
```

---


# Stage 5: TCP Proxy

### Server

```bash
python3 -m http.server 3000
```

### Proxy

```bash
gcc tcp_proxy.c -o tcp_proxy
```

```bash
./tcp_proxy
```

### Client

```bash
curl http://localhost:8080/
```

[**`http://localhost:8080/`**](http://localhost:8080/)


---

# Stage 5-b: File Transfer using TCP

### Server

```bash
gcc fp_server.c -o fp_server
```

```bash
./fp_server
```

### Client - data transfer

```bash
nc localhost 8080
```

### Client - file transfer

```bash
gcc fp_client.c -o fp_client
```

```bash
./fp_client
```

---

# Stage 6: Listener & Connection Modules

### build

```bash
./build.sh
```

### Debugger

*ON*

```bash
export XPS_DEBUG=1
```

*OFF*

```bash
unset XPS_DEBUG
```

### Server

```bash
./xps
```

### Clients

```bash
nc localhost 8001
```

```bash
nc localhost 8002
```

```bash
nc localhost 8003
```

```bash
nc localhost 8004
```

---

# Stage 7: Core & Loop Modules

### Server

```bash
./xps
```

### Client

```bash
nc localhost 8001
```

```bash
nc localhost 8002
```

### Sender

```bash
gcc sender.c -o sender
```

```bash
./sender
```

```bash
cat huge_file.dat | ./sender
```

---

# Stage 8: Non-Blocking Sockets

### Server

```bash
./xps
```

### Client

```bash
nc localhost 8001
```

### *htop* utility

```bash
htop
```

---

# Stage 9: epoll Edge Triggered

### Server

```bash
./xps
```

### *htop* utility

```bash
htop
```

### Client

```bash
nc localhost 8001
```

---