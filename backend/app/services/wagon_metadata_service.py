WAGON_TYPES = {
    "10": "BOXN",
    "11": "BOXNHA",
    "12": "BOXNHS",
    "13": "BOXNCR",
    "14": "BOXNLW",
    "15": "BOXNB",
    "16": "BOXNF",
    "17": "BOXNG",
    "18": "BOY",
    "19": "BOST",
    "20": "BOXNAL",
    "21": "BOST HS",
    "22": "BOXN-HL",

    "30": "BCNA",
    "31": "BCNAHS",
    "32": "BCCNR",
    "33": "BCN-HL",

    "40": "BTPN",
    "41": "BTPNHS",
    "42": "BTPGLN",
    "43": "BTALN",
    "44": "BTCS",
    "45": "BTPH",
    "46": "BTAP",
    "47": "BTFLN",

    "55": "BRNA",
    "56": "BRNAHS",
    "57": "BFNS",
    "58": "BOMN",
    "59": "BRSTH",
    "60": "BFAT",
    "61": "BLCA",
    "62": "BLCB",
    "63": "BLLA",
    "64": "BLLB",
    "65": "BRS",
    "66": "BFU",
    "67": "BRHNEHS",
    "68": "BCL",
    "69": "BCLA",

    "70": "BOBYN",
    "71": "BOBYNHS",
    "72": "BOBRN",
    "73": "BOBRNHS",
    "74": "BOBRAL",

    "80": "BWTB",
    "81": "MBWT",
    "82": "DBKM",
    "83": "MBWZ",

    "85": "BVZC",
    "86": "BVZI",
}


OWNING_RAILWAYS = {
    "01": {
        "name": "Central Railway",
        "code": "CR",
    },
    "02": {
        "name": "Eastern Railway",
        "code": "ER",
    },
    "03": {
        "name": "Northern Railway",
        "code": "NR",
    },
    "04": {
        "name": "North Eastern Railway",
        "code": "NER",
    },
    "05": {
        "name": "Northeast Frontier Railway",
        "code": "NFR",
    },
    "06": {
        "name": "Southern Railway",
        "code": "SR",
    },
    "07": {
        "name": "South Eastern Railway",
        "code": "SER",
    },
    "08": {
        "name": "Western Railway",
        "code": "WR",
    },
    "09": {
        "name": "South Central Railway",
        "code": "SCR",
    },
    "10": {
        "name": "East Central Railway",
        "code": "ECR",
    },
    "11": {
        "name": "North Western Railway",
        "code": "NWR",
    },
    "12": {
        "name": "East Coast Railway",
        "code": "ECoR",
    },
    "13": {
        "name": "North Central Railway",
        "code": "NCR",
    },
    "14": {
        "name": "South East Central Railway",
        "code": "SECR",
    },
    "15": {
        "name": "South Western Railway",
        "code": "SWR",
    },
    "16": {
        "name": "West Central Railway",
        "code": "WCR",
    },
    "25": {
        "name": "CONCOR",
        "code": "CONCOR",
    },
    "26": {
        "name": "Privately Owned",
        "code": "PRIVATE",
    },
}


def get_wagon_metadata(wagon_number: str):
    if not wagon_number or len(wagon_number) != 11:
        return None

    wagon_type_code = wagon_number[0:2]
    owner_code = wagon_number[2:4]
    year_code = wagon_number[4:6]
    individual_number = wagon_number[6:10]
    check_digit = wagon_number[10]

    wagon_type = WAGON_TYPES.get(
        wagon_type_code,
        "Unknown Wagon Type",
    )

    owner = OWNING_RAILWAYS.get(
        owner_code,
        {
            "name": "Unknown Railway",
            "code": owner_code,
        },
    )

    try:
        year = 2000 + int(year_code)
    except ValueError:
        year = None

    return {
        "wagon_type": {
            "code": wagon_type_code,
            "name": wagon_type,
        },
        "owner": {
            "code": owner_code,
            "name": owner["name"],
            "short_code": owner["code"],
        },
        "manufacturing_year": {
            "code": year_code,
            "year": year,
        },
        "individual_number": individual_number,
        "check_digit": check_digit,
    }