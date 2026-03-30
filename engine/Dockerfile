# start from an official GCC image with CMake
FROM ubuntu:22.04

# install build tools
RUN apt-get update && apt-get install -y \
    cmake \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# set working directory
WORKDIR /app

# copy the engine source
COPY . .

# create build directory and compile
RUN mkdir -p build && cd build && cmake .. && make

# run the engine
CMD ["./build/drone_sim_engine"]