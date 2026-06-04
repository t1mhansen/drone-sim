#pragma once

#include <string>
#include <vector>
#include <mutex>
#include "DroneState.h"
#include "DroneConfig.h"
#include "CommandChannel.h"
#include "WorldCollision.h"

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
//   msg_type 0x01 = DroneState (engine -> client): 14 LE doubles = 112 bytes
//   msg_type 0x02 = Command (client -> engine): int32 type + int32 rotor_index + float64 throttle = 16 bytes
//   msg_type 0x03 = DroneConfig (client -> engine): int32 type + int32 numRotors + int32 isKamikaze + 4 doubles = 44 bytes
//   msg_type 0x04 = FlightInput (client -> engine): 4 doubles = 32 bytes
//   msg_type 0x05 = WorldEvent (engine -> client): int32 type + int32 index + 3 doubles = 32 bytes

static constexpr uint8_t MSG_TYPE_STATE        = 0x01;
static constexpr uint8_t MSG_TYPE_COMMAND      = 0x02;
static constexpr uint8_t MSG_TYPE_CONFIG       = 0x03;
static constexpr uint8_t MSG_TYPE_FLIGHT_INPUT = 0x04;
static constexpr uint8_t MSG_TYPE_EVENT        = 0x05;
static constexpr size_t  HEADER_SIZE           = 5;
static constexpr size_t  STATE_PAYLOAD         = 112; // 14 doubles
static constexpr size_t  COMMAND_PAYLOAD       = 16;
static constexpr size_t  CONFIG_PAYLOAD        = 44;  // 3 int32 + 4 doubles
static constexpr size_t  FLIGHT_INPUT_PAYLOAD  = 32;  // 4 doubles
static constexpr size_t  EVENT_PAYLOAD         = 32;  // 2 int32 + 3 doubles

struct ClientConnection {
    socket_t sock;
    std::vector<uint8_t> recvBuffer;
};

struct ParsedMessage {
    Command command;
    DroneConfig config;
    bool hasConfig;
    FlightInput flightInput;
    bool hasFlightInput;
};

class TcpServer {
public:
    explicit TcpServer(int port);
    ~TcpServer();

    void acceptClients();
    void broadcastState(const DroneState& state);
    void broadcastEvent(const WorldEvent& event);
    ParsedMessage readMessages();

private:
    void setNonBlocking(socket_t sock);
    void closeSocket(socket_t sock);
    bool sendAll(socket_t sock, const uint8_t* data, size_t len);
    void broadcastFrame(const uint8_t* frame, size_t len);

    socket_t listenSock;
    std::vector<ClientConnection> clients;
    std::mutex clientMutex;

#ifdef _WIN32
    WSADATA wsaData;
#endif
};
