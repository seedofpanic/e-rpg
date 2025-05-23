import React from 'react';
import { observer } from 'mobx-react-lite';
import characterStore from '../stores/CharacterStore';
import socketService from '../services/api';
import '../styles/SkillRoll.css';
import ChatStore from '../stores/ChatStore';

interface SkillRollProps {
}

// Helper function to get formatted skill name
const formatSkillName = (skillName: string): string => {
  return skillName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Skill categories to organize the skills
const SKILL_CATEGORIES = {
  strength: ['athletics'],
  dexterity: ['acrobatics', 'sleight_of_hand', 'stealth'],
  intelligence: ['arcana', 'history', 'investigation', 'nature', 'religion'],
  wisdom: ['animal_handling', 'insight', 'medicine', 'perception', 'survival'],
  charisma: ['deception', 'intimidation', 'performance', 'persuasion']
};

const SkillRollModal: React.FC<SkillRollProps> = observer(() => {
  const character = characterStore.getCharacterById(ChatStore.skillRollModal.characterId);
  
  if (!character) {
    return null;
  }

  const handleRollSkill = (skillName: string) => {
    socketService.sendEvent('roll_skill', {
      character_id: ChatStore.skillRollModal.characterId,
      skill_name: skillName
    });
    
    // Auto-close the menu after selecting a skill
    ChatStore.closeSkillRoll();
  };

  // Calculate modifier for display in tooltips
  const getAbilityModifier = (abilityScore: number): number => {
    return Math.floor((abilityScore - 10) / 2);
  };

  // Format the modifier for display (add + for positive numbers)
  const formatModifier = (modifier: number): string => {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  };

  const renderSkillButton = (skillName: string) => {
    if (!character.ability_scores) return null;
    
    const abilityKey = Object.entries(SKILL_CATEGORIES)
      .find(([_, skills]) => skills.includes(skillName))?.[0] || 'strength';
    
    // Get ability score and calculate modifier
    const abilityScore = character.ability_scores[abilityKey as keyof typeof character.ability_scores] || 10;
    const abilityModifier = getAbilityModifier(abilityScore);
    
    // Check if character is proficient in this skill
    const isProficient = character.skill_proficiencies?.[skillName] || false;
    const proficiencyBonus = isProficient ? (character.proficiency_bonus || 2) : 0;
    
    // Total modifier
    const totalModifier = abilityModifier + proficiencyBonus;
    
    return (
      <button 
        key={skillName}
        className={`skill-roll-button ${isProficient ? 'proficient' : ''}`}
        onClick={() => handleRollSkill(skillName)}
        title={`${formatSkillName(skillName)} (${abilityKey.charAt(0).toUpperCase() + abilityKey.slice(1)})
Roll: 1d20 ${formatModifier(abilityModifier)} (${abilityKey}) ${isProficient ? `+ ${proficiencyBonus} (proficiency)` : ''}`}
      >
        {formatSkillName(skillName)} {formatModifier(totalModifier)}
      </button>
    );
  };

  const renderSkillCategory = (categoryKey: string, skills: string[]) => {
    return (
      <div key={categoryKey} className="skill-category">
        <h4 className="skill-category-title">{categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)}</h4>
        <div className="skill-category-buttons">
          {skills.map(skill => renderSkillButton(skill))}
        </div>
      </div>
    );
  };

  return (
    <div className="skill-roll-container">
      {ChatStore.skillRollModal.open && (
        <>
          <div className="modal-backdrop" onClick={() => ChatStore.closeSkillRoll()}></div>
          <div className="skill-roll-menu">
            <div className="skill-roll-header">
              <h3>Skill Rolls for {character.name}</h3>
              <button className="close-modal-button" onClick={() => ChatStore.closeSkillRoll()}>×</button>
            </div>
            
            <div className="skill-categories">
              {Object.entries(SKILL_CATEGORIES).map(([category, skills]) => 
                renderSkillCategory(category, skills)
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default SkillRollModal; 