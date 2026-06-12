from app.shared.suc_utils import char_to_digit, calculate_luhn_mod10, generate_suc, verify_suc

def test_char_to_digit():
    assert char_to_digit("0") == 0
    assert char_to_digit("9") == 9
    assert char_to_digit("A") == 10
    assert char_to_digit("Z") == 35
    assert char_to_digit("a") == 10
    assert char_to_digit("z") == 35
    assert char_to_digit("-") == 0

def test_calculate_luhn_mod10():
    # Test with standard values
    # e.g., base = QY-SCH01-2605-0145
    # Let's calculate expected value
    base = "QY-SCH01-2605-0145"
    checksum = calculate_luhn_mod10(base)
    assert 0 <= checksum <= 9

def test_generate_and_verify_suc():
    suc = generate_suc("SCH01", "2605", 145)
    # The format should be: QY-SCH01-2605-0145-checksum
    parts = suc.split("-")
    assert len(parts) == 5
    assert parts[0] == "QY"
    assert parts[1] == "SCH01"
    assert parts[2] == "2605"
    assert parts[3] == "0145"
    assert len(parts[4]) == 1
    
    # Should verify successfully
    assert verify_suc(suc) is True
    
    # Single character mutation should fail validation
    # Mutating checksum
    mutated_checksum = suc[:-1] + ("0" if suc[-1] != "0" else "1")
    assert verify_suc(mutated_checksum) is False
    
    # Mutating sequence digit
    # e.g., changing QY-SCH01-2605-0145-C to QY-SCH01-2605-0146-C
    mutated_seq = suc.replace("0145", "0146")
    assert verify_suc(mutated_seq) is False

def test_invalid_formats():
    assert verify_suc("") is False
    assert verify_suc("QY-SCH01-2605") is False
    assert verify_suc("QY-SCH01-2605-0145-A") is False
