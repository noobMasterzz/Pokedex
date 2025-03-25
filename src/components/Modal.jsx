import React from 'react';
import './Modal.css';

const Modal = ({ pokemon, onClose }) => {
  if (!pokemon) return null;

  // Map stat names to more readable format
  const statNames = {
    'hp': 'HP',
    'attack': 'Attack',
    'defense': 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    'speed': 'Speed'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h2 className="modal-title">
            {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
          </h2>
          <div className="modal-types">
            {pokemon.types.map((type, index) => (
              <span key={index} className={`type-tag ${type.type.name.toLowerCase()}`}>
                {type.type.name.charAt(0).toUpperCase() + type.type.name.slice(1)}
              </span>
            ))}
          </div>
        </div>

        <div className="modal-body">
          <div className="modal-image-container">
            <img 
              src={pokemon.sprites.front_default} 
              alt={pokemon.name} 
              className="modal-pokemon-image"
            />
          </div>

          <div className="modal-details">
            <div className="modal-section">
              <h3>Description</h3>
              <p>{pokemon.description}</p>
            </div>

            <div className="modal-section">
              <h3>Abilities</h3>
              <div className="modal-abilities">
                {pokemon.abilities.map((ability, index) => (
                  <div key={index} className={`ability-item ${ability.is_hidden ? 'hidden' : ''}`}>
                    {ability.ability.name.split('-').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-section">
              <h3>Base Stats</h3>
              <div className="modal-stats">
                {pokemon.stats.map((stat, index) => (
                  <div key={index} className="stat-item">
                    <span className="stat-name">{statNames[stat.stat.name]}</span>
                    <div className="stat-bar">
                      <div 
                        className={`stat-bar-fill stat-${stat.stat.name}`}
                        style={{ width: `${(stat.base_stat / 255) * 100}%` }}
                      ></div>
                    </div>
                    <span className="stat-value">{stat.base_stat}</span>
                  </div>
                ))}
              </div>
            </div>

            {pokemon.weaknesses && pokemon.weaknesses.length > 0 && (
              <div className="modal-section">
                <h3>Weaknesses</h3>
                <div className="modal-types">
                  {pokemon.weaknesses.map((weakness, index) => (
                    <span key={index} className="type-tag weakness">
                      {weakness.charAt(0).toUpperCase() + weakness.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {pokemon.strengths && pokemon.strengths.length > 0 && (
              <div className="modal-section">
                <h3>Strong Against</h3>
                <div className="modal-types">
                  {pokemon.strengths.map((strength, index) => (
                    <span key={index} className="type-tag strength">
                      {strength.charAt(0).toUpperCase() + strength.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {pokemon.evolutionChain && pokemon.evolutionChain.length > 1 && (
              <div className="modal-section">
                <h3>Evolution Chain</h3>
                <div className="modal-evolution">
                  {pokemon.evolutionChain.map((evo, index) => (
                    <div key={index} className="evolution-item">
                      <img src={evo.sprite} alt={evo.name} />
                      <span>{evo.name.charAt(0).toUpperCase() + evo.name.slice(1)}</span>
                      {index < pokemon.evolutionChain.length - 1 && (
                        <div className="evolution-arrow">
                          →
                          {evo.min_level && (
                            <span className="evolution-level">
                              Level {evo.min_level}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal; 