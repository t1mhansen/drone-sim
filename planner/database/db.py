from sqlalchemy import create_engine, Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

# create SQLite database in the planner directory
engine = create_engine('sqlite:///drone_sim.db', echo=False)
Base = declarative_base()
SessionLocal = sessionmaker(bind=engine)


class MissionRecord(Base):
    """Stores mission metadata — algorithm, start, goal, obstacles."""
    __tablename__ = 'missions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    algorithm = Column(String)
    start_x = Column(Float)
    start_y = Column(Float)
    start_z = Column(Float)
    goal_x = Column(Float)
    goal_y = Column(Float)
    goal_z = Column(Float)
    path_length = Column(Integer)
    compute_time_ms = Column(Float)

    # one mission has many flight log entries
    flight_logs = relationship('FlightLog', back_populates='mission')


class FlightLog(Base):
    """Stores drone state snapshots during a mission for replay."""
    __tablename__ = 'flight_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    mission_id = Column(Integer, ForeignKey('missions.id'))
    timestamp = Column(Float)
    x = Column(Float)
    y = Column(Float)
    z = Column(Float)
    qx = Column(Float)
    qy = Column(Float)
    qz = Column(Float)
    qw = Column(Float)
    vx = Column(Float)
    vy = Column(Float)
    vz = Column(Float)
    ax = Column(Float)
    ay = Column(Float)
    az = Column(Float)

    mission = relationship('MissionRecord', back_populates='flight_logs')


def init_db():
    """Create all tables if they don't exist."""
    Base.metadata.create_all(engine)