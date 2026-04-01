#pragma once

#include <string>
#include <vector>
#include <mutex>
#include "DroneState.h"
#include "DroneConfig.h"
#include "CommandChannel.h"

#ifdef _WIN32
    #include <winsock2.h>
    #include <ws2tcpip.h>
    #pragma comment(lib, "ws2_32.lib")
    typedef SOCKET socket_t;
    #define INVALID_SOCK INVALID_SOCKET
#else
    #include <sys/socket.h>
    #include <netinet/in.h>
    #include <netinet/tcp.h>
    #include <arpa/inet.h>
    #include <unistd.h>
    #include <fcntl.h>
    typedef int socket_t;
    #define INVALID_SOCK (-1)
#endif

// Wire protocol:
//   [4 bytes LE: payload_length][1 byte: msg_type][payload]
//   msg_type 0x01 = DroneState (engine -> client): 13 LE doubles = 104 bytes
//   msg_type 0x02 = Command (client -> engine): int32 type + int32 rotor_index + float64 throttle = 16 bytes
//   msg_type 0x03 = DroneConfig (client -> engine): int32 type + int32 numRotors + 4 doubles = 40 bytes

static constexpr uint8_t MSG_TYPE_STATE   = 0x01;
static constexpr uint8_t MSG_TYPE_COMMAND = 0x02;
static constexpr uint8_t MSG_TYPE_CONFIG  = 0x03;
static constexpr size_t  HEADER_SIZE      = 5; // 4-byte length + 1-byte type
static constexpr size_t  STATE_PAYLOAD    = 104;
static constexpr size_t  COMMAND_PAYLOAD  = 16;
static constexpr size_t  CONFIG_PAYLOAD   = 40; // int32 + int32 + 4 doubles

struct ClientConnection {
    socket_t sock;
    std::vector<uint8_t> recvBuffer;
};

struct ParsedMessage {
    Command command;
    DroneConfig config;
    bool hasConfig;
};

class TcpServer {
public:
    explicit TcpServer(int port);
    ~TcpServer();

    void acceptClients();
    void broadcastState(const DroneState& state);
    ParsedMessage readMessages();

private:
    void setNonBlocking(socket_t sock);
    void closeSocket(socket_t sock);
    bool sendAll(socket_t sock, const uint8_t* data, size_t len);

    socket_t listenSock;
    std::vector<ClientConnection> clients;
    std::mutex clientMutex;

#ifdef _WIN32
    WSADATA wsaData;
#endif
};
