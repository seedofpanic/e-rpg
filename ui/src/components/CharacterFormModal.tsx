import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import characterStore from '../stores/CharacterStore';
import '../styles/CharacterManagement.css';

interface CharacterFormModalProps {
  onClose: () => void;
}

const CharacterFormModal: React.FC<CharacterFormModalProps> = observer(({ onClose }) => {
  const editingCharacter = characterStore.editingCharacter;
  const isEditing = !!editingCharacter?.id;
  
  const [formData, setFormData] = useState({
    id: editingCharacter?.id || '',
    name: editingCharacter?.name || '',
    race: editingCharacter?.race || '',
    class: editingCharacter?.class || '',
    personality: editingCharacter?.personality || '',
    background: editingCharacter?.background || '',
    motivation: editingCharacter?.motivation || '',
    is_leader: editingCharacter?.is_leader || false,
    active: editingCharacter?.active !== undefined ? editingCharacter.active : true,
    strength: editingCharacter?.ability_scores?.strength || 10,
    dexterity: editingCharacter?.ability_scores?.dexterity || 10,
    constitution: editingCharacter?.ability_scores?.constitution || 10,
    intelligence: editingCharacter?.ability_scores?.intelligence || 10,
    wisdom: editingCharacter?.ability_scores?.wisdom || 10,
    charisma: editingCharacter?.ability_scores?.charisma || 10,
    max_hp: editingCharacter?.max_hp || 10,
    current_hp: editingCharacter?.current_hp || 10,
    armor_class: editingCharacter?.armor_class || 10,
    proficiency_bonus: editingCharacter?.proficiency_bonus || 2,
  });
  
  const [skillProficiencies, setSkillProficiencies] = useState<Record<string, boolean>>(
    editingCharacter?.skill_proficiencies || {}
  );
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleSkillProficiencyChange = (skillName: string, checked: boolean) => {
    setSkillProficiencies(prev => ({ ...prev, [skillName]: checked }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare character data
    const characterData = {
      ...formData,
      ability_scores: {
        strength: parseInt(formData.strength.toString()),
        dexterity: parseInt(formData.dexterity.toString()),
        constitution: parseInt(formData.constitution.toString()),
        intelligence: parseInt(formData.intelligence.toString()),
        wisdom: parseInt(formData.wisdom.toString()),
        charisma: parseInt(formData.charisma.toString()),
      },
      skill_proficiencies: skillProficiencies,
    };
    
    // Save character
    if (isEditing) {
      characterStore.updateCharacter(characterData);
    } else {
      characterStore.createCharacter(characterData);
    }
    
    onClose();
  };
  
  const skills = [
    'acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception',
    'history', 'insight', 'intimidation', 'investigation', 'medicine',
    'nature', 'perception', 'performance', 'persuasion', 'religion',
    'sleight_of_hand', 'stealth', 'survival'
  ];
  
  return (
    <div className="character-form-modal">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">{isEditing ? 'Edit Character' : 'Create Character'}</h5>
          <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div className="mb-3">
              <h6>Basic Information</h6>
              <div className="row">
                <div className="col-md-6">
                  <label htmlFor="characterId" className="form-label">Character ID</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="characterId" 
                    name="id" 
                    value={formData.id} 
                    onChange={handleChange} 
                    required
                    readOnly={isEditing}
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="characterName" className="form-label">Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="characterName" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    required
                  />
                </div>
              </div>
              <div className="row mt-2">
                <div className="col-md-6">
                  <label htmlFor="characterRace" className="form-label">Race</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="characterRace" 
                    name="race" 
                    value={formData.race} 
                    onChange={handleChange}
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="characterClass" className="form-label">Class</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="characterClass" 
                    name="class" 
                    value={formData.class} 
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="row mt-2">
                <div className="col-md-6">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="isLeader" 
                      name="is_leader" 
                      checked={formData.is_leader} 
                      onChange={handleCheckboxChange}
                    />
                    <label className="form-check-label" htmlFor="isLeader">
                      Party Leader
                    </label>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="isActive" 
                      name="active" 
                      checked={formData.active} 
                      onChange={handleCheckboxChange}
                    />
                    <label className="form-check-label" htmlFor="isActive">
                      Active Character
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Character Stats */}
            <div className="mb-3">
              <h6>Ability Scores</h6>
              <div className="ability-scores">
                <div className="ability-score">
                  <label htmlFor="strength">STR</label>
                  <input 
                    type="number" 
                    id="strength" 
                    name="strength" 
                    min="1" max="30" 
                    value={formData.strength} 
                    onChange={handleChange}
                  />
                </div>
                <div className="ability-score">
                  <label htmlFor="dexterity">DEX</label>
                  <input 
                    type="number" 
                    id="dexterity" 
                    name="dexterity" 
                    min="1" max="30" 
                    value={formData.dexterity} 
                    onChange={handleChange}
                  />
                </div>
                <div className="ability-score">
                  <label htmlFor="constitution">CON</label>
                  <input 
                    type="number" 
                    id="constitution" 
                    name="constitution" 
                    min="1" max="30" 
                    value={formData.constitution} 
                    onChange={handleChange}
                  />
                </div>
                <div className="ability-score">
                  <label htmlFor="intelligence">INT</label>
                  <input 
                    type="number" 
                    id="intelligence" 
                    name="intelligence" 
                    min="1" max="30" 
                    value={formData.intelligence} 
                    onChange={handleChange}
                  />
                </div>
                <div className="ability-score">
                  <label htmlFor="wisdom">WIS</label>
                  <input 
                    type="number" 
                    id="wisdom" 
                    name="wisdom" 
                    min="1" max="30" 
                    value={formData.wisdom} 
                    onChange={handleChange}
                  />
                </div>
                <div className="ability-score">
                  <label htmlFor="charisma">CHA</label>
                  <input 
                    type="number" 
                    id="charisma" 
                    name="charisma" 
                    min="1" max="30" 
                    value={formData.charisma} 
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Character Combat Stats */}
            <div className="mb-3">
              <h6>Combat Stats</h6>
              <div className="row">
                <div className="col-md-3">
                  <label htmlFor="maxHp" className="form-label">Max HP</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    id="maxHp" 
                    name="max_hp" 
                    value={formData.max_hp} 
                    onChange={handleChange}
                  />
                </div>
                <div className="col-md-3">
                  <label htmlFor="currentHp" className="form-label">Current HP</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    id="currentHp" 
                    name="current_hp" 
                    value={formData.current_hp} 
                    onChange={handleChange}
                  />
                </div>
                <div className="col-md-3">
                  <label htmlFor="armorClass" className="form-label">Armor Class</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    id="armorClass" 
                    name="armor_class" 
                    value={formData.armor_class} 
                    onChange={handleChange}
                  />
                </div>
                <div className="col-md-3">
                  <label htmlFor="proficiencyBonus" className="form-label">Prof. Bonus</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    id="proficiencyBonus" 
                    name="proficiency_bonus" 
                    value={formData.proficiency_bonus} 
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Background & Personality */}
            <div className="mb-3">
              <h6>Background & Personality</h6>
              <div className="mb-2">
                <label htmlFor="personality" className="form-label">Personality</label>
                <textarea
                  className="form-control"
                  id="personality"
                  name="personality"
                  rows={2}
                  value={formData.personality}
                  onChange={handleChange}
                ></textarea>
              </div>
              <div className="mb-2">
                <label htmlFor="background" className="form-label">Background</label>
                <textarea
                  className="form-control"
                  id="background"
                  name="background"
                  rows={2}
                  value={formData.background}
                  onChange={handleChange}
                ></textarea>
              </div>
              <div className="mb-2">
                <label htmlFor="motivation" className="form-label">Motivation</label>
                <textarea
                  className="form-control"
                  id="motivation"
                  name="motivation"
                  rows={2}
                  value={formData.motivation}
                  onChange={handleChange}
                ></textarea>
              </div>
            </div>

            {/* Skill Proficiencies */}
            <div className="mb-3">
              <h6>Skill Proficiencies</h6>
              <div className="skill-proficiencies">
                {skills.map(skill => (
                  <div key={skill} className="form-check">
                    <input
                      className="form-check-input skill-checkbox"
                      type="checkbox"
                      id={`skill-${skill}`}
                      value={skill}
                      checked={skillProficiencies[skill] || false}
                      onChange={(e) => handleSkillProficiencyChange(skill, e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor={`skill-${skill}`}>
                      {skill.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Character</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

export default CharacterFormModal; 