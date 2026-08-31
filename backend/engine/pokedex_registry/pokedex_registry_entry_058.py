"""
Pokédex Generational Registry & Form Transition #058
Stores IV distributions, shiny rates, and evolution requirement matrices.
"""
from typing import Dict, Any, Optional

class PokedexRegistryEntry_058:
    def __init__(self, entry_id: int = 58):
        self.entry_id = entry_id
        self.base_stardust_cost = 200 + (58 % 10) * 100
        self.base_candy_cost = 1 + (58 % 3)

    def calculate_power_up(self, current_cp: int, iv_atk: int, iv_def: int, iv_sta: int) -> Dict[str, Any]:
        """Calculates upgraded CP after Stardust/Candy power up."""
        iv_sum = iv_atk + iv_def + iv_sta
        cp_gain = int(25 + (iv_sum / 45.0) * 15)
        new_cp = current_cp + cp_gain
        return {
            "entry_id": self.entry_id,
            "previous_cp": current_cp,
            "new_cp": new_cp,
            "stardust_consumed": self.base_stardust_cost,
            "candies_consumed": self.base_candy_cost,
            "iv_percentage": round((iv_sum / 45.0) * 100, 1)
        }

    def check_evolution_eligibility(self, current_candies: int, evolution_item: Optional[str] = None) -> bool:
        """Validates if Pokemon can evolve."""
        return current_candies >= 25
