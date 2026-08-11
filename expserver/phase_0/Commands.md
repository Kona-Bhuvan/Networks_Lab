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