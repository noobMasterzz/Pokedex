import { useState, useEffect } from "react";
import axios from "axios";
import './loading.css';
import './darkTheme.css';
import Modal from './components/Modal';

function Pokedex() {
    const [pokemon, setPokemon] = useState(null);
    const [allPokemon, setAllPokemon] = useState([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [totalPokemon, setTotalPokemon] = useState(0);
    const [isPageTransitioning, setIsPageTransitioning] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(true);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [selectedPokemon, setSelectedPokemon] = useState(null);

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
        return (
            <div className="card-container">
                <div className="card" onClick={() => setSelectedPokemon(pokemon)}>
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
                    <div className="type-section">
                        <div className="type-list">
                            {pokemon.types.map(t => 
                                <span key={t.type.name} className="type-tag">
                                    {t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)}
                                </span>
                            )}
                        </div>
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

    // Theme toggle handler
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    // Initialize theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, []);

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

            <button 
                className="theme-toggle"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
                <img 
                    src={theme === 'light' 
                        ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z'/%3E%3C/svg%3E"
                        : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z'/%3E%3C/svg%3E"
                    }
                    alt={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
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

            {selectedPokemon && (
                <Modal 
                    pokemon={selectedPokemon} 
                    onClose={() => setSelectedPokemon(null)} 
                />
            )}
        </div>
    );
}

export default Pokedex;
