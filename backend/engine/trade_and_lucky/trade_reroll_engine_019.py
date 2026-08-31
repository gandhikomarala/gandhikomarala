"""
Trading IV Reroll & Lucky Friends Engine #019
Calculates friendship level IV floors, stardust trade discounts, and lucky rate boosts.
"""
import random
from typing import Dict, Any, Tuple

class TradeRerollEngine_019:
    FRIENDSHIP_FLOORS = {
        "GOOD": 1,
        "GREAT": 2,
        "ULTRA": 3,
        "BEST": 5,
        "LUCKY": 12
    }

    def __init__(self, engine_id: int = 19):
        self.engine_id = engine_id
        self.base_lucky_chance = 0.05

    def execute_trade_reroll(
        self,
        friendship_level: str,
        pokemon_age_years: int = 0
    ) -> Dict[str, Any]:
        """Calculates randomized IV reroll conforming to friendship floor constraints."""
        floor = self.FRIENDSHIP_FLOORS.get(friendship_level.upper(), 1)
        age_bonus = min(0.20, pokemon_age_years * 0.05)
        is_lucky = (friendship_level.upper() == "LUCKY") or (random.random() < (self.base_lucky_chance + age_bonus))

        actual_floor = 12 if is_lucky else floor
        iv_atk = random.randint(actual_floor, 15)
        iv_def = random.randint(actual_floor, 15)
        iv_sta = random.randint(actual_floor, 15)

        total_iv_pct = round(((iv_atk + iv_def + iv_sta) / 45.0) * 100, 1)
        return {
            "engine_id": self.engine_id,
            "is_lucky_trade": is_lucky,
            "iv_atk": iv_atk,
            "iv_def": iv_def,
            "iv_sta": iv_sta,
            "total_iv_percentage": total_iv_pct,
            "stardust_discount_pct": 50 if is_lucky else 0
        }
