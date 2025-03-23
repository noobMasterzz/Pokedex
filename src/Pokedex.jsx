import { useState, useEffect } from "react";
import axios from "axios";
import './loading.css';

function Pokedex() {
    const [pokemon, setPokemon] = useState(null);
    const [allPokemon, setAllPokemon] = useState([]);
    const [displayedPokemon, setDisplayedPokemon] = useState([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [totalPokemon, setTotalPokemon] = useState(0);
    const [sortBy, setSortBy] = useState("id");
    const [sortOrder, setSortOrder] = useState("asc");
    const [typeFilter, setTypeFilter] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState([]);
    const [isPageTransitioning, setIsPageTransitioning] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(true);

    // Type effectiveness mapping
    const typeEffectiveness = {
        normal: { weaknesses: ['fighting'], strengths: [] },
        fire: { weaknesses: ['water', 'ground', 'rock'], strengths: ['grass', 'ice', 'bug', 'steel'] },
        water: { weaknesses: ['electric', 'grass'], strengths: ['fire', 'ground', 'rock'] },
        electric: { weaknesses: ['ground'], strengths: ['water', 'flying'] },
        grass: { weaknesses: ['fire', 'ice', 'poison', 'flying', 'bug'], strengths: ['water', 'ground', 'rock'] },
        ice: { weaknesses: ['fire', 'fighting', 'rock', 'steel'], strengths: ['grass', 'ground', 'flying', 'dragon'] },
        fighting: { weaknesses: ['flying', 'psychic', 'fairy'], strengths: ['normal', 'ice', 'rock', 'dark', 'steel'] },
        poison: { weaknesses: ['ground', 'psychic'], strengths: ['grass', 'fairy'] },
        ground: { weaknesses: ['water', 'grass', 'ice'], strengths: ['fire', 'electric', 'poison', 'rock', 'steel'] },
        flying: { weaknesses: ['electric', 'ice', 'rock'], strengths: ['grass', 'fighting', 'bug'] },
        psychic: { weaknesses: ['bug', 'ghost', 'dark'], strengths: ['fighting', 'poison'] },
        bug: { weaknesses: ['fire', 'flying', 'rock'], strengths: ['grass', 'psychic', 'dark'] },
        rock: { weaknesses: ['water', 'grass', 'fighting', 'ground', 'steel'], strengths: ['fire', 'ice', 'flying', 'bug'] },
        ghost: { weaknesses: ['ghost', 'dark'], strengths: ['psychic', 'ghost'] },
        dragon: { weaknesses: ['ice', 'dragon', 'fairy'], strengths: ['dragon'] },
        dark: { weaknesses: ['fighting', 'bug', 'fairy'], strengths: ['psychic', 'ghost'] },
        steel: { weaknesses: ['fire', 'fighting', 'ground'], strengths: ['ice', 'rock', 'fairy'] },
        fairy: { weaknesses: ['poison', 'steel'], strengths: ['fighting', 'dragon', 'dark'] }
    };

    const getPokemonWithSpecies = async (pokemonData) => {
        try {
            const speciesResponse = await axios.get(pokemonData.species.url);
            const englishFlavorText = speciesResponse.data.flavor_text_entries
                .find(entry => entry.language.name === "en")?.flavor_text
                .replace(/\\f|\\n/g, ' ') || "No description available.";

            // Get evolution chain data
            const evolutionResponse = await axios.get(speciesResponse.data.evolution_chain.url);
            const evolutionChain = [];
            
            // Process evolution chain
            let evoData = evolutionResponse.data.chain;
            while (evoData) {
                const speciesUrl = evoData.species.url;
                const pokemonId = speciesUrl.split('/').slice(-2, -1)[0];
                const pokemonResponse = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
                
                evolutionChain.push({
                    name: evoData.species.name,
                    sprite: pokemonResponse.data.sprites.front_default,
                    min_level: evoData.evolution_details?.[0]?.min_level || null
                });
                
                evoData = evoData.evolves_to[0]; // Get the first evolution path
            }

            // Get weaknesses and strengths based on types
            const types = pokemonData.types.map(t => t.type.name);
            const weaknesses = new Set();
            const strengths = new Set();

            types.forEach(type => {
                if (typeEffectiveness[type]) {
                    typeEffectiveness[type].weaknesses.forEach(w => weaknesses.add(w));
                    typeEffectiveness[type].strengths.forEach(s => strengths.add(s));
                }
            });

            return {
                ...pokemonData,
                category: speciesResponse.data.is_legendary ? "Legendary" :
                         speciesResponse.data.is_mythical ? "Mythical" : "Regular",
                description: englishFlavorText,
                weaknesses: Array.from(weaknesses),
                strengths: Array.from(strengths),
                evolutionChain
            };
        } catch (error) {
            console.error("Error fetching species data:", error);
            return pokemonData;
        }
    };

    const fetchPokemonPage = async (page) => {
        setIsPageTransitioning(true);
        setLoading(true);
        try {
            const offset = (page - 1) * itemsPerPage;
            const response = await axios.get(`https://pokeapi.co/api/v2/pokemon?limit=${itemsPerPage}&offset=${offset}`);
            const results = response.data.results;
            setTotalPokemon(response.data.count);
            
            // Fetch detailed data for each pokemon
            const pokemonData = await Promise.all(
                results.map(async (pokemon) => {
                    const res = await axios.get(pokemon.url);
                    return res.data;
                })
            );

            // Fetch species data for each pokemon
            const detailedPokemon = await Promise.all(
                pokemonData.map(getPokemonWithSpecies)
            );
            
            setAllPokemon(detailedPokemon);
        } catch (error) {
            console.error("Error fetching pokemon page:", error);
        } finally {
            setLoading(false);
            setTimeout(() => setIsPageTransitioning(false), 500); // Match animation duration
        }
    };

    // Update when page or items per page changes
    useEffect(() => {
        if (!pokemon) {
            fetchPokemonPage(currentPage);
        }
    }, [currentPage, itemsPerPage]);

    const handlePageChange = (newPage) => {
        if (newPage === currentPage) return;
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleItemsPerPageChange = (e) => {
        const newItemsPerPage = parseInt(e.target.value);
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1); // Reset to first page when changing items per page
    };

    const addToSearchHistory = (pokemonName) => {
        const updatedHistory = [
            pokemonName,
            ...searchHistory.filter(name => name !== pokemonName)
        ].slice(0, 5); // Keep only the last 5 searches
        
        setSearchHistory(updatedHistory);
        localStorage.setItem('pokemonSearchHistory', JSON.stringify(updatedHistory));
    };

    const fetchPokemon = async (searchQuery = query.trim()) => {
        if (!searchQuery) {
            setPokemon(null);
            return;
        }
        
        setLoading(true);
        try {
            const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${searchQuery.toLowerCase()}`);
            const pokemonWithSpecies = await getPokemonWithSpecies(response.data);
            setPokemon(pokemonWithSpecies);
            addToSearchHistory(searchQuery.toLowerCase());
        } catch (error) {
            setPokemon(null);
            alert("Pokémon not found!");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        fetchPokemon();
    };

    const handleHome = () => {
        setPokemon(null);
        setQuery("");
        setCurrentPage(1);
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const handleHistoryClick = (pokemonName) => {
        setQuery(pokemonName);
        fetchPokemon(pokemonName);
    };

    // Generate page numbers with ellipsis
    const getPageNumbers = () => {
        const totalPages = Math.ceil(totalPokemon / itemsPerPage);
        const pageNumbers = [];
        
        if (totalPages <= 7) {
            // Show all pages if total pages are 7 or less
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            // Always show first page
            pageNumbers.push(1);
            
            if (currentPage > 3) {
                pageNumbers.push('...');
            }
            
            // Show pages around current page
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                pageNumbers.push(i);
            }
            
            if (currentPage < totalPages - 2) {
                pageNumbers.push('...');
            }
            
            // Always show last page
            pageNumbers.push(totalPages);
        }
        
        return pageNumbers;
    };

    const PokemonCard = ({ pokemon }) => {
        // Calculate max stat value for the stat bars
        const maxStat = Math.max(...pokemon.stats.map(stat => stat.base_stat));
        
        // Map stat names to more readable format
        const statNames = {
            'hp': 'HP',
            'attack': 'Attack',
            'defense': 'Defense',
            'special-attack': 'Sp. Atk',
            'special-defense': 'Sp. Def',
            'speed': 'Speed'
        };

        const handleEvolutionClick = (pokemonName) => {
            setQuery(pokemonName);
            fetchPokemon(pokemonName);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        return (
            <div className="card-container">
            <div className="card">
                <img 
                    src={pokemon.sprites.front_default} 
                    alt={pokemon.name}
                />
                <h2 className="card-title">
                    {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
                </h2>
                <div className="card-description">
                    <p className={`pokemon-category ${pokemon.category.toLowerCase()}`}>
                        {pokemon.category}
                    </p>
                    <p>{pokemon.description}</p>
                </div>
                <div className="pokemon-stats">
                    <div className="type-section">
                        <h4>Type:</h4>
                        <div className="type-list">
                            {pokemon.types.map(t => 
                                <span key={t.type.name} className="type-tag">
                                    {t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="abilities-section">
                        <h4>Abilities:</h4>
                        <div className="type-list">
                            {pokemon.abilities.map(ability => (
                                <span 
                                    key={ability.ability.name}
                                    className={`ability-item ${ability.is_hidden ? 'hidden' : ''}`}
                                    title={ability.is_hidden ? 'Hidden Ability' : 'Regular Ability'}
                                >
                                    {ability.ability.name.split('-').map(word => 
                                        word.charAt(0).toUpperCase() + word.slice(1)
                                    ).join(' ')}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="stats-section">
                        <h4>Base Stats:</h4>
                        {pokemon.stats.map(stat => (
                            <div key={stat.stat.name} className="stat-bar">
                                <span className="stat-name">
                                    {statNames[stat.stat.name]}
                                </span>
                                <span className="stat-value">
                                    {stat.base_stat}
                                </span>
                                <div className="stat-bar-fill">
                                    <div 
                                        className={`stat-${stat.stat.name}`}
                                        style={{
                                            width: `${(stat.base_stat / maxStat) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {pokemon.weaknesses && pokemon.weaknesses.length > 0 && (
                        <div className="type-section">
                            <h4>Weaknesses:</h4>
                            <div className="type-list">
                                {pokemon.weaknesses.map(weakness => (
                                    <span key={weakness} className="type-tag weakness">
                                        {weakness.charAt(0).toUpperCase() + weakness.slice(1)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {pokemon.strengths && pokemon.strengths.length > 0 && (
                        <div className="type-section">
                            <h4>Strong Against:</h4>
                            <div className="type-list">
                                {pokemon.strengths.map(strength => (
                                    <span key={strength} className="type-tag strength">
                                        {strength.charAt(0).toUpperCase() + strength.slice(1)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {pokemon.evolutionChain && pokemon.evolutionChain.length > 1 && (
                        <div className="evolution-section">
                            <h4>Evolution Chain:</h4>
                            <div className="evolution-chain">
                                {pokemon.evolutionChain.map((evo, index) => (
                                    <>
                                        <div 
                                            key={evo.name}
                                            className="evolution-item"
                                            onClick={() => handleEvolutionClick(evo.name)}
                                            title={`Click to view ${evo.name}`}
                                        >
                                            <img src={evo.sprite} alt={evo.name} />
                                            <span>
                                                {evo.name.charAt(0).toUpperCase() + evo.name.slice(1)}
                                            </span>
                                        </div>
                                        {index < pokemon.evolutionChain.length - 1 && (
                                            <div className="evolution-arrow">
                                                →
                                                {pokemon.evolutionChain[index + 1].min_level && (
                                                    <span className="evolution-level">
                                                        Level {pokemon.evolutionChain[index + 1].min_level}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        );
    };

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;
            
            // Show scroll-to-top button when user has scrolled down 200px
            setShowScrollTop(scrollTop > 200);
            
            // Show scroll-to-bottom button when not at bottom
            setShowScrollBottom(scrollTop + clientHeight < scrollHeight - 100);
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleScrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const handleScrollToBottom = () => {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });
    };

    return (
        <div className="cards-wrapper">
            {loading && (
                <div className="loading-screen">
                    <div className="pokeball">
                        <div className="pokeball-line"></div>
                        <div className="glow"></div>
                    </div>
                    <div className="loading-text loading-dots">Catching Pokémon</div>
                </div>
            )}
            
            {isPageTransitioning && <div className="loading-transition" />}
            
            <button 
                className={`scroll-button scroll-top-button ${showScrollTop ? 'visible' : ''}`}
                onClick={handleScrollToTop}
                title="Scroll to Top"
            >
                <img 
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 3l-8 8h5v10h6V11h5z'/%3E%3C/svg%3E"
                    alt="Scroll to Top"
                />
            </button>

            <button
                className={`scroll-button scroll-bottom-button ${showScrollBottom ? 'visible' : ''}`}
                onClick={handleScrollToBottom}
                title="Scroll to Bottom"
            >
                <img 
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 21l8-8h-5V3h-6v10H4z'/%3E%3C/svg%3E"
                    alt="Scroll to Bottom"
                />
            </button>

            <button 
                className="home-button" 
                onClick={handleHome}
                title="Return to all Pokémon"
            >
                <img 
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2L1 12h3v9h7v-6h2v6h7v-9h3L12 2z'/%3E%3C/svg%3E"
                    alt="Home"
                />
            </button>

            <h1 className="title">Pokédex</h1>
            
            <form onSubmit={handleSubmit} className="search-form">
            <input
                type="text"
                placeholder="Enter Pokémon name"
                    value={query}
                onChange={(e) => setQuery(e.target.value)}
                    className="search-input"
                />
                <button type="submit" className="search-button">
                    Search
                </button>
            </form>

            {searchHistory.length > 0 && (
                <div className="search-history">
                    <h3>Recent Searches:</h3>
                    <div className="history-items">
                        {searchHistory.map((name) => (
                            <button
                                key={name}
                                onClick={() => handleHistoryClick(name)}
                                className="history-item"
                            >
                                {name.charAt(0).toUpperCase() + name.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="cards-container">
                {loading && <div className="loading">Loading Pokémon...</div>}
                
                {pokemon && !loading ? (
                    <PokemonCard pokemon={pokemon} />
                ) : (
                    allPokemon.map((p) => (
                        <PokemonCard key={p.id} pokemon={p} />
                    ))
                )}
            </div>

            {!pokemon && !loading && (
                <div className="pagination-controls">
                    <div className="items-per-page">
                        <label htmlFor="itemsPerPage">Show:</label>
                        <select
                            id="itemsPerPage"
                            value={itemsPerPage}
                            onChange={handleItemsPerPageChange}
                        >
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                        <span>per page</span>
                    </div>

                    <div className="page-numbers">
                        {getPageNumbers().map((pageNum, index) => (
                            pageNum === '...' ? (
                                <span key={`ellipsis-${index}`} className="page-ellipsis">•••</span>
                            ) : (
                                <button
                                    key={pageNum}
                                    className={`page-number ${pageNum === currentPage ? 'active' : ''}`}
                                    onClick={() => handlePageChange(pageNum)}
                                >
                                    {pageNum}
                                </button>
                            )
                        ))}
                    </div>

                    <div className="pagination-navigation">
                        <button
                            className="pagination-button"
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                        >
                            ⟪ First
                        </button>
                        <button
                            className="pagination-button"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            ← Prev
                        </button>
                        <button
                            className="pagination-button"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= Math.ceil(totalPokemon / itemsPerPage)}
                        >
                            Next →
                        </button>
                        <button
                            className="pagination-button"
                            onClick={() => handlePageChange(Math.ceil(totalPokemon / itemsPerPage))}
                            disabled={currentPage >= Math.ceil(totalPokemon / itemsPerPage)}
                        >
                            Last ⟫
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Pokedex;
