#include "TcpServer.h"
#include <iostream>
#include <cstring>
#include <algorithm>

#ifdef _WIN32
    #define SHUT_RDWR SD_BOTH
#endif

TcpServer::TcpServer(int port) : listenSock(INVALID_SOCK) {
#ifdef _WIN32
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        throw std::runtime_error("WSAStartup failed");
    }
#endif

    listenSock = socket(AF_INET, SOCK_STREAM, 0);
    if (listenSock == INVALID_SOCK) {
        throw std::runtime_error("Failed to create listen socket");
    }

    // Allow port reuse
    int opt = 1;
#ifdef _WIN32
    setsockopt(listenSock, SOL_SOCKET, SO_REUSEADDR, (const char*)&opt, sizeof(opt));
#else
    setsockopt(listenSock, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
#endif

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(static_cast<uint16_t>(port));

    if (bind(listenSock, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) < 0) {
        closeSocket(listenSock);
        throw std::runtime_error("Failed to bind to port " + std::to_string(port));
    }

    if (listen(listenSock, 5) < 0) {
        closeSocket(listenSock);
        throw std::runtime_error("Failed to listen");
    }

    setNonBlocking(listenSock);
    std::cout << "TCP server listening on port " << port << std::endl;
}

TcpServer::~TcpServer() {
    std::lock_guard<std::mutex> lock(clientMutex);
    for (auto& c : clients) {
        closeSocket(c.sock);
    }
    clients.clear();
    if (listenSock != INVALID_SOCK) {
        closeSocket(listenSock);
    }
#ifdef _WIN32
    WSACleanup();
#endif
}

void TcpServer::setNonBlocking(socket_t sock) {
#ifdef _WIN32
    u_long mode = 1;
    ioctlsocket(sock, FIONBIO, &mode);
#else
    int flags = fcntl(sock, F_GETFL, 0);
    fcntl(sock, F_SETFL, flags | O_NONBLOCK);
#endif
}

void TcpServer::closeSocket(socket_t sock) {
#ifdef _WIN32
    closesocket(sock);
#else
    close(sock);
#endif
}

bool TcpServer::sendAll(socket_t sock, const uint8_t* data, size_t len) {
    size_t sent = 0;
    while (sent < len) {
        int flags = 0;
#ifdef __linux__
        flags = MSG_NOSIGNAL;
#endif
        auto n = send(sock, reinterpret_cast<const char*>(data + sent),
                      static_cast<int>(len - sent), flags);
        if (n <= 0) {
            return false;
        }
        sent += static_cast<size_t>(n);
    }
    return true;
}

void TcpServer::acceptClients() {
    while (true) {
        sockaddr_in clientAddr{};
        socklen_t addrLen = sizeof(clientAddr);
        socket_t newSock = accept(listenSock, reinterpret_cast<sockaddr*>(&clientAddr), &addrLen);

        if (newSock == INVALID_SOCK) {
            break;
        }

        setNonBlocking(newSock);

        int noDelay = 1;
#ifdef _WIN32
        setsockopt(newSock, IPPROTO_TCP, TCP_NODELAY, (const char*)&noDelay, sizeof(noDelay));
#else
        setsockopt(newSock, IPPROTO_TCP, TCP_NODELAY, &noDelay, sizeof(noDelay));
#endif

        std::lock_guard<std::mutex> lock(clientMutex);
        clients.push_back({newSock, {}});
        std::cout << "Client connected (total: " << clients.size() << ")" << std::endl;
    }
}

void TcpServer::broadcastState(const DroneState& state) {
    uint8_t frame[HEADER_SIZE + STATE_PAYLOAD];
    uint32_t payloadLen = STATE_PAYLOAD;
    std::memcpy(frame, &payloadLen, 4);
    frame[4] = MSG_TYPE_STATE;
    std::memcpy(frame + HEADER_SIZE, &state, sizeof(DroneState));

    std::lock_guard<std::mutex> lock(clientMutex);
    auto it = clients.begin();
    while (it != clients.end()) {
        if (!sendAll(it->sock, frame, sizeof(frame))) {
            std::cout << "Client disconnected (send failed)" << std::endl;
            closeSocket(it->sock);
            it = clients.erase(it);
        } else {
            ++it;
        }
    }
}

ParsedMessage TcpServer::readMessages() {
    ParsedMessage result;
    result.command = {CommandType::NONE, 0, 0.0};
    result.hasConfig = false;
    result.flightInput = {0.0, 0.0, 0.0, 0.0};
    result.hasFlightInput = false;

    std::lock_guard<std::mutex> lock(clientMutex);
    auto it = clients.begin();
    while (it != clients.end()) {
        uint8_t buf[256];
        auto n = recv(it->sock, reinterpret_cast<char*>(buf), sizeof(buf), 0);

        if (n > 0) {
            it->recvBuffer.insert(it->recvBuffer.end(), buf, buf + n);
        } else if (n == 0) {
            std::cout << "Client disconnected (closed)" << std::endl;
            closeSocket(it->sock);
            it = clients.erase(it);
            continue;
        } else {
#ifdef _WIN32
            int err = WSAGetLastError();
            if (err != WSAEWOULDBLOCK) {
#else
            if (errno != EAGAIN && errno != EWOULDBLOCK) {
#endif
                std::cout << "Client disconnected (recv error)" << std::endl;
                closeSocket(it->sock);
                it = clients.erase(it);
                continue;
            }
        }

        // Parse complete frames from buffer
        while (it != clients.end() && it->recvBuffer.size() >= HEADER_SIZE) {
            uint32_t payloadLen;
            std::memcpy(&payloadLen, it->recvBuffer.data(), 4);
            uint8_t msgType = it->recvBuffer[4];

            if (it->recvBuffer.size() < HEADER_SIZE + payloadLen) {
                break;
            }

            const uint8_t* payload = it->recvBuffer.data() + HEADER_SIZE;

            if (msgType == MSG_TYPE_COMMAND && payloadLen == COMMAND_PAYLOAD) {
                int32_t cmdType, rotorIndex;
                double throttle;
                std::memcpy(&cmdType, payload, 4);
                std::memcpy(&rotorIndex, payload + 4, 4);
                std::memcpy(&throttle, payload + 8, 8);
                result.command.type = static_cast<CommandType>(cmdType);
                result.command.rotor_index = rotorIndex;
                result.command.throttle = throttle;
            } else if (msgType == MSG_TYPE_CONFIG && payloadLen == CONFIG_PAYLOAD) {
                int32_t droneType, numRotors;
                double mass, maxThrustPerRotor, dragCoeff, liftCoeff;
                std::memcpy(&droneType, payload, 4);
                std::memcpy(&numRotors, payload + 4, 4);
                std::memcpy(&mass, payload + 8, 8);
                std::memcpy(&maxThrustPerRotor, payload + 16, 8);
                std::memcpy(&dragCoeff, payload + 24, 8);
                std::memcpy(&liftCoeff, payload + 32, 8);
                result.config.type = static_cast<DroneType>(droneType);
                result.config.numRotors = numRotors;
                result.config.mass = mass;
                result.config.maxThrustPerRotor = maxThrustPerRotor;
                result.config.dragCoeff = dragCoeff;
                result.config.liftCoeff = liftCoeff;
                result.hasConfig = true;
            } else if (msgType == MSG_TYPE_FLIGHT_INPUT && payloadLen == FLIGHT_INPUT_PAYLOAD) {
                std::memcpy(&result.flightInput.throttle, payload, 8);
                std::memcpy(&result.flightInput.pitch, payload + 8, 8);
                std::memcpy(&result.flightInput.roll, payload + 16, 8);
                std::memcpy(&result.flightInput.yaw, payload + 24, 8);
                result.hasFlightInput = true;
            }

            it->recvBuffer.erase(
                it->recvBuffer.begin(),
                it->recvBuffer.begin() + HEADER_SIZE + payloadLen
            );
        }

        ++it;
    }

    return result;
}
