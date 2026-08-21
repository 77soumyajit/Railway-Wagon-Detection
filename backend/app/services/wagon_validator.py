from typing import Optional


class WagonNumberValidator:
    """
    Validator for the Indian Railways 11-digit wagon numbering system.

    Format:

        C1 C2 | C3 C4 | C5 C6 | C7 C8 C9 C10 | C11
        Type  | Owner |  Year | Individual No | Check

    Example:

        31101695215

        31 10 16 9521 5
        │  │  │   │    └── Check digit
        │  │  │   └────── Individual wagon number
        │  │  └────────── Year of manufacture
        │  └───────────── Owning railway
        └──────────────── Wagon type
    """

    NUMBER_LENGTH = 11

    def validate(self, wagon_number: str) -> dict:
        """
        Validate an 11-digit wagon number.

        Returns a complete validation result that can be
        sent directly to the frontend.
        """

        # ---------------------------------------------
        # Normalize OCR output
        # ---------------------------------------------

        if wagon_number is None:
            return self._invalid_result(
                wagon_number="",
                reason="No wagon number detected",
            )

        wagon_number = str(wagon_number).strip()

        # Remove spaces, hyphens and other OCR formatting.
        normalized = "".join(
            character
            for character in wagon_number
            if character.isdigit()
        )

        # ---------------------------------------------
        # Length validation
        # ---------------------------------------------

        if len(normalized) != self.NUMBER_LENGTH:
            return self._invalid_result(
                wagon_number=normalized,
                reason=(
                    f"Expected 11 digits, "
                    f"received {len(normalized)}"
                ),
                valid_length=False,
            )

        # ---------------------------------------------
        # Calculate check digit
        # ---------------------------------------------

        calculation = self.calculate_check_digit(
            normalized[:10]
        )

        actual_check_digit = int(normalized[10])

        calculated_check_digit = calculation[
            "calculated_check_digit"
        ]

        check_digit_valid = (
            actual_check_digit == calculated_check_digit
        )

        # ---------------------------------------------
        # Build number distribution
        # ---------------------------------------------

        distribution = self.get_distribution(
            normalized
        )

        # ---------------------------------------------
        # Final result
        # ---------------------------------------------

        return {
            "wagon_number": normalized,

            "valid": check_digit_valid,

            "valid_length": True,

            "check_digit": {
                "actual": actual_check_digit,
                "calculated": calculated_check_digit,
                "valid": check_digit_valid,
            },

            "distribution": distribution,

            "calculation": calculation,

            "message": (
                "Wagon number verified successfully"
                if check_digit_valid
                else "Invalid wagon number check digit"
            ),
        }

    # =================================================
    # CHECK DIGIT CALCULATION
    # =================================================

    def calculate_check_digit(
        self,
        first_ten_digits: str,
    ) -> dict:
        """
        Calculate the 11th digit using the Indian Railways
        six-step check-digit algorithm.

        Step 1:
            S1 = C2 + C4 + C6 + C8 + C10

        Step 2:
            S1 * 3

        Step 3:
            S2 = C1 + C3 + C5 + C7 + C9

        Step 4:
            Total = (S1 * 3) + S2

        Step 5:
            Round up to next multiple of 10.

        Step 6:
            Check digit = rounded value - total.
        """

        if len(first_ten_digits) != 10:
            raise ValueError(
                "Check digit calculation requires "
                "exactly 10 digits"
            )

        if not first_ten_digits.isdigit():
            raise ValueError(
                "Wagon number must contain digits only"
            )

        digits = [
            int(character)
            for character in first_ten_digits
        ]

        # ---------------------------------------------
        # Step 1
        # Even positions:
        # C2 + C4 + C6 + C8 + C10
        # ---------------------------------------------

        even_sum = sum(
            digits[index]
            for index in [1, 3, 5, 7, 9]
        )

        # ---------------------------------------------
        # Step 2
        # ---------------------------------------------

        multiplied_even_sum = even_sum * 3

        # ---------------------------------------------
        # Step 3
        # Odd positions:
        # C1 + C3 + C5 + C7 + C9
        # ---------------------------------------------

        odd_sum = sum(
            digits[index]
            for index in [0, 2, 4, 6, 8]
        )

        # ---------------------------------------------
        # Step 4
        # ---------------------------------------------

        total = (
            multiplied_even_sum
            + odd_sum
        )

        # ---------------------------------------------
        # Step 5
        # ---------------------------------------------

        next_multiple_of_ten = (
            ((total + 9) // 10) * 10
        )

        # ---------------------------------------------
        # Step 6
        # ---------------------------------------------

        calculated_check_digit = (
            next_multiple_of_ten - total
        )

        return {
            "first_ten_digits": first_ten_digits,

            "even_positions": {
                "positions": [
                    2,
                    4,
                    6,
                    8,
                    10,
                ],
                "digits": [
                    digits[index]
                    for index in [1, 3, 5, 7, 9]
                ],
                "sum": even_sum,
            },

            "step_2": {
                "operation": "even_sum × 3",
                "value": multiplied_even_sum,
            },

            "odd_positions": {
                "positions": [
                    1,
                    3,
                    5,
                    7,
                    9,
                ],
                "digits": [
                    digits[index]
                    for index in [0, 2, 4, 6, 8]
                ],
                "sum": odd_sum,
            },

            "step_4": {
                "operation": (
                    "even_sum × 3 + odd_sum"
                ),
                "value": total,
            },

            "next_multiple_of_ten": (
                next_multiple_of_ten
            ),

            "calculated_check_digit": (
                calculated_check_digit
            ),
        }

    # =================================================
    # NUMBER DISTRIBUTION
    # =================================================

    def get_distribution(
        self,
        wagon_number: str,
    ) -> list:

        return [
            {
                "position": 1,
                "digit": wagon_number[0],
                "code": "C1",
                "meaning": "Wagon type",
            },
            {
                "position": 2,
                "digit": wagon_number[1],
                "code": "C2",
                "meaning": "Wagon type",
            },
            {
                "position": 3,
                "digit": wagon_number[2],
                "code": "C3",
                "meaning": "Owning railway",
            },
            {
                "position": 4,
                "digit": wagon_number[3],
                "code": "C4",
                "meaning": "Owning railway",
            },
            {
                "position": 5,
                "digit": wagon_number[4],
                "code": "C5",
                "meaning": "Year of manufacture",
            },
            {
                "position": 6,
                "digit": wagon_number[5],
                "code": "C6",
                "meaning": "Year of manufacture",
            },
            {
                "position": 7,
                "digit": wagon_number[6],
                "code": "C7",
                "meaning": "Individual wagon number",
            },
            {
                "position": 8,
                "digit": wagon_number[7],
                "code": "C8",
                "meaning": "Individual wagon number",
            },
            {
                "position": 9,
                "digit": wagon_number[8],
                "code": "C9",
                "meaning": "Individual wagon number",
            },
            {
                "position": 10,
                "digit": wagon_number[9],
                "code": "C10",
                "meaning": "Individual wagon number",
            },
            {
                "position": 11,
                "digit": wagon_number[10],
                "code": "C11",
                "meaning": "Check digit",
            },
        ]

    # =================================================
    # INVALID RESPONSE
    # =================================================

    def _invalid_result(
        self,
        wagon_number: str,
        reason: str,
        valid_length: bool = False,
    ) -> dict:

        return {
            "wagon_number": wagon_number,
            "valid": False,
            "valid_length": valid_length,

            "check_digit": {
                "actual": None,
                "calculated": None,
                "valid": False,
            },

            "distribution": (
                self.get_distribution(wagon_number)
                if len(wagon_number) == 11
                else []
            ),

            "calculation": None,

            "message": reason,
        }


# Load once when the application starts.
wagon_validator = WagonNumberValidator()