def char_to_digit(c: str) -> int:
    if c.isdigit():
        return int(c)
    if c.isalpha():
        return ord(c.upper()) - ord('A') + 10
    return 0

def calculate_luhn_mod10(payload: str) -> int:
    # Remove hyphens and whitespace, and convert to uppercase
    clean_str = payload.replace("-", "").replace(" ", "").upper()
    total = 0
    reversed_str = clean_str[::-1]
    for idx, char in enumerate(reversed_str):
        val = char_to_digit(char)
        if idx % 2 == 1:
            val *= 2
            if val > 9:
                val = (val % 10) + (val // 10)
        total += val
    return (10 - (total % 10)) % 10

def generate_suc(org: str, yymm: str, seq: int) -> str:
    # Standard format: QY-ORG-YYMM-SEQ-C
    # org: e.g. SCH01
    # yymm: e.g. 2605
    # seq: e.g. 145 (will be formatted to 4 digits: 0145)
    base = f"QY-{org.upper()}-{yymm}-{seq:04d}"
    checksum = calculate_luhn_mod10(base)
    return f"{base}-{checksum}"

def verify_suc(suc: str) -> bool:
    """
    Verifies if the SUC is structurally valid and passes Luhn MOD-10 check.
    Format: QY-ORG-YYMM-SEQ-C where C is the checksum digit.
    """
    if not suc:
        return False
    parts = suc.split("-")
    if len(parts) != 5:
        return False
    if parts[0] != "QY":
        return False
    
    # Reconstruct the base and verify the checksum
    base = "-".join(parts[:-1])
    try:
        expected_checksum = calculate_luhn_mod10(base)
        actual_checksum = int(parts[-1])
        return expected_checksum == actual_checksum
    except ValueError:
        return False
