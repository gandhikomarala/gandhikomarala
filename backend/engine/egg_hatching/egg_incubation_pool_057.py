"""
Egg Incubation & Hatching Pool Engine #057
Calculates incubation distance thresholds, hatch odds, shiny probability, and bonus stardust.
"""
import random
from typing import Dict, Any, List

class EggIncubationPool_057:
    EGG_TIER_DISTANCES = {
        "2KM": 2.0,
        "5KM": 5.0,
        "7KM": 7.0,
        "10KM": 10.0,
        "12KM": 12.0
    }

    def __init__(self, pool_id: int = 57):
        self.pool_id = pool_id
        self.super_incubator_multiplier = 0.67
        self.base_shiny_hatch_rate = 0.02

    def process_incubation_step(
        self,
        egg_tier: str,
        current_distance_km: float,
        step_distance_km: float,
        is_super_incubator: bool = False
    ) -> Dict[str, Any]:
        """Calculates distance increment and checks for hatch trigger."""
        req_dist = self.EGG_TIER_DISTANCES.get(egg_tier.upper(), 5.0)
        if is_super_incubator:
            req_dist *= self.super_incubator_multiplier

        new_dist = current_distance_km + step_distance_km
        hatched = new_dist >= req_dist

        return {
            "pool_id": self.pool_id,
            "egg_tier": egg_tier,
            "required_distance_km": round(req_dist, 2),
            "accumulated_distance_km": round(new_dist, 2),
            "is_hatched": hatched,
            "distance_remaining_km": max(0.0, round(req_dist - new_dist, 2))
        }

    def roll_hatch_rewards(self, egg_tier: str) -> Dict[str, Any]:
        """Calculates Stardust, Candies, and shiny chances awarded on hatch."""
        base_dust = {"2KM": 800, "5KM": 1600, "7KM": 2200, "10KM": 3200, "12KM": 4800}.get(egg_tier.upper(), 1600)
        base_candy = {"2KM": 10, "5KM": 20, "7KM": 25, "10KM": 30, "12KM": 40}.get(egg_tier.upper(), 20)

        is_shiny = random.random() < self.base_shiny_hatch_rate
        return {
            "pool_id": self.pool_id,
            "stardust_awarded": base_dust + random.randint(100, 400),
            "candies_awarded": base_candy + random.randint(2, 6),
            "is_shiny_hatch": is_shiny
        }
