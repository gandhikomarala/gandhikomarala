"""
Buddy Adventure & Emotion Tracker #057
Calculates buddy affection hearts, excited emotion points, and souvenir drops.
"""
from typing import Dict, Any, List

class BuddyEmotionTracker_057:
    AFFECTION_LEVELS = {
        "GOOD_BUDDY": 1,
        "GREAT_BUDDY": 70,
        "ULTRA_BUDDY": 150,
        "BEST_BUDDY": 300
    }

    def __init__(self, tracker_id: int = 57):
        self.tracker_id = tracker_id
        self.excited_threshold_points = 32

    def record_activity_heart(
        self,
        current_hearts: int,
        emotion_points: int,
        activity_type: str
    ) -> Dict[str, Any]:
        """Records buddy activity and updates affection progression."""
        points_map = {
            "WALK": 3,
            "TREAT": 1,
            "PLAY": 1,
            "BATTLE": 1,
            "SNAPSHOT": 1,
            "VISIT_NEW_PLACE": 1
        }
        gained_pts = points_map.get(activity_type.upper(), 1)
        new_emotion = emotion_points + gained_pts
        is_excited = new_emotion >= self.excited_threshold_points

        heart_multiplier = 2 if is_excited else 1
        new_hearts = current_hearts + (1 * heart_multiplier)

        # Determine level
        level = "GOOD_BUDDY"
        for lvl_name, req in self.AFFECTION_LEVELS.items():
            if new_hearts >= req:
                level = lvl_name

        return {
            "tracker_id": self.tracker_id,
            "activity_type": activity_type,
            "new_affection_hearts": new_hearts,
            "new_emotion_points": new_emotion,
            "is_excited": is_excited,
            "buddy_level": level,
            "cp_boost_active": level == "BEST_BUDDY"
        }
