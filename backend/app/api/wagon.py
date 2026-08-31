from datetime import datetime

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.wagon import RailwayRecord

from app.database.crud import (
    close_railway_record,
    create_railway_record,
    create_wagon_record,
    create_wagon_records_bulk,
    get_railway_record,
    get_railway_records,
    get_wagons,
)

from app.database.database import get_db

from app.schemas.wagon import (
    RailwayRecordCreate,
    RailwayRecordDetailResponse,
    RailwayRecordResponse,
    WagonBulkCreate,
    WagonRecordCreate,
    WagonRecordResponse,
)


router = APIRouter(
    prefix="/api",
    tags=["Wagon Detection"],
)


@router.post(
    "/railway-records",
    response_model=RailwayRecordResponse,
)
def create_record(
    data: RailwayRecordCreate,
    db: Session = Depends(get_db),
):
    if not data.r_no or not data.r_no.strip():
        raise HTTPException(
            status_code=400,
            detail="Railway Record number is required.",
        )

    record = RailwayRecord(
        r_no=data.r_no.strip(),
        line_in=datetime.now(),
        line_out=None,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


@router.get(
    "/railway-records",
    response_model=list[RailwayRecordResponse],
)
def list_records(
    db: Session = Depends(get_db),
):
    return get_railway_records(db)


@router.get(
    "/railway-records/active",
    response_model=RailwayRecordResponse | None,
)
def get_active_record(
    db: Session = Depends(get_db),
):
    record = (
        db.query(RailwayRecord)
        .filter(
            RailwayRecord.line_out.is_(None)
        )
        .order_by(
            RailwayRecord.id.desc()
        )
        .first()
    )

    return record


@router.get(
    "/railway-records/{record_id}",
    response_model=RailwayRecordDetailResponse,
)
def get_record(
    record_id: int,
    db: Session = Depends(get_db),
):
    record = get_railway_record(
        db,
        record_id,
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Railway record not found.",
        )

    return {
        "id": record.id,
        "r_no": record.r_no,
        "line_in": record.line_in,
        "line_out": record.line_out,
        "wagons": record.wagons,
    }


@router.put(
    "/railway-records/{record_id}/line-out",
    response_model=RailwayRecordResponse,
)
def update_line_out(
    record_id: int,
    db: Session = Depends(get_db),
):
    record = get_railway_record(
        db,
        record_id,
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Railway record not found.",
        )

    if record.line_out is not None:
        raise HTTPException(
            status_code=400,
            detail="Railway inspection is already finished.",
        )

    return close_railway_record(
        db,
        record,
    )


@router.post(
    "/railway-records/{record_id}/wagons",
    response_model=WagonRecordResponse,
)
def add_wagon(
    record_id: int,
    data: WagonRecordCreate,
    db: Session = Depends(get_db),
):
    record = get_railway_record(
        db,
        record_id,
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Railway record not found.",
        )

    if record.line_out is not None:
        raise HTTPException(
            status_code=400,
            detail="Cannot add wagon to a finished inspection.",
        )

    if not data.wagon_no or not data.wagon_no.strip():
        raise HTTPException(
            status_code=400,
            detail="Wagon number is required.",
        )

    return create_wagon_record(
        db=db,
        railway_record_id=record_id,
        wagon_no=data.wagon_no.strip(),
        wagon_type=data.wagon_type,
        wagon_owning=data.wagon_owning,
        gross=data.gross,
        tare=data.tare,
        load=data.load,
        other=data.other,
    )


@router.post(
    "/railway-records/{record_id}/wagons/bulk",
    response_model=list[WagonRecordResponse],
)
def add_wagons_bulk(
    record_id: int,
    data: WagonBulkCreate,
    db: Session = Depends(get_db),
):
    record = get_railway_record(
        db,
        record_id,
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Railway record not found.",
        )

    if record.line_out is not None:
        raise HTTPException(
            status_code=400,
            detail="Cannot save wagons to a finished inspection.",
        )

    if not data.wagons:
        raise HTTPException(
            status_code=400,
            detail="No wagons were provided.",
        )

    cleaned_wagons = []
    wagon_numbers = set()

    for index, wagon in enumerate(
        data.wagons,
        start=1,
    ):
        wagon_no = (
            wagon.wagon_no.strip()
            if wagon.wagon_no
            else ""
        )

        if not wagon_no:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Wagon number is required "
                    f"for wagon {index}."
                ),
            )

        if len(wagon_no) != 11:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid wagon number "
                    f"{wagon_no} for wagon {index}."
                ),
            )

        if wagon_no in wagon_numbers:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Duplicate wagon number "
                    f"{wagon_no} in the save request."
                ),
            )

        wagon_numbers.add(wagon_no)

        cleaned_wagons.append(
            WagonRecordCreate(
                wagon_no=wagon_no,
                wagon_type=wagon.wagon_type,
                wagon_owning=wagon.wagon_owning,
                gross=wagon.gross,
                tare=wagon.tare,
                load=wagon.load,
                other=wagon.other,
            )
        )

    try:
        saved_wagons = create_wagon_records_bulk(
            db=db,
            railway_record_id=record_id,
            wagons=cleaned_wagons,
        )

        return saved_wagons

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        print(
            "Bulk wagon save error:",
            exc,
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to save wagons to database.",
        )


@router.get(
    "/railway-records/{record_id}/wagons",
    response_model=list[WagonRecordResponse],
)
def list_wagons(
    record_id: int,
    db: Session = Depends(get_db),
):
    record = get_railway_record(
        db,
        record_id,
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Railway record not found.",
        )

    return get_wagons(
        db,
        record_id,
    )