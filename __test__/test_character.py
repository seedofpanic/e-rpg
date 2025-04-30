import os
import sys
import json
import pytest

# Add the parent directory to sys.path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from character import Character

class TestCharacter:
    @pytest.fixture
    def sample_character(self):
        return Character(
            char_id="sample",
            name="Sample Character",
            char_class="Paladin",
            race="Tiefling",
            personality="Righteous and determined",
            background="Seeks redemption for a past mistake",
            motivation="Prove that tieflings can be forces of good",
            is_leader=False,
            strength=14,
            dexterity=10,
            constitution=12,
            intelligence=8,
            wisdom=14,
            charisma=16
        )
    
    def test_character_initialization(self, sample_character):
        """Test that a character is initialized with correct attributes"""
        assert sample_character.id == "sample"
        assert sample_character.name == "Sample Character"
        assert sample_character.char_class == "Paladin"
        assert sample_character.race == "Tiefling"
        assert sample_character.personality == "Righteous and determined"
        assert sample_character.background == "Seeks redemption for a past mistake"
        assert sample_character.motivation == "Prove that tieflings can be forces of good"
        assert sample_character.is_leader is False
        
        # Check ability scores
        assert sample_character.ability_scores["strength"] == 14
        assert sample_character.ability_scores["dexterity"] == 10
        assert sample_character.ability_scores["constitution"] == 12
        assert sample_character.ability_scores["intelligence"] == 8
        assert sample_character.ability_scores["wisdom"] == 14
        assert sample_character.ability_scores["charisma"] == 16
        
        # Check default avatar and memory
        assert sample_character.avatar is not None
        assert len(sample_character.memory) == 0
    
    def test_memory_management(self, sample_character):
        """Test adding and retrieving memories"""
        # Directly add memories to the character's memory set
        sample_character.memory.add("Met a mysterious stranger")
        sample_character.memory.add("Found a magical sword")
        sample_character.memory.add("Defeated a goblin camp")
        
        # Check that memories were added
        assert len(sample_character.memory) == 3
        
        # Check memory contents
        assert "Met a mysterious stranger" in sample_character.memory
        assert "Found a magical sword" in sample_character.memory
        assert "Defeated a goblin camp" in sample_character.memory
        
        # Clear memories
        sample_character.clear_memories()
        assert len(sample_character.memory) == 0
    
    def test_avatar_management(self, sample_character, tmp_path):
        """Test avatar setting and getting"""
        # Test default avatar
        assert sample_character.avatar is not None
        
        # Set new avatar
        test_avatar = "test_avatar.png"
        sample_character.set_avatar(test_avatar)
        assert sample_character.avatar == "avatars/" + test_avatar
        
        # Test getting avatar URL
        avatar_url = sample_character.get_avatar_url()
        assert test_avatar in avatar_url
    
    def test_inventory_management(self, sample_character):
        """Test inventory management functions"""
        # Test adding items
        sample_character.add_item_to_inventory("Healing Potion", "Restores 2d4+2 HP", 3, 50, 0.5, "potion", "common")
        sample_character.add_item_to_inventory("Longsword", "Standard longsword", 1, 15, 3, "weapon", "common")
        
        # Check inventory
        inventory = sample_character.get_inventory()
        assert len(inventory) == 2
        
        # Check item details
        potion = next((item for item in inventory if item["name"] == "Healing Potion"), None)
        assert potion is not None
        assert potion["quantity"] == 3
        assert potion["value"] == 50
        
        # Test removing items
        result = sample_character.remove_item_from_inventory("Healing Potion", 2)
        assert result is True
        
        # Check updated inventory
        inventory = sample_character.get_inventory()
        potion = next((item for item in inventory if item["name"] == "Healing Potion"), None)
        assert potion["quantity"] == 1
        
        # Test gold management
        assert sample_character.get_gold() == 0
        sample_character.add_gold(100)
        assert sample_character.get_gold() == 100
        sample_character.remove_gold(30)
        assert sample_character.get_gold() == 70


if __name__ == "__main__":
    pytest.main(["-v", "__test__/test_character.py"]) 