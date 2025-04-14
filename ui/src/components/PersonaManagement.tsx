import React, { useState, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import personaStore, { Persona } from '../stores/PersonaStore';
import styles from '../styles/main.module.css';

interface PersonaManagementProps {
  isOpen: boolean;
  onClose: () => void;
  initialCreateMode?: boolean;
}

const PersonaManagement: React.FC<PersonaManagementProps> = observer(({ isOpen, onClose, initialCreateMode = false }) => {
  const [editMode, setEditMode] = useState<'create' | 'edit' | null>(initialCreateMode ? 'create' : null);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  // Update edit mode when initialCreateMode changes
  useEffect(() => {
    if (initialCreateMode && editMode !== 'create') {
      setEditMode('create');
    }
  }, [initialCreateMode]);
  
  // Reset form when closing or switching modes
  const resetForm = () => {
    setName('');
    setDescription('');
    setAvatarPreview(null);
    setAvatarFile(null);
    setSelectedPersona(null);
  };
  
  // Start creating a new persona
  const handleCreateNew = () => {
    resetForm();
    setEditMode('create');
  };
  
  // Start editing an existing persona
  const handleEdit = (persona: Persona) => {
    setSelectedPersona(persona);
    setName(persona.name);
    setDescription(persona.description);
    setAvatarPreview(persona.avatar);
    setEditMode('edit');
  };
  
  // Close the edit/create form
  const handleCancelEdit = () => {
    setEditMode(null);
    resetForm();
  };
  
  // Save the persona (create or update)
  const handleSave = async () => {
    if (editMode === 'create') {
      const newPersona = {
        name,
        description,
        avatar: avatarPreview || 'images/avatar.jpg',
        isDefault: personaStore.personas.length === 0, // Make default if it's the first one
        isFavorite: false
      };
      
      await personaStore.createPersona(newPersona);
      
      // If we have a new avatar file, upload it
      if (avatarFile && personaStore.personas.length > 0) {
        // Get the ID of the newly created persona (last in the array)
        const newPersonaId = personaStore.personas[personaStore.personas.length - 1].id;
        await personaStore.updatePersona(newPersonaId, { avatar: await uploadAvatar(newPersonaId, avatarFile) });
      }
    } else if (editMode === 'edit' && selectedPersona) {
      const updates = {
        name,
        description
      };
      
      await personaStore.updatePersona(selectedPersona.id, updates);
      
      // If we have a new avatar file, upload it
      if (avatarFile) {
        await personaStore.updatePersona(selectedPersona.id, { 
          avatar: await uploadAvatar(selectedPersona.id, avatarFile) 
        });
      }
    }
    
    setEditMode(null);
    resetForm();
  };
  
  // Delete a persona
  const handleDelete = async (personaId: string) => {
    if (window.confirm('Are you sure you want to delete this persona?')) {
      await personaStore.deletePersona(personaId);
    }
  };
  
  // Set a persona as default
  const handleSetDefault = async (personaId: string) => {
    await personaStore.setAsDefault(personaId);
  };
  
  // Toggle favorite status
  const handleToggleFavorite = async (personaId: string) => {
    await personaStore.toggleFavorite(personaId);
  };
  
  // Switch to a persona
  const handleSwitchTo = async (personaId: string) => {
    await personaStore.setCurrentPersona(personaId);
    onClose();
  };
  
  // Handle avatar file selection
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setAvatarFile(file);
    }
  };
  
  // Trigger file input click
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };
  
  // Upload avatar and get its URL
  const uploadAvatar = async (personaId: string, file: File): Promise<string> => {
    const response = await fetch('/api/upload_persona_avatar', {
      method: 'POST',
      body: (() => {
        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('persona_id', personaId);
        return formData;
      })(),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.avatar_url;
    }
    
    return 'images/avatar.jpg';
  };
  
  // Helper function to format avatar URL with cache busting
  const formatAvatarUrl = (avatarPath: string, timestamp?: number) => {
    // If it's null or undefined, return default avatar
    if (!avatarPath) {
      return 'images/avatar.jpg';
    }
    
    const cacheBuster = timestamp || Date.now();
    
    // If it's already a data URL from FileReader, return as is
    if (avatarPath.startsWith('data:')) {
      return avatarPath;
    }
    
    // If it's a full URL (starts with http)
    if (avatarPath.startsWith('http')) {
      return `${avatarPath}?t=${cacheBuster}`;
    }
    
    // For regular path
    return `${avatarPath}?t=${cacheBuster}`;
  };
  
  // If modal is not open, don't render anything
  if (!isOpen) return null;
  
  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles.personaModal}`}>
        <div className={styles.modalHeader}>
          <h5>Persona Management</h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
        </div>
        
        <div className={styles.modalBody}>
          {editMode === null ? (
            <>
              <div className="d-flex justify-content-between mb-3">
                <h6>Available Personas</h6>
                <button className="btn btn-sm btn-primary" onClick={handleCreateNew}>
                  <i className="bi bi-plus-circle me-1"></i> New Persona
                </button>
              </div>
              
              {personaStore.isLoading ? (
                <div className="text-center p-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : personaStore.personas.length === 0 ? (
                <div className="alert alert-info">
                  No personas have been created yet. Create your first persona to get started!
                </div>
              ) : (
                <div className={styles.personaGrid}>
                  {personaStore.personas.map(persona => (
                    <div key={persona.id} className={styles.personaCard}>
                      <div className={styles.personaCardHeader}>
                        <div className={styles.personaAvatar} onClick={() => handleEdit(persona)}>
                          <img 
                            src={formatAvatarUrl(persona.avatar, persona.avatarTimestamp)} 
                            alt={persona.name} 
                            className={styles.avatarImage} 
                          />
                        </div>
                        <div className={styles.personaMeta}>
                          <h6 className={styles.personaName}>
                            {persona.name}
                            {persona.isDefault && (
                              <span className="badge bg-primary ms-2">Default</span>
                            )}
                          </h6>
                          <div className={styles.personaActions}>
                            <button 
                              className="btn btn-sm btn-outline-warning me-1" 
                              onClick={() => handleToggleFavorite(persona.id)}
                              title={persona.isFavorite ? "Remove from favorites" : "Add to favorites"}
                            >
                              <i className={`bi ${persona.isFavorite ? 'bi-star-fill' : 'bi-star'}`}></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-primary me-1" 
                              onClick={() => handleSwitchTo(persona.id)}
                              title="Switch to this persona"
                            >
                              <i className="bi bi-box-arrow-in-right"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-secondary me-1" 
                              onClick={() => handleEdit(persona)}
                              title="Edit persona"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger" 
                              onClick={() => handleDelete(persona.id)}
                              title="Delete persona"
                              disabled={persona.isDefault}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className={styles.personaCardBody}>
                        <p className={styles.personaDescription}>{persona.description}</p>
                      </div>
                      <div className={styles.personaCardFooter}>
                        {!persona.isDefault && (
                          <button 
                            className="btn btn-sm btn-outline-primary w-100" 
                            onClick={() => handleSetDefault(persona.id)}
                          >
                            Make Default
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {personaStore.error && (
                <div className="alert alert-danger mt-3">
                  {personaStore.error}
                </div>
              )}
            </>
          ) : (
            <div className={styles.personaForm}>
              <h6>{editMode === 'create' ? 'Create New Persona' : 'Edit Persona'}</h6>
              
              <div className="mb-3 text-center">
                <div 
                  className={styles.avatarUpload} 
                  onClick={handleAvatarClick}
                >
                  <img 
                    src={avatarPreview ? formatAvatarUrl(avatarPreview) : 'images/avatar.jpg'} 
                    alt="Persona Avatar" 
                    className={styles.avatarPreview} 
                  />
                  <div className={styles.avatarOverlay}>
                    <i className="bi bi-camera"></i>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  accept="image/*" 
                  className="d-none"
                />
                <small className="text-muted d-block mt-1">Click to upload avatar</small>
              </div>
              
              <div className="mb-3">
                <label htmlFor="personaName" className="form-label">Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  id="personaName" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Enter persona name" 
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="personaDescription" className="form-label">Description</label>
                <textarea 
                  className="form-control" 
                  id="personaDescription" 
                  rows={2} 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Brief description of this persona" 
                />
              </div>
              
              <div className="d-flex justify-content-end mt-4">
                <button 
                  className="btn btn-secondary me-2" 
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSave}
                  disabled={!name.trim()}
                >
                  {editMode === 'create' ? 'Create' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default PersonaManagement; 