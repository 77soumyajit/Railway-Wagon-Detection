from datetime import datetime

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy.orm import relationship

from app.database.database import Base


class RailwayRecord(Base):
    __tablename__ = "railway_records"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    r_no = Column(
        String(100),
        nullable=True,
    )

    line_in = Column(
        String(50),
        nullable=True,
    )

    line_out = Column(
        String(50),
        nullable=True,
    )

    wagons = relationship(
        "WagonRecord",
        back_populates="railway_record",
        cascade="all, delete-orphan",
    )


class WagonRecord(Base):
    __tablename__ = "wagon_records"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    railway_record_id = Column(
        Integer,
        ForeignKey(
            "railway_records.id"
        ),
        nullable=False,
        index=True,
    )

    sl_no = Column(
        Integer,
        nullable=True,
    )

    wagon_no = Column(
        String(100),
        nullable=True,
    )

    wagon_type = Column(
        String(100),
        nullable=True,
    )

    wagon_owning = Column(
        String(100),
        nullable=True,
    )

    gross = Column(
        String(50),
        nullable=True,
    )

    tare = Column(
        String(50),
        nullable=True,
    )

    load = Column(
        String(50),
        nullable=True,
    )

    other = Column(
        String(50),
        nullable=True,
    )

    detected_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=True,
    )

    railway_record = relationship(
        "RailwayRecord",
        back_populates="wagons",
    )