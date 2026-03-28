#pragma once

class Rotor {
private:
    double maxThrust;

public:
    double throttle;

    Rotor(double maxThrust);

    [[nodiscard]] double getThrust() const;
};