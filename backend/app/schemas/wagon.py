from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import field_validator


class RailwayRecordCreate(BaseModel):
    r_no: str
    line_in: Optional[str] = None

    @field_validator("r_no")
    @classmethod
    def validate_r_no(cls, value):
        value = value.strip()

        if not value:
            raise ValueError(
                "Railway Record number is required."
            )

        return value


class RailwayRecordResponse(BaseModel):
    id: int
    r_no: Optional[str] = None
    line_in: Optional[str] = None
    line_out: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True
    )


class WagonRecordCreate(BaseModel):
    wagon_no: str
    wagon_type: Optional[str] = None
    wagon_owning: Optional[str] = None
    gross: Optional[str] = None
    tare: Optional[str] = None
    load: Optional[str] = None
    other: Optional[str] = None

    @field_validator("wagon_no")
    @classmethod
    def validate_wagon_no(cls, value):
        value = value.strip()

        if not value:
            raise ValueError(
                "Wagon number is required."
            )

        if len(value) != 11:
            raise ValueError(
                "Wagon number must contain exactly 11 characters."
            )

        return value


class WagonRecordResponse(BaseModel):
    id: int
    railway_record_id: int
    sl_no: Optional[int] = None
    wagon_no: Optional[str] = None
    wagon_type: Optional[str] = None
    wagon_owning: Optional[str] = None
    gross: Optional[str] = None
    tare: Optional[str] = None
    load: Optional[str] = None
    other: Optional[str] = None
    detected_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )


class WagonBulkCreate(BaseModel):
    wagons: list[WagonRecordCreate]

    @field_validator("wagons")
    @classmethod
    def validate_wagons(cls, value):
        if not value:
            raise ValueError(
                "At least one wagon is required."
            )

        return value


class RailwayRecordDetailResponse(
    RailwayRecordResponse
):
    wagons: list[WagonRecordResponse] = []