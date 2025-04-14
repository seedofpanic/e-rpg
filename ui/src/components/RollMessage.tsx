import React from 'react';
import '../styles/RollMessage.css';

interface RollMessageProps {
  data: {
    ability: string;
    base_roll: number;
    ability_modifier: number;
    proficiency_bonus: number;
    skill_name: string;
  };
}

const RollMessage: React.FC<RollMessageProps> = ({ data }) => {
  const { base_roll, ability_modifier, proficiency_bonus, skill_name, ability } = data;
  const total = base_roll + ability_modifier + proficiency_bonus;
  
  // Format skill name for display
  const formattedSkillName = skill_name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Format ability name for display
  const formattedAbility = ability.charAt(0).toUpperCase() + ability.slice(1);
  
  // Determine if roll is critical success or failure
  const isCriticalSuccess = base_roll === 20;
  const isCriticalFailure = base_roll === 1;
  
  // Format modifiers for display
  const formatModifier = (modifier: number): string => {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  };

  return (
    <div className={`roll-message ${isCriticalSuccess ? 'critical-success' : ''} ${isCriticalFailure ? 'critical-failure' : ''}`}>
      <div className="roll-header">
        <span className="roll-skill-name">{formattedSkillName}</span>
        <span className="roll-ability">({formattedAbility})</span>
      </div>
      
      <div className="roll-result">
        <div className={`dice-roll ${isCriticalSuccess ? 'critical-success' : ''} ${isCriticalFailure ? 'critical-failure' : ''}`}>
          {base_roll}
        </div>
        
        <div className="roll-formula">
          <span className="roll-base">d20</span>
          {ability_modifier !== 0 && (
            <span className="roll-ability-mod">{formatModifier(ability_modifier)} {formattedAbility}</span>
          )}
          {proficiency_bonus > 0 && (
            <span className="roll-prof-bonus">+{proficiency_bonus} Prof</span>
          )}
          <span className="roll-equals">=</span>
          <span className="roll-total">{total}</span>
        </div>
      </div>
      
      {isCriticalSuccess && (
        <div className="roll-critical-text success">Critical Success!</div>
      )}
      {isCriticalFailure && (
        <div className="roll-critical-text failure">Critical Failure!</div>
      )}
    </div>
  );
};

export default RollMessage; 