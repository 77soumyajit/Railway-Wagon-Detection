from datetime import datetime

from sqlalchemy.orm import Session

from app.models.wagon import (
    RailwayRecord,
    WagonRecord,
)


def create_railway_record(
    db: Session,
    r_no: str,
    line_in: str | None = None,
):
    record = RailwayRecord(
        r_no=r_no,
        line_in=line_in,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


def get_railway_record(
    db: Session,
    record_id: int,
):
    return (
        db.query(RailwayRecord)
        .filter(
            RailwayRecord.id == record_id
        )
        .first()
    )


def get_railway_records(
    db: Session,
):
    return (
        db.query(RailwayRecord)
        .order_by(
            RailwayRecord.id.desc()
        )
        .all()
    )


def close_railway_record(
    db: Session,
    record: RailwayRecord,
):
    record.line_out = datetime.now()

    db.commit()
    db.refresh(record)

    return record


def get_next_sl_no(
    db: Session,
    railway_record_id: int,
):
    last_wagon = (
        db.query(WagonRecord)
        .filter(
            WagonRecord.railway_record_id
            == railway_record_id
        )
        .order_by(
            WagonRecord.sl_no.desc()
        )
        .first()
    )

    if last_wagon is None:
        return 1

    return (
        last_wagon.sl_no or 0
    ) + 1


def create_wagon_record(
    db: Session,
    railway_record_id: int,
    wagon_no: str,
    wagon_type: str | None = None,
    wagon_owning: str | None = None,
    gross: str | None = None,
    tare: str | None = None,
    load: str | None = None,
    other: str | None = None,
):
    sl_no = get_next_sl_no(
        db,
        railway_record_id,
    )

    wagon = WagonRecord(
        railway_record_id=railway_record_id,
        sl_no=sl_no,
        wagon_no=wagon_no,
        wagon_type=wagon_type,
        wagon_owning=wagon_owning,
        gross=gross,
        tare=tare,
        load=load,
        other=other,
        detected_at=datetime.utcnow(),
    )

    db.add(wagon)
    db.commit()
    db.refresh(wagon)

    return wagon


def create_wagon_records_bulk(
    db: Session,
    railway_record_id: int,
    wagons,
):
    next_sl_no = get_next_sl_no(
        db,
        railway_record_id,
    )

    saved_wagons = []

    try:
        for wagon_data in wagons:
            wagon = WagonRecord(
                railway_record_id=railway_record_id,
                sl_no=next_sl_no,
                wagon_no=wagon_data.wagon_no,
                wagon_type=wagon_data.wagon_type,
                wagon_owning=wagon_data.wagon_owning,
                gross=wagon_data.gross,
                tare=wagon_data.tare,
                load=wagon_data.load,
                other=wagon_data.other,
                detected_at=datetime.utcnow(),
            )

            db.add(wagon)

            saved_wagons.append(
                wagon
            )

            next_sl_no += 1

        db.commit()

        for wagon in saved_wagons:
            db.refresh(wagon)

        return saved_wagons

    except Exception:
        db.rollback()
        raise


def get_wagons(
    db: Session,
    railway_record_id: int,
):
    return (
        db.query(WagonRecord)
        .filter(
            WagonRecord.railway_record_id
            == railway_record_id
        )
        .order_by(
            WagonRecord.sl_no.asc()
        )
        .all()
    )


def get_wagon(
    db: Session,
    wagon_id: int,
):
    return (
        db.query(WagonRecord)
        .filter(
            WagonRecord.id == wagon_id
        )
        .first()
    )