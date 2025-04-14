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
        
        # Check default avatar and memories
        assert sample_character.avatar is not None
        assert len(sample_character.memories) == 0
    
    def test_memory_management(self, sample_character):
        """Test adding and retrieving memories"""
        # Add memories
        sample_character.add_memory("Met a mysterious stranger")
        sample_character.add_memory("Found a magical sword")
        sample_character.add_memory("Defeated a goblin camp")
        
        # Check that memories were added
        assert len(sample_character.memories) == 3
        
        # Check memory contents
        assert "Met a mysterious stranger" in sample_character.memories
        assert "Found a magical sword" in sample_character.memories
        assert "Defeated a goblin camp" in sample_character.memories
        
        # Get memories as string
        memory_string = sample_character.get_memories()
        assert "Met a mysterious stranger" in memory_string
        assert "Found a magical sword" in memory_string
        assert "Defeated a goblin camp" in memory_string
        
        # Clear memories
        sample_character.clear_memories()
        assert len(sample_character.memories) == 0
    
    def test_avatar_management(self, sample_character, tmp_path):
        """Test avatar setting and getting"""
        # Test default avatar
        assert sample_character.avatar is not None
        
        # Set new avatar
        test_avatar = "test_avatar.png"
        sample_character.set_avatar(test_avatar)
        assert sample_character.avatar == test_avatar
        
        # Test getting avatar URL
        avatar_url = sample_character.get_avatar_url()
        assert test_avatar in avatar_url
    
    def test_character_description(self, sample_character):
        """Test character description generation"""
        description = sample_character.get_character_description()
        
        # Description should include basic character info
        assert sample_character.name in description
        assert sample_character.race in description
        assert sample_character.char_class in description
        assert sample_character.personality in description
        assert sample_character.background in description
        
        # Should include ability scores
        assert "Strength: 14" in description
        assert "Dexterity: 10" in description
        assert "Constitution: 12" in description
        assert "Intelligence: 8" in description
        assert "Wisdom: 14" in description
        assert "Charisma: 16" in description
    
    def test_character_properties(self, sample_character):
        """Test character property getters"""
        assert sample_character.get_name() == "Sample Character"
        assert sample_character.get_description() == "Righteous and determined"
        
        # Check identity summary
        identity = sample_character.get_identity()
        assert sample_character.name in identity
        assert sample_character.race in identity
        assert sample_character.char_class in identity


if __name__ == "__main__":
    pytest.main(["-v", "__test__/test_character.py"]) 