cmake_minimum_required(VERSION 3.20)
project(drone_sim_engine)
set(CMAKE_CXX_STANDARD 17)
add_executable(drone_sim_engine src/main.cpp
        src/PhysicsEngine.cpp
        src/Rotor.cpp
        src/RK4Integrator.cpp
        src/Logger.cpp
        src/TcpServer.cpp)

if(WIN32)
    target_link_libraries(drone_sim_engine ws2_32)
endif()
