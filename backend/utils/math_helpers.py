def calculate_risk_score(claims: int, amount: float, age: int, location: int) -> float:
    # 4 risk vectors matching the frontend CSV rules:
    # 1. claims_per_month > 6
    # 2. amount > 40000
    # 3. account_age_days < 30
    # 4. location_cluster <= 2
    vectors = [
        claims > 6,
        amount > 40000,
        age < 30,
        location <= 2
    ]
    matched = sum(bool(x) for x in vectors)
    return float(matched * 25)

def get_severity(amount: float, claims: int) -> str:
    if amount > 100000:
        return "CRITICAL"
    elif claims > 10:
        return "HIGH"
    return "MEDIUM"
