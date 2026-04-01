FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    cmake \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN mkdir -p build && cd build && cmake .. && make

ENV ENGINE_PORT=9001
EXPOSE 9001

CMD ["./build/drone_sim_engine"]
