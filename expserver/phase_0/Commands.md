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